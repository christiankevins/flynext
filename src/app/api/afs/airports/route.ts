import { NextResponse } from "next/server";
import { AFSError, listAirports } from "../index";

export async function GET() {
  try {
    const airports = await listAirports();
    return NextResponse.json(airports);
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
