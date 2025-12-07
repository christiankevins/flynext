import { NextRequest, NextResponse } from "next/server";
import { ensureLoggedIn } from "../../../middleware";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { env } from "~/env";
import { s3 } from "~/server/aws";
import { db } from "~/server/db";

export const GET = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: any) => {
    const url = new URL(req.url);
    console.log("Full request URL:", req.url);
    console.log(
      "URL search params:",
      Object.fromEntries(url.searchParams.entries()),
    );
    const hotelId = url.searchParams.get("hotelId");
    console.log("Extracted hotelId:", hotelId);

    if (!hotelId) {
      console.log("No hotelId found in request");
      return NextResponse.json(
        { error: "Hotel ID is required" },
        { status: 400 },
      );
    }

    const hotel = await db.hotel.findUnique({
      where: {
        hotelId: hotelId,
      },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    // Generate a unique ID for the image
    const imageId = crypto.randomUUID();

    try {
      // Log S3 client configuration
      console.log("S3 client config:", {
        endpoint: env.NEXT_PUBLIC_MINIO_ENDPOINT,
        bucket: env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES,
        hasCredentials: !!env.MINIO_USER && !!env.MINIO_PASSWORD,
      });

      const { url: presignedUrl, fields } = await createPresignedPost(s3, {
        Bucket: env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES,
        Key: `${imageId}.webp`,
        Expires: 60 * 60,
        Conditions: [
          ["content-length-range", 0, 1024 * 1024],
          ["eq", "$Content-Type", "image/webp"],
        ],
      });

      // Log the generated URL and fields for debugging
      console.log("Generated presigned URL:", presignedUrl);
      console.log("Generated fields:", JSON.stringify(fields, null, 2));
      console.log("Expected key pattern:", `${imageId}.webp`);

      // Ensure the URL uses the public endpoint
      const finalImageUrl = `${env.NEXT_PUBLIC_MINIO_ENDPOINT}/${env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES}/${imageId}.webp`;
      console.log("Final image URL:", finalImageUrl);

      return NextResponse.json({
        url: presignedUrl,
        fields,
        imageId,
        finalImageUrl,
        hotelId,
      });
    } catch (error: any) {
      console.error("Error generating presigned URL:", error);
      console.error("Error details:", {
        bucket: env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES,
        key: `${imageId}.webp`,
        hotelId,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      return NextResponse.json(
        { error: "Failed to generate upload URL" },
        { status: 500 },
      );
    }
  },
);
