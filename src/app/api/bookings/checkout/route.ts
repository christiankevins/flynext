import { NextRequest, NextResponse } from "next/server";
import { validatePayment } from "../../../../utils/paymentValidator";
import { JwtPayload } from "jsonwebtoken";
import { ensureLoggedIn } from "../../middleware";
import { db } from "~/server/db";
import { z } from "zod";

// Define Zod schema for input validation
const checkoutSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  paymentInfo: z.object({
    cardNumber: z
      .string()
      .min(16, "Card number must be 16 digits")
      .max(16, "Card number must be 16 digits"), // Example validation
    expiryDate: z
      .string()
      .min(5, "Expiry date is required")
      .regex(/^\d{2}\/\d{2}$/, "Expiry date must be in MM/YY format"), // Example validation for expiry date
    cvv: z.string().length(3, "CVV must be 3 digits"),
  }),
});

export const POST = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    return CheckoutPOST(req, res, session);
  },
);

async function CheckoutPOST(
  req: NextRequest,
  res: NextResponse,
  session: JwtPayload,
) {
  try {
    // Parse and validate the request body
    const parsedBody = await req.json();
    const parsedInput = checkoutSchema.safeParse(parsedBody);

    // Handle validation errors
    if (!parsedInput.success) {
      const errorMessages = parsedInput.error.errors
        .map((err) => err.message)
        .join(", ");
      return NextResponse.json(
        { error: `Validation failed: ${errorMessages}` },
        { status: 400 },
      );
    }

    // Destructure validated input
    const { bookingId, paymentInfo } = parsedInput.data;

    // Validate payment details
    if (!validatePayment(paymentInfo)) {
      return NextResponse.json(
        { error: "Invalid payment details" },
        { status: 400 },
      );
    }

    // Fetch the booking details
    const booking = await db.booking.findFirst({
      where: { bookingId: bookingId },
      include: {
        reservation: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You are not authorized to pay for this booking" },
        { status: 403 },
      );
    }

    // Prevent payment if booking is canceled
    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot pay for a canceled booking" },
        { status: 400 },
      );
    }

    // Update the booking status to "PAID"
    const updatedBooking = await db.booking.update({
      where: { bookingId: bookingId },
      data: { status: "PAID" },
    });
    return NextResponse.json(
      { message: "Payment Success", updatedBooking },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to finalize booking" },
      { status: 500 },
    );
  }
}
