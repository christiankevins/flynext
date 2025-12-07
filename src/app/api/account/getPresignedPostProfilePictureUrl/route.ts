import { NextResponse } from "next/server";
import { ensureLoggedIn } from "../../middleware";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { env } from "~/env";
import { s3 } from "~/server/aws";

export const GET = ensureLoggedIn(async (req, res, session) => {
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: env.NEXT_PUBLIC_MINIO_BUCKET_NAME_PROFILE_PICTURES,
    Key: `${session.user.id}.webp`,
    Expires: 60 * 60,
    Conditions: [
      ["content-length-range", 0, 1024 * 1024],
      ["eq", "$Content-Type", "image/webp"],
    ],
  });

  return NextResponse.json({
    url,
    fields,
  });
});
