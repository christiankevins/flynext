import { NextResponse, NextRequest } from "next/server";
import { retrieveBooking } from "../../afs/index";
import { ensureLoggedIn } from "../../middleware";
import { JwtPayload } from "jsonwebtoken";
import { db } from "~/server/db";
import { z } from "zod";

// Validate the query string instead of the request body
const verifyRequestSchema = z.object({
  bookingReference: z.string().min(1, "Booking reference is required"),
});

export const GET = ensureLoggedIn(VerifyGET);

async function VerifyGET(
  req: NextRequest,
  res: NextResponse,
  session: JwtPayload,
) {
  // Read query parameters instead of body
  const { searchParams } = new URL(req.url);
  const bookingReference = searchParams.get("bookingReference");
  if (!bookingReference) {
    return NextResponse.json(
      { error: "Booking reference is required" },
      { status: 400 },
    );
  }
  // Validate the query parameter
  let safeInput;
  try {
    safeInput = verifyRequestSchema.parse({ bookingReference });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Invalid booking reference" },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  const afsBookingReference = safeInput.bookingReference;
  try {
    // Query the booking from the database
    const booking = await db.booking.findUnique({
      where: {
        afsBookingReference: afsBookingReference, // Use the validated bookingReference
      },
      include: {
        user: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to verify this booking" },
        { status: 401 },
      );
    }

    // Step 2: Use the bookingReference to call the external API (afsFetch)
    const afsResponse = await retrieveBooking({
      lastName: booking.user.lastName,
      bookingReference: afsBookingReference,
    });

    // Step 3: Extract flight details directly from afsResponse
    const flights = afsResponse.flights.map((flight) => ({
      flightNumber: flight.flightNumber,
      status: flight.status,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      origin: flight.origin.name,
      destination: flight.destination.name,
    }));

    return NextResponse.json({ flights }, { status: 200 });
  } catch (error) {
    console.error("Error verifying booking:", error);
    return NextResponse.json(
      { error: "Failed to verify booking" },
      { status: 500 },
    );
  }
}
