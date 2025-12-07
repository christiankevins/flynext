import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { hotelId: string } },
) {
  const { hotelId } = params;
  const searchParams = new URL(req.url).searchParams;

  // Get and validate check-in and check-out dates
  const checkInDate = searchParams.get("checkIn");
  const checkOutDate = searchParams.get("checkOut");

  if (!checkInDate || !checkOutDate) {
    return NextResponse.json(
      { error: "Check-in and check-out dates are required" },
      { status: 400 },
    );
  }

  try {
    // Parse dates
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 },
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Check-out date must be after check-in date" },
        { status: 400 },
      );
    }

    // Fetch all room types for the hotel
    const roomTypes = await db.roomType.findMany({
      where: {
        hotelId: hotelId,
      },
      include: {
        availabilities: {
          where: {
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },
    });

    if (!roomTypes || roomTypes.length === 0) {
      return NextResponse.json(
        { error: "No room types found for this hotel" },
        { status: 404 },
      );
    }

    // Check availability for each room type
    const availabilityResults = roomTypes.map((roomType) => {
      // If there are no availability records for the date range, room is available
      if (roomType.availabilities.length === 0) {
        return {
          roomId: roomType.roomId,
          name: roomType.name,
          isAvailable: true,
          reason: "No availability records found for the date range",
        };
      }

      // Check if any date in the range has no available rooms
      const hasUnavailableDate = roomType.availabilities.some(
        (avail) => avail.availableRooms <= 0,
      );

      return {
        roomId: roomType.roomId,
        name: roomType.name,
        isAvailable: !hasUnavailableDate,
        reason: hasUnavailableDate
          ? "Room is sold out for some dates in the range"
          : "Room is available for all dates",
      };
    });

    return NextResponse.json(
      { availability: availabilityResults },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error checking availability:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 },
    );
  }
}
