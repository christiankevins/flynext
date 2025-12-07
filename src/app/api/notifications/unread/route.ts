import { NextResponse, NextRequest } from "next/server";
import { ensureLoggedIn } from "../../middleware";
import { db } from "~/server/db";
import { JwtPayload } from "jsonwebtoken";

export const GET = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    try {
      const count = await db.notification.count({
        where: {
          userId: session.user.id,
          read: false,
        },
      });

      return NextResponse.json({ count });
    } catch (error) {
      console.error("Error fetching unread notifications count:", error);
      return NextResponse.json(
        { error: "Failed to fetch unread notifications count" },
        { status: 500 },
      );
    }
  },
);
