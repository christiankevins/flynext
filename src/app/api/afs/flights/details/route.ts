import { NextRequest, NextResponse } from "next/server";
import { AFSError, getFlight } from "../index";
import { z } from "zod";

const requestSchema = z.object({
  flightIds: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("body", body);
    const { flightIds } = requestSchema.parse(body);
    console.log("ids", flightIds);
    const flightDetails = await Promise.all(
      flightIds.map(async (id) => {
        try {
          return await getFlight({ id });
        } catch (error) {
          if (error instanceof AFSError) {
            return null;
          }
          throw error;
        }
      }),
    );

    const validFlights = flightDetails.filter(
      (flight): flight is NonNullable<typeof flight> => flight !== null,
    );

    return NextResponse.json({ flights: validFlights });
  } catch (error) {
    if (error instanceof AFSError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
