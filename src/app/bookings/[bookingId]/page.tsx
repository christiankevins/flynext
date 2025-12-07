"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "../../session-provider";
import { Button } from "~/components/ui/button";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Hotel {
  name: string;
  location: string;
}

interface RoomType {
  name: string;
  pricePerNight: number;
  hotel: Hotel;
}

interface Reservation {
  roomType: RoomType;
  checkInDate: string;
  checkOutDate: string;
  totalHotelPrice: number;
}

interface Flight {
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  origin: { name: string };
  destination: { name: string };
  price: number;
  status?: string;
}

interface Booking {
  bookingId: string;
  status: string;
  userId: string;
  afsBookingReference: string;
  lastName?: string;
  user: User;
  reservation?: Reservation | null;
  flight?: Flight | null;
  // Add flights array to match backend structure
  flights?: Flight[];
}

interface PaymentInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}

export default function CheckoutPage() {
  const pathname = usePathname();
  const pathSegments = pathname.split("/");
  const bookingId = pathSegments[pathSegments.length - 1];
  const session = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [afsResponse, setAfsResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  const router = useRouter();

  const fetchAfsBooking = async (
    lastName: string,
    bookingReference: string,
  ) => {
    try {
      const url = new URL("/api/afs/bookings/retrieve", window.location.origin);
      url.searchParams.append("lastName", lastName);
      url.searchParams.append("bookingReference", bookingReference);

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch flight details: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching AFS booking:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    if (!bookingId) {
      setError("No booking specified");
      setLoading(false);
      return;
    }

    const fetchBookingData = async () => {
      try {
        setLoading(true);
        setError(null);

        // First fetch the booking details
        const bookingResponse = await fetch(
          `/api/bookings?bookingId=${bookingId}`,
          {
            headers: {
              Authorization: `Bearer ${session.jti}`,
            },
          },
        );

        if (!bookingResponse.ok) {
          throw new Error("Failed to fetch booking details");
        }

        const bookingData = await bookingResponse.json();
        console.log("Booking ID:", bookingId);
        console.log("API Response:", bookingData);

        // Handle both response structures (single booking or array of bookings)
        let booking;
        if (bookingData.booking) {
          booking = bookingData.booking;
        } else if (
          bookingData.bookings &&
          Array.isArray(bookingData.bookings) &&
          bookingData.bookings.length > 0
        ) {
          booking = bookingData.bookings[0];
        } else {
          throw new Error("No booking found with the specified ID");
        }

        if (!booking) {
          throw new Error("Invalid booking data received");
        }

        if (booking.userId !== session.user.id) {
          throw new Error("You are not authorized to view this booking");
        }

        if (booking.status === "CANCELLED") {
          throw new Error("Cancelled");
        }

        // If there's an AFS booking reference, fetch flight details
        if (booking.afsBookingReference) {
          const lastNameToUse = booking.lastName || session.user.lastName;
          
          const afsData = await fetchAfsBooking(
            lastNameToUse,
            booking.afsBookingReference,
          );
          setAfsResponse(afsData);
        }

        setBooking(booking);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [session, router, bookingId]);

  const calculateTotalPrice = () => {
    if (!booking) return 0;

    // Calculate hotel price
    const hotelPrice = booking.reservation?.totalHotelPrice || 0;

    // Calculate flight price from AFS response or from booking.flight
    let flightPrice = 0;
    if (afsResponse?.flights?.length > 0) {
      flightPrice = afsResponse.flights.reduce(
        (sum: number, flight: Flight) => sum + (flight.price || 0),
        0,
      );
    } else if (booking.flight) {
      flightPrice = booking.flight.price || 0;
    }

    return hotelPrice + flightPrice;
  };

  const totalPrice = calculateTotalPrice();

  if (!session || loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-center mt-10">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => router.push("/bookings")}>
          Back to Bookings
        </Button>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="max-w-2xl mx-auto mt-12 mb-20 p-6 border-4 rounded-lg">
      <h1 className="text-2xl font-bold">Booking Details</h1>
      <button
        className="max-w-2xl mx-auto mt-4 btn-secondary"
        onClick={() => router.push("/bookings")}
      >
        ← Back to Bookings
      </button>

      <div className="mt-6 p-4 rounded-lg bg-white dark:bg-gray-800 transition-colors duration-200 shadow-md ">
        <h2 className="font-semibold">Booking Summary</h2>
        <p>
          <strong>ID:</strong> {booking.bookingId}
        </p>

        {booking.reservation && (
          <div className="mt-2">
            <h3 className="font-medium">Hotel Details</h3>
            <p>
              <strong>Hotel:</strong> {booking.reservation.roomType.hotel.name}
            </p>
            <p>
              <strong>Room Type:</strong> {booking.reservation.roomType.name}
            </p>
            <p>
              <strong>Stay:</strong>{" "}
              {new Date(booking.reservation.checkInDate).toLocaleDateString()} -{" "}
              {new Date(booking.reservation.checkOutDate).toLocaleDateString()}
            </p>
            <p>
              <strong>Price Per Night:</strong> $
              {booking.reservation.roomType.pricePerNight.toFixed(2)}
            </p>
            <p>
              <strong>Total Hotel Cost:</strong> $
              {booking.reservation.totalHotelPrice.toFixed(2)}
            </p>
          </div>
        )}

        {(afsResponse?.flights?.length > 0 || booking.flight) && (
          <div className="mt-2">
            <h3 className="font-medium">Flight Details</h3>
            {afsResponse?.flights?.map((flight: Flight, index: number) => (
              <div key={index} className="mb-2">
                <p>
                  <strong>Flight {index + 1}:</strong> {flight.flightNumber}
                </p>
                <p>
                  <strong>Status:</strong> {flight.status || "Confirmed"}
                </p>
                <p>
                  <strong>Departure:</strong>{" "}
                  {new Date(flight.departureTime).toLocaleString()}
                </p>
                <p>
                  <strong>Arrival:</strong>{" "}
                  {new Date(flight.arrivalTime).toLocaleString()}
                </p>
                <p>
                  <strong>From:</strong> {flight.origin.name}
                </p>
                <p>
                  <strong>To:</strong> {flight.destination.name}
                </p>
                <p>
                  <strong>Price:</strong> ${flight.price.toFixed(2)}
                </p>
              </div>
            ))}
            {!afsResponse && booking.flight && (
              <>
                <p>
                  <strong>Status:</strong>{" "}
                  {booking.flight.status || "Confirmed"}
                </p>
                <p>
                  <strong>Flight Price:</strong> $
                  {booking.flight.price.toFixed(2)}
                </p>
              </>
            )}
          </div>
        )}

        <p className="font-bold mt-4 text-lg">
          Total: ${totalPrice.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
