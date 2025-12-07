import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { ensureLoggedIn } from "../../../middleware";
import { JwtPayload } from "jsonwebtoken";

export const POST = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    try {
      // Extract hotelId from the URL
      const url = new URL(req.url);
      const hotelId = url.pathname.split("/").slice(-2)[0];

      // Verify hotel ownership
      const hotel = await db.hotel.findUnique({
        where: { hotelId },
        select: { ownerId: true },
      });

      if (!hotel) {
        return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
      }

      if (hotel.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const body = await req.json();
      const { name, amenities, pricePerNight, totalRooms, beds } = body;

      // Parse numeric values
      const parsedPricePerNight = parseFloat(pricePerNight);
      const parsedTotalRooms = parseInt(totalRooms);
      const parsedBeds = parseInt(beds);

      // Validate numeric values
      if (isNaN(parsedPricePerNight) || parsedPricePerNight < 0) {
        return NextResponse.json(
          { error: "Invalid price per night" },
          { status: 400 },
        );
      }

      if (isNaN(parsedTotalRooms) || parsedTotalRooms < 0) {
        return NextResponse.json(
          { error: "Invalid total rooms" },
          { status: 400 },
        );
      }

      if (isNaN(parsedBeds) || parsedBeds < 1) {
        return NextResponse.json(
          { error: "Invalid number of beds" },
          { status: 400 },
        );
      }

      const roomType = await db.roomType.create({
        data: {
          name,
          amenities,
          pricePerNight: parsedPricePerNight,
          totalRooms: parsedTotalRooms,
          beds: parsedBeds,
          hotelId,
        },
      });

      return NextResponse.json({ roomType });
    } catch (error) {
      console.error("Error creating room type:", error);
      return NextResponse.json(
        { error: "Failed to create room type" },
        { status: 500 },
      );
    }
  },
);
