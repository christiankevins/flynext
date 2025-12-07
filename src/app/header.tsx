"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useSession } from "./session-provider";
import Link from "next/link";
import { Avatar } from "~/components/avatar";
import { Button } from "~/components/ui/button";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ShoppingCart, Hotel, Plane, Bell } from "lucide-react";
import { CART_UPDATE_EVENT, CartEventDetail } from "~/lib/cart-events";

interface CartItem {
  singleRoomId?: string;
  outboundFlights?: string[];
  returnFlights?: string[];
}

export function Header() {
  const session = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pathname = usePathname();
  const [key, setKey] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartState, setCartState] = useState({
    hasHotel: false,
    hasFlight: false,
  });

  useEffect(() => {
    setKey((prev) => prev + 1);
  }, [pathname]);

  useEffect(() => {
    const fetchCartItems = async () => {
      try {
        const response = await fetch("/api/bookings/cart", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch cart items");
        }

        const data = await response.json();
        setCartItems(data.cartItem ? [data.cartItem] : []);
      } catch (error) {
        console.error("Error fetching cart items:", error);
        setCartItems([]);
      }
    };

    const fetchUnreadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications/unread", {
          method: "GET",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch unread notifications");
        }
        const data = await response.json();
        setHasUnreadNotifications(data.count > 0);
        setUnreadCount(data.count);
      } catch (error) {
        console.error("Error fetching unread notifications:", error);
        setHasUnreadNotifications(false);
        setUnreadCount(0);
      }
    };

    if (session) {
      fetchCartItems();
      fetchUnreadNotifications();
    }
  }, [session]);

  useEffect(() => {
    const handleCartUpdate = (event: CustomEvent<CartEventDetail>) => {
      const { type } = event.detail;
      setCartState((prev) => ({
        ...prev,
        hasHotel: type === "hotel" ? true : prev.hasHotel,
        hasFlight: type === "flight" ? true : prev.hasFlight,
      }));
    };

    window.addEventListener(
      CART_UPDATE_EVENT,
      handleCartUpdate as EventListener,
    );

    // Initial cart check
    const checkCart = async () => {
      try {
        const response = await fetch("/api/bookings/cart");
        if (response.ok) {
          const data = await response.json();
          setCartState({
            hasHotel: !!data.cartItem?.singleRoomId,
            hasFlight: !!(
              data.cartItem?.outboundFlights?.length ||
              data.cartItem?.returnFlights?.length
            ),
          });
        }
      } catch (error) {
        console.error("Error checking cart:", error);
      }
    };

    checkCart();

    return () => {
      window.removeEventListener(
        CART_UPDATE_EVENT,
        handleCartUpdate as EventListener,
      );
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);

    // Toggle dark mode class on document
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Check for saved theme preference or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Navigation links component to avoid duplication
  const NavigationLinks = () => (
    <>
      <Link
        href="/"
        className={`${
          pathname === "/" ? "font-bold underline" : ""
        } hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
      >
        Home
      </Link>
      <Link
        href="/flights"
        className={`${
          pathname === "/flights" ? "font-bold underline" : ""
        } hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
      >
        Flights
      </Link>
      <Link
        href="/hotels"
        className={`${
          pathname === "/hotels" ? "font-bold underline" : ""
        } hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
      >
        Hotels
      </Link>
      {session && (
        <>
          <Link
            href="/hotels/manage"
            className={`${
              pathname === "/hotels/manage" ? "font-bold underline" : ""
            } hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
          >
            Manage Hotels
          </Link>
          <Link
            href="/bookings"
            className={pathname === "/bookings" ? "font-bold underline" : ""}
          >
            Bookings
          </Link>
          <Link href="/notifications" className="relative">
            <Bell className="w-5 h-5" />
            {hasUnreadNotifications && (
              <div className="absolute -top-1 -right-1">
                <div className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </div>
              </div>
            )}
          </Link>
          <Link href="/cart" className="relative">
            <ShoppingCart className="w-5 h-5" />
            {cartState.hasHotel && (
              <div className="absolute -top-2 -right-2 flex gap-1">
                <div className="bg-blue-500 rounded-full w-3 h-3 flex items-center justify-center">
                  <Hotel className="w-2 h-2 text-white" />
                </div>
              </div>
            )}
            {cartState.hasFlight && (
              <div className="absolute -top-2 -right-2 flex gap-1">
                <div className="bg-blue-500 rounded-full w-3 h-3 flex items-center justify-center">
                  <Plane className="w-2 h-2 text-white" />
                </div>
              </div>
            )}
          </Link>
        </>
      )}
    </>
  );

  // User controls component to avoid duplication
  const UserControls = () => (
    <div className="flex gap-2">
      {session ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="rounded-full overflow-hidden cursor-pointer p-0 m-0 size-[32px] bg-white"
            >
              <Avatar
                src={session.user.profilePictureUrl}
                alt="Profile picture"
                className="size-[32px]"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={async () => {
                const response = await fetch("/api/account/logout", {
                  method: "POST",
                });

                if (response.ok) {
                  window.location.href = "/";
                } else {
                  alert("Failed to log out");
                }
              }}
            >
              Log Out
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile">Update Profile</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <Link
            href="/login"
            className={`${
              pathname === "/login" ? "font-bold underline" : ""
            } text-white hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
          >
            Log In
          </Link>
          <Link
            href="/register"
            className={`${
              pathname === "/register" ? "font-bold underline" : ""
            } text-white hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
          >
            Register
          </Link>
        </>
      )}
    </div>
  );

  // Mobile core navigation links component
  const MobileNavigationLinks = () => (
    <>
      <Link
        href="/"
        className={`${
          pathname === "/" ? "font-bold underline" : ""
        } block py-2 px-4 hover:bg-orange-600 dark:hover:bg-gray-700 rounded transition-colors duration-200`}
        onClick={toggleMenu} // Close menu on click
      >
        Home
      </Link>
      <Link
        href="/flights"
        className={`${
          pathname === "/flights" ? "font-bold underline" : ""
        } block py-2 px-4 hover:bg-orange-600 dark:hover:bg-gray-700 rounded transition-colors duration-200`}
        onClick={toggleMenu} // Close menu on click
      >
        Flights
      </Link>
      <Link
        href="/hotels"
        className={`${
          pathname === "/hotels" ? "font-bold underline" : ""
        } block py-2 px-4 hover:bg-orange-600 dark:hover:bg-gray-700 rounded transition-colors duration-200`}
        onClick={toggleMenu} // Close menu on click
      >
        Hotels
      </Link>
      {session && (
        <>
          <Link
            href="/hotels/manage"
            className={`${
              pathname === "/hotels/manage" ? "font-bold underline" : ""
            } block py-2 px-4 hover:bg-orange-600 dark:hover:bg-gray-700 rounded transition-colors duration-200`}
            onClick={toggleMenu} // Close menu on click
          >
            Manage Hotels
          </Link>
          <Link
            href="/bookings"
            className={`${
              pathname === "/bookings" ? "font-bold underline" : ""
            } block py-2 px-4 hover:bg-orange-600 dark:hover:bg-gray-700 rounded transition-colors duration-200`}
            onClick={toggleMenu} // Close menu on click
          >
            Bookings
          </Link>
        </>
      )}
    </>
  );

  return (
    <header
      key={key}
      className="bg-gradient-to-r from-orange-500 to-orange-400 dark:from-gray-800 dark:to-gray-900 text-white shadow-md transition-colors duration-200 sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container-custom py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              FlyNext
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-orange-600 dark:hover:bg-gray-700 focus:outline-none transition-colors duration-200"
              aria-label={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {isDarkMode ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            <NavigationLinks />
            <UserControls />
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-orange-600 dark:hover:bg-gray-700 focus:outline-none transition-colors duration-200"
              aria-label={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {isDarkMode ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {/* Icons moved here for mobile header */}
            {session && (
              <>
                <Link
                  href="/notifications"
                  className="relative text-white p-2 rounded-full hover:bg-orange-600 dark:hover:bg-gray-700"
                >
                  <Bell className="w-5 h-5" />
                  {hasUnreadNotifications && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount}
                      </div>
                    </div>
                  )}
                </Link>
                <Link
                  href="/cart"
                  className="relative text-white p-2 rounded-full hover:bg-orange-600 dark:hover:bg-gray-700"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {(cartState.hasHotel || cartState.hasFlight) && (
                    <div className="absolute top-1 right-1 flex items-center justify-center bg-blue-500 rounded-full w-3 h-3 p-0.5">
                      {/* Simple indicator dot instead of icons inside */}
                    </div>
                  )}
                  {/* Simplified indicator for mobile - just a dot if anything is in cart */}
                  {/* {cartState.hasHotel && (
                    <div className="absolute -top-2 -right-2 flex gap-1">
                      <div className="bg-blue-500 rounded-full w-3 h-3 flex items-center justify-center">
                        <Hotel className="w-2 h-2 text-white" />
                      </div>
                    </div>
                  )}
                  {cartState.hasFlight && (
                    <div className="absolute -top-2 -right-2 flex gap-1">
                       <div className="bg-blue-500 rounded-full w-3 h-3 flex items-center justify-center">
                         <Plane className="w-2 h-2 text-white" />
                       </div>
                    </div>
                  )} */}
                </Link>
              </>
            )}

            {/* UserControls remain here */}
            <UserControls />

            {/* Hamburger Button remains here */}
            <button
              onClick={toggleMenu}
              className="text-white focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-2 py-2 border-t border-orange-300 dark:border-gray-700">
            {/* Use the new MobileNavigationLinks component */}
            <MobileNavigationLinks />
          </div>
        )}
      </div>
    </header>
  );
}
