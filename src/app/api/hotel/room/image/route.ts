import { NextRequest, NextResponse } from "next/server";
import { ensureLoggedIn } from "../../../../middleware";
import { db } from "~/server/db";
import { JwtPayload } from "jsonwebtoken";
import { s3 } from "~/server/aws";
import { env } from "~/env";

const handler = async (
  req: NextRequest,
  res: NextResponse,
  session: JwtPayload,
) => {
  try {
    // Get imageId from the URL
    const url = new URL(req.url);
    const segments = url.pathname.split("/");
    const imageId = segments[segments.length - 1];

    const body = await req.json();
    const { url: imageUrl } = body;

    console.log("Updating image URL:", { imageId, url: imageUrl });

    if (!imageId || !imageUrl) {
      console.log("Missing required fields:", { imageId, url: imageUrl });
      return NextResponse.json(
        { error: "Image ID and URL are required" },
        { status: 400 },
      );
    }

    // First check if the image exists
    const existingImage = await db.roomTypeImage.findUnique({
      where: {
        id: imageId,
      },
    });

    if (!existingImage) {
      console.log("Image not found:", imageId);
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const updatedImage = await db.roomTypeImage.update({
      where: {
        id: imageId,
      },
      data: {
        url: imageUrl,
      },
    });

    console.log("Successfully updated image:", updatedImage);
    return NextResponse.json({ image: updatedImage });
  } catch (error: any) {
    console.error("Error updating image URL:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      url: req.url,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update image URL",
      },
      { status: 500 },
    );
  }
};

export const PATCH = ensureLoggedIn(handler);

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
      const image = await db.roomTypeImage.findUnique({
        where: {
          id: imageId,
        },
        include: {
          roomType: {
            include: {
              hotel: {
                select: {
                  ownerId: true,
                },
              },
            },
          },
        },
      });

      if (!image) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }

      if (image.roomType?.hotel.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized to delete this image" },
          { status: 401 },
        );
      }

      // Extract the filename from the URL
      const urlParts = image.url.split("/");
      const filename = urlParts[urlParts.length - 1];

      // TODO: Fix MinIO deletion
      // Delete from MinIO bucket
      // await s3.removeObject(env.MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES, filename);
      // console.log('Deleted image from MinIO:', filename);

      // Delete from database
      await db.roomTypeImage.delete({
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
