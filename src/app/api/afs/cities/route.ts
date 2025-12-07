import { NextResponse, NextRequest } from "next/server";
import { AFSError, listCities } from "../index";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let city = searchParams.get("city");
  if (!city) {
    city = "";
  }

  try {
    const cities = await listCities();
    return NextResponse.json(cities);
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
