import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { getSession } from "~/server/session";
import { z } from "zod";

// Update schema to handle both hotel and flight data
const cartItemSchema = z.object({
  // Hotel fields
  roomId: z.string().optional(),
  hotelId: z.string().optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),

  // Flight fields
  outboundFlightIds: z.array(z.string()).optional(),
  returnFlightIds: z.array(z.string()).optional(),
  
  // Booking field
  bookingId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = cartItemSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { message: "Invalid request data" },
        { status: 400 },
      );
    }
    console.log("parse body", validatedData);

    // Check if we're updating the bookingId
    if (validatedData.data.bookingId) {
      // Check if user already has a cart item
      const existingCartItem = await db.cartItem.findUnique({
        where: { userId: session.user.id },
      });
      console.log("existingCartItem", existingCartItem);
      if (existingCartItem) {
        // Update existing cart item with bookingId
        const cartItem = await db.cartItem.update({
          where: { userId: session.user.id },
          data: {
            bookingId: validatedData.data.bookingId,
          },
        });
        console.log("cartItem", cartItem);
        return NextResponse.json({ cartItem }, { status: 200 });
      } else {
        return NextResponse.json(
          { message: "No cart item found to update" },
          { status: 404 },
        );
      }
    }

    // Check if we're adding a hotel or a flight
    if (validatedData.data.roomId) {
      // Handle hotel room addition
      const { roomId, hotelId, checkInDate, checkOutDate } = validatedData.data;

      // Check if the room exists and is available
      const room = await db.roomType.findUnique({
        where: { roomId },
        include: {
          availabilities: {
            where: {
              date: {
                gte: new Date(checkInDate!),
                lte: new Date(checkOutDate!),
              },
            },
          },
        },
      });

      if (!room) {
        return NextResponse.json(
          { message: "Room not found" },
          { status: 404 },
        );
      }

      // Check if room is available for the selected dates
      const isAvailable = room.availabilities.every(
        (availability) => availability.availableRooms > 0,
      );

      if (!isAvailable) {
        return NextResponse.json(
          { message: "Room is not available for the selected dates" },
          { status: 400 },
        );
      }

      // Check if user already has a cart item
      const existingCartItem = await db.cartItem.findUnique({
        where: { userId: session.user.id },
      });

      if (existingCartItem) {
        // Update existing cart item with hotel room
        const cartItem = await db.cartItem.update({
          where: { userId: session.user.id },
          data: {
            singleRoomId: roomId,
            checkInDate: new Date(checkInDate!),
            checkOutDate: new Date(checkOutDate!),
          },
        });
        return NextResponse.json({ cartItem }, { status: 200 });
      } else {
        // Create new cart item with hotel room
        const cartItem = await db.cartItem.create({
          data: {
            userId: session.user.id,
            singleRoomId: roomId,
            checkInDate: new Date(checkInDate!),
            checkOutDate: new Date(checkOutDate!),
          },
        });
        return NextResponse.json({ cartItem }, { status: 200 });
      }
    } else if (
      validatedData.data.outboundFlightIds ||
      validatedData.data.returnFlightIds
    ) {
      // Handle flight addition
      const { outboundFlightIds, returnFlightIds } = validatedData.data;

      // Check if user already has a cart item
      const existingCartItem = await db.cartItem.findUnique({
        where: { userId: session.user.id },
      });

      if (existingCartItem) {
        // Update existing cart item with flight
        const updateData: any = {};

        if (outboundFlightIds) {
          updateData.outboundFlights = outboundFlightIds;
        }

        if (returnFlightIds) {
          updateData.returnFlights = returnFlightIds;
        }

        const cartItem = await db.cartItem.update({
          where: { userId: session.user.id },
          data: updateData,
        });
        return NextResponse.json({ cartItem }, { status: 200 });
      } else {
        // Create new cart item with flight
        const createData: any = {
          userId: session.user.id,
        };

        if (outboundFlightIds) {
          createData.outboundFlights = outboundFlightIds;
        }

        if (returnFlightIds) {
          createData.returnFlights = returnFlightIds;
        }

        const cartItem = await db.cartItem.create({
          data: createData,
        });
        return NextResponse.json({ cartItem }, { status: 200 });
      }
    } else {
      return NextResponse.json(
        { message: "Either room or flight data must be provided" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Add GET endpoint to fetch cart items
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to view cart" },
        { status: 401 },
      );
    }

    const cartItem = await db.cartItem.findUnique({
      where: {
        userId: session.user.id,
      },
      include: {
        room: {
          include: {
            hotel: {
              include: {
                images: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ cartItem }, { status: 200 });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to remove items from cart" },
        { status: 401 },
      );
    }

    // Parse request body to determine what to remove
    let body;
    try {
      body = await req.json();
    } catch (e) {
      // If no body, clear the entire cart
      await db.cartItem.delete({
        where: {
          userId: session.user.id,
        },
      });
      return NextResponse.json(
        { message: "Cart cleared successfully" },
        { status: 200 },
      );
    }

    // Check if we're removing a specific item
    if (body.hotelId || body.flightId) {
      const cartItem = await db.cartItem.findUnique({
        where: { userId: session.user.id },
      });

      if (!cartItem) {
        return NextResponse.json(
          { message: "Cart not found" },
          { status: 404 },
        );
      }

      // Update the cart item to remove the specified item
      const updateData: any = {};

      if (body.hotelId) {
        updateData.singleRoomId = null;
        updateData.checkInDate = null;
        updateData.checkOutDate = null;
      }

      if (body.flightId) {
        if (body.flightType === "departure") {
          updateData.outboundFlights = [];
        } else if (body.flightType === "return") {
          updateData.returnFlights = [];
        }
      }

      await db.cartItem.update({
        where: { userId: session.user.id },
        data: updateData,
      });

      return NextResponse.json(
        { message: "Item removed from cart" },
        { status: 200 },
      );
    }

    // If no specific item to remove, clear the entire cart
    await db.cartItem.delete({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      { message: "Cart cleared successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error clearing cart:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
