import { NextRequest, NextResponse } from "next/server";
import { ensureLoggedIn } from "../../middleware";
import { JwtPayload } from "jsonwebtoken";
import { db } from "~/server/db";
import { z } from "zod";

// Define Zod schema for input validation
const payLaterSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
});

export const POST = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    return PayLaterPOST(req, res, session);
  },
);

async function PayLaterPOST(
  req: NextRequest,
  res: NextResponse,
  session: JwtPayload,
) {
  try {
    // Parse and validate the request body
    const parsedBody = await req.json();
    const parsedInput = payLaterSchema.safeParse(parsedBody);

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
    const { bookingId } = parsedInput.data;

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
        { error: "You are not authorized to modify this booking" },
        { status: 403 },
      );
    }

    // Prevent modification if booking is canceled
    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot modify a canceled booking" },
        { status: 400 },
      );
    }

    // Update the booking status to "PAY_LATER"
    const updatedBooking = await db.booking.update({
      where: { bookingId: bookingId },
      data: { status: "PAY_LATER" },
    });

    // Create a notification for the user
    await db.notification.create({
      data: {
        userId: session.user.id,
        title: "Payment Deferred",
        message: `Your booking ${bookingId} has been marked for payment later. You can complete the payment anytime before your travel date.`,
      },
    });

    return NextResponse.json(
      { message: "Payment deferred successfully", updatedBooking },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing pay later request:", error);
    return NextResponse.json(
      { error: "Failed to process pay later request" },
      { status: 500 },
    );
  }
}
