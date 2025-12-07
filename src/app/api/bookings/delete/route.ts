import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { ensureLoggedIn } from "../../middleware";
import { JwtPayload } from "jsonwebtoken";
import { z } from "zod";

const deleteBookingSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
});

export const DELETE = ensureLoggedIn(
  async (
    req: NextRequest,
    res: NextResponse,
    session: JwtPayload,
  ): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");

    // Validate using Zod
    let safeInput;
    try {
      safeInput = deleteBookingSchema.parse({ bookingId });
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid booking ID" },
        { status: 400 },
      );
    }

    try {
      // Find the booking
      const booking = await db.booking.findUnique({
        where: { bookingId: safeInput.bookingId },
        include: {
          reservation: true,
        },
      });

      if (!booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 },
        );
      }

      // Check if user owns the booking
      if (booking.userId !== session.user.id) {
        return NextResponse.json(
          { error: "You are not authorized to delete this booking" },
          { status: 403 },
        );
      }

      // If there's a reservation, delete it first
      if (booking.reservation) {
        await db.reservation.delete({
          where: {
            reservationId: booking.reservation.reservationId,
          },
        });
      }

      // Delete the booking
      await db.booking.delete({
        where: {
          bookingId: safeInput.bookingId,
        },
      });

      return NextResponse.json(
        { message: "Booking deleted successfully" },
        { status: 200 },
      );
    } catch (error) {
      console.error("Error deleting booking:", error);
      return NextResponse.json(
        { error: "Failed to delete booking" },
        { status: 500 },
      );
    }
  },
);
