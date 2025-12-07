"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Star,
  MapPin,
  Calendar as CalendarIcon,
  ShoppingCart,
} from "lucide-react";
import { format, isBefore, startOfToday } from "date-fns";
import Image from "next/image";
import { parseAmenities } from "~/lib/utils/amenities";
import { CartNotification } from "~/components/cart-notification";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { toast } from "react-hot-toast";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Calendar } from "~/components/ui/calendar";
import { cn } from "~/lib/utils";
import { DateRange } from "react-day-picker";
import { useSession } from "../../session-provider";
import { dispatchCartUpdate } from "~/lib/cart-events";
import { useRouter } from "next/navigation";

interface RoomType {
  roomId: string;
  name: string;
  description: string;
  pricePerNight: number;
  totalRooms: number;
  beds: number;
  amenities: string;
  images: {
    id: string;
    url: string;
  }[];
  availabilities: {
    date: Date;
    availableRooms: number;
  }[];
  isAvailable?: boolean;
}

interface Hotel {
  hotelId: string;
  name: string;
  logo: string | null;
  country: string;
  province: string;
  city: string;
  streetAddress: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  starRating: number;
  images: {
    id: string;
    url: string;
  }[];
  roomTypes: RoomType[];
}

export default function HotelDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [cartNotificationData, setCartNotificationData] = useState({
    hotelName: "",
    city: "",
    isError: false,
    errorMessage: "",
  });
  const [showAddToCartConfirmation, setShowAddToCartConfirmation] =
    useState(false);
  const [selectedRoomForCart, setSelectedRoomForCart] =
    useState<RoomType | null>(null);
  const [availableRoomTypes, setAvailableRoomTypes] = useState<RoomType[]>([]);
  const [showExistingCartDialog, setShowExistingCartDialog] = useState(false);
  const [showNextStepsDialog, setShowNextStepsDialog] = useState(false);
  const [nextStepsOptions, setNextStepsOptions] = useState<{
    title: string;
    description: string;
    hotelUrl: string;
    flightUrl: string;
    hotelButtonText: string;
    flightButtonText: string;
  } | null>(null);
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchHotelDetails = async () => {
      try {
        const response = await fetch(
          `/api/hotel/${params.hotelId}?checkInDate=${searchParams.get("checkIn")}&checkOutDate=${searchParams.get("checkOut")}`,
        );
        const data = await response.json();
        if (response.ok) {
          setHotel(data.hotel);
          // Calculate availability for each room type
          const roomTypesWithAvailability = data.hotel.roomTypes.map(
            (roomType: RoomType) => {
              // A room is available if:
              // 1. There are no availability records for the date range, OR
              // 2. All availability records in the range have availableRooms > 0
              const isAvailable =
                roomType.availabilities.length === 0 ||
                roomType.availabilities.every(
                  (avail) => avail.availableRooms > 0,
                );
              return {
                ...roomType,
                isAvailable,
              };
            },
          );
          setAvailableRoomTypes(roomTypesWithAvailability);
        } else {
          toast.error(data.error || "Failed to fetch hotel details");
        }
      } catch (error) {
        console.error("Error fetching hotel details:", error);
        toast.error("Failed to fetch hotel details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotelDetails();
  }, [
    params.hotelId,
    searchParams.get("checkIn"),
    searchParams.get("checkOut"),
  ]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
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
              <p className="text-sm text-red-700">
                {error || "Hotel not found"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCartClick = (room: RoomType) => {
    setSelectedRoomForCart(room);
    setShowAddToCartConfirmation(true);
  };

  const handleAddToCart = async (roomId: string) => {
    if (!session) {
      toast.error("Please login to add items to cart");
      return;
    }

    try {
      // First check if user already has a hotel in cart
      const checkResponse = await fetch("/api/bookings/cart");
      if (!checkResponse.ok) {
        throw new Error("Failed to check cart status");
      }

      const cartData = await checkResponse.json();
      if (cartData.cartItem?.singleRoomId) {
        setShowExistingCartDialog(true);
        return;
      }

      const response = await fetch("/api/bookings/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          hotelId: params.hotelId,
          checkInDate: searchParams.get("checkIn"),
          checkOutDate: searchParams.get("checkOut"),
        }),
      });

      let errorMessage = "Failed to add to cart";
      if (!response.ok) {
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Close the confirmation dialog
      setShowAddToCartConfirmation(false);
      setSelectedRoomForCart(null);

      // Dispatch cart update event
      dispatchCartUpdate({
        type: "hotel",
        id: roomId,
        name: hotel?.name || "",
        city: hotel?.city || "",
      });

      // Check if there are any flights in the cart
      if (
        !cartData.cartItem?.outboundFlights?.length &&
        !cartData.cartItem?.returnFlights?.length
      ) {
        // Show flight suggestion dialog
        setNextStepsOptions({
          title: "Hotel added to cart!",
          description: `Would you like to find a flight to ${hotel?.city}?`,
          hotelUrl: "",
          flightUrl: `/flights?destination=${encodeURIComponent(hotel?.city || "")}&date=${encodeURIComponent(searchParams.get("checkIn") || "")}`,
          hotelButtonText: "",
          flightButtonText: `Find flights to ${hotel?.city}`,
        });
        setShowNextStepsDialog(true);
      } else {
        // If flights exist, show confirmation dialog
        setNextStepsOptions({
          title: "Hotel added to cart!",
          description:
            "Your hotel has been added to your cart. Would you like to proceed to booking or continue shopping?",
          hotelUrl: "",
          flightUrl: "",
          hotelButtonText: "",
          flightButtonText: "",
        });
        setShowNextStepsDialog(true);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add to cart",
      );
    }
  };

  // Display selected dates if available
  const checkInDate = searchParams.get("checkIn");
  const checkOutDate = searchParams.get("checkOut");
  const hasSelectedDates = checkInDate && checkOutDate;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hotel Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">{hotel?.name}</h1>
          <div className="flex items-center">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 mr-1" />
            <span className="text-lg">{hotel?.starRating}</span>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-2">
          {hotel?.streetAddress}, {hotel?.city}, {hotel?.province}
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          {hotel?.country} {hotel?.postalCode}
        </p>
        {hasSelectedDates && (
          <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-300">
            <CalendarIcon className="w-4 h-4 mr-1" />
            <span>
              {format(new Date(checkInDate), "dd MMM")} -{" "}
              {format(new Date(checkOutDate), "dd MMM yyyy")}
            </span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            const url = `https://www.google.com/maps/search/?api=1&query=${hotel?.latitude},${hotel?.longitude}`;
            window.open(url, "_blank");
          }}
        >
          <MapPin className="w-4 h-4 mr-2" />
          View on Google Maps
        </Button>
      </div>

      {/* Hotel Images */}
      {hotel?.images && hotel.images.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Hotel Images</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {hotel.images.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square cursor-pointer"
                onClick={() => setSelectedImage(image.url)}
              >
                <Image
                  src={image.url}
                  alt={hotel.name}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room Types */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Room Types</h2>
        {!hasSelectedDates && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
            <p>
              Please select dates on the search page to add rooms to your cart.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableRoomTypes.map((roomType) => (
            <Card key={roomType.roomId} className="group relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{roomType.name}</span>
                  <span className="text-orange-600 dark:text-orange-400">
                    {roomType.pricePerNight} CAD/night
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roomType.images && roomType.images.length > 0 && (
                    <div className="relative h-48">
                      <Image
                        src={roomType.images[0].url}
                        alt={roomType.name}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold mb-2">Amenities:</p>
                    <div className="flex flex-wrap gap-2">
                      {parseAmenities(roomType.amenities).map(
                        ({ icon: Icon, label }, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md"
                          >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {roomType.beds} {roomType.beds === 1 ? "bed" : "beds"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {roomType.totalRooms} total rooms
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!roomType.isAvailable ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600"
                          disabled
                        >
                          Sold Out
                        </Button>
                      ) : !session ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600"
                          disabled
                        >
                          Login to book
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={() => handleAddToCartClick(roomType)}
                          disabled={!hasSelectedDates}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full max-w-4xl h-[80vh]">
            <Image
              src={selectedImage}
              alt="Hotel"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* Cart Notification Dialog */}
      <Dialog
        open={showCartNotification}
        onOpenChange={setShowCartNotification}
      >
        <DialogContent
          className="sm:max-w-[425px]"
          aria-describedby="cart-notification-description"
        >
          <DialogHeader>
            <DialogTitle>Cart Notification</DialogTitle>
          </DialogHeader>
          <div id="cart-notification-description">
            {showCartNotification && (
              <CartNotification
                hotelName={cartNotificationData.hotelName}
                city={cartNotificationData.city}
                onClose={() => setShowCartNotification(false)}
                isError={cartNotificationData.isError}
                errorMessage={cartNotificationData.errorMessage}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Cart Confirmation Dialog */}
      <Dialog
        open={showAddToCartConfirmation}
        onOpenChange={setShowAddToCartConfirmation}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add to Cart</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to add {selectedRoomForCart?.name} to your
              cart?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() =>
                  selectedRoomForCart &&
                  handleAddToCart(selectedRoomForCart.roomId)
                }
              >
                Add to Cart
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddToCartConfirmation(false);
                  setSelectedRoomForCart(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Existing Cart Dialog */}
      <Dialog
        open={showExistingCartDialog}
        onOpenChange={setShowExistingCartDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cart Already Contains a Hotel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              You can only have one hotel in your cart at a time. Please proceed
              to book or clear your cart first.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setShowExistingCartDialog(false);
                  router.push("/bookings/book");
                }}
              >
                Proceed to Book
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowExistingCartDialog(false);
                  window.location.href = `/flights?destination=${encodeURIComponent(hotel?.city || "")}&date=${encodeURIComponent(searchParams.get("checkIn") || "")}`;
                }}
              >
                Find a Flight to {hotel?.city}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowExistingCartDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              {nextStepsOptions?.hotelButtonText && (
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
              {nextStepsOptions?.flightButtonText && (
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
