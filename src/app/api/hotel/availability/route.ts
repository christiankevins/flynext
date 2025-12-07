import { NextResponse, NextRequest } from "next/server";
import { ensureLoggedIn } from "../../../api/middleware";
import { z } from "zod";
import { db } from "~/server/db";
import { JwtPayload } from "jsonwebtoken";

export const GET = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    const userInput = z.object({
      fromDate: z.date(),
      endDate: z.date(),
      roomId: z.string(),
    });

    let searchParams;
    try {
      // Parse and validate the incoming request body using hotelSchema
      searchParams = new URL(req.url).searchParams;
      console.log("seacrh", searchParams);
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Invalid Request parameters" },
        { status: 400 },
      );
    }
    let rawParams: {
      endDate?: Date;
      roomId?: string;
      fromDate?: Date;
    } = {
      roomId: searchParams.get("roomId") ?? undefined,
    };

    // Parse `fromDate` safely
    const fromDateString = searchParams.get("fromDate");
    if (fromDateString) {
      const parsedDate = new Date(new Date(fromDateString).getTime() + 24 * 60 * 60 * 1000);

      if (!isNaN(parsedDate.getTime())) {
        rawParams.fromDate = parsedDate;
      }
    }

    // Parse `endDate` safely
    const endDateString = searchParams.get("endDate");
    if (endDateString) {
      const parsedDate = new Date(new Date(endDateString).getTime() + 24 * 60 * 60 * 1000);
      if (!isNaN(parsedDate.getTime())) {
        rawParams.endDate = parsedDate;
      }
    }
    console.log(rawParams);
    let safeInput;
    try {
      safeInput = userInput.parse(rawParams);
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error }, { status: 400 });
    }
    try {
      const room = await db.roomType.findFirst({
        where: {
          roomId: safeInput.roomId,
        },
        select: {
          totalRooms: true,
          roomId: true,
          hotel: {
            select: {
              owner: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!room) {
        return NextResponse.json(
          { error: "Room does not exist" },
          { status: 404 },
        );
      }
      if (room.hotel.owner.id !== session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized to view availability of this room" },
          { status: 401 },
        );
      }

      let currentDate = new Date(safeInput.fromDate);
      const endDate = new Date(safeInput.endDate);

      // Loop through each date from checkInDate to checkOutDate
      const reservationCounts: { date: string; availableRooms: number }[] = [];
      while (currentDate <= endDate) {
        // Check if availability exists for this room on the current date
        const copyDate = new Date(currentDate);
        const availability = await db.availability.findFirst({
          where: {
            roomId: room.roomId,
            date: copyDate,
          },
        });

        if (availability) {
          // If availability exists, increment availableRooms
          reservationCounts.push({
            date: copyDate.toISOString().split("T")[0],
            availableRooms: availability.availableRooms,
          });
        } else {
          // If availability does not exist, create a new entry with availableRooms = totalRooms - 1
          reservationCounts.push({
            date: copyDate.toISOString().split("T")[0],
            availableRooms: room.totalRooms,
          });
        }
        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
        console.log(currentDate);
      }

      return NextResponse.json(reservationCounts, { status: 200 });
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to check availability" },
        { status: 500 },
      );
    }
  },
);

export const PUT = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    const userInput = z.object({
      roomId: z.string(),
      newTotalRooms: z.number().int().min(0),
    });

    try {
      // Parse and validate the incoming request body using hotelSchema
      const requestBody = await req.json();
      const safeInput = userInput.parse(requestBody);

      const room = await db.roomType.findFirst({
        where: {
          roomId: safeInput.roomId,
        },
        select: {
          name: true,
          totalRooms: true,
          roomId: true,
          hotel: {
            select: {
              name: true,
              owner: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });
      if (!room) {
        return NextResponse.json(
          { error: "Room does not exist" },
          { status: 404 },
        );
      }
      if (room.hotel.owner.id !== session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized to update availability of this room" },
          { status: 401 },
        );
      }

      const diff = safeInput.newTotalRooms - room.totalRooms;
      await db.roomType.update({
        // update totalRooms
        where: {
          roomId: room.roomId,
        },
        data: {
          totalRooms: safeInput.newTotalRooms,
        },
      });

      // Update availability entries for the room
      await db.availability.updateMany({
        where: {
          roomId: room.roomId,
        },
        data: {
          availableRooms: {
            increment: diff,
          },
        },
      });

      const cancelledReservations = [];
      while (true) {
        const availability = await db.availability.findFirst({
          where: {
            roomId: room.roomId,
            availableRooms: { lt: 0 },
          },
        });
        if (!availability) {
          break;
        }
        const cancellationNeeded = -availability.availableRooms;
        const reservationsToCancel = await db.reservation.findMany({
          where: {
            roomId: room.roomId,
            checkInDate: { lte: availability.date },
            checkOutDate: { gt: availability.date },
            status: { not: "CANCELLED" },
          },
          select: {
            reservationId: true,
            user: {
              select: {
                id: true,
              },
            },
            checkInDate: true,
            checkOutDate: true,
          },
          orderBy: {
            checkInDate: "desc", // Sort reservations by check-in date (latest first)
          },
          take: cancellationNeeded,
        });
        for (const reservation of reservationsToCancel) {
          await db.reservation.update({
            where: { reservationId: reservation.reservationId },
            data: {
              status: "CANCELLED",
            },
          });
          // TODO : notify user
          cancelledReservations.push(reservation);

          // Update availability that is affected by the  cancelled reservation
          await db.availability.updateMany({
            where: {
              roomId: room.roomId,
              date: {
                gte: reservation.checkInDate,
                lt: reservation.checkOutDate,
              },
            },
            data: {
              availableRooms: {
                increment: 1,
              },
            },
          });
        }
        await db.availability.update({
          where: { availabilityId: availability.availabilityId },
          data: {
            availableRooms: 0,
          },
        });
      }

      for (const reservation of cancelledReservations) {
        await db.notification.create({
          data: {
            userId: reservation.user.id,
            title: "Hotel Reservation Cancelled",
            message: `Your reservation for ${room.name} room at ${room.hotel.name} has been cancelled by the hotel. We're deeply sorry.`,
          },
        });
      }
      return NextResponse.json(
        {
          message:
            "Number of rooms updated and availability adjusted successfully",
          cancelledReservations: cancelledReservations,
        },
        { status: 200 },
      );
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to update number of rooms" },
        { status: 500 },
      );
    }
  },
);
