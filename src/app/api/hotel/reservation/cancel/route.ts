import { NextResponse, NextRequest } from "next/server";
import { ensureLoggedIn } from "../../../../api/middleware";
import { z } from "zod";
import { db } from "~/server/db";
import { JwtPayload } from "jsonwebtoken";
export const POST = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    const userInput = z.object({
      reservationId: z.string(),
      confirmed: z.boolean().optional(),
    });

    let requestBody;
    try {
      // Parse and validate the incoming request body using hotelSchema
      requestBody = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body, must be a valid JSON" },
        { status: 400 },
      );
    }
    let safeInput;
    try {
      safeInput = userInput.parse(requestBody);
    } catch (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!safeInput.confirmed) {
      return NextResponse.json(
        { error: "Please confirm the cancellation" },
        { status: 400 },
      );
    }

    try {
      const reservation = await db.reservation.findUnique({
        where: {
          reservationId: safeInput.reservationId,
        },
        include: {
          user: {
            select: {
              id: true,
            },
          },
          roomType: {
            select: {
              name: true,
              hotel: {
                select: {
                  name: true,
                  ownerId: true,
                },
              },
            },
          },
          booking: {
            select: {
              bookingId: true,
              status: true,
              afsBookingReference: true,
            },
          },
        },
      });
      if (!reservation) {
        return NextResponse.json(
          { error: "Reservation not found" },
          { status: 404 },
        );
      }
      if (reservation.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Reservation already cancelled" },
          { status: 400 },
        );
      }

      if (reservation.roomType.hotel.ownerId !== session.user.id) {
        console.log(reservation.roomType.hotel.ownerId);
        return NextResponse.json(
          { error: "You are not authorized to cancel this reservation" },
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

      // Update the reservation status to CANCELLED
      await db.reservation.update({
        where: {
          reservationId: reservation.reservationId,
        },
        data: {
          status: "CANCELLED",
        },
      });

      // If there's an associated booking, update it to set reservationId to null
      if (reservation.booking) {
        await db.booking.update({
          where: {
            bookingId: reservation.booking.bookingId,
          },
          data: {
            reservationId: null,
            // If the booking has no flight reference, mark it as CANCELLED
            status: !reservation.booking.afsBookingReference
              ? "CANCELLED"
              : reservation.booking.status,
          },
        });
      }

      console.log(reservation.roomType);
      await db.notification.create({
        data: {
          userId: reservation.user.id,
          title: "Hotel Reservation Cancelled",
          message: `Your reservation for ${reservation.roomType.name} room at ${reservation.roomType.hotel.name} has been cancelled by the hotel.
          We're deeply sorry.`,
        },
      });

      return NextResponse.json(
        { message: "Reservation cancelled successfully" },
        { status: 200 },
      );
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to cancel reservation" },
        { status: 500 },
      );
    }
  },
);
