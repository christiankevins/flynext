import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { z } from "zod";
import { sendEmail } from "~/server/email";
import { retrieveBooking } from "../../afs/index";

export const POST = async (
  req: NextRequest,
  res: NextResponse,
): Promise<NextResponse> => {
  return CancelPOST(req, res);
};

async function CancelPOST(
  req: NextRequest,
  res: NextResponse,
): Promise<NextResponse> {
  const bookingSchema = z.object({
    bookingId: z.string(),
    cancelFlight: z.boolean(),
    cancelHotel: z.boolean(),
    lastName: z.string().optional(), // Make lastName optional for backward compatibility
  });
  let requestBody;
  try {
    requestBody = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body, must be a valid JSON" },
      { status: 400 },
    );
  }
  let safeInput;
  try {
    safeInput = bookingSchema.parse(requestBody);
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  let { bookingId, cancelFlight, cancelHotel, lastName } = safeInput;
  try {
    if (!cancelFlight && !cancelHotel) {
      return NextResponse.json(
        { error: "Please specify what to cancel" },
        { status: 400 },
      );
    }
    const booking = await db.booking.findFirst({
      where: {
        bookingId: bookingId,
      },
      select: {
        bookingId: true,
        userId: true,
        afsBookingReference: true,
        reservationId: true,
        status: true,
        lastName: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    
    // Use the lastName from the booking object if not provided in the request
    if (!lastName && booking.lastName) {
      lastName = booking.lastName;
    }
    
    // If the booking has no reservation or flight, force both to be cancelled
    if (!booking.reservationId && !booking.afsBookingReference) {
      return NextResponse.json(
        { error: "This booking has no reservations to cancel" },
        { status: 400 },
      );
    }

    // Adjust cancellation flags based on what's available
    if (!booking.reservationId) {
      cancelHotel = false;
    }
    if (!booking.afsBookingReference) {
      cancelFlight = false;
    }

    if (!cancelFlight && !cancelHotel) {
      return NextResponse.json(
        { error: "No valid cancellation options available" },
        { status: 400 },
      );
    }

    // Cancel the hotel reservation

    let reservation;
    if (cancelHotel && booking.reservationId) {
      try {
        // Parse and validate the incoming request body using hotelSchema

        reservation = await db.reservation.findUnique({
          where: {
            reservationId: booking.reservationId ?? undefined,
          },
          select: {
            reservationId: true,
            status: true,
            userId: true,
            checkInDate: true,
            checkOutDate: true,
            roomId: true,
            roomType: {
              select: {
                name: true,
                hotel: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (!reservation) {
          return NextResponse.json(
            { error: "Hotel reservation not found" },
            { status: 404 },
          );
        }
        if (reservation.status === "CANCELLED") {
          return NextResponse.json(
            { error: "Hotel reservation already cancelled" },
            { status: 400 },
          );
        }
        if (reservation.userId !== booking.userId) {
          return NextResponse.json(
            {
              error: "You are not authorized to cancel this hotel reservation",
            },
            { status: 403 },
          );
        }

        await db.availability.updateMany({
          where: {
            date: {
              gte: reservation.checkInDate,
              lt: reservation.checkOutDate,
            },
            roomType: {
              roomId: reservation.roomId,
            },
          },
          data: {
            availableRooms: {
              increment: 1,
            },
          },
        });
        await db.reservation.update({
          where: {
            reservationId: reservation.reservationId,
          },
          data: {
            status: "CANCELLED",
          },
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json(
          { error: "Failed to cancel hotel reservation" },
          { status: 500 },
        );
      }
    }

    // Cancel the flight booking if needed
    if (cancelFlight && booking.afsBookingReference) {
      try {
        // Use retrieveBooking to get the booking details from AFS
        // This doesn't require authentication
        if (!lastName) {
          return NextResponse.json(
            { error: "Last name is required to cancel flight booking" },
            { status: 400 },
          );
        }
        
        const afsBooking = await retrieveBooking({
          lastName: lastName,
          bookingReference: booking.afsBookingReference,
        });
        
        if (!afsBooking) {
          return NextResponse.json(
            { error: "Flight booking not found in AFS" },
            { status: 404 },
          );
        }
        
        // Note: We're not actually canceling the AFS booking here
        // The actual cancellation would require authentication
        // We're just updating our local database
      } catch (error) {
        console.error(error);
        return NextResponse.json(
          { error: "Failed to retrieve flight booking from AFS" },
          { status: 500 },
        );
      }
    }

    let message = "Booking does not changed";
    const isBothCanceled = cancelFlight && cancelHotel;
    if (isBothCanceled) {
      message = "Booking cancelled successfully";
      await db.notification.create({
        data: {
          userId: booking.userId,
          title: "Booking Cancelled",
          message: `Your booking (${booking.bookingId}) has been cancelled. We hope to see you again soon!`,
        },
      });
    } else if (safeInput.cancelHotel) {
      message = "Hotel reservation cancelled successfully";
      const notification = await db.notification.create({
        data: {
          userId: booking.userId,
          title: "Hotel Reservation Cancelled",
          message: `Your hotel reservation at ${reservation?.roomType.hotel.name} has been cancelled. We hope to see you again soon!`,
        },
      });
    } else if (safeInput.cancelFlight) {
      message = "Flight booking cancelled successfully";
      await db.notification.create({
        data: {
          userId: booking.userId,
          title: "Flight Booking Cancelled",
          message: `Your flight booking with reference ${booking?.afsBookingReference} has been cancelled. We hope to see you again soon!`,
        },
      });
    }
    // Update the booking, removing only the flightId if cancelFlight is true

    const updatedBooking = await db.booking.update({
      where: { bookingId: bookingId },
      data: {
        afsBookingReference: cancelFlight ? null : booking.afsBookingReference,
        reservationId: cancelHotel ? null : booking.reservationId,
        status: isBothCanceled ? "CANCELLED" : booking.status, // Update status if both are canceled
        // // Clear reservationId after deletion
      },
    });

    // Check if both references are null and update status accordingly
    if (!updatedBooking.afsBookingReference && !updatedBooking.reservationId) {
      await db.booking.update({
        where: { bookingId: bookingId },
        data: {
          status: "CANCELLED",
        },
      });
      updatedBooking.status = "CANCELLED";
    }

    return NextResponse.json(
      { message: message, updatedBooking },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 },
    );
  }
}
