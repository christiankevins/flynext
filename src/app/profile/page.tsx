"use client";

import { useState } from "react";
import { useSession } from "../session-provider";
import { Button } from "~/components/ui/button";
import { Avatar } from "~/components/avatar";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const session = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    new: {
      firstName: session?.user.firstName || "",
      lastName: session?.user.lastName || "",
      email: session?.user.email || "",
      phoneNumber: session?.user.phoneNumber || "",
      password: "",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!session) {
    redirect("/");
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "currentPassword") {
      setFormData((prev) => ({ ...prev, password: value }));
    } else {
      setFormData((prev) => ({
        ...prev,
        new: { ...prev.new, [name]: value },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      setSuccess("Profile updated successfully!");
      // Reload the page after successful update
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 shadow-md">
      <h1 className="text-2xl font-bold mb-6">Update Profile</h1>

      <div className="flex items-center mb-6">
        <Link href="/pfp">
          <Avatar
            src={session.user.profilePictureUrl}
            alt="Profile picture"
            className="size-16 mr-4"
          />
        </Link>
        <div>
          <p className="font-medium">{session.user.email}</p>
        </div>
      </div>

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

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="mb-4">
          <label htmlFor="firstName" className="block text-sm font-medium mb-1">
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.new.firstName}
            onChange={handleChange}
            className="input-field"
            required
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="lastName" className="block text-sm font-medium mb-1">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.new.lastName}
            onChange={handleChange}
            className="input-field"
            required
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium mb-1"
          >
            Phone Number
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.new.phoneNumber}
            onChange={handleChange}
            className="input-field"
            placeholder="+1234567890"
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="newEmail" className="block text-sm font-medium mb-1">
            New Email
          </label>
          <input
            type="email"
            id="newEmail"
            name="email"
            value={formData.new.email}
            onChange={handleChange}
            className="input-field"
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium mb-1"
          >
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            name="password"
            value={formData.new.password}
            onChange={handleChange}
            className="input-field"
            autoComplete="off"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium mb-1"
          >
            Current Password
          </label>
          <input
            type="password"
            id="currentPassword"
            name="currentPassword"
            value={formData.password}
            onChange={handleChange}
            className="input-field"
            required
            autoComplete="off"
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </div>
  );
}
