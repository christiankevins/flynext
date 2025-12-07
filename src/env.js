import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const portSchema = z
  .string()
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val) && val >= 1 && val <= 65535);

export const env = createEnv({
  server: {
    ACCESS_TOKEN_SECRET: z.string().min(1),
    REFRESH_TOKEN_SECRET: z.string().min(1),
    BASE_URL: z.string().min(1).url(),
    POSTGRES_URL: z.string().min(1).url(),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PORT: portSchema,
    POSTGRES_PASSWORD: z.string().min(1),
    MINIO_USER: z.string().min(1),
    MINIO_PORT: portSchema,
    MINIO_CONSOLE_PORT: portSchema,
    MINIO_ENDPOINT: z.string().min(1).url(),
    MINIO_PASSWORD: z.string().min(1),
    AFS_BASE_URL: z.string().min(1).url(),
    AFS_POSTGRES_URL: z.string().min(1).url(),
    AFS_PASSWORD: z.string().min(1),
    GOOGLE_MAPS_API_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_MINIO_ENDPOINT: z.string().min(1).url(),
    NEXT_PUBLIC_MINIO_BUCKET_NAME_PROFILE_PICTURES: z.string().min(1),
    NEXT_PUBLIC_MINIO_BUCKET_HOTEL_IMAGES: z.string().min(1),
    NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_MINIO_ENDPOINT: process.env.NEXT_PUBLIC_MINIO_ENDPOINT,
    NEXT_PUBLIC_MINIO_BUCKET_NAME_PROFILE_PICTURES:
      process.env.NEXT_PUBLIC_MINIO_BUCKET_NAME_PROFILE_PICTURES,
    NEXT_PUBLIC_MINIO_BUCKET_HOTEL_IMAGES:
      process.env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_IMAGES,
    NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES:
      process.env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES,
  },
});
