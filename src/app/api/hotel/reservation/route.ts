import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";

export async function GET(req: NextRequest) {
  const userInput = z.object({
    reservationId: z.string(),
  });

  let searchParams;
  try {
    searchParams = new URL(req.url).searchParams;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Invalid Request parameters" },
      { status: 400 },
    );
  }

  const reservationId = searchParams.get("reservationId");
  if (!reservationId) {
    return NextResponse.json(
      { error: "Reservation ID is required" },
      { status: 400 },
    );
  }

  let safeInput;
  try {
    safeInput = userInput.parse({ reservationId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    // Find the booking that contains this reservation
    const booking = await db.booking.findFirst({
      where: {
        reservationId: safeInput.reservationId,
      },
      select: {
        bookingId: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found for this reservation" },
        { status: 404 },
      );
    }

    return NextResponse.json({ bookingId: booking.bookingId }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to retrieve booking ID" },
      { status: 500 },
    );
  }
}
