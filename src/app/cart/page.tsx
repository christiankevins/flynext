"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ShoppingCart, Plane, Hotel, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface CartItem {
  hotelId?: string;
  roomId?: string;
  flightId?: string;
  bookingId?: string;
  hotel?: {
    name: string;
    city: string;
    images: { url: string }[];
  };
  room?: {
    name: string;
    pricePerNight: number;
    images: { url: string }[];
  };
  outboundFlights?: string[];
  returnFlights?: string[];
  flight?: {
    outboundFlights?: string[];
    returnFlights?: string[];
  };
  checkInDate?: string;
  checkOutDate?: string;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [flightDetails, setFlightDetails] = useState<Record<string, any>>({});
  const [hasBookingId, setHasBookingId] = useState(false);

  useEffect(() => {
    const fetchCartItems = async () => {
      try {
        const response = await fetch("/api/bookings/cart");
        if (!response.ok) {
          throw new Error("Failed to fetch cart items");
        }
        const data = await response.json();

        // Transform the cartItem into the expected format
        const items: CartItem[] = [];
        if (data.cartItem) {
          // Check if bookingId exists
          if (data.cartItem.bookingId) {
            setHasBookingId(true);
          }
          
          if (data.cartItem.singleRoomId && data.cartItem.room) {
            items.push({
              hotelId: data.cartItem.room.hotel.hotelId,
              roomId: data.cartItem.singleRoomId,
              bookingId: data.cartItem.bookingId,
              hotel: {
                name: data.cartItem.room.hotel.name,
                city: data.cartItem.room.hotel.city,
                images: data.cartItem.room.hotel.images || [],
              },
              room: {
                name: data.cartItem.room.name,
                pricePerNight: data.cartItem.room.pricePerNight,
                images: data.cartItem.room.images || [],
              },
            });
          }
          if (
            data.cartItem.outboundFlights?.length > 0 ||
            data.cartItem.returnFlights?.length > 0
          ) {
            items.push({
              outboundFlights: data.cartItem.outboundFlights,
              returnFlights: data.cartItem.returnFlights,
              bookingId: data.cartItem.bookingId,
            });
          }
        }

        setCartItems(items);

        // Fetch flight details for all flights
        const outboundFlightIds =
          data.cartItem?.outboundFlights?.map((f: any) => f) || [];
        const returnFlightIds =
          data.cartItem?.returnFlights?.map((f: any) => f) || [];

        const flightDetailsMap: Record<string, any> = {};

        // Fetch outbound flight details
        if (outboundFlightIds.length > 0) {
          const outboundResponse = await fetch("/api/afs/flights/details", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ flightIds: outboundFlightIds }),
          });

          if (outboundResponse.ok) {
            const outboundData = await outboundResponse.json();
            outboundData.flights.forEach((flight: any) => {
              flightDetailsMap[flight.id] = flight;
            });
          }
        }

        // Fetch return flight details
        if (returnFlightIds.length > 0) {
          const returnResponse = await fetch("/api/afs/flights/details", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ flightIds: returnFlightIds }),
          });

          if (returnResponse.ok) {
            const returnData = await returnResponse.json();
            returnData.flights.forEach((flight: any) => {
              flightDetailsMap[flight.id] = flight;
            });
          }
        }
        console.log("flightDetailsMap", flightDetailsMap);
        setFlightDetails(flightDetailsMap);
      } catch (error) {
        console.error("Error fetching cart items:", error);
        setCartItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCartItems();
  }, []);

  const handleRemoveItem = async (item: CartItem) => {
    try {
      const response = await fetch("/api/bookings/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hotelId: item.hotelId,
          flightId: item.flightId,
          flightType: item.outboundFlights ? "outbound" : "return",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove item from cart");
      }

      setCartItems((prevItems) =>
        prevItems.filter(
          (i) =>
            i.hotelId !== item.hotelId &&
            i.flightId !== item.flightId &&
            i.outboundFlights !== item.outboundFlights &&
            i.returnFlights !== item.returnFlights,
        ),
      );
    } catch (error) {
      console.error("Error removing item from cart:", error);
    }
  };

  const calculateHotelTotal = () => {
    return cartItems.reduce((total, item) => {
      if (item.room) {
        return total + item.room.pricePerNight;
      }
      return total;
    }, 0);
  };

  const calculateOutboundFlightsTotal = () => {
    return cartItems.reduce((total, item) => {
      if (item.outboundFlights) {
        return (
          total +
          item.outboundFlights.reduce((sum, flight) => {
            const flightDetail = flightDetails[flight];
            return sum + (flightDetail?.price || 0);
          }, 0)
        );
      }
      return total;
    }, 0);
  };

  const calculateReturnFlightsTotal = () => {
    return cartItems.reduce((total, item) => {
      if (item.returnFlights) {
        return (
          total +
          item.returnFlights.reduce((sum, flight) => {
            const flightDetail = flightDetails[flight];
            return sum + (flightDetail?.price || 0);
          }, 0)
        );
      }
      return total;
    }, 0);
  };

  const hotelTotal = calculateHotelTotal();
  const outboundFlightsTotal = calculateOutboundFlightsTotal();
  const returnFlightsTotal = calculateReturnFlightsTotal();
  const total = hotelTotal + outboundFlightsTotal + returnFlightsTotal;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-6">
            Add some hotels or flights to your cart to get started!
          </p>
          <Button>
            <Link href="/hotels">Browse Hotels</Link>
          </Button>
          <Button className="ml-2">
            <Link href="/flights">Browse Flights</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item, index) => (
            <div key={index}>
              {item.room && item.hotel && (
                <Card className="mb-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Hotel className="w-5 h-5 text-blue-500" />
                      {item.hotel.name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex">
                      <div className="relative w-32 h-32">
                        <Image
                          src={item.hotel.images[0]?.url || "/placeholder.png"}
                          alt={item.hotel.name}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                      <div className="flex-1 p-4">
                        <p className="text-sm text-gray-600 mb-2">
                          {item.room.name}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          {item.hotel.city}
                        </p>
                        <p className="font-semibold text-orange-600">
                          {item.room.pricePerNight} CAD/night
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {item.outboundFlights && item.outboundFlights.length > 0 && (
                <Card className="mb-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Plane className="w-5 h-5 text-blue-500" />
                      Departure Flights
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleRemoveItem({
                          ...item,
                          outboundFlights: undefined,
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {item.outboundFlights.map((flight, idx) => {
                      const flightDetail = flightDetails[flight];
                      return (
                        <div key={idx} className="mb-4 last:mb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Plane className="w-4 h-4 text-blue-500" />
                            <h3 className="font-semibold">
                              {flightDetail?.airline?.name}{" "}
                              {flightDetail?.flightNumber}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {flightDetail?.origin?.city} (
                            {flightDetail?.origin?.code}) →{" "}
                            {flightDetail?.destination?.city} (
                            {flightDetail?.destination?.code})
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {new Date(
                              flightDetail?.departureTime,
                            ).toLocaleString()}{" "}
                            -
                            {new Date(
                              flightDetail?.arrivalTime,
                            ).toLocaleString()}
                          </p>
                          <div className="text-sm text-gray-500">
                            <p>
                              Duration:{" "}
                              {Math.floor(flightDetail?.duration / 60)}H{" "}
                              {flightDetail?.duration % 60}M
                            </p>
                          </div>
                          <p className="font-semibold text-orange-600">
                            {flightDetail?.price?.toFixed(2)}{" "}
                            {flightDetail?.currency}
                          </p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {item.returnFlights && item.returnFlights.length > 0 && (
                <Card className="mb-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Plane className="w-5 h-5 text-blue-500" />
                      Return Flights
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleRemoveItem({ ...item, returnFlights: undefined })
                      }
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {item.returnFlights.map((flight, idx) => {
                      const flightDetail = flightDetails[flight];
                      return (
                        <div key={idx} className="mb-4 last:mb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Plane className="w-4 h-4 text-blue-500" />
                            <h3 className="font-semibold">
                              {flightDetail?.airline?.name}{" "}
                              {flightDetail?.flightNumber}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {flightDetail?.origin?.city} (
                            {flightDetail?.origin?.code}) →{" "}
                            {flightDetail?.destination?.city} (
                            {flightDetail?.destination?.code})
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {new Date(
                              flightDetail?.departureTime,
                            ).toLocaleString()}{" "}
                            -
                            {new Date(
                              flightDetail?.arrivalTime,
                            ).toLocaleString()}
                          </p>
                          <div className="text-sm text-gray-500">
                            <p>
                              Duration:{" "}
                              {Math.floor(flightDetail?.duration / 60)}H{" "}
                              {flightDetail?.duration % 60}M
                            </p>
                          </div>
                          <p className="font-semibold text-orange-600">
                            {flightDetail?.price?.toFixed(2)}{" "}
                            {flightDetail?.currency}
                          </p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Hotel:</span>
                    <span>{hotelTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Departure Flights:</span>
                    <span>{outboundFlightsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Return Flights:</span>
                    <span>{returnFlightsTotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{total.toFixed(2)}</span>
                  </div>
                </div>
                {hasBookingId ? (
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/checkout?bookingId=${cartItems[0]?.bookingId}`)}
                  >
                    Proceed to Checkout
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => router.push("/bookings/book")}
                  >
                    Continue to Book
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
