import { NextResponse } from "next/server";
import { ensureLoggedIn } from "../../../api/middleware";
import { db } from "~/server/db";
import { JwtPayload } from "jsonwebtoken";

export const GET = ensureLoggedIn(
  async (req: Request, res: NextResponse, session: JwtPayload) => {
    try {
      const hotels = await db.hotel.findMany({
        where: {
          ownerId: session.user.id,
        },
        include: {
          roomTypes: {
            include: {
              images: true,
            },
          },
          images: true,
        },
      });

      return NextResponse.json({ hotels }, { status: 200 });
    } catch (error) {
      console.error("Error fetching owned hotels:", error);
      return NextResponse.json(
        { error: "Failed to fetch hotels" },
        { status: 500 },
      );
    }
  },
);
