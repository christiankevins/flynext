import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const portSchema = z
  .string()
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val) && val >= 1 && val <= 65535);

// Try to create the validated env. If validation fails (for example during a
// CI/build where the full backend secrets aren't available), fall back to a
// permissive object built from `process.env` so the frontend can still build.
let env;
try {
  env = createEnv({
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
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn(
    "Environment validation failed during createEnv — using process.env fallbacks.\n",
    err && err.errors ? err.errors : err
  );

  const toNumber = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  };

  env = {
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET ?? "",
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ?? "",
    BASE_URL: process.env.BASE_URL ?? "",
    POSTGRES_URL: process.env.POSTGRES_URL ?? "",
    POSTGRES_USER: process.env.POSTGRES_USER ?? "",
    POSTGRES_PORT: toNumber(process.env.POSTGRES_PORT),
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "",
    MINIO_USER: process.env.MINIO_USER ?? "",
    MINIO_PORT: toNumber(process.env.MINIO_PORT),
    MINIO_CONSOLE_PORT: toNumber(process.env.MINIO_CONSOLE_PORT),
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT ?? "",
    MINIO_PASSWORD: process.env.MINIO_PASSWORD ?? "",
    AFS_BASE_URL: process.env.AFS_BASE_URL ?? "",
    AFS_POSTGRES_URL: process.env.AFS_POSTGRES_URL ?? "",
    AFS_PASSWORD: process.env.AFS_PASSWORD ?? "",
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? "",
    NEXT_PUBLIC_MINIO_ENDPOINT: process.env.NEXT_PUBLIC_MINIO_ENDPOINT ?? "",
    NEXT_PUBLIC_MINIO_BUCKET_NAME_PROFILE_PICTURES:
      process.env.NEXT_PUBLIC_MINIO_BUCKET_NAME_PROFILE_PICTURES ?? "",
    NEXT_PUBLIC_MINIO_BUCKET_HOTEL_IMAGES:
      process.env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_IMAGES ?? "",
    NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES:
      process.env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES ?? "",
  };
}

export { env };
