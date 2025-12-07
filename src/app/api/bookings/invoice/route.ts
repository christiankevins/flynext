import { NextRequest, NextResponse } from "next/server";
import { validatePayment } from "../../../../utils/paymentValidator";
import { JwtPayload } from "jsonwebtoken";
import { ensureLoggedIn } from "../../middleware";
import { retrieveBooking } from "../../afs/index";
import { db } from "~/server/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";

// Zod schema to validate the request input
const invoiceRequestSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"), // bookingId should be a non-empty string
});

export const GET = ensureLoggedIn(InvoiceGET);

async function InvoiceGET(
  req: NextRequest,
  res: NextResponse,
  session: JwtPayload,
) {
  const userId = session.user.id;
  let bookingId;
  try {
    // Get bookingId from URL query parameters instead of request body
    const url = new URL(req.url);
    bookingId = url.searchParams.get("bookingId");
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Invalid request params, need bookingId" },
      { status: 400 },
    );
  }
  let parsedInput;
  try {
    // Validate the query parameter using Zod schema
    parsedInput = invoiceRequestSchema.parse({ bookingId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 400 });
  }
  try {
    // Query the booking with the provided bookingId
    const booking = await db.booking.findUnique({
      where: { bookingId: bookingId! },
      include: {
        user: true, // Include user details if needed
        reservation: {
          include: {
            roomType: {
              include: {
                hotel: true, // Include hotel details
              },
            },
          },
        },
      },
    });

    // Check if no bookings exist for the user
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if the booking belongs to the current user
    if (booking.userId !== userId) {
      return NextResponse.json(
        { error: "You are not authorized to view this booking" },
        { status: 403 },
      );
    }

    // Assuming the retrieveBooking function is still relevant, you can call it here
    let afsResponse;
    if (booking.afsBookingReference) {
      console.log(
        "Retrieving flight details for booking reference:",
        booking.afsBookingReference,
      );
      try {
        afsResponse = await retrieveBooking({
          lastName: booking.lastName,
          bookingReference: booking.afsBookingReference,
        });
        console.log("Flight details retrieved successfully");
      } catch (error) {
        console.error("Error retrieving flight details:", error);
        // Continue without flight details
        afsResponse = undefined;
      }
    } else {
      console.log(
        "No flight booking reference found, generating hotel-only invoice",
      );
    }

    // Generate the invoice (PDF)
    const invoicePdfBytes = await generateInvoice(booking, afsResponse);

    // Return the PDF directly with appropriate headers for inline display
    return new NextResponse(invoicePdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${bookingId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error retrieving bookings:", error);
    return NextResponse.json(
      { error: "Failed to retrieve bookings" },
      { status: 500 },
    );
  }
}

// Generate PDF Invoice from booking details
export async function generateInvoice(
  booking: any,
  afsResponse: any,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  //const page = pdfDoc.addPage([600, 400]);
  const pageWidth = 600;
  const pageHeight = 850;
  let yPosition = 750;

  const addNewPageIfNeeded = () => {
    if (yPosition < 50) {
      // If y-position goes below 50, create a new page
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - 50; // Reset y-position to top of the new page
    }
  };
  let page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Invoice Title
  page.drawText("Invoice", {
    x: 50,
    y: yPosition,
    size: 24,
    font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 30; // Move down

  // Booking Details
  page.drawText(`Booking ID: ${booking.bookingId}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font,
  });
  yPosition -= 20;
  page.drawText(`Name: ${booking.user.firstName} ${booking.user.lastName}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font,
  });
  yPosition -= 20;
  page.drawText(`Email: ${booking.user.email}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font,
  });
  yPosition -= 30;

  // Flight Details (if flight is booked)
  var totalFlightPrice = 0;
  if (afsResponse?.flights && afsResponse.flights.length > 0) {
    page.drawText("Flight Details:", {
      x: 50,
      y: yPosition,
      size: 14,
      font,
      color: rgb(0, 0, 0.8),
    });
    yPosition -= 20;
    for (let i = 0; i < afsResponse.flights.length; i++) {
      const flight = afsResponse.flights[i]; // Assuming the first flight is the one to include
      page.drawText(`Flight ${i + 1}`, {
        x: 50,
        y: yPosition,
        size: 14,
        font,
        color: rgb(0, 0, 0.8),
      });
      yPosition -= 20;
      page.drawText(`Flight Number: ${flight.flightNumber}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font,
      });
      yPosition -= 20;
      page.drawText(
        `Departure: ${new Date(flight.departureTime).toLocaleString()}`,
        { x: 50, y: yPosition, size: 12, font },
      );
      yPosition -= 20;
      page.drawText(
        `Arrival: ${new Date(flight.arrivalTime).toLocaleString()}`,
        { x: 50, y: yPosition, size: 12, font },
      );
      yPosition -= 20;
      page.drawText(`Origin: ${flight.origin.name}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font,
      });
      yPosition -= 20;
      page.drawText(`Destination: ${flight.destination.name}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font,
      });
      yPosition -= 20;
      totalFlightPrice += flight.price;
      page.drawText(`Price: $${flight.price?.toFixed(2)}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font,
      });
      yPosition -= 30;
    }
  }

  // Hotel Details (if hotel is booked)
  let reservation;
  if (booking.reservation) {
    reservation = booking.reservation;
    const roomType = reservation.roomType;
    const hotel = roomType.hotel;

    page.drawText("Hotel Details:", {
      x: 50,
      y: yPosition,
      size: 14,
      font,
      color: rgb(0, 0.8, 0),
    });
    yPosition -= 20;
    addNewPageIfNeeded();
    page.drawText(`Hotel Name: ${hotel.name}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font,
    });
    yPosition -= 20;
    addNewPageIfNeeded();
    page.drawText(`Room Type: ${roomType.name}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font,
    });
    yPosition -= 20;
    addNewPageIfNeeded();
    page.drawText(
      `Check-in: ${new Date(reservation.checkInDate).toLocaleDateString()}`,
      { x: 50, y: yPosition, size: 12, font },
    );
    yPosition -= 20;
    addNewPageIfNeeded();
    page.drawText(
      `Check-out: ${new Date(reservation.checkOutDate).toLocaleDateString()}`,
      { x: 50, y: yPosition, size: 12, font },
    );
    yPosition -= 20;
    addNewPageIfNeeded();
    page.drawText(`Price Per Night: $${roomType.pricePerNight.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font,
    });
    yPosition -= 20;
    addNewPageIfNeeded();
    page.drawText(
      `Total Hotel Cost: $${reservation.totalHotelPrice?.toFixed(2)}`,
      { x: 50, y: yPosition, size: 12, font },
    );
    yPosition -= 30;
    addNewPageIfNeeded();
  }

  // Total Cost
  const totalHotelPrice = reservation?.totalHotelPrice ?? 0;
  const totalCost = totalFlightPrice + totalHotelPrice;
  console.log("Total Cost:", totalCost);
  page.drawText(`Total Cost: ${totalCost.toString()}`, {
    x: 50,
    y: yPosition,
    size: 14,
    font,
    color: rgb(0.8, 0, 0),
  });
  yPosition -= 30;
  addNewPageIfNeeded();

  // Footer
  page.drawText("Thank you for booking with us!", {
    x: 50,
    y: 50,
    size: 12,
    font,
    color: rgb(0, 0, 0.5),
  });
  addNewPageIfNeeded();

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}