import { NextRequest, NextResponse } from "next/server";
import { ensureLoggedIn } from "../../../../api/middleware";
import { db } from "~/server/db";
import { JwtPayload } from "jsonwebtoken";

export const GET = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    const hotelId = req.url.split("/").slice(-2)[0]; // Get hotelId from the URL
    if (!hotelId) {
      return NextResponse.json(
        { message: "Hotel ID is required" },
        { status: 400 },
      );
    }

    try {
      // Check if the user owns the hotel
      const hotel = await db.hotel.findUnique({
        where: { hotelId },
        select: { ownerId: true },
      });

      if (!hotel) {
        return NextResponse.json(
          { message: "Hotel not found" },
          { status: 404 },
        );
      }

      if (hotel.ownerId !== session.user.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
      }

      // Fetch hotel details along with related room types and reservations
      const hotelDetails = await db.hotel.findUnique({
        where: { hotelId },
        include: {
          images: {
            select: {
              id: true,
              url: true,
            },
          },
          roomTypes: {
            include: {
              images: {
                select: {
                  id: true,
                  url: true,
                },
              },
              availabilities: {
                where: {
                  date: {
                    gte: new Date(),
                  },
                },
              },
            },
          },
        },
      });

      // Return the hotel details as the response
      return NextResponse.json({ hotel: hotelDetails }, { status: 200 });
    } catch (error) {
      console.error("Error fetching hotel details:", error);
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
);

const handler = async (
  req: NextRequest,
  res: NextResponse,
  session: JwtPayload,
) => {
  try {
    // Get hotelId from the URL
    const hotelId = req.url.split("/").slice(-2)[0];
    if (!hotelId) {
      return NextResponse.json(
        { message: "Hotel ID is required" },
        { status: 400 },
      );
    }

    // Check if the user owns the hotel
    const hotel = await db.hotel.findUnique({
      where: { hotelId },
      select: { ownerId: true },
    });

    if (!hotel) {
      return NextResponse.json({ message: "Hotel not found" }, { status: 404 });
    }

    if (hotel.ownerId !== session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case "PUT":
        return handleUpdate(req, hotelId);
      case "DELETE":
        return handleDelete(hotelId);
      default:
        return NextResponse.json(
          { message: "Method not allowed" },
          { status: 405 },
        );
    }
  } catch (error) {
    console.error("Error in hotel handler:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
};

async function handleUpdate(req: NextRequest, hotelId: string) {
  try {
    const body = await req.json();
    const updatedHotel = await db.hotel.update({
      where: { hotelId },
      data: body,
    });
    return NextResponse.json(updatedHotel);
  } catch (error) {
    console.error("Error updating hotel:", error);
    return NextResponse.json(
      { message: "Failed to update hotel" },
      { status: 500 },
    );
  }
}

async function handleDelete(hotelId: string) {
  try {
    // First, get all room types for this hotel with their reservations
    const roomTypes = await db.roomType.findMany({
      where: {
        hotelId: hotelId,
      },
      include: {
        reservations: true,
      },
    });

    // Cancel all reservations for all room types
    for (const roomType of roomTypes) {
      for (const reservation of roomType.reservations) {
        if (reservation.status !== "CANCELLED") {
          await db.reservation.update({
            where: {
              reservationId: reservation.reservationId,
            },
            data: {
              status: "CANCELLED",
            },
          });
        }
      }
    }

    // Delete all room type images
    await db.roomTypeImage.deleteMany({
      where: {
        roomType: {
          hotelId: hotelId,
        },
      },
    });

    // Delete all hotel images
    await db.hotelImage.deleteMany({
      where: {
        hotelId: hotelId,
      },
    });

    // Delete all room types
    await db.roomType.deleteMany({
      where: {
        hotelId: hotelId,
      },
    });

    // Finally delete the hotel
    await db.hotel.delete({
      where: {
        hotelId: hotelId,
      },
    });

    return NextResponse.json(
      { message: "Hotel deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting hotel:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to delete hotel",
      },
      { status: 500 },
    );
  }
}

export const PUT = ensureLoggedIn(handler);
export const DELETE = ensureLoggedIn(handler);
