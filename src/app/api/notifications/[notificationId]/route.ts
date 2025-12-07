import { NextResponse, NextRequest } from "next/server";
import { ensureLoggedIn } from "../../middleware";
import { db } from "~/server/db";
import { JwtPayload } from "jsonwebtoken";

// PATCH - Mark a notification as read
export const PATCH = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    const notificationId = req.url.split("/").pop();

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 },
      );
    }

    try {
      // First check if the notification exists and belongs to the user
      const notification = await db.notification.findUnique({
        where: {
          notificationId: notificationId,
        },
      });

      if (!notification) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 },
        );
      }

      if (notification.userId !== session.user.id) {
        return NextResponse.json(
          { error: "You are not authorized to update this notification" },
          { status: 403 },
        );
      }

      // Update the notification to mark it as read
      const updatedNotification = await db.notification.update({
        where: {
          notificationId: notificationId,
        },
        data: {
          read: true,
        },
      });

      return NextResponse.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return NextResponse.json(
        { error: "Failed to mark notification as read" },
        { status: 500 },
      );
    }
  },
);

// DELETE - Delete a notification
export const DELETE = ensureLoggedIn(
  async (req: NextRequest, res: NextResponse, session: JwtPayload) => {
    const notificationId = req.url.split("/").pop();

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 },
      );
    }

    try {
      // First check if the notification exists and belongs to the user
      const notification = await db.notification.findUnique({
        where: {
          notificationId: notificationId,
        },
      });

      if (!notification) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 },
        );
      }

      if (notification.userId !== session.user.id) {
        return NextResponse.json(
          { error: "You are not authorized to delete this notification" },
          { status: 403 },
        );
      }

      // Delete the notification
      await db.notification.delete({
        where: {
          notificationId: notificationId,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      return NextResponse.json(
        { error: "Failed to delete notification" },
        { status: 500 },
      );
    }
  },
);
