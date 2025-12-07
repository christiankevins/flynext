import { NextResponse, NextRequest } from "next/server";
import { createBooking } from "../../afs/index"; // Import from app/afs/index.ts
import { ensureLoggedIn } from "../../middleware";
import { JwtPayload } from "jsonwebtoken";
import { db } from "~/server/db";
import { z } from "zod";

export const POST = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    const userId = session.user.id;
    const userInput = z.object({
      flightIds: z.array(z.string()).optional(),
      roomId: z.string().optional(),
      checkInDate: z.date().optional(),
      checkOutDate: z.date().optional(),
      passengerDetails: z
        .object({
          email: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          passportNumber: z.string(),
        })
        .optional(),
    });

    let requestBody;
    try {
      requestBody = await req.json();
      if (requestBody.checkInDate) {
        requestBody.checkInDate = new Date(requestBody.checkInDate);
      }
      if (requestBody.checkOutDate) {
        requestBody.checkOutDate = new Date(requestBody.checkOutDate);
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    console.log("requestBody", requestBody);
    let safeInput;
    try {
      safeInput = userInput.parse(requestBody);
    } catch (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!safeInput.flightIds && !safeInput.roomId) {
      return NextResponse.json(
        { error: "Flight or hotel booking is required" },
        { status: 400 },
      );
    }
    let afsBookingReference = null;
    let reservationId = null;
    let totalHotelPrice = null;

    // Handle Flight Booking
    if (safeInput.flightIds) {
      if (!safeInput.passengerDetails) {
        return NextResponse.json(
          { error: "Passenger details are required" },
          { status: 400 },
        );
      }
      // Send flight booking to AFS
      let afsBooking;
      try {
        afsBooking = await createBooking({
          email: safeInput.passengerDetails.email,
          firstName: safeInput.passengerDetails.firstName,
          lastName: safeInput.passengerDetails.lastName,
          passportNumber: safeInput.passengerDetails.passportNumber,
          flightIds: safeInput.flightIds,
        });
      } catch (error) {
        console.error("Error creating AFS booking:", error);
        return NextResponse.json(
          { message: "Failed to create booking with AFS. " + error },
          { status: 500 },
        );
      }
      if (!afsBooking) {
        return NextResponse.json(
          { error: "Failed to create booking with AFS" },
          { status: 500 },
        );
      }
      afsBookingReference = afsBooking.bookingReference;
    }

    // Handle Hotel Reservation

    if (safeInput.roomId) {
      if (!safeInput.checkInDate || !safeInput.checkOutDate) {
        return NextResponse.json(
          { error: "Check-in and check-out dates are required" },
          { status: 400 },
        );
      }

      try {
        const room = await db.roomType.findUnique({
          where: {
            roomId: safeInput.roomId,
          },
          include: {
            hotel: {
              select: {
                name: true,
                owner: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        if (!room) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 },
          );
        }

        // check availability
        const full = await db.availability.findFirst({
          where: {
            roomId: room.roomId,
            date: {
              gte: safeInput.checkInDate,
              lt: safeInput.checkOutDate,
            },
            availableRooms: 0,
          },
        });
        if (full) {
          return NextResponse.json(
            { error: "Room fully booked at " + full.date },
            { status: 400 },
          );
        }

        const differenceInTime =
          safeInput.checkOutDate.getTime() - safeInput.checkInDate.getTime();
        const numberOfDays = Math.ceil(
          differenceInTime / (1000 * 60 * 60 * 24),
        );
        totalHotelPrice = room.pricePerNight * numberOfDays;
        // create reservation
        const reservation = await db.reservation.create({
          data: {
            checkInDate: safeInput.checkInDate,
            checkOutDate: safeInput.checkOutDate,
            totalHotelPrice: totalHotelPrice,
            roomId: room.roomId,
            userId: session.user.id,
            status: "RESERVED",
          },
        });
            
        // Create notification for hotel owner
        await db.notification.create({
          data: {
            userId: room.hotel.owner.id,
            title: "New Reservation",
            message: `New reservation for ${room.name} room at ${room.hotel.name}. Check-in: ${safeInput.checkInDate.toLocaleDateString()}, Check-out: ${safeInput.checkOutDate.toLocaleDateString()}`,
          },
        });

        // modify availability
        const checkInDate = new Date(safeInput.checkInDate);
        const checkOutDate = new Date(safeInput.checkOutDate);
        let currentDate = new Date(checkInDate);
        // Loop through each date from checkInDate to checkOutDate
        while (currentDate < checkOutDate) {
          // Format the current date as YYYY-MM-DD to match the stored format
          const formattedDate = currentDate;

          // Check if availability exists for this room on the current date
          const availability = await db.availability.findFirst({
            where: {
              roomId: room.roomId,
              date: formattedDate,
            },
          });

          if (availability) {
            // If availability exists, increment availableRooms
            await db.availability.update({
              where: { availabilityId: availability.availabilityId },
              data: { availableRooms: availability.availableRooms - 1 },
            });
          } else {
            // If availability does not exist, create a new entry with availableRooms = totalRooms - 1
            await db.availability.create({
              data: {
                roomId: room.roomId,
                date: formattedDate,
                availableRooms: room.totalRooms - 1, // Subtract 1 room for this date
              },
            });
          }

          // Move to the next day
          currentDate.setDate(currentDate.getDate() + 1);
        }

        reservationId = reservation.reservationId;
      } catch (error) {
        if (error) {
          console.error("Error:", error);
        }
        return NextResponse.json(
          { error: "Failed to reserve" },
          { status: 500 },
        );
      }
    }
    try {
      // Create the local booking
      const localBooking = await db.booking.create({
        data: {
          userId,
          afsBookingReference: afsBookingReference || null,
          reservationId: reservationId || null,
          status: "BOOKED",
          lastName: safeInput.passengerDetails?.lastName || null,
        },
      });

      const notification = await db.notification.create({
        data: {
          userId: session.user.id,
          title: "New Booking",
          message: `New booking ${localBooking.bookingId} has been created. 
        ${safeInput.flightIds ? "Flight Booking Reference : " + localBooking.afsBookingReference + ". " : ""} 
        ${safeInput.roomId ? "Reservation id : " + localBooking.reservationId + ". " : ""}
        Thank you for booking with us.`,
        },
      });

      // Return the created booking
      return NextResponse.json(
        { message: "Booking Success", localBooking },
        { status: 201 },
      );
    } catch (error) {
      console.error("Error creating booking:", error);
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 },
      );
    }
  },
);
