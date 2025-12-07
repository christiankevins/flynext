"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function BookingVerification() {
  const [bookingRef, setBookingRef] = useState("");
  const [lastName, setLastName] = useState("");
  const [flights, setFlights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const verifyBooking = async () => {
    if (!bookingRef.trim()) {
      setError("Booking reference is required");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required");
      return;
    }

    setIsLoading(true);
    setError("");
    setFlights([]);

    try {
      const response = await fetch(
        `/api/verify-booking?bookingReference=${encodeURIComponent(bookingRef)}&lastName=${encodeURIComponent(lastName)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify booking");
      }

      setFlights(data.flights || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify booking");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-custom py-8">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Verify Your Flights
        </h2>

        {error && (
          <div className="mb-4 p-3 text-sm text-white bg-red-600 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="bookingRef"
              className="block text-sm font-medium mb-1"
            >
              Booking Reference
            </label>
            <input
              type="text"
              id="bookingRef"
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value)}
              className="input-field w-full"
              placeholder="Enter your booking reference"
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium mb-1"
            >
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-field w-full"
              placeholder="Enter your last name"
            />
          </div>

          <button
            onClick={verifyBooking}
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? "Verifying..." : "Verify Booking"}
          </button>
        </div>

        {flights.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Flight Details</h3>
            <div className="space-y-6">
              {flights.map((flight, index) => (
                <div key={index} className="card p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Flight Number
                      </p>
                      <p className="font-medium">{flight.flightNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Status
                      </p>
                      <p className="font-medium">{flight.status}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Departure
                      </p>
                      <p className="font-medium">
                        {format(new Date(flight.departureTime), "dd/MM/yyyy HH:mm")}
                      </p>
                      <p>{flight.origin}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Arrival
                      </p>
                      <p className="font-medium">
                        {format(new Date(flight.arrivalTime), "dd/MM/yyyy HH:mm")}
                      </p>
                      <p>{flight.destination}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
