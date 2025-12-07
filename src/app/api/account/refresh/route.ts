import { NextRequest, NextResponse } from "next/server";
import { sign, JwtPayload, verify } from "jsonwebtoken";
import { env } from "~/env";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { message: "No refresh token provided" },
      { status: 400 },
    );
  }

  let payload: JwtPayload | string;
  try {
    payload = verify(refreshToken, env.REFRESH_TOKEN_SECRET);
    if (typeof payload === "string") {
      return NextResponse.json(
        { message: "Invalid token format" },
        { status: 401 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid or expired token" },
      { status: 401 },
    );
  }

  const { exp, ...payloadWithoutExp } = payload;
  const accessToken = sign(payloadWithoutExp, env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  const response = NextResponse.json({ message: "Success" }, { status: 200 });

  response.cookies.set({
    name: "accessToken",
    value: accessToken,
    httpOnly: true,
    secure: env.BASE_URL.startsWith("https"),
    sameSite: "strict",
    maxAge: 60 * 60,
    path: "/",
  });

  return response;
}
