"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Calendar, Filter, X } from "lucide-react";
import { format } from "date-fns";

interface RoomType {
  roomId: string;
  name: string;
  totalRooms: number;
}

interface Booking {
  bookingId: string;
  hotelId: string;
  roomTypeId: string;
  roomType: RoomType;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  status: string;
  createdAt: string;
}

interface Availability {
  date: string;
  availableRooms: number;
}

export default function ManageBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
    roomTypeId: searchParams.get("roomTypeId") || "",
  });
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);

  useEffect(() => {
    fetchBookings();
    fetchRoomTypes();
  }, [searchParams]);

  const fetchBookings = async () => {
    try {
      const params = new URLSearchParams(searchParams.toString());
      const response = await fetch(
        `/api/hotel/reservation?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }
      const data = await response.json();
      setBookings(data.bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const response = await fetch("/api/hotel/room");
      if (!response.ok) {
        throw new Error("Failed to fetch room types");
      }
      const data = await response.json();
      setRoomTypes(data.roomTypes);
    } catch (err) {
      console.error("Error fetching room types:", err);
    }
  };

  const fetchAvailability = async (roomTypeId: string) => {
    try {
      const response = await fetch(`/api/hotel/availability/${roomTypeId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch availability");
      }
      const data = await response.json();
      setAvailability(data.availability);
    } catch (err) {
      console.error("Error fetching availability:", err);
    }
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/hotels/manage/bookings?${params.toString()}`);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      const response = await fetch("/api/hotel/reservation/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId: bookingId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel booking");
      }

      // Refresh bookings list
      fetchBookings();
    } catch (err) {
      console.error("Error canceling booking:", err);
      alert("Failed to cancel booking. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Bookings</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              {bookings.length} bookings found
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                />
              </div>
              <div>
                <Label htmlFor="roomTypeId">Room Type</Label>
                <select
                  id="roomTypeId"
                  name="roomTypeId"
                  value={filters.roomTypeId}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">All Room Types</option>
                  {roomTypes.map((roomType) => (
                    <option key={roomType.roomId} value={roomType.roomId}>
                      {roomType.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={applyFilters}>Apply Filters</Button>
            </div>
          </div>
        )}
      </div>

      {/* Room Type Availability */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Room Availability</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomTypes.map((roomType) => (
            <Card key={roomType.roomId}>
              <CardHeader>
                <CardTitle>{roomType.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRoomType(roomType.roomId);
                    fetchAvailability(roomType.roomId);
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Check Availability
                </Button>
                {selectedRoomType === roomType.roomId &&
                  availability.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Available Rooms:</h4>
                      <div className="space-y-2">
                        {availability.map((day) => (
                          <div key={day.date} className="flex justify-between">
                            <span>
                              {format(new Date(day.date), "MMM d, yyyy")}
                            </span>
                            <span>{day.availableRooms} rooms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Current Bookings</h2>
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.bookingId}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {booking.roomType.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Guest: {booking.user.name}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      Email: {booking.user.email}
                    </p>
                    <div className="mt-2">
                      <p>
                        Check-in:{" "}
                        {format(new Date(booking.checkInDate), "MMM d, yyyy")}
                      </p>
                      <p>
                        Check-out:{" "}
                        {format(new Date(booking.checkOutDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <p className="mt-2 font-semibold">
                      Total: ${booking.totalPrice}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelBooking(booking.bookingId)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
