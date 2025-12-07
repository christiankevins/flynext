import { NextResponse } from "next/server";
import { AFSError, listAirlines } from "../index";

export async function GET() {
  try {
    const airlines = await listAirlines();
    return NextResponse.json(airlines);
  } catch (error) {
    if (error instanceof AFSError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
