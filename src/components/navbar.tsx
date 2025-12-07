import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pathname = usePathname();

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

  return (
    <nav className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-gray-800 dark:to-gray-900 text-white shadow-md transition-colors duration-200">
      <div className="container-custom py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              FlyNext
            </Link>
          </div>

          {/* Theme toggle and Navigation links */}
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
            <Link
              href="/about"
              className={`${
                pathname === "/about" ? "font-bold underline" : ""
              } hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
            >
              About
            </Link>
          </div>

          {/* Mobile menu button and theme toggle */}
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
          <div className="md:hidden mt-2 py-2">
            <Link
              href="/"
              className={`block py-2 ${
                pathname === "/" ? "font-bold underline" : ""
              } hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
            >
              Home
            </Link>
            <Link
              href="/flights"
              className={`block py-2 ${
                pathname === "/flights" ? "font-bold underline" : ""
              } hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
            >
              Flights
            </Link>
            <Link
              href="/hotels"
              className={`block py-2 ${
                pathname === "/hotels" ? "font-bold underline" : ""
              } hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
            >
              Hotels
            </Link>
            <Link
              href="/about"
              className={`block py-2 ${
                pathname === "/about" ? "font-bold underline" : ""
              } hover:text-orange-200 dark:hover:text-gray-300 transition-colors duration-200`}
            >
              About
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
