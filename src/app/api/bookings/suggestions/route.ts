import { NextRequest, NextResponse } from "next/server";
import { listFlights, retrieveBooking } from "../../afs/index";
import { ensureLoggedIn } from "../../middleware";
import { JwtPayload } from "jsonwebtoken";
import { db } from "~/server/db";

export const GET = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    const { searchParams } = new URL(req.url);

    // Parse request parameters for in-progress booking
    const roomId = searchParams.get("roomId");
    const origin = searchParams.get("origin");
    const checkInDate = searchParams.get("checkInDate");
    const afsBookingReference = searchParams.get("afsBookingReference");

    if (roomId && afsBookingReference) {
      return NextResponse.json(
        { error: "Cannot supply both flights and hotels" },
        { status: 400 },
      );
    }
    if (!roomId && !afsBookingReference) {
      return NextResponse.json(
        { error: "Must supply either flights or hotels" },
        { status: 400 },
      );
    }

    if (afsBookingReference) {
      try {
        let destinationCity = null;
        // If we have an AFS booking reference, retrieve flight details from AFS API
        // Get user details to retrieve the booking
        const bookingDetails = await retrieveBooking({
          lastName: session.user.lastName,
          bookingReference: afsBookingReference,
        });
        // Get the destination city from the last flight in the booking
        if (bookingDetails.flights && bookingDetails.flights.length > 0) {
          const lastFlight =
            bookingDetails.flights[bookingDetails.flights.length - 1];
          destinationCity = lastFlight.destination.city;
        } else {
          return NextResponse.json(
            { error: "No flights found in booking" },
            { status: 404 },
          );
        }
        const hotels = await db.hotel.findMany({
          where: {
            city: destinationCity,
          },
          take: 5,
          include: {
            roomTypes: {
              take: 1, // Include at least one room type for pricing info
            },
          },
        });
        const result = hotels.map((hotel) => ({
          id: hotel.hotelId,
          name: hotel.name,
          address: `${hotel.streetAddress}, ${hotel.city}, ${hotel.province}, ${hotel.country}`,
          starRating: hotel.starRating,
          searchLink: `/api/hotel${hotel.hotelId}`,
        }));
        return NextResponse.json({ result }, { status: 200 });
      } catch (error) {
        console.error("Error retrieving AFS booking:", error);
        return NextResponse.json(
          { error: "Error retrieving booking details" },
          { status: 500 },
        );
      }
    }

    // If room ID is provided, suggest flights to that hotel's city
    try {
      if (!origin) {
        return NextResponse.json(
          { error: "Origin city is required" },
          { status: 400 },
        );
      }
      // Find the room and its associated hotel
      const room = await db.roomType.findUnique({
        where: { roomId: roomId! },
        select: {
          hotel: {
            select: {
              city: true,
            },
          },
        },
      });

      if (room) {
        // Get the hotel's city for flight suggestions
        const destinationCity = room.hotel.city;

        // Use AFS API to get flights to this city
        const today = new Date();
        // If check-in date is provided, use it as departure date, otherwise use a date 30 days from now
        let departureDate = checkInDate
          ? new Date(checkInDate)
          : new Date(today.setDate(today.getDate() + 30));

        departureDate = new Date(
          departureDate.setDate(departureDate.getDate() - 1),
        );
        const date = departureDate.toISOString().split("T")[0];
        try {
          // Use a default origin if needed
          const origin = searchParams.get("origin") || "NYC"; // Default origin as fallback

          console.log(origin, destinationCity, date);
          // Call listFlights with the correct parameters
          const flightResults = await listFlights({
            origin: origin,
            destination: destinationCity,
            date: date,
          });

          return NextResponse.json(
            {
              suggestions: flightResults.results,
              suggestionLink: `/search/flights?origin=${encodeURIComponent(
                origin,
              )}&destination=${encodeURIComponent(
                destinationCity,
              )}&date=${date}`,
            },
            { status: 200 },
          );
        } catch (error) {
          console.error("Error calling AFS flights API:", error);
          return NextResponse.json(
            { error: "Failed to get flight suggestions" },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
    } catch (error) {
      console.error("Error fetching flight suggestions:", error);
      return NextResponse.json(
        { error: "Failed to get flight suggestions" },
        { status: 500 },
      );
    }
  },
);
