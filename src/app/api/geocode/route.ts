import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "~/env";

const geocodeRequestSchema = z.object({
  address: z.string().min(1, "Address is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = geocodeRequestSchema.parse(body);

    const encodedAddress = encodeURIComponent(validatedData.address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${env.GOOGLE_MAPS_API_KEY}`;
    console.log("Sending request to Google Maps API:", url);

    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch coordinates" },
        { status: 500 },
      );
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results[0]) {
      return NextResponse.json(
        { error: "No results found for the address" },
        { status: 404 },
      );
    }

    const location = data.results[0].geometry.location;
    return NextResponse.json({
      lat: location.lat,
      lng: location.lng,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Geocoding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
