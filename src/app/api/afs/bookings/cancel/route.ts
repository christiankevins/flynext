import { NextRequest, NextResponse } from "next/server";
import { AFSError, cancelBooking } from "../../index";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 }
    );
  }

  try {
    const booking = await cancelBooking(body);
    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof AFSError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
