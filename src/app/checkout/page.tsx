"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useSession } from "../session-provider";
import { CreditCard, Loader2, Check, Hotel, Plane } from "lucide-react";

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

interface PaymentInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  nameOnCard: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const session = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [flightDetails, setFlightDetails] = useState<Record<string, any>>({});
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
  });

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

        // Fetch flight details for all flights
        const allFlightIds = [
          ...(data.cartItem?.outboundFlights || []),
          ...(data.cartItem?.returnFlights || []),
        ];

        if (allFlightIds.length > 0) {
          const flightResponse = await fetch("/api/afs/flights/details", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ flightIds: allFlightIds }),
          });

          if (flightResponse.ok) {
            const flightData = await flightResponse.json();
            const flightDetailsMap = flightData.flights.reduce(
              (acc: any, flight: any) => {
                acc[flight.id] = flight;
                return acc;
              },
              {},
            );
            setFlightDetails(flightDetailsMap);
          }
        }
      } catch (error) {
        console.error("Error fetching cart items:", error);
        setError("Failed to load cart items");
      }
    };

    fetchCartItems();
  }, []);

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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

  const handleCheckout = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    if (!bookingId) {
      setError("No booking ID provided");
      return;
    }

    // Validate payment info
    if (
      !paymentInfo.cardNumber ||
      !paymentInfo.expiryDate ||
      !paymentInfo.cvv ||
      !paymentInfo.nameOnCard
    ) {
      setError("Please fill in all payment details");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Process checkout
      const checkoutResponse = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: bookingId,
          paymentInfo: {
            cardNumber: paymentInfo.cardNumber,
            expiryDate: paymentInfo.expiryDate,
            cvv: paymentInfo.cvv,
            nameOnCard: paymentInfo.nameOnCard,
          },
        }),
      });

      if (!checkoutResponse.ok) {
        const data = await checkoutResponse.json();
        throw new Error(data.error || "Checkout failed");
      }

      // Clear the cart after successful checkout
      try {
        const clearCartResponse = await fetch("/api/bookings/cart", {
          method: "DELETE",
        });

        if (!clearCartResponse.ok) {
          console.error("Failed to clear cart after checkout");
          // Continue with success flow even if cart clearing fails
        }
      } catch (cartError) {
        console.error("Error clearing cart after checkout:", cartError);
        // Continue with success flow even if cart clearing fails
      }

      // Show success state
      setIsSuccess(true);

      // Wait for 1.5 seconds before navigating
      setTimeout(() => {
        router.push("/bookings");
      }, 1500);
    } catch (error) {
      console.error("Checkout error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during checkout",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
          <h1 className="text-2xl font-bold mb-2">Processing Payment</h1>
          <p className="text-gray-600">
            Please wait while we process your payment...
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-green-600">
            Payment Successful!
          </h1>
          <p className="text-gray-600">Redirecting you to your bookings...</p>
        </div>
      </div>
    );
  }

  const total = calculateTotal();
  const priceBeforeTax = total / 1.13;
  const tax = total - priceBeforeTax;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Complete Payment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nameOnCard">Name on Card</Label>
                  <Input
                    id="nameOnCard"
                    name="nameOnCard"
                    value={paymentInfo.nameOnCard}
                    onChange={handlePaymentChange}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    name="cardNumber"
                    value={paymentInfo.cardNumber}
                    onChange={handlePaymentChange}
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      name="expiryDate"
                      value={paymentInfo.expiryDate}
                      onChange={handlePaymentChange}
                      placeholder="MM/YY"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      name="cvv"
                      value={paymentInfo.cvv}
                      onChange={handlePaymentChange}
                      placeholder="123"
                    />
                  </div>
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <Button
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cartItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {item.room ? (
                      <Hotel className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Plane className="w-4 h-4 text-blue-500" />
                    )}
                    <div className="flex-1">
                      {item.room ? (
                        <>
                          <p className="font-medium">{item.hotel?.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.room.name}
                          </p>
                        </>
                      ) : (
                        <>
                          {item.outboundFlights && (
                            <div className="mb-2">
                              <p className="font-medium">Departure Flights</p>
                              {item.outboundFlights.map((flightId, idx) => {
                                const details = flightDetails[flightId];
                                return (
                                  <div
                                    key={idx}
                                    className="text-sm text-gray-600"
                                  >
                                    <p>
                                      {details?.origin?.code} →{" "}
                                      {details?.destination?.code}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {item.returnFlights && (
                            <div>
                              <p className="font-medium">Return Flights</p>
                              {item.returnFlights.map((flightId, idx) => {
                                const details = flightDetails[flightId];
                                return (
                                  <div
                                    key={idx}
                                    className="text-sm text-gray-600"
                                  >
                                    <p>
                                      {details?.origin?.code} →{" "}
                                      {details?.destination?.code}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <p className="font-semibold">
                      {item.room
                        ? item.room.pricePerNight
                        : (item.outboundFlights?.reduce((sum, flightId) => {
                            const flightDetail = flightDetails[flightId];
                            return sum + (flightDetail?.price || 0);
                          }, 0) || 0) +
                          (item.returnFlights?.reduce((sum, flightId) => {
                            const flightDetail = flightDetails[flightId];
                            return sum + (flightDetail?.price || 0);
                          }, 0) || 0)}{" "}
                      CAD
                    </p>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span>Price Before Tax</span>
                    <span>${priceBeforeTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Tax (13%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
