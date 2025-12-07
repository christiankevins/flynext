import { JwtPayload } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "~/server/session/index";

export const ensureLoggedIn = (
  next: (
    req: NextRequest,
    res: NextResponse,
    session: JwtPayload,
  ) => Promise<NextResponse>,
) => {
  return async (req: NextRequest, res: NextResponse) => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return next(req, res, session);
  };
};
