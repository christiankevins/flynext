import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";

const searchSchema = z.object({
  checkInDate: z.string(),
  checkOutDate: z.string(),
  city: z.string(),
  name: z.string().optional(),
  starRating: z.number().int().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
});

export async function GET(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;

  try {
    // Parse and validate input
    const rawInput = {
      checkInDate: searchParams.get("checkInDate"),
      checkOutDate: searchParams.get("checkOutDate"),
      city: searchParams.get("city"),
      name: searchParams.get("name") || undefined,
      starRating: searchParams.get("starRating")
        ? parseInt(searchParams.get("starRating")!)
        : undefined,
      priceMin: searchParams.get("priceMin")
        ? parseFloat(searchParams.get("priceMin")!)
        : undefined,
      priceMax: searchParams.get("priceMax")
        ? parseFloat(searchParams.get("priceMax")!)
        : undefined,
    };

    const input = searchSchema.parse(rawInput);

    // Validate dates
    const checkInDate = new Date(input.checkInDate);
    const checkOutDate = new Date(input.checkOutDate);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 },
      );
    }

    if (checkInDate >= checkOutDate) {
      return NextResponse.json(
        { error: "Check-out date must be after check-in date" },
        { status: 400 },
      );
    }

    // Fetch hotels with room types and their availabilities
    const hotels = await db.hotel.findMany({
      where: {
        city: input.city,
        ...(input.name && {
          name: { contains: input.name, mode: "insensitive" },
        }),
        ...(input.starRating && { starRating: input.starRating }),
      },
      include: {
        roomTypes: {
          include: {
            availabilities: {
              where: {
                date: {
                  gte: checkInDate,
                  lt: checkOutDate,
                },
              },
            },
          },
        },
      },
    });

    // Filter hotels based on room availability
    const availableHotels = hotels.filter((hotel) => {
      // A hotel is available if it has at least one room type that's available for the entire date range
      return hotel.roomTypes.some((roomType) => {
        // If no availability records exist for the date range, room is available
        if (roomType.availabilities.length === 0) {
          return true;
        }
        // Room is available if all dates in the range have availableRooms > 0
        return roomType.availabilities.every(
          (avail) => avail.availableRooms > 0,
        );
      });
    });

    // Format response
    const result = availableHotels.map((hotel) => ({
      hotelId: hotel.hotelId,
      name: hotel.name,
      country: hotel.country,
      province: hotel.province,
      city: hotel.city,
      streetAddress: hotel.streetAddress,
      postalCode: hotel.postalCode,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      starRating: hotel.starRating,
      startingPrice:
        hotel.roomTypes.length > 0
          ? Math.min(...hotel.roomTypes.map((room) => room.pricePerNight))
          : null,
    }));

    return NextResponse.json({ hotels: result }, { status: 200 });
  } catch (error) {
    console.error("Error searching hotels:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input parameters" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to search hotels" },
      { status: 500 },
    );
  }
}
