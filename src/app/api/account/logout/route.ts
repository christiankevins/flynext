import { NextResponse } from "next/server";
import { env } from "~/env";
import { ensureLoggedIn } from "../../middleware";

export const POST = ensureLoggedIn(async (req, res, session) => {
  const response = NextResponse.json(
    { message: "Logged out" },
    { status: 200 },
  );

  response.cookies.set({
    name: "accessToken",
    value: "",
    httpOnly: true,
    secure: env.BASE_URL.startsWith("https"),
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  response.cookies.set({
    name: "refreshToken",
    value: "",
    httpOnly: true,
    secure: env.BASE_URL.startsWith("https"),
    sameSite: "strict",
    maxAge: 0,
    path: "/api/account/refresh",
  });

  return response;
});
