import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { hash } from "argon2";
import { type User } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { signJwtPayload } from "../login/route";
import { env } from "~/env";

export async function POST(req: NextRequest) {
  const schema = z.object({
    firstName: z
      .string()
      .min(1, "First name is required.")
      .max(1024, "First name must be no more than 1024 characters."),
    lastName: z
      .string()
      .min(1, "Last name is required.")
      .max(1024, "Last name must be no more than 1024 characters."),
    email: z
      .string()
      .min(1, "Email is required.")
      .max(1024, "Email must be no more than 1024 characters.")
      .email("Invalid email address."),
    phoneNumber: z
      .string()
      .min(1, "Phone number is required.")
      .regex(/^\+?[0-9]{10,15}$/, "Phone number is invalid."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .max(1024, "Password must be no more than 1024 characters."),
  });
  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
  const { success, data: input, error } = schema.safeParse(body);
  if (!success) {
    console.error(error);
    return NextResponse.json(
      { message: "Invalid input", error },
      { status: 400 },
    );
  }
  let user: Pick<
    User,
    "id" | "email" | "firstName" | "lastName" | "phoneNumber"
  >;
  try {
    user = await db.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        passwordHash: await hash(input.password),
        emailVerified: true,
        phoneNumberVerified: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Email is already in use" },
        { status: 400 },
      );
    }
    throw error;
  }

  const { accessToken, refreshToken } = signJwtPayload(user);

  const response = NextResponse.json(
    { message: "Account created successfully" },
    { status: 201 },
  );

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
