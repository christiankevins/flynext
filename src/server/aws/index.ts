import { env } from "~/env";
import { JwtPayload } from "jsonwebtoken";
import {
  S3Client,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: "us-east-1",
  endpoint: env.NEXT_PUBLIC_MINIO_ENDPOINT,
  credentials: {
    accessKeyId: env.MINIO_USER,
    secretAccessKey: env.MINIO_PASSWORD,
  },
  forcePathStyle: true,
});

async function ensureBucket(bucketName: string) {
  try {
    await s3.send(
      new HeadBucketCommand({
        Bucket: bucketName,
      }),
    );
    console.log(`Bucket ${bucketName} already exists`);
  } catch (error) {
    await s3.send(
      new CreateBucketCommand({
        Bucket: bucketName,
      }),
    );
    console.log(`Created bucket: ${bucketName}`);
  }

  // Make bucket public readable
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicRead",
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      }),
    }),
  );
  console.log(`Made bucket ${bucketName} public readable`);
}

export async function ensureBuckets() {
  await Promise.allSettled([
    ensureBucket(env.NEXT_PUBLIC_MINIO_BUCKET_NAME_PROFILE_PICTURES),
    ensureBucket(env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES),
    ensureBucket(env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_IMAGES),
  ]).finally(() => {
    console.log("Done ensuring buckets exist");
  });
}

export async function sessionWithPresignedUrls(session: JwtPayload) {
  return {
    ...session,
    user: {
      ...session.user,
      profilePictureUrl: await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: env.NEXT_PUBLIC_MINIO_BUCKET_NAME_PROFILE_PICTURES,
          Key: `${session.user.id}.webp`,
        }),
      ),
    },
  };
}
