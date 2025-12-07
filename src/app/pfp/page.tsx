"use client";

import { useState, useRef } from "react";
import { useSession } from "../session-provider";
import { Button } from "~/components/ui/button";
import { redirect } from "next/navigation";

export default function ProfilePicturePage() {
  const session = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!session) {
    redirect("/");
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create preview
        setImagePreview(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const convertToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return reject(new Error("Canvas not available"));

        // Calculate dimensions (maintaining aspect ratio)
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height = (height * MAX_SIZE) / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = (width * MAX_SIZE) / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not get canvas context"));

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Failed to convert to WebP"));
            resolve(blob);
          },
          "image/webp",
          0.9,
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadProfilePicture = async () => {
    if (!fileInputRef.current?.files?.length) {
      setError("Please select an image first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert to WebP
      const webpBlob = await convertToWebP(fileInputRef.current.files[0]);

      // Get presigned URL
      const presignedResponse = await fetch(
        "/api/account/getPresignedPostProfilePictureUrl",
      );
      if (!presignedResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { url, fields } = await presignedResponse.json();

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
        console.log(await uploadResponse.text());
        throw new Error("Failed to upload image");
      }

      setSuccess("Profile picture updated successfully!");

      // Reload after a short delay to see the new profile picture
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Update Profile Picture</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {success}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Select a new profile picture
        </label>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-primary file:text-white
            hover:file:bg-primary/90"
        />
      </div>

      {imagePreview && (
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Preview:</p>
          <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-gray-200">
            <img
              src={imagePreview}
              alt="Preview"
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      )}

      <Button
        onClick={uploadProfilePicture}
        disabled={isLoading || !imagePreview}
        className="w-full"
      >
        {isLoading ? "Uploading..." : "Upload Profile Picture"}
      </Button>

      {/* Hidden canvas for WebP conversion */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
