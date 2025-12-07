"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useSession } from "../../session-provider";
import { Hotel, Plane, ShoppingCart, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import Link from "next/link";

interface CartItem {
  hotelId?: string;
  roomId?: string;
  flightId?: string;
  hotel?: {
    name: string;
    city: string;
  };
  room?: {
    name: string;
    pricePerNight: number;
  };
  outboundFlights?: string[];
  returnFlights?: string[];
  checkInDate?: string;
  checkOutDate?: string;
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  passportNumber: string;
}

interface FlightDetail {
  id: string;
  airline: string;
  flightNumber: string;
  origin: {
    code: string;
    name: string;
  };
  destination: {
    code: string;
    name: string;
  };
  departureTime: string;
  arrivalTime: string;
  price: number;
}

export default function BookingPage() {
  const router = useRouter();
  const session = useSession();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFlight, setHasFlight] = useState(false);
  const [flightDetails, setFlightDetails] = useState<
    Record<string, FlightDetail>
  >({});
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: "",
    lastName: "",
    email: "",
    passportNumber: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [bookingData, setBookingData] = useState<{ 
    message: string;
    localBooking: { 
      bookingId: string;
    };
  } | null>(null);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    // Initialize personal info with session data
    if (session.user) {
      setPersonalInfo({
        firstName: session.user.firstName || "",
        lastName: session.user.lastName || "",
        email: session.user.email || "",
        passportNumber: "",
      });
    }

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
          if (data.cartItem.singleRoomId && data.cartItem.room) {
            items.push({
              hotelId: data.cartItem.room.hotel.hotelId,
              roomId: data.cartItem.singleRoomId,
              hotel: {
                name: data.cartItem.room.hotel.name,
                city: data.cartItem.room.hotel.city,
              },
              room: {
                name: data.cartItem.room.name,
                pricePerNight: data.cartItem.room.pricePerNight,
              },
              checkInDate: data.cartItem.checkInDate,
              checkOutDate: data.cartItem.checkOutDate,
            });
          }
          if (
            data.cartItem.outboundFlights?.length > 0 ||
            data.cartItem.returnFlights?.length > 0
          ) {
            items.push({
              outboundFlights: data.cartItem.outboundFlights,
              returnFlights: data.cartItem.returnFlights,
            });
          }
        }
        
        setCartItems(items);
        setHasFlight(
          items.some((item) => item.outboundFlights || item.returnFlights),
        );

        // Fetch flight details for all flights
        const outboundFlightIds =
          data.cartItem?.outboundFlights?.map((f: any) => f) || [];
        const returnFlightIds =
          data.cartItem?.returnFlights?.map((f: any) => f) || [];

        const flightDetailsMap: Record<string, FlightDetail> = {};

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

        setFlightDetails(flightDetailsMap);
      } catch (error) {
        console.error("Error fetching cart items:", error);
        setCartItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCartItems();
  }, [session, router]);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      if (item.room) {
        return total + item.room.pricePerNight;
      }
      
      // Handle flights - both outbound and return flights might be in the same item
      let flightTotal = 0;
      
      // Add outbound flight prices
      if (item.outboundFlights && item.outboundFlights.length > 0) {
        flightTotal += item.outboundFlights.reduce((sum, flightId) => {
          const flightDetail = flightDetails[flightId];
          return sum + (flightDetail?.price || 0);
        }, 0);
      }
      
      // Add return flight prices
      if (item.returnFlights && item.returnFlights.length > 0) {
        flightTotal += item.returnFlights.reduce((sum, flightId) => {
          const flightDetail = flightDetails[flightId];
          return sum + (flightDetail?.price || 0);
        }, 0);
      }
      
      return total + flightTotal;
    }, 0);
  };

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push("/login");
      return;
    }

    // Validate personal information
    if (
      !personalInfo.firstName ||
      !personalInfo.lastName ||
      !personalInfo.email ||
      (hasFlight && !personalInfo.passportNumber)
    ) {
      setError(
        hasFlight
          ? "Please fill in all passenger information fields"
          : "Please fill in all guest information fields",
      );
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Create booking
      const bookingResponse = await fetch("/api/bookings/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(cartItems.find((item) => item.roomId) && {
            roomId: cartItems.find((item) => item.roomId)?.roomId,
            checkInDate: new Date(
              cartItems.find((item) => item.roomId)?.checkInDate!,
            ),
            checkOutDate: new Date(
              cartItems.find((item) => item.roomId)?.checkOutDate!,
            ),
          }),
          ...(hasFlight && {
            flightIds: [
              ...(cartItems.find((item) => item.outboundFlights)
                ?.outboundFlights || []),
              ...(cartItems.find((item) => item.returnFlights)?.returnFlights ||
                []),
            ],
            passengerDetails: {
              email: personalInfo.email,
              firstName: personalInfo.firstName,
              lastName: personalInfo.lastName,
              passportNumber: personalInfo.passportNumber,
            },
          }),
        }),
      });

      if (!bookingResponse.ok) {
        throw new Error("Failed to create booking");
      }

      const bookingData = await bookingResponse.json();
      console.log("bookingData", bookingData);
      setBookingData(bookingData);

      // Update the cartItem with the bookingId
      try {
        const updateCartResponse = await fetch("/api/bookings/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: bookingData.localBooking?.bookingId,
          }),
        });

        if (!updateCartResponse.ok) {
          console.error("Failed to update cart with bookingId");
          // Continue with success flow even if cart update fails
        }
      } catch (cartError) {
        console.error("Error updating cart with bookingId:", cartError);
        // Continue with success flow even if cart update fails
      }

      // Show the dialog instead of proceeding directly
      setShowDialog(true);
    } catch (error) {
      console.error("Error creating booking:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create booking",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueToPayment = async () => {
    setShowDialog(false);
    if (bookingData) {
      router.push(`/checkout?bookingId=${bookingData.localBooking.bookingId}`);
    }
  };

  const handleContinueShopping = () => {
    setShowDialog(false);
    router.push("/hotels");
  };

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

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-6">
            Add some hotels or flights to your cart to get started!
          </p>
          <Button>
            <Link href="/hotels">Browse Hotels</Link>
          </Button>
          <Button>
            <Link href="/flights">Browse Flights</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Complete Your Booking</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {hasFlight ? "Passenger Information" : "Booking will be made with the following details:"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasFlight ? (
                  // For flights, show input fields
                  <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={personalInfo.firstName}
                      onChange={handlePersonalInfoChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={personalInfo.lastName}
                      onChange={handlePersonalInfoChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={personalInfo.email}
                    onChange={handlePersonalInfoChange}
                    required
                  />
                </div>
                  <div className="space-y-2">
                    <Label htmlFor="passportNumber">Passport Number</Label>
                    <Input
                      id="passportNumber"
                      name="passportNumber"
                      value={personalInfo.passportNumber}
                      onChange={handlePersonalInfoChange}
                      required={hasFlight}
                    />
                    </div>
                  </>
                ) : (
                  // For hotels only, show user details
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h3 className="text-lg font-medium mb-2"></h3>
                      <div className="space-y-2">
                        <p><span className="font-medium">Name:</span> {session?.user?.firstName} {session?.user?.lastName}</p>
                        <p><span className="font-medium">Email:</span> {session?.user?.email}</p>
                      </div>
                    </div>
                    {/* Hidden inputs to submit the form */}
                    <input type="hidden" name="firstName" value={personalInfo.firstName} />
                    <input type="hidden" name="lastName" value={personalInfo.lastName} />
                    <input type="hidden" name="email" value={personalInfo.email} />
                  </div>
                )}
              </CardContent>
            </Card>

            {error && (
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
            )}

            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Book"}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cartItems.map((item, index) => (
                  <div key={index}>
                    {item.room ? (
                      <div className="flex items-center gap-2">
                      <Hotel className="w-4 h-4 text-blue-500" />
                        <div className="flex-1">
                          <p className="font-medium">{item.hotel?.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.room.name}
                          </p>
                        </div>
                        <p className="font-semibold">
                          ${item.room.pricePerNight}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {item.outboundFlights &&
                          item.outboundFlights.length > 0 && (
                            <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-blue-500" />
                    <div className="flex-1">
                                <p className="font-medium">Departure Flights</p>
                                {item.outboundFlights.map((flightId, idx) => {
                                  const flightDetail = flightDetails[flightId];
                                  return (
                                    <p
                                      key={idx}
                                      className="text-sm text-gray-600"
                                    >
                                      {flightDetail
                                        ? `${
                                            flightDetail.origin?.code || ""
                                          } → ${
                                            flightDetail.destination?.code || ""
                                          }`
                                        : "Loading..."}
                                    </p>
                                  );
                                })}
                              </div>
                              <p className="font-semibold">
                                $
                                {item.outboundFlights.reduce(
                                  (sum, flightId) => {
                                    const flightDetail =
                                      flightDetails[flightId];
                                    return sum + (flightDetail?.price || 0);
                                  },
                                  0,
                                )}
                              </p>
                            </div>
                          )}
                        {item.returnFlights &&
                          item.returnFlights.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Plane className="w-4 h-4 text-blue-500" />
                              <div className="flex-1">
                                <p className="font-medium">Return Flights</p>
                                {item.returnFlights.map((flightId, idx) => {
                                  const flightDetail = flightDetails[flightId];
                                  return (
                                    <p
                                      key={idx}
                                      className="text-sm text-gray-600"
                                    >
                                      {flightDetail
                                        ? `${
                                            flightDetail.origin?.code || ""
                                          } → ${
                                            flightDetail.destination?.code || ""
                                          }`
                                        : "Loading..."}
                                    </p>
                                  );
                                })}
                    </div>
                    <p className="font-semibold">
                                $
                                {item.returnFlights.reduce((sum, flightId) => {
                                  const flightDetail = flightDetails[flightId];
                                  return sum + (flightDetail?.price || 0);
                                }, 0)}
                              </p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>${calculateTotal()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Booking successful</DialogTitle>
            <DialogDescription>
              Would you like to proceed to payment or continue shopping?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <Button
              className="flex flex-col items-center justify-center h-24 gap-2"
              onClick={handleContinueToPayment}
              disabled={isProcessing}
            >
              <CreditCard className="w-6 h-6" />
              <span>Continue to Payment</span>
            </Button>
            <Button
              className="flex flex-col items-center justify-center h-24 gap-2"
              variant="outline"
              onClick={handleContinueShopping}
            >
              <ShoppingCart className="w-6 h-6" />
              <span>Continue Shopping</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
