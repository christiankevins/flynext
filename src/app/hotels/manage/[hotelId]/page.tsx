"use client";

import { useState, useEffect, useRef } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Edit,
  Trash,
  Plus,
  Image as ImageIcon,
  Bed,
  DoorOpen,
  ArrowLeft,
  Calendar,
  Filter,
  X,
} from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import Image from "next/image";
import { Star } from "lucide-react";
import { MapPin } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Hotel as PrismaHotel,
  RoomType as PrismaRoomType,
  HotelImage,
  RoomTypeImage,
} from "@prisma/client";
import {
  availableAmenities,
  parseAmenities,
  amenityIcons,
} from "~/lib/utils/amenities";
import { cn } from "~/lib/utils";
import { format } from "date-fns";

interface RoomType {
  roomId: string;
  name: string;
  pricePerNight: number;
  totalRooms: number;
  beds: number;
  amenities: string;
  images: RoomTypeImage[];
}

interface Hotel {
  hotelId: string;
  name: string;
  country: string;
  province: string;
  city: string;
  streetAddress: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  starRating: number;
  amenities?: string;
  roomTypes: RoomType[];
  images: HotelImage[];
}

interface RoomTypeFormData {
  name: string;
  amenities: string;
  pricePerNight: string;
  totalRooms: string;
  beds: string;
  images: File[];
}

interface EditRoomTypeFormData extends Omit<RoomTypeFormData, "images"> {
  roomId: string;
  images: File[];
}

interface PageParams {
  hotelId: string;
}

interface EditHotelFormData {
  name: string;
  country: string;
  province: string;
  city: string;
  streetAddress: string;
  postalCode: string;
  starRating: number;
  amenities: string;
  images: File[];
}

interface Reservation {
  reservationId: string;
  checkInDate: Date;
  checkOutDate: Date;
  status: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ManageHotelPage({ params }: { params: PageParams }) {
  const router = useRouter();
  const { hotelId } = React.use(params as unknown as React.Usable<PageParams>);
  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EditHotelFormData>({
    name: "",
    country: "",
    province: "",
    city: "",
    streetAddress: "",
    postalCode: "",
    starRating: 0,
    amenities: "",
    images: [],
  });
  const [roomTypeFormData, setRoomTypeFormData] = useState<RoomTypeFormData>({
    name: "",
    amenities: "",
    pricePerNight: "0",
    totalRooms: "1",
    beds: "1",
    images: [],
  });
  const [roomImages, setRoomImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditRoomDialogOpen, setIsEditRoomDialogOpen] = useState(false);
  const [editRoomFormData, setEditRoomFormData] =
    useState<EditRoomTypeFormData>({
      roomId: "",
      name: "",
      amenities: "",
      pricePerNight: "0",
      totalRooms: "1",
      beds: "1",
      images: [],
    });
  const [isViewImagesDialogOpen, setIsViewImagesDialogOpen] = useState(false);
  const [selectedRoomImages, setSelectedRoomImages] = useState<RoomTypeImage[]>(
    [],
  );
  const [isViewHotelImagesDialogOpen, setIsViewHotelImagesDialogOpen] =
    useState(false);
  const [selectedHotelImages, setSelectedHotelImages] = useState<HotelImage[]>(
    [],
  );
  const [isDeleteRoomTypeDialogOpen, setIsDeleteRoomTypeDialogOpen] =
    useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(
    null,
  );
  const [roomTypeToDelete, setRoomTypeToDelete] = useState<RoomType | null>(
    null,
  );
  const [isDeleteHotelDialogOpen, setIsDeleteHotelDialogOpen] = useState(false);
  const [isDeleteRoomImageDialogOpen, setIsDeleteRoomImageDialogOpen] =
    useState(false);
  const [roomImageToDelete, setRoomImageToDelete] =
    useState<RoomTypeImage | null>(null);
  const [isDeleteHotelImageDialogOpen, setIsDeleteHotelImageDialogOpen] =
    useState(false);
  const [hotelImageToDelete, setHotelImageToDelete] =
    useState<HotelImage | null>(null);
  const [isViewReservationsDialogOpen, setIsViewReservationsDialogOpen] =
    useState(false);
  const [selectedRoomReservations, setSelectedRoomReservations] = useState<
    Reservation[]
  >([]);
  const [selectedRoomForReservations, setSelectedRoomForReservations] =
    useState<RoomType | null>(null);
  const [reservationFilterDate, setReservationFilterDate] =
    useState<string>("");
  const [showReservationFilters, setShowReservationFilters] = useState(false);
  const [selectedEditAmenities, setSelectedEditAmenities] = useState<
    Set<string>
  >(new Set());
  const [selectedAddRoomAmenities, setSelectedAddRoomAmenities] = useState<
    Set<string>
  >(new Set());
  const [selectedEditRoomAmenities, setSelectedEditRoomAmenities] = useState<
    Set<string>
  >(new Set());
  const [isViewAvailabilityDialogOpen, setIsViewAvailabilityDialogOpen] = useState(false);
  const [selectedRoomAvailability, setSelectedRoomAvailability] = useState<{ date: string; availableRooms: number }[]>([]);
  const [selectedRoomForAvailability, setSelectedRoomForAvailability] = useState<RoomType | null>(null);
  const [availabilityDateRange, setAvailabilityDateRange] = useState<{
    fromDate: string;
    toDate: string;
  }>({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        const response = await fetch(`/api/hotel/${hotelId}/manage`);
        if (!response.ok) {
          throw new Error("Failed to fetch hotel");
        }
        const data = await response.json();
        setHotel(data.hotel);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchHotel();
  }, [hotelId]);

  const handleEditHotel = (hotel: Hotel) => {
    setEditFormData({
      name: hotel.name,
      country: hotel.country,
      province: hotel.province,
      city: hotel.city,
      streetAddress: hotel.streetAddress,
      postalCode: hotel.postalCode,
      starRating: hotel.starRating,
      amenities: hotel.amenities || "",
      images: [],
    });
    setSelectedEditAmenities(amenitiesStringToSet(hotel.amenities));
    setIsEditDialogOpen(true);
  };

  const handleHotelImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setEditFormData((prev) => ({
        ...prev,
        images: Array.from(files),
      }));
    }
  };

  const handleUpdateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Update hotel details first
      const response = await fetch(`/api/hotel/${hotelId}/manage`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editFormData.name,
          country: editFormData.country,
          province: editFormData.province,
          city: editFormData.city,
          streetAddress: editFormData.streetAddress,
          postalCode: editFormData.postalCode,
          starRating: editFormData.starRating,
          amenities: editFormData.amenities,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update hotel");
      }

      // Upload new images if any
      if (editFormData.images.length > 0) {
        const imageUploadPromises = editFormData.images.map(async (image) => {
          try {
            // Convert to WebP
            const webpBlob = await convertToWebP(image);

            // Get presigned URL
            const presignedResponse = await fetch(
              `/api/hotel/getPresignedPostHotelImageUrl?hotelId=${hotelId}`,
            );
            if (!presignedResponse.ok) {
              const error = await presignedResponse.json();
              throw new Error(error.error || "Failed to get upload URL");
            }
            const { url, fields, imageId, finalImageUrl } =
              await presignedResponse.json();

            // Create form data for upload
            const formData = new FormData();
            Object.entries(fields).forEach(([key, value]) => {
              formData.append(key, value as string);
            });
            formData.append("Content-Type", "image/webp");
            formData.append("file", webpBlob);

            // Upload to S3
            const uploadResponse = await fetch(url, {
              method: "POST",
              body: formData,
            });

            if (!uploadResponse.ok) {
              const error = await uploadResponse.text();
              throw new Error(`Failed to upload image: ${error}`);
            }

            // Create image record
            const createResponse = await fetch("/api/hotel/image", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                hotelId,
                url: finalImageUrl,
              }),
            });

            if (!createResponse.ok) {
              const error = await createResponse.json();
              throw new Error(error.error || "Failed to create image record");
            }
          } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
          }
        });

        // Wait for all image uploads to complete
        await Promise.all(imageUploadPromises);
      }

      const data = await response.json();
      setHotel(data.hotel);
      setIsEditDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDeleteRoomType = async (roomType: RoomType) => {
    setRoomTypeToDelete(roomType);
    setIsDeleteRoomTypeDialogOpen(true);
  };

  const confirmDeleteRoomType = async () => {
    if (!roomTypeToDelete) return;

    try {
      const response = await fetch(
        `/api/hotel/room/${roomTypeToDelete.roomId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete room type");
      }

      setHotel((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          roomTypes: prev.roomTypes.filter(
            (rt) => rt.roomId !== roomTypeToDelete.roomId,
          ),
        };
      });

      setIsDeleteRoomTypeDialogOpen(false);
      setRoomTypeToDelete(null);
      toast.success("Room type deleted successfully");
    } catch (error) {
      console.error("Error deleting room type:", error);
      toast.error("Failed to delete room type");
    }
  };

  const handleRoomTypeInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    setRoomTypeFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setRoomTypeFormData((prev) => ({
        ...prev,
        images: Array.from(files),
      }));
    }
  };

  const convertToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Could not convert to WebP"));
              }
            },
            "image/webp",
            0.8,
          );
        };
        img.onerror = () => reject(new Error("Could not load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  };

  const uploadRoomImages = async (roomId: string) => {
    setIsUploadingImages(true);
    try {
      const webpBlobs = await Promise.all(
        roomImages.map((file) => convertToWebP(file)),
      );

      const formData = new FormData();
      webpBlobs.forEach((blob, index) => {
        formData.append(
          "images",
          new File([blob], `room-${index}.webp`, { type: "image/webp" }),
        );
      });

      const response = await fetch(
        `/api/hotel/${hotelId}/room/${roomId}/images`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Failed to upload images");
      }

      const data = await response.json();
      setHotel((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          roomTypes: prev.roomTypes.map((room) =>
            room.roomId === roomId
              ? { ...room, images: [...room.images, ...data.images] }
              : room,
          ),
        };
      });
      setRoomImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const fetchHotelDetails = async () => {
    try {
      const response = await fetch(`/api/hotel/${hotelId}/manage`);
      if (!response.ok) {
        throw new Error("Failed to fetch hotel");
      }
      const data = await response.json();
      return data.hotel;
    } catch (err) {
      console.error("Error fetching hotel details:", err);
      throw err;
    }
  };

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let createdRoomId: string | null = null;

    try {
      // Create room type first
      const response = await fetch(`/api/hotel/${hotelId}/room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomTypeFormData.name,
          amenities: roomTypeFormData.amenities,
          pricePerNight: parseFloat(roomTypeFormData.pricePerNight),
          totalRooms: parseInt(roomTypeFormData.totalRooms),
          beds: parseInt(roomTypeFormData.beds),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add room type");
      }

      const data = await response.json();
      console.log("Created room type response:", data);

      if (!data.roomType || !data.roomType.roomId) {
        throw new Error("Invalid response from server: missing roomId");
      }

      createdRoomId = data.roomType.roomId;
      console.log("Created room type with ID:", createdRoomId);

      // Upload images if any
      if (roomTypeFormData.images.length > 0) {
        const imageUploadPromises = roomTypeFormData.images.map(
          async (image) => {
            try {
              // Convert to WebP
              const webpBlob = await convertToWebP(image);

              // Get presigned URL
              const presignedResponse = await fetch(
                `/api/hotel/room/getPresignedPostRoomImageUrl?hotelId=${hotelId}`,
              );
              if (!presignedResponse.ok) {
                const error = await presignedResponse.json();
                throw new Error(error.error || "Failed to get upload URL");
              }
              const { url, fields, imageId, finalImageUrl } =
                await presignedResponse.json();
              console.log("Got presigned URL:", {
                url,
                fields,
                imageId,
                finalImageUrl,
              });

              // Create form data for upload
              const formData = new FormData();
              Object.entries(fields).forEach(([key, value]) => {
                formData.append(key, value as string);
              });
              formData.append("Content-Type", "image/webp");
              formData.append("file", webpBlob);

              // Upload to S3
              const uploadResponse = await fetch(url, {
                method: "POST",
                body: formData,
              });

              if (!uploadResponse.ok) {
                const error = await uploadResponse.text();
                throw new Error(`Failed to upload image: ${error}`);
              }

              // Create image record
              console.log("Creating image record with data:", {
                roomId: createdRoomId,
                url: finalImageUrl,
              });
              const createResponse = await fetch("/api/hotel/room/image", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  roomId: createdRoomId,
                  url: finalImageUrl,
                }),
              });

              if (!createResponse.ok) {
                const error = await createResponse.json();
                throw new Error(error.error || "Failed to create image record");
              }
            } catch (error) {
              console.error("Error uploading image:", error);
              throw error;
            }
          },
        );

        // Wait for all image uploads to complete
        await Promise.all(imageUploadPromises);
      }

      // If we get here, everything succeeded
      // Refresh hotel data
      const updatedHotel = await fetchHotelDetails();
      setHotel(updatedHotel);
      setIsAddRoomDialogOpen(false);
      setRoomTypeFormData({
        name: "",
        amenities: "",
        pricePerNight: "0",
        totalRooms: "1",
        beds: "1",
        images: [],
      });
    } catch (error) {
      console.error("Error in room type creation:", error);

      // If we created a room but image upload failed, delete the room
      if (createdRoomId) {
        try {
          console.log(
            "Deleting room due to image upload failure:",
            createdRoomId,
          );
          await fetch(`/api/hotel/${hotelId}/manage/room/${createdRoomId}`, {
            method: "DELETE",
          });
        } catch (deleteError) {
          console.error(
            "Error deleting room after failed image upload:",
            deleteError,
          );
        }
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to add room type",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRoomType = (room: RoomType) => {
    setEditRoomFormData({
      roomId: room.roomId,
      name: room.name,
      amenities: room.amenities,
      pricePerNight: room.pricePerNight.toString(),
      totalRooms: room.totalRooms.toString(),
      beds: room.beds.toString(),
      images: [],
    });
    setSelectedEditRoomAmenities(amenitiesStringToSet(room.amenities));
    setIsEditRoomDialogOpen(true);
  };

  const handleUpdateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // First, update availability data
      const availabilityResponse = await fetch(`/api/hotel/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: editRoomFormData.roomId,
          newTotalRooms: parseInt(editRoomFormData.totalRooms),
        }),
      });

      if (!availabilityResponse.ok) {
        throw new Error("Failed to update room availability");
      }

      // Then update room type details
      const response = await fetch(
        `/api/hotel/room/${editRoomFormData.roomId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editRoomFormData.name,
            amenities: editRoomFormData.amenities,
            pricePerNight: parseFloat(editRoomFormData.pricePerNight),
            totalRooms: parseInt(editRoomFormData.totalRooms),
            beds: parseInt(editRoomFormData.beds),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update room type");
      }

      // Upload new images if any
      if (editRoomFormData.images.length > 0) {
        const imageUploadPromises = editRoomFormData.images.map(
          async (image) => {
            try {
              // Convert to WebP
              const webpBlob = await convertToWebP(image);

              // Get presigned URL
              const presignedResponse = await fetch(
                `/api/hotel/room/getPresignedPostHotelRoomImageUrl?roomId=${editRoomFormData.roomId}`,
              );
              if (!presignedResponse.ok) {
                const error = await presignedResponse.json();
                throw new Error(error.error || "Failed to get upload URL");
              }
              const { url, fields, imageId, finalImageUrl } =
                await presignedResponse.json();

              // Create form data for upload
              const formData = new FormData();
              Object.entries(fields).forEach(([key, value]) => {
                formData.append(key, value as string);
              });
              formData.append("Content-Type", "image/webp");
              formData.append("file", webpBlob);

              // Upload to S3
              const uploadResponse = await fetch(url, {
                method: "POST",
                body: formData,
              });

              if (!uploadResponse.ok) {
                const error = await uploadResponse.text();
                throw new Error(`Failed to upload image: ${error}`);
              }

              // Create image record
              const createResponse = await fetch("/api/hotel/room/image", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  roomId: editRoomFormData.roomId,
                  url: finalImageUrl,
                }),
              });

              if (!createResponse.ok) {
                const error = await createResponse.json();
                throw new Error(error.error || "Failed to create image record");
              }
            } catch (error) {
              console.error("Error uploading image:", error);
              throw error;
            }
          },
        );

        // Wait for all image uploads to complete
        await Promise.all(imageUploadPromises);
      }

      const updatedHotel = await fetchHotelDetails();
      setHotel(updatedHotel);
      setIsEditRoomDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleViewRoomImages = (room: RoomType) => {
    setSelectedRoomImages(room.images);
    setIsViewImagesDialogOpen(true);
  };

  const handleViewHotelImages = (hotel: Hotel) => {
    setSelectedHotelImages(hotel.images);
    setIsViewHotelImagesDialogOpen(true);
  };

  const handleDeleteHotelImage = (image: HotelImage) => {
    setHotelImageToDelete(image);
    setIsDeleteHotelImageDialogOpen(true);
  };

  const confirmDeleteHotelImage = async () => {
    if (!hotelImageToDelete) return;

    try {
      const response = await fetch(
        `/api/hotel/image/${hotelImageToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      setHotel((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          images: prev.images.filter(
            (image) => image.id !== hotelImageToDelete.id,
          ),
        };
      });

      // Update the selected images in the dialog
      setSelectedHotelImages((prev) =>
        prev.filter((image) => image.id !== hotelImageToDelete.id),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDeleteHotelImageDialogOpen(false);
      setHotelImageToDelete(null);
    }
  };

  const handleDeleteRoomImage = (image: RoomTypeImage) => {
    setRoomImageToDelete(image);
    setIsDeleteRoomImageDialogOpen(true);
  };

  const confirmDeleteRoomImage = async () => {
    if (!roomImageToDelete) return;

    try {
      const response = await fetch(
        `/api/hotel/room/image/${roomImageToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      setHotel((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          roomTypes: prev.roomTypes.map((room) => ({
            ...room,
            images: room.images.filter(
              (img) => img.id !== roomImageToDelete.id,
            ),
          })),
        };
      });

      setSelectedRoomImages((prev) =>
        prev.filter((img) => img.id !== roomImageToDelete.id),
      );

      setIsDeleteRoomImageDialogOpen(false);
      setRoomImageToDelete(null);
      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  const handleDeleteHotel = () => {
    setIsDeleteHotelDialogOpen(true);
  };

  const confirmDeleteHotel = async () => {
    if (!confirm("Are you sure you want to delete this hotel? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/hotel/${hotelId}/manage`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete hotel");
      }

      toast.success("Hotel deleted successfully");
      router.push("/hotels/manage");
    } catch (err) {
      console.error("Error deleting hotel:", err);
      toast.error("Failed to delete hotel");
    } finally {
      setIsDeleteHotelDialogOpen(false);
    }
  };

  const handleViewReservations = async (room: RoomType) => {
    try {
      let url = `/api/hotel/reservation?hotelId=${hotelId}&roomId=${room.roomId}`;

      // Add date filter if selected
      if (reservationFilterDate) {
        console.log(reservationFilterDate);
        url += `&date=${reservationFilterDate}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch reservations");
      }
      const data = await response.json();
      setSelectedRoomReservations(data);
      setSelectedRoomForReservations(room);
      setIsViewReservationsDialogOpen(true);
    } catch (err) {
      console.error("Error fetching reservations:", err);
      toast.error("Failed to fetch reservations");
    }
  };

  const handleReservationFilterChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setReservationFilterDate(e.target.value);
  };

  const clearReservationFilter = () => {
    setReservationFilterDate("");
    if (selectedRoomForReservations) {
      handleViewReservations(selectedRoomForReservations);
    }
  };

  const applyReservationFilter = () => {
    if (selectedRoomForReservations) {
      handleViewReservations(selectedRoomForReservations);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm("Are you sure you want to cancel this reservation? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch("/api/hotel/reservation/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId,
          confirmed: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel reservation");
      }

      // Refresh the reservations list
      if (selectedRoomForReservations) {
        handleViewReservations(selectedRoomForReservations);
      }

      toast.success("Reservation cancelled successfully");
    } catch (err) {
      console.error("Error cancelling reservation:", err);
      toast.error("Failed to cancel reservation");
    }
  };

  const handleViewAvailability = async (room: RoomType) => {
    try {
      const response = await fetch(`/api/hotel/availability?roomId=${room.roomId}&fromDate=${availabilityDateRange.fromDate}&endDate=${availabilityDateRange.toDate}`);
      if (!response.ok) {
        throw new Error("Failed to fetch availability");
      }
      const data = await response.json();
      setSelectedRoomAvailability(data);
      setSelectedRoomForAvailability(room);
      setIsViewAvailabilityDialogOpen(true);
    } catch (err) {
      console.error("Error fetching availability:", err);
      toast.error("Failed to fetch availability");
    }
  };

  const handleAvailabilityDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAvailabilityDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchAvailabilityForDateRange = async () => {
    if (!selectedRoomForAvailability) return;
    
    try {
      const response = await fetch(`/api/hotel/availability?roomId=${selectedRoomForAvailability.roomId}&fromDate=${availabilityDateRange.fromDate}&endDate=${availabilityDateRange.toDate}`);
      if (!response.ok) {
        throw new Error("Failed to fetch availability");
      }
      const data = await response.json();
      setSelectedRoomAvailability(data);
    } catch (err) {
      console.error("Error fetching availability:", err);
      toast.error("Failed to fetch availability");
    }
  };

  // Helper function to convert set to comma-separated string
  const amenitiesSetToString = (amenities: Set<string>): string =>
    Array.from(amenities).join(",");

  // Helper function to convert comma-separated string to set
  const amenitiesStringToSet = (amenitiesString?: string): Set<string> =>
    new Set(
      amenitiesString ? amenitiesString.split(",").map((a) => a.trim()) : [],
    );

  // Effect to update editFormData when selectedEditAmenities changes
  useEffect(() => {
    setEditFormData((prev) => ({
      ...prev,
      amenities: amenitiesSetToString(selectedEditAmenities),
    }));
  }, [selectedEditAmenities]);

  // Effect to update roomTypeFormData when selectedAddRoomAmenities changes
  useEffect(() => {
    setRoomTypeFormData((prev) => ({
      ...prev,
      amenities: amenitiesSetToString(selectedAddRoomAmenities),
    }));
  }, [selectedAddRoomAmenities]);

  // Effect to update editRoomFormData when selectedEditRoomAmenities changes
  useEffect(() => {
    setEditRoomFormData((prev) => ({
      ...prev,
      amenities: amenitiesSetToString(selectedEditRoomAmenities),
    }));
  }, [selectedEditRoomAmenities]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Hotel not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/hotels/manage")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Hotels
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{hotel.name}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => handleEditHotel(hotel)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Hotel
          </Button>
          <Button variant="destructive" onClick={handleDeleteHotel}>
            <Trash className="w-4 h-4 mr-2" />
            Delete Hotel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold mb-4">Hotel Details</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Address:</span>{" "}
                {hotel.streetAddress}, {hotel.city}, {hotel.province},{" "}
                {hotel.postalCode}, {hotel.country}
              </p>
              <p>
                <span className="font-medium">Star Rating:</span>{" "}
                <Star className="w-4 h-4 inline-block text-yellow-400" />{" "}
                {hotel.starRating}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Hotel Images</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewHotelImages(hotel)}
              >
                View All Images
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {hotel.images.slice(0, 2).map((image) => (
                <div key={image.id} className="relative aspect-video">
                  <Image
                    src={image.url}
                    alt={`${hotel.name} image`}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Room Types</h2>
          <Dialog
            open={isAddRoomDialogOpen}
            onOpenChange={setIsAddRoomDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Room Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Room Type</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddRoomType} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={roomTypeFormData.name}
                    onChange={handleRoomTypeInputChange}
                    required
                  />
                </div>
                <div>
                  <Label>Amenities</Label>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {availableAmenities.map((amenityKey) => {
                      const amenity = amenityIcons[amenityKey];
                      if (!amenity) return null;
                      const isSelected =
                        selectedAddRoomAmenities.has(amenityKey);
                      return (
                        <Button
                          key={amenityKey}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => {
                            setSelectedAddRoomAmenities((prev) => {
                              const next = new Set(prev);
                              if (isSelected) {
                                next.delete(amenityKey);
                              } else {
                                next.add(amenityKey);
                              }
                              return next;
                            });
                          }}
                          className={cn(
                            "flex items-center space-x-2 h-auto px-3 py-1.5 text-left rounded-md transition-colors border border-transparent",
                            isSelected &&
                              "bg-primary text-primary-foreground hover:bg-primary/90",
                          )}
                        >
                          <amenity.icon className="w-4 h-4" />
                          <span>{amenity.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label htmlFor="pricePerNight">Price per Night</Label>
                  <Input
                    id="pricePerNight"
                    name="pricePerNight"
                    type="number"
                    min="0"
                    value={roomTypeFormData.pricePerNight}
                    onChange={handleRoomTypeInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="totalRooms">Total Rooms</Label>
                  <Input
                    id="totalRooms"
                    name="totalRooms"
                    type="number"
                    min="0"
                    value={roomTypeFormData.totalRooms}
                    onChange={handleRoomTypeInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="beds">Number of Beds</Label>
                  <Input
                    id="beds"
                    name="beds"
                    type="number"
                    min="1"
                    value={roomTypeFormData.beds}
                    onChange={handleRoomTypeInputChange}
                    required
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="images">Room Images</Label>
                    <Input
                      id="images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleRoomImageChange}
                    />
                  </div>
                  {roomTypeFormData.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {roomTypeFormData.images.map((image, index) => (
                        <div key={index} className="relative">
                          <Image
                            src={URL.createObjectURL(image)}
                            alt={`Room image ${index + 1}`}
                            width={200}
                            height={200}
                            className="rounded-lg object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setRoomTypeFormData((prev) => ({
                                ...prev,
                                images: prev.images.filter(
                                  (_, i) => i !== index,
                                ),
                              }));
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={isUploadingImages}>
                  Add Room Type
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotel.roomTypes.map((room) => (
            <Card key={room.roomId}>
              <CardContent className="p-4">
                <div className="relative h-48 mb-4">
                  {room.images.length > 0 ? (
                    <Image
                      src={room.images[0].url}
                      alt={room.name}
                      fill
                      className="object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <MapPin className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2">{room.name}</h3>
                <div className="flex flex-wrap gap-1 mb-2">
                  {parseAmenities(room.amenities).map((amenity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md"
                      title={amenity.label}
                    >
                      <amenity.icon className="h-3 w-3" />
                      <span>{amenity.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bed className="w-4 h-4" />
                    <span>
                      {room.beds} {room.beds === 1 ? "bed" : "beds"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DoorOpen className="w-4 h-4" />
                    <span>
                      {room.totalRooms}{" "}
                      {room.totalRooms === 1 ? "room" : "rooms"}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-2xl font-bold">
                      ${room.pricePerNight}
                    </span>
                    <span className="text-muted-foreground">/night</span>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAvailability(room)}
                    >
                      <DoorOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReservations(room)}
                    >
                      <Calendar className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRoomImages(room)}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRoomType(room)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteRoomType(room)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Hotel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Hotel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateHotel} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                name="country"
                value={editFormData.country}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, country: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                name="province"
                value={editFormData.province}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, province: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={editFormData.city}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, city: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="streetAddress">Street Address</Label>
              <Input
                id="streetAddress"
                name="streetAddress"
                value={editFormData.streetAddress}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    streetAddress: e.target.value,
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                name="postalCode"
                value={editFormData.postalCode}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    postalCode: e.target.value,
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="starRating">Star Rating</Label>
              <Input
                id="starRating"
                name="starRating"
                type="number"
                min="1"
                max="5"
                value={editFormData.starRating}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    starRating: Number(e.target.value),
                  })
                }
                required
              />
            </div>
            <div>
              <Label>Amenities</Label>
              <div className="flex flex-wrap gap-2 pt-2">
                {availableAmenities.map((amenityKey) => {
                  const amenity = amenityIcons[amenityKey];
                  if (!amenity) return null;
                  const isSelected = selectedEditAmenities.has(amenityKey);
                  return (
                    <Button
                      key={amenityKey}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => {
                        setSelectedEditAmenities((prev) => {
                          const next = new Set(prev);
                          if (isSelected) {
                            next.delete(amenityKey);
                          } else {
                            next.add(amenityKey);
                          }
                          return next;
                        });
                      }}
                      className={cn(
                        "flex items-center space-x-2 h-auto px-3 py-1.5 text-left rounded-md transition-colors border border-transparent",
                        isSelected &&
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                    >
                      <amenity.icon className="w-4 h-4" />
                      <span>{amenity.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hotel-images">Add Images</Label>
                <Input
                  id="hotel-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleHotelImageChange}
                />
              </div>
              {editFormData.images.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {editFormData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={URL.createObjectURL(image)}
                        alt={`Hotel image ${index + 1}`}
                        width={200}
                        height={200}
                        className="rounded-lg object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setEditFormData((prev) => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== index),
                          }));
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit">Update Hotel</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Room Type Dialog */}
      <Dialog
        open={isEditRoomDialogOpen}
        onOpenChange={setIsEditRoomDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room Type</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateRoomType} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                value={editRoomFormData.name}
                onChange={(e) =>
                  setEditRoomFormData({
                    ...editRoomFormData,
                    name: e.target.value,
                  })
                }
                required
              />
            </div>
            <div>
              <Label>Amenities</Label>
              <div className="flex flex-wrap gap-2 pt-2">
                {availableAmenities.map((amenityKey) => {
                  const amenity = amenityIcons[amenityKey];
                  if (!amenity) return null;
                  const isSelected = selectedEditRoomAmenities.has(amenityKey);
                  return (
                    <Button
                      key={amenityKey}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => {
                        setSelectedEditRoomAmenities((prev) => {
                          const next = new Set(prev);
                          if (isSelected) {
                            next.delete(amenityKey);
                          } else {
                            next.add(amenityKey);
                          }
                          return next;
                        });
                      }}
                      className={cn(
                        "flex items-center space-x-2 h-auto px-3 py-1.5 text-left rounded-md transition-colors border border-transparent",
                        isSelected &&
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                    >
                      <amenity.icon className="w-4 h-4" />
                      <span>{amenity.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-pricePerNight">Price per Night</Label>
              <Input
                id="edit-pricePerNight"
                name="pricePerNight"
                type="number"
                min="0"
                value={editRoomFormData.pricePerNight}
                onChange={(e) =>
                  setEditRoomFormData({
                    ...editRoomFormData,
                    pricePerNight: e.target.value,
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-totalRooms">Total Rooms</Label>
              <Input
                id="edit-totalRooms"
                name="totalRooms"
                type="number"
                min="0"
                value={editRoomFormData.totalRooms}
                onChange={(e) =>
                  setEditRoomFormData({
                    ...editRoomFormData,
                    totalRooms: e.target.value,
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-beds">Number of Beds</Label>
              <Input
                id="edit-beds"
                name="beds"
                type="number"
                min="1"
                value={editRoomFormData.beds}
                onChange={(e) =>
                  setEditRoomFormData({
                    ...editRoomFormData,
                    beds: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-room-images">Add Images</Label>
                <Input
                  id="edit-room-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      setEditRoomFormData((prev) => ({
                        ...prev,
                        images: Array.from(files),
                      }));
                    }
                  }}
                />
              </div>
              {editRoomFormData.images.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {editRoomFormData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={URL.createObjectURL(image)}
                        alt={`Room image ${index + 1}`}
                        width={200}
                        height={200}
                        className="rounded-lg object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setEditRoomFormData((prev) => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== index),
                          }));
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit">Update Room Type</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Room Images Dialog */}
      <Dialog
        open={isViewImagesDialogOpen}
        onOpenChange={setIsViewImagesDialogOpen}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Room Images</DialogTitle>
            <DialogDescription>
              View and manage all images for this room type
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedRoomImages.map((image) => (
              <div key={image.id} className="relative group">
                <Image
                  src={image.url}
                  alt="Room image"
                  width={300}
                  height={200}
                  className="rounded-lg object-cover w-full h-48"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteRoomImage(image)}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Hotel Images Dialog */}
      <Dialog
        open={isViewHotelImagesDialogOpen}
        onOpenChange={setIsViewHotelImagesDialogOpen}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Hotel Images</DialogTitle>
            <DialogDescription>
              View and manage all images for this hotel
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedHotelImages.map((image) => (
              <div key={image.id} className="relative group">
                <Image
                  src={image.url}
                  alt="Hotel image"
                  width={300}
                  height={200}
                  className="rounded-lg object-cover w-full h-48"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteHotelImage(image)}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Room Type Confirmation Dialog */}
      <Dialog
        open={isDeleteRoomTypeDialogOpen}
        onOpenChange={setIsDeleteRoomTypeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this room type? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteRoomTypeDialogOpen(false);
                setRoomTypeToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRoomType}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Hotel Confirmation Dialog */}
      <Dialog
        open={isDeleteHotelDialogOpen}
        onOpenChange={setIsDeleteHotelDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Hotel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this hotel? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteHotelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteHotel}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Room Image Confirmation Dialog */}
      <Dialog
        open={isDeleteRoomImageDialogOpen}
        onOpenChange={setIsDeleteRoomImageDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteRoomImageDialogOpen(false);
                setRoomImageToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRoomImage}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Hotel Image Confirmation Dialog */}
      <Dialog
        open={isDeleteHotelImageDialogOpen}
        onOpenChange={setIsDeleteHotelImageDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Hotel Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteHotelImageDialogOpen(false);
                setHotelImageToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteHotelImage}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Reservations Dialog */}
      <Dialog
        open={isViewReservationsDialogOpen}
        onOpenChange={setIsViewReservationsDialogOpen}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Reservations for {selectedRoomForReservations?.name}
            </DialogTitle>
            <DialogDescription>
              View and manage all reservations for this room type
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReservationFilters(!showReservationFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {showReservationFilters ? "Hide Filters" : "Show Filters"}
            </Button>

            {showReservationFilters && (
              <div className="mt-4 p-4 border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Filter by Date</h4>
                  {reservationFilterDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearReservationFilter}
                      className="h-8 px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={reservationFilterDate}
                    onChange={handleReservationFilterChange}
                    className="flex-1"
                  />
                  <Button onClick={applyReservationFilter}>Apply</Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {selectedRoomReservations.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No reservations found
              </p>
            ) : (
              selectedRoomReservations.map((reservation) => (
                <Card key={reservation.reservationId}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">
                          {reservation.user.firstName}{" "}
                          {reservation.user.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {reservation.user.email}
                        </p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm">
                            Check-in:{" "}
                            {format(new Date(reservation.checkInDate), "dd/MM/yyyy")}
                          </p>
                          <p className="text-sm">
                            Check-out:{" "}
                            {format(new Date(reservation.checkOutDate), "dd/MM/yyyy")}
                          </p>
                          <p className="text-sm">
                            Status:{" "}
                            <span className="capitalize">
                              {reservation.status.toLowerCase()}
                            </span>
                          </p>
                        </div>
                      </div>
                      {reservation.status !== "CANCELLED" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleCancelReservation(reservation.reservationId)
                          }
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Availability Dialog */}
      <Dialog
        open={isViewAvailabilityDialogOpen}
        onOpenChange={setIsViewAvailabilityDialogOpen}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Availability for {selectedRoomForAvailability?.name}
            </DialogTitle>
            <DialogDescription>
              View the availability of this room type for a selected date range
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4 p-4 border rounded-md">
            <h4 className="font-medium mb-2">Select Date Range</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  name="fromDate"
                  type="date"
                  value={availabilityDateRange.fromDate}
                  onChange={handleAvailabilityDateChange}
                />
              </div>
              <div>
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  name="toDate"
                  type="date"
                  value={availabilityDateRange.toDate}
                  onChange={handleAvailabilityDateChange}
                />
              </div>
            </div>
            <Button 
              className="mt-4" 
              onClick={fetchAvailabilityForDateRange}
            >
              Apply Date Range
            </Button>
          </div>

          <div className="space-y-4">
            {selectedRoomAvailability.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No availability data found
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      <th className="text-left p-2 border-b">Date</th>
                      <th className="text-left p-2 border-b">Available Rooms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRoomAvailability.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <td className="p-2 border-b">{format(new Date(item.date), "dd/MM/yyyy")}</td>
                        <td className="p-2 border-b">{item.availableRooms}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
