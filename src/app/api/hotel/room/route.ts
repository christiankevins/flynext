import { NextResponse, NextRequest } from "next/server";
import { ensureLoggedIn } from "../../../../api/middleware";
import { db } from "~/server/db";
import { JwtPayload } from "jsonwebtoken";
import { s3 } from "~/server/aws";
import { env } from "~/env";
import { z } from "zod";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const roomUpdateSchema = z.object({
  name: z.string(),
  amenities: z.string(),
  pricePerNight: z.number().min(0, "Price must be positive"),
  totalRooms: z.number(),
  beds: z.number().int().min(1, "Room must have at least 1 bed"),
});

export const DELETE = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    try {
      // Get roomId from the URL
      const roomId = req.url.split("/").pop();

      if (!roomId) {
        return NextResponse.json(
          { error: "Room ID is required" },
          { status: 400 },
        );
      }

      // Check if room exists and belongs to user's hotel
      const room = await db.roomType.findUnique({
        where: {
          roomId: roomId,
        },
        include: {
          hotel: {
            select: {
              ownerId: true,
            },
          },
          reservations: true,
          images: true,
          availabilities: true,
        },
      });

      if (!room) {
        return NextResponse.json(
          { error: "Room type not found" },
          { status: 404 },
        );
      }

      if (room.hotel.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized to delete this room type" },
          { status: 401 },
        );
      }

      // Cancel all reservations for this room type
      if (room.reservations && room.reservations.length > 0) {
        for (const reservation of room.reservations) {
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

      // Delete all availability records
      if (room.availabilities && room.availabilities.length > 0) {
        await db.availability.deleteMany({
          where: {
            roomId: roomId,
          },
        });
      }

      // Delete all images from MinIO bucket
      if (room.images && room.images.length > 0) {
        for (const image of room.images) {
          try {
            const urlParts = image.url.split("/");
            const filename = urlParts[urlParts.length - 1];

            await s3.send(
              new DeleteObjectCommand({
                Bucket: env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES,
                Key: filename,
              }),
            );
            console.log("Deleted image from MinIO:", filename);
          } catch (error) {
            console.error("Error deleting image from MinIO:", error);
          }
        }
      }

      // Delete all images from database
      if (room.images && room.images.length > 0) {
        await db.roomTypeImage.deleteMany({
          where: {
            roomId: roomId,
          },
        });
      }

      // Finally delete the room type
      await db.roomType.delete({
        where: {
          roomId: roomId,
        },
      });

      return NextResponse.json(
        { message: "Room type deleted successfully" },
        { status: 200 },
      );
    } catch (error) {
      console.error("Error deleting room type:", error);
      return NextResponse.json(
        { error: "Failed to delete room type" },
        { status: 500 },
      );
    }
  },
);

export const PUT = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    try {
      // Get roomId from the URL
      const roomId = req.url.split("/").pop();

      if (!roomId) {
        return NextResponse.json(
          { error: "Room ID is required" },
          { status: 400 },
        );
      }

      // Parse and validate the request body
      const requestBody = await req.json();
      const validateRoomData = roomUpdateSchema.parse(requestBody);

      // Check if room exists and belongs to user's hotel
      const room = await db.roomType.findUnique({
        where: {
          roomId: roomId,
        },
        include: {
          hotel: {
            select: {
              ownerId: true,
            },
          },
        },
      });

      if (!room) {
        return NextResponse.json(
          { error: "Room type not found" },
          { status: 404 },
        );
      }

      if (room.hotel.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized to update this room type" },
          { status: 401 },
        );
      }

      // Update the room type
      const updatedRoom = await db.roomType.update({
        where: {
          roomId: roomId,
        },
        data: {
          name: validateRoomData.name,
          amenities: validateRoomData.amenities,
          pricePerNight: validateRoomData.pricePerNight,
          totalRooms: validateRoomData.totalRooms,
          beds: validateRoomData.beds,
        },
      });

      return NextResponse.json(
        { message: "Room type updated successfully", room: updatedRoom },
        { status: 200 },
      );
    } catch (error) {
      console.error("Error updating room type:", error);
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors }, { status: 400 });
      }
      return NextResponse.json(
        { error: "Failed to update room type" },
        { status: 500 },
      );
    }
  },
);
