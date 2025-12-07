"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "../../session-provider";
import { Button } from "~/components/ui/button";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "~/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

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

interface CancellationOption {
  type: "flight" | "hotel" | "both";
  label: string;
  description: string;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const session = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [afsResponse, setAfsResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] =
    useState<CancellationOption | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  const router = useRouter();

  // Define all possible cancellation options
  const allCancellationOptions: CancellationOption[] = [
    {
      type: "flight",
      label: "Cancel Flight Only",
      description: "Cancel only the flight portion of your booking",
    },
    {
      type: "hotel",
      label: "Cancel Hotel Only",
      description: "Cancel only the hotel reservation portion of your booking",
    },
    {
      type: "both",
      label: "Cancel Entire Booking",
      description: "Cancel both flight and hotel portions of your booking",
    },
  ];

  // Filter cancellation options based on booking contents
  const getCancellationOptions = (booking: Booking): CancellationOption[] => {
    const hasFlight = !!booking.afsBookingReference;
    const hasHotel = !!booking.reservation;

    if (hasFlight && hasHotel) {
      return allCancellationOptions;
    } else if (hasFlight) {
      return [allCancellationOptions[0]]; // Only flight option
    } else if (hasHotel) {
      return [allCancellationOptions[1]]; // Only hotel option
    }
    return []; // No options if neither exists
  };

  const [cancellationOptions, setCancellationOptions] = useState<
    CancellationOption[]
  >([]);

  const handleCancel = async () => {
    if (!selectedOption || !booking || !session) return;

    setCancelling(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Convert cancellationType to the expected format
      const cancelFlight =
        selectedOption.type === "flight" || selectedOption.type === "both";
      const cancelHotel =
        selectedOption.type === "hotel" || selectedOption.type === "both";

      // Validate that we're not trying to cancel something that doesn't exist
      if (cancelFlight && !booking.afsBookingReference) {
        throw new Error("Cannot cancel flight: No flight booking found");
      }

      if (cancelHotel && !booking.reservation) {
        throw new Error("Cannot cancel hotel: No hotel reservation found");
      }

      console.log("Sending cancellation request:", {
        bookingId: booking.bookingId,
        cancelFlight,
        cancelHotel,
        hasReservation: !!booking.reservation,
        hasFlight: !!booking.afsBookingReference,
      });

      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bookingId: booking.bookingId,
          cancelFlight,
          cancelHotel,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Cancellation failed:", {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
        });
        throw new Error(data.error || "Failed to cancel booking");
      }

      const result = await response.json();
      console.log("Cancellation successful:", result);

      // Show success message before redirecting
      setSuccessMessage(result.message || "Booking cancelled successfully");

      // Wait a moment before redirecting
      setTimeout(() => {
        router.push("/bookings?cancelled=true");
      }, 1500);
    } catch (err) {
      console.error("Cancel error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === "object" && err !== null) {
        setError(JSON.stringify(err));
      } else {
        setError("Failed to cancel booking");
      }
    } finally {
      setCancelling(false);
    }
  };

  const fetchAfsBooking = async (
    lastName: string,
    bookingReference: string,
    accessToken: string,
  ) => {
    try {
      const response = await fetch(
        `/api/afs/bookings/retrieve?lastName=${lastName}&bookingReference=${bookingReference}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch flight details");
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

        console.log("Fetching booking with ID:", bookingId);
        console.log("Using session token:", session.jti);
        console.log("User ID:", session.user.id);

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
          const errorText = await bookingResponse.text();
          console.error("Booking fetch failed:", {
            status: bookingResponse.status,
            statusText: bookingResponse.statusText,
            error: errorText,
          });
          throw new Error(`Failed to fetch booking details: ${errorText}`);
        }

        const bookingData = await bookingResponse.json();
        console.log("Booking ID:", bookingId);
        console.log("API Response:", JSON.stringify(bookingData, null, 2));

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
          throw new Error("This booking has already been cancelled");
        }

        // If there's an AFS booking reference, fetch flight details
        if (booking.afsBookingReference) {
          const lastNameToUse = booking.lastName || session.user.lastName;
          
          const afsData = await fetchAfsBooking(
            lastNameToUse,
            booking.afsBookingReference,
            session.jti || "",
          );
          setAfsResponse(afsData);
        }

        setBooking(booking);
        // Set available cancellation options based on booking contents
        setCancellationOptions(getCancellationOptions(booking));
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
    console.log("booking", booking);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Cancel Booking</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              <p>{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/bookings")}
              >
                Back to Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : successMessage ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-green-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-xl font-medium">{successMessage}</p>
              <p className="text-sm text-gray-500 mt-2">
                Redirecting to bookings page...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : booking ? (
        <div className="space-y-6">
          <div className="max-w-2xl mx-auto mt-12 p-6 border-4 mb-12 rounded-lg">
            <h1 className="text-2xl font-bold">Cancellation Details</h1>
            <button
              className="max-w-2xl mx-auto mt-4 btn-secondary"
              onClick={() => router.push("/bookings")}
            >
              ← Back to Bookings
            </button>

            <div className="mt-6 p-4 border rounded-lg bg-white dark:bg-gray-800">
              <h2 className="font-semibold">Booking Summary</h2>
              <p>
                <strong>ID:</strong> {booking.bookingId}
              </p>

              {booking.reservation && (
                <div className="mt-2">
                  <h3 className="font-medium">Hotel Details</h3>
                  <p>
                    <strong>Hotel:</strong>{" "}
                    {booking.reservation.roomType.hotel.name}
                  </p>
                  <p>
                    <strong>Room Type:</strong>{" "}
                    {booking.reservation.roomType.name}
                  </p>
                  <p>
                    <strong>Stay:</strong>{" "}
                    {new Date(
                      booking.reservation.checkInDate,
                    ).toLocaleDateString()}{" "}
                    -{" "}
                    {new Date(
                      booking.reservation.checkOutDate,
                    ).toLocaleDateString()}
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
                  {afsResponse?.flights?.map(
                    (flight: Flight, index: number) => (
                      <div key={index} className="mb-2">
                        <p>
                          <strong>Flight {index + 1}:</strong>{" "}
                          {flight.flightNumber}
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
                    ),
                  )}
                  {!afsResponse && booking.flight && (
                    <p>
                      <strong>Flight Price:</strong> $
                      {booking.flight.price.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              <p className="font-bold mt-4 text-lg">
                Total: ${totalPrice.toFixed(2)}
              </p>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">
                Select Cancellation Option
              </h2>
              <div className="space-y-4">
                {cancellationOptions.map((option) => (
                  <div
                    key={option.type}
                    className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      id={option.type}
                      name="cancellationOption"
                      value={option.type}
                      checked={selectedOption?.type === option.type}
                      onChange={() => setSelectedOption(option)}
                      className="mt-1"
                    />
                    <label htmlFor={option.type} className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-50">
                        {option.description}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 text-red-500 text-center">{error}</div>
            )}

            <button
              onClick={handleCancel}
              disabled={!selectedOption || cancelling}
              className={`w-full max-w-2xl mx-auto mt-6 btn-danger ${!selectedOption || cancelling ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {cancelling ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </div>
      ) : undefined}
    </div>
  );
}
