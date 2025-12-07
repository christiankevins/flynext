import { db } from "~/server/db";
import { ensureLoggedIn } from "../middleware";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = ensureLoggedIn(async (req, res, session) => {
  const schema = z.object({
    code: z.string().length(6, "Verification code must be 6 digits"),
    type: z.enum(["EMAIL", "PHONE_NUMBER"], {
      errorMap: () => ({ message: "Type must be EMAIL or PHONE_NUMBER" }),
    }),
  });

  let body;

  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      {
        message: "Invalid request body",
        error,
      },
      { status: 400 },
    );
  }

  const { success, data: input, error } = schema.safeParse(body);

  if (!success) {
    return NextResponse.json(
      {
        message: "Invalid input",
        error,
      },
      { status: 400 },
    );
  }
  const verificationCode = await db.verificationCode.findUnique({
    where: {
      code_type_userId: {
        code: input.code,
        type: input.type,
        userId: session.user.id,
      },
    },
  });

  if (!verificationCode) {
    return NextResponse.json(
      {
        message: "Invalid verification code",
      },
      { status: 400 },
    );
  }

  if (verificationCode.expires < new Date()) {
    return NextResponse.json(
      {
        message: "Verification code expired",
      },
      { status: 400 },
    );
  }

  if (verificationCode.type === "EMAIL") {
    await db.user.update({
      where: { id: session.user.id },
      data: { emailVerified: true },
    });
  } else if (verificationCode.type === "PHONE_NUMBER") {
    await db.user.update({
      where: { id: session.user.id },
      data: { phoneNumberVerified: true },
    });
  } else {
    throw new Error("Invalid verification code type");
  }

  return NextResponse.json({
    message: `${input.type} verified`,
  });
});
