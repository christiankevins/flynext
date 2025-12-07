"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "../../session-provider";

export default function InvoicePage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const router = useRouter();
  const session = useSession();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = async () => {
    if (!bookingId || !session?.user) {
      setError("Please log in to view your invoice");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Construct the URL to fetch the invoice PDF
      const url = `/api/bookings/invoice?bookingId=${encodeURIComponent(
        bookingId,
      )}`;

      // Create a blob URL for the PDF
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch invoice");
      }

      // Check if the response is a PDF
      const contentType = response.headers.get("content-type");
      if (contentType !== "application/pdf") {
        throw new Error("Invalid response format");
      }

      const blob = await response.blob();
      const pdfObjectUrl = URL.createObjectURL(blob);
      setPdfUrl(pdfObjectUrl);
    } catch (err: any) {
      console.error("Error fetching invoice:", err);
      setError(err.message || "An error occurred while fetching the invoice");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId && session?.user) {
      fetchInvoice();
    } else {
      setIsLoading(false);
    }

    // Clean up the object URL when component unmounts
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [bookingId, session]);

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `invoice-${bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="container-custom py-8">
      <h1 className="text-2xl font-bold mb-6">Booking Invoice</h1>

      {!bookingId ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No booking ID provided. Please check the URL.</p>
        </div>
      ) : (
        <div className="card w-full max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Invoice</h2>
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                onClick={() => router.push("/bookings")}
              >
                ← Back to Bookings
              </button>
              <button
                className="btn-secondary flex items-center"
                onClick={fetchInvoice}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Refresh
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
              <button
                className="btn-primary flex items-center"
                onClick={handleDownload}
                disabled={!pdfUrl || isLoading}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </button>
            </div>
          </div>
          <div>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg
                  className="animate-spin h-8 w-8 mb-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading invoice...
                </p>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4 text-red-800 dark:text-red-200">
                <p className="font-medium">Error loading invoice</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            ) : pdfUrl ? (
              <div
                className="relative rounded-md overflow-hidden border border-gray-300 dark:border-gray-600"
                style={{ height: "70vh" }}
              >
                <iframe
                  src={`${pdfUrl}#toolbar=0`}
                  className="w-full h-full"
                  title="Invoice PDF"
                />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No invoice available for this booking</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
