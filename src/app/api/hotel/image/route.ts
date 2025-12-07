import { NextRequest, NextResponse } from "next/server";
import { ensureLoggedIn } from "../../../middleware";
import { db } from "~/server/db";
import { JwtPayload } from "jsonwebtoken";

export const DELETE = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    try {
      // Get imageId from the URL
      const url = new URL(req.url);
      const segments = url.pathname.split("/");
      const imageId = segments[segments.length - 1];

      if (!imageId) {
        return NextResponse.json(
          { error: "Image ID is required" },
          { status: 400 },
        );
      }

      // First check if the image exists and belongs to user's hotel
      const image = await db.hotelImage.findUnique({
        where: {
          id: imageId,
        },
        include: {
          hotel: {
            select: {
              ownerId: true,
            },
          },
        },
      });

      if (!image) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }

      if (image.hotel?.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized to delete this image" },
          { status: 401 },
        );
      }

      // Extract the filename from the URL
      // const urlParts = image.url.split('/');
      // const filename = urlParts[urlParts.length - 1];

      // TODO: Fix MinIO deletion
      // Delete from MinIO bucket
      // await s3.removeObject(env.MINIO_BUCKET_HOTEL_IMAGES, filename);
      // console.log('Deleted image from MinIO:', filename);

      // Delete from database
      await db.hotelImage.delete({
        where: {
          id: imageId,
        },
      });

      return NextResponse.json(
        { message: "Image deleted successfully" },
        { status: 200 },
      );
    } catch (error) {
      console.error("Error deleting image:", error);
      return NextResponse.json(
        { error: "Failed to delete image" },
        { status: 500 },
      );
    }
  },
);
