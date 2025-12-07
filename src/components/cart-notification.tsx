import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Plane, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

interface CartNotificationProps {
  hotelName: string;
  city: string;
  onClose: () => void;
  isError?: boolean;
  errorMessage?: string;
}

export function CartNotification({
  hotelName,
  city,
  onClose,
  isError = false,
  errorMessage,
}: CartNotificationProps) {
  const router = useRouter();

  const handleFlightSearch = () => {
    router.push(`/flights?from=${city}`);
    onClose();
  };

  const handleCheckout = () => {
    router.push("/cart");
    onClose();
  };

  if (isError) {
    return (
      <Card className="p-4 max-w-sm">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg text-destructive">
              Cannot Add to Cart
            </h3>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium mb-2">What would you like to do?</h4>
            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full"
                onClick={handleCheckout}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Checkout Current Cart
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleFlightSearch}
              >
                <Plane className="w-4 h-4 mr-2" />
                Search Flights to {city}
              </Button>
            </div>
          </div>

          <Button variant="ghost" className="w-full" onClick={onClose}>
            Continue Shopping
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 max-w-sm">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Added to Cart!</h3>
          <p className="text-sm text-muted-foreground">
            {hotelName} has been added to your cart.
          </p>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">Complete Your Trip</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Looking for flights to {city}? We can help you find the perfect
            flight to complete your journey.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleFlightSearch}
          >
            <Plane className="w-4 h-4 mr-2" />
            Search Flights to {city}
          </Button>
        </div>

        <Button variant="ghost" className="w-full" onClick={onClose}>
          Continue Shopping
        </Button>
      </div>
    </Card>
  );
}
