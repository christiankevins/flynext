import prisma from "../../../lib/prisma";
import { validatePayment } from "../../../utils/paymentValidator";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { userId, flightId, hotelId, paymentInfo } = req.body;

    if (!validatePayment(paymentInfo)) {
      return res.status(400).json({ error: "Invalid payment details" });
    }

    try {
      const booking = await prisma.booking.create({
        data: {
          userId,
          totalPrice: 100.0, // Example price calculation logic
          flight: flightId ? { create: { flightId } } : undefined,
          hotel: hotelId ? { create: { hotelId } } : undefined,
        },
      });
      res.status(201).json(booking);
    } catch (error) {
      res.status(500).json({ error: "Failed to create booking" });
    }
  } else if (req.method === "GET") {
    const bookings = await prisma.booking.findMany({
      include: { flight: true, hotel: true },
    });
    res.status(200).json(bookings);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
