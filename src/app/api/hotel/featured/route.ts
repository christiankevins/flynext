import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET() {
  try {
    const hotels = await db.hotel.findMany({
      include: {
        roomTypes: {
          select: {
            pricePerNight: true,
          },
          orderBy: {
            pricePerNight: "asc",
          },
          take: 1,
        },
      },
    });

    const result = hotels.map((hotel) => ({
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
        hotel.roomTypes.length > 0 ? hotel.roomTypes[0].pricePerNight : null,
    }));

    return NextResponse.json({ hotels: result }, { status: 200 });
  } catch (error) {
    console.error("Error fetching featured hotels:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured hotels" },
      { status: 500 },
    );
  }
}
