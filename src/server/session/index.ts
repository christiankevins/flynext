import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { env } from "~/env";
import { sessionWithPresignedUrls } from "~/server/aws";

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return null;
    }

    const payload = verify(accessToken, env.ACCESS_TOKEN_SECRET);
    if (typeof payload === "string") throw new Error("Invalid access token");

    return sessionWithPresignedUrls(payload);
  } catch (error) {
    console.error("Session error:", error);
    return null;
  }
}
