"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface Flight {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  origin: { name: string };
  destination: { name: string };
  price: number;
}

interface Hotel {
  roomId: string;
  name: string;
  pricePerNight: number;
  hotel: {
    name: string;
  };
  checkInDate?: string;
  checkOutDate?: string;
}

interface CartItem {
  type: "flight" | "hotel";
  item: Flight | Hotel;
}

interface CartContextType {
  items: CartItem[];
  addFlight: (flight: Flight) => void;
  addHotel: (hotel: Hotel) => void;
  removeItem: (type: "flight" | "hotel", id: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addFlight = (flight: Flight) => {
    setItems((prevItems) => {
      // Check if flight already exists
      const flightExists = prevItems.some(
        (item) =>
          item.type === "flight" && (item.item as Flight).id === flight.id,
      );

      if (flightExists) {
        return prevItems;
      }

      return [...prevItems, { type: "flight", item: flight }];
    });
  };

  const addHotel = (hotel: Hotel) => {
    setItems((prevItems) => {
      // Check if hotel already exists
      const hotelExists = prevItems.some(
        (item) =>
          item.type === "hotel" && (item.item as Hotel).roomId === hotel.roomId,
      );

      if (hotelExists) {
        return prevItems;
      }

      return [...prevItems, { type: "hotel", item: hotel }];
    });
  };

  const removeItem = (type: "flight" | "hotel", id: string) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(
            item.type === type &&
            ((type === "flight" && (item.item as Flight).id === id) ||
              (type === "hotel" && (item.item as Hotel).roomId === id))
          ),
      ),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      if (item.type === "flight") {
        return total + (item.item as Flight).price;
      } else {
        const hotel = item.item as Hotel;
        if (hotel.checkInDate && hotel.checkOutDate) {
          const days = Math.ceil(
            (new Date(hotel.checkOutDate).getTime() -
              new Date(hotel.checkInDate).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          return total + hotel.pricePerNight * days;
        }
        return total;
      }
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addFlight,
        addHotel,
        removeItem,
        clearCart,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
