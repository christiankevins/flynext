import { ensureLoggedIn } from "../../middleware";
import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { User } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { env } from "~/env";
import { hash, verify } from "argon2";
import { signJwtPayload } from "../login/route";

export const PUT = ensureLoggedIn(async (req, res, session) => {
  const schema = z.object({
    password: z
      .string()
      .min(1, "Password is required.")
      .max(1024, "Password must be no more than 1024 characters."),
    new: z
      .object({
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
      })
      .partial(),
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

  const oldUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      passwordHash: true,
      emailVerified: true,
      phoneNumberVerified: true,
    },
  });

  if (!oldUser) {
    return NextResponse.json(
      { message: "Invalid credentials." },
      { status: 401 },
    );
  }

  const match = await verify(oldUser.passwordHash, input.password);
  if (!match) {
    return NextResponse.json(
      { message: "Invalid credentials." },
      { status: 401 },
    );
  }

  let newUser: Pick<
    User,
    "id" | "firstName" | "lastName" | "email" | "phoneNumber"
  >;
  try {
    newUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        firstName: input.new?.firstName,
        lastName: input.new?.lastName,
        email: input.new?.email,
        passwordHash: input.new?.password
          ? await hash(input.new.password)
          : undefined,
        emailVerified:
          input.new?.email !== oldUser.email ? false : oldUser.emailVerified,
        phoneNumberVerified:
          input.new?.phoneNumber !== oldUser.phoneNumber
            ? false
            : oldUser.phoneNumberVerified,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
      },
    });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    throw error;
  }

  const { accessToken, refreshToken } = signJwtPayload(newUser);

  const response = NextResponse.json({
    message: "Profile updated",
  });

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
});
