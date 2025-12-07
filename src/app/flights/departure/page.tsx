"use client";

import { FC, useEffect } from "react";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";
import { useSession } from "../../session-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { listFlights } from "~/app/api/afs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { dispatchCartUpdate } from "~/lib/cart-events";

export default function DepartureFlightsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [showNextStepsDialog, setShowNextStepsDialog] = useState(false);
  const [nextStepsOptions, setNextStepsOptions] = useState<{
    title: string;
    description: string;
    hotelUrl: string;
    flightUrl: string;
    hotelButtonText: string;
    flightButtonText: string;
  } | null>(null);

  // Get search parameters from URL
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const date = searchParams.get("date");
  const tripType = searchParams.get("type");
  const returnDate = searchParams.get("returnDate");
  const isRoundTrip = tripType === "round-trip";

  useEffect(() => {
    const searchFlights = async () => {
      if (!origin || !destination || !date) return;

      setIsSearching(true);
      try {
        const results = await listFlights({
          origin,
          destination,
          date,
        });
        setSearchResults(results);
      } catch (error) {
        console.error("Failed to search flights:", error);
        toast.error("Failed to search flights");
      } finally {
        setIsSearching(false);
      }
    };

    searchFlights();
  }, [origin, destination, date]);

  const handleAddToCart = async (flightResult: any) => {
    if (!session) {
      router.push("/login");
      return;
    }

    if (!flightResult || !flightResult.flights) {
      toast.error("No flight selected");
      return;
    }

    try {
      const flightIds = flightResult.flights.map((flight: any) => flight.id);

      const response = await fetch("/api/bookings/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outboundFlightIds: flightIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add flight to cart");
      }

      // Dispatch cart update event
      dispatchCartUpdate({
        type: "flight",
        id: flightIds[0],
        name: `${flightResult.flights[0].airline} ${flightResult.flights[0].flightNumber}`,
        city: flightResult.flights[0].destination.city,
      });

      // Show success notification and check cart state
      const cartResponse = await fetch("/api/bookings/cart");
      const cartData = await cartResponse.json();

      if (cartData.cartItem) {
        const hasHotel = cartData.cartItem.singleRoomId;
        const hasReturnFlight = cartData.cartItem.returnFlights && cartData.cartItem.returnFlights.length > 0;
        const isRoundTrip = tripType === "round-trip";

        // Debug information
        console.log("Trip Type:", tripType);
        console.log("Return Date:", returnDate);
        console.log("Is Round Trip:", isRoundTrip);
        console.log("Has Return Flight:", hasReturnFlight);
        console.log("Cart Data:", cartData.cartItem);

        // Show a success toast
        toast.success("Flight added to cart!");

        // For round-trip bookings, always prompt for return flight if not selected
        if (isRoundTrip && !hasReturnFlight) {
          // Use the return date from URL parameters
          if (returnDate) {
            console.log("Setting up return flight prompt");
            setNextStepsOptions({
              title: "Departure flight added to cart!",
              description: "Would you like to select your return flight now?",
              hotelUrl: "",
              flightUrl: `/flights/return?origin=${encodeURIComponent(destination || "")}&destination=${encodeURIComponent(origin || "")}&date=${encodeURIComponent(returnDate)}&type=round-trip`,
              hotelButtonText: "",
              flightButtonText: "Select Return Flight",
            });
            setShowNextStepsDialog(true);
            return;
          } else {
            console.log("No return date available");
          }
        }

        // For one-way bookings only
        if (!isRoundTrip) {
          if (!hasHotel) {
            // If no hotel in cart, show hotel suggestion dialog
            const flight_length = flightResult.flights.length;
            const city = flightResult.flights[flight_length - 1].destination.city;
            const date = flightResult.flights[0].arrivalTime;

            setNextStepsOptions({
              title: "Flight added to cart!",
              description: `Would you like to find a hotel in ${city}?`,
              hotelUrl: `/hotels?city=${encodeURIComponent(city)}&checkInDate=${encodeURIComponent(new Date(date).toISOString().split("T")[0])}&checkOutDate=${encodeURIComponent(new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0])}`,
              flightUrl: "",
              hotelButtonText: `Find a hotel in ${city}`,
              flightButtonText: "",
            });
          } else {
            // If hotel exists, show confirmation dialog
            setNextStepsOptions({
              title: "Flight added to cart!",
              description:
                "Your flight has been added to your cart. Would you like to proceed to booking or continue shopping?",
              hotelUrl: "",
              flightUrl: "",
              hotelButtonText: "",
              flightButtonText: "",
            });
          }
          setShowNextStepsDialog(true);
        }
      }
    } catch (error) {
      console.error("Error adding flight to cart:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add flight to cart",
      );
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen mt-6">
      <div className="w-full max-w-7xl p-4">
        {/* Back Button */}
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>

        {/* Search Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {tripType === "round-trip" ? "Departure Flight" : "Flight Summary"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">From</p>
              <p className="font-medium">{origin}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">To</p>
              <p className="font-medium">{destination}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">
                {date
                  ? format(
                      new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
                      "MMMM d, yyyy",
                    )
                  : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Flight Results */}
        <div className="mt-8">
          {isSearching ? (
            <div className="text-center py-32">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
              </div>
            </div>
          ) : searchResults && searchResults.results.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Available Flights</h2>
              <div className="space-y-4">
                {searchResults.results.map((result: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                  >
                    <div className="flex justify-between">
                      <div className="flex-1">
                        {result.flights.map(
                          (flight: any, flightIdx: number) => (
                            <div key={flightIdx}>
                              <div className="flex items-center gap-4">
                                <div>
                                  <div className="text-lg font-semibold">
                                    {format(
                                      new Date(flight.departureTime),
                                      "HH:mm",
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {flight.origin.city}
                                  </div>
                                </div>
                                <div className="text-gray-400">→</div>
                                <div>
                                  <div className="text-lg font-semibold">
                                    {format(
                                      new Date(flight.arrivalTime),
                                      "HH:mm",
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {flight.destination.city}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-gray-500">
                                {flight.airline.name} • {flight.flightNumber} •{" "}
                                {formatDuration(flight.duration)}
                              </div>
                              {flightIdx < result.flights.length - 1 && (
                                <div className="my-3 pl-6 text-sm text-orange-500">
                                  {formatDuration(
                                    (new Date(
                                      result.flights[
                                        flightIdx + 1
                                      ].departureTime,
                                    ).getTime() -
                                      new Date(flight.arrivalTime).getTime()) /
                                      (1000 * 60),
                                  )}{" "}
                                  layover in {flight.destination.city}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-semibold">
                          {result.flights
                            .reduce(
                              (total: number, flight: any) =>
                                total + Number(flight.price),
                              0,
                            )
                            .toFixed(0)}{" "}
                          {result.flights[0].currency}
                        </div>
                        <div className="text-sm text-gray-500">
                          {Math.min(
                            ...result.flights.map((f: any) => f.availableSeats),
                          )}{" "}
                          seats left
                        </div>
                        <Button
                          className="mt-4 bg-orange-500 hover:bg-orange-600"
                          disabled={!session}
                          onClick={() => {
                            if (!session) {
                              router.push("/login");
                            } else {
                              handleAddToCart(result);
                            }
                          }}
                        >
                          {session ? "Add to cart" : "Log in to book"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-32">
              <h2 className="text-2xl font-semibold mb-2">No flights found</h2>
              <p className="text-muted-foreground">
                Try adjusting your search criteria to find available flights
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps Dialog */}
      <Dialog open={showNextStepsDialog} onOpenChange={setShowNextStepsDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {nextStepsOptions?.title || "What's next?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{nextStepsOptions?.description}</p>
            <div className="flex flex-col gap-2">
              {nextStepsOptions?.hotelButtonText &&
                nextStepsOptions?.hotelUrl && (
                  <Button
                    onClick={() => {
                      if (nextStepsOptions?.hotelUrl) {
                        router.push(nextStepsOptions.hotelUrl);
                      }
                      setShowNextStepsDialog(false);
                    }}
                  >
                    {nextStepsOptions.hotelButtonText}
                  </Button>
                )}
              {nextStepsOptions?.flightButtonText &&
                nextStepsOptions?.flightUrl && (
                  <Button
                    onClick={() => {
                      if (nextStepsOptions?.flightUrl) {
                        router.push(nextStepsOptions.flightUrl);
                      }
                      setShowNextStepsDialog(false);
                    }}
                  >
                    {nextStepsOptions.flightButtonText}
                  </Button>
                )}
              {!isRoundTrip && (
                <>
                  <Button
                    onClick={() => {
                      router.push("/bookings/book");
                      setShowNextStepsDialog(false);
                    }}
                  >
                    Proceed to Book
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNextStepsDialog(false);
                    }}
                  >
                    Continue Shopping
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};
