import { NextRequest, NextResponse } from "next/server";
import { AFSError, retrieveBooking } from "../../index";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lastName = searchParams.get("lastName");
  const bookingReference = searchParams.get("bookingReference");

  if (!lastName || !bookingReference) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  try {
    const booking = await retrieveBooking({
      lastName,
      bookingReference,
    });

    return NextResponse.json(booking);
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
