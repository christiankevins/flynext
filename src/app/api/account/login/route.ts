import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { verify } from "argon2";
import { JwtPayload, sign } from "jsonwebtoken";
import { env } from "~/env";
import { User } from "@prisma/client";

declare module "jsonwebtoken" {
  export interface JwtPayload {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
    };
  }
}

export function signJwtPayload({
  id,
  firstName,
  lastName,
  email,
  phoneNumber,
}: Pick<User, "id" | "firstName" | "lastName" | "email" | "phoneNumber">): {
  accessToken: string;
  refreshToken: string;
} {
  const payload = {
    user: {
      id,
      firstName,
      lastName,
      email,
      phoneNumber,
    },
  } satisfies JwtPayload;

  return {
    accessToken: sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" }),
    refreshToken: sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" }),
  };
}

export async function POST(req: Request) {
  const schema = z.object({
    email: z.string().min(1, "Email is required."),
    password: z
      .string()
      .min(1, "Password is required.")
      .max(1024, "Password must be no more than 1024 characters."),
  });

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }

  const { success, data: input, error } = schema.safeParse(body);

  if (!success)
    return NextResponse.json(
      { message: "Invalid input", error },
      { status: 400 },
    );

  const user = await db.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "Invalid credentials." },
      { status: 401 },
    );
  }

  const match = await verify(user.passwordHash, input.password);
  if (!match) {
    return NextResponse.json(
      { message: "Invalid credentials." },
      { status: 401 },
    );
  }

  const { accessToken, refreshToken } = signJwtPayload(user);

  const response = NextResponse.json({ message: "Logged in" }, { status: 200 });

  response.cookies.set({
    name: "accessToken",
    value: accessToken,
    httpOnly: true,
    secure: env.BASE_URL.startsWith("https"),
    sameSite: "strict",
    maxAge: 60 * 60,
    path: "/",
  });

  response.cookies.set({
    name: "refreshToken",
    value: refreshToken,
    httpOnly: true,
    secure: env.BASE_URL.startsWith("https"),
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60,
    path: "/api/account/refresh",
  });

  return response;
}
