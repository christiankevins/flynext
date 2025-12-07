import { createHash } from "crypto";
import { z } from "zod";

/*
    List cities.
*/
export async function listCities() {
  const schema = z.array(z.object({ city: z.string(), country: z.string() }));

  const response = await afsFetch("cities");
  const json = await response.json();
  if (response.status >= 400) {
    throw new AFSError(json.error, response.status);
  }

  return schema.parse(json);
}

/*
    List airports.
*/
export async function listAirports() {
  const schema = z.array(
    z.object({
      city: z.string(),
      code: z.string(),
      country: z.string(),
      id: z.string(),
      name: z.string(),
    }),
  );

  const response = await afsFetch("airports");

  const json = await response.json();
  if (response.status >= 400) {
    throw new AFSError(json.error, response.status);
  }

  return schema.parse(json);
}

/*
    List airlines.
*/
export async function listAirlines() {
  const schema = z.array(
    z.object({
      base: z.object({
        city: z.string(),
        code: z.string(),
        country: z.string(),
        name: z.string(),
      }),
      code: z.string(),
      name: z.string(),
    }),
  );

  const response = await afsFetch("airlines");
  const json = await response.json();
  if (response.status >= 400) {
    throw new AFSError(json.error, response.status);
  }

  return schema.parse(json);
}

/*
    List flights.
*/
export async function listFlights({
  origin,
  destination,
  date,
}: {
  origin: string;
  destination: string;
  date: string;
}) {
  const schema = z.object({
    results: z.array(
      z.object({
        flights: z.array(
          z.object({
            airline: z.object({ code: z.string(), name: z.string() }),
            arrivalTime: z.string(),
            availableSeats: z.number(),
            currency: z.string(),
            departureTime: z.string(),
            destination: z.object({
              city: z.string(),
              code: z.string(),
              country: z.string(),
              name: z.string(),
            }),
            destinationId: z.string(),
            duration: z.number(),
            flightNumber: z.string(),
            id: z.string(),
            origin: z.object({
              city: z.string(),
              code: z.string(),
              country: z.string(),
              name: z.string(),
            }),
            originId: z.string(),
            price: z.number(),
            status: z.string(),
          }),
        ),
      }),
    ),
  });

  const response = await afsFetch(
    `flights?origin=${encodeURIComponent(
      origin,
    )}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(
      date,
    )}`,
  );
  const json = await response.json();
  if (response.status >= 400) {
    throw new AFSError(json.error, response.status);
  }

  return schema.parse(json);
}

/*
    Get flight.
*/
export async function getFlight({ id }: { id: string }) {
  const schema = z.object({
    airline: z.object({
      code: z.string(),
      name: z.string(),
    }),
    arrivalTime: z.string(),
    availableSeats: z.number(),
    currency: z.string(),
    departureTime: z.string(),
    destination: z.object({
      city: z.string(),
      code: z.string(),
      country: z.string(),
      name: z.string(),
    }),
    destinationId: z.string(),
    duration: z.number(),
    flightNumber: z.string(),
    id: z.string(),
    origin: z.object({
      city: z.string(),
      code: z.string(),
      country: z.string(),
      name: z.string(),
    }),
    originId: z.string(),
    price: z.number(),
    status: z.string(),
  });

  console.log("Fetching flight", id);

  const response = await afsFetch(`flights/${id}`);
  const json = await response.json();
  if (response.status >= 400) {
    throw new AFSError(json.error, response.status);
  }

  return schema.parse(json);
}

/*
    Create booking.
*/
export async function createBooking({
  email,
  firstName,
  flightIds,
  lastName,
  passportNumber,
}: {
  email: string;
  firstName: string;
  flightIds: string[];
  lastName: string;
  passportNumber: string;
}) {
  const schema = z.object({
    agencyId: z.string(),
    bookingReference: z.string(),
    createdAt: z.string(),
    email: z.string(),
    firstName: z.string(),
    flights: z.array(
      z.object({
        airline: z.object({
          code: z.string(),
          name: z.string(),
        }),
        arrivalTime: z.string(),
        availableSeats: z.number(),
        currency: z.string(),
        departureTime: z.string(),
        destination: z.object({
          city: z.string(),
          code: z.string(),
          country: z.string(),
          name: z.string(),
        }),
        destinationId: z.string(),
        duration: z.number(),
        flightNumber: z.string(),
        id: z.string(),
        origin: z.object({
          city: z.string(),
          code: z.string(),
          country: z.string(),
          name: z.string(),
        }),
        originId: z.string(),
        price: z.number(),
        status: z.string(),
      }),
    ),
    lastName: z.string(),
    passportNumber: z.string(),
    status: z.string(),
    ticketNumber: z.string(),
  });
  const response = await afsFetch("bookings", {
    method: "POST",
    body: JSON.stringify({
      email,
      firstName,
      flightIds,
      lastName,
      passportNumber,
    }),
  });

  const json = await response.json();
  if (response.status >= 400) {
    throw new AFSError(json.error, response.status);
  }

  return schema.parse(json);
}

export async function retrieveBooking({
  lastName,
  bookingReference,
}: {
  lastName: string;
  bookingReference: string;
}) {
  const schema = z.object({
    agencyId: z.string(),
    bookingReference: z.string(),
    createdAt: z.string(),
    email: z.string(),
    firstName: z.string(),
    flights: z.array(
      z.object({
        airline: z.object({
          code: z.string(),
          name: z.string(),
        }),
        arrivalTime: z.string(),
        availableSeats: z.number(),
        currency: z.string(),
        departureTime: z.string(),
        destination: z.object({
          city: z.string(),
          code: z.string(),
          country: z.string(),
          name: z.string(),
        }),
        destinationId: z.string(),
        duration: z.number(),
        flightNumber: z.string(),
        id: z.string(),
        origin: z.object({
          city: z.string(),
          code: z.string(),
          country: z.string(),
          name: z.string(),
        }),
        originId: z.string(),
        price: z.number(),
        status: z.string(),
      }),
    ),
    lastName: z.string(),
    passportNumber: z.string(),
    status: z.string(),
    ticketNumber: z.string(),
  });

  const response = await afsFetch(
    `bookings/retrieve?lastName=${encodeURIComponent(
      lastName,
    )}&bookingReference=${encodeURIComponent(bookingReference)}`,
  );
  const json = await response.json();
  if (response.status >= 400) {
    throw new AFSError(json.error, response.status);
  }

  return schema.parse(json);
}

export async function cancelBooking({
  lastName,
  bookingReference,
}: {
  lastName: string;
  bookingReference: string;
}) {
  const schema = z.object({
    agencyId: z.string(),
    bookingReference: z.string(),
    createdAt: z.string(),
    email: z.string(),
    firstName: z.string(),
    flights: z.array(
      z.object({
        airline: z.object({
          code: z.string(),
          name: z.string(),
        }),
        arrivalTime: z.string(),
        availableSeats: z.number(),
        currency: z.string(),
        departureTime: z.string(),
        destination: z.object({
          city: z.string(),
          code: z.string(),
          country: z.string(),
          name: z.string(),
        }),
        destinationId: z.string(),
        duration: z.number(),
        flightNumber: z.string(),
        id: z.string(),
        origin: z.object({
          city: z.string(),
          code: z.string(),
          country: z.string(),
          name: z.string(),
        }),
        originId: z.string(),
        price: z.number(),
        status: z.string(),
      })
    ),
    lastName: z.string(),
    passportNumber: z.string(),
    status: z.string(),
    ticketNumber: z.string(),
  });

  const response = await afsFetch("bookings/cancel", {
    method: "POST",
    body: JSON.stringify({
      lastName,
      bookingReference,
    }),
  });

  const json = await response.json();
  if (response.status >= 400) {
    throw new AFSError(json.error, response.status);
  }

  return schema.parse(json);
}

/*
    Internal tool, don't use outside of this file.
*/
const afsFetch = (path: string, init: RequestInit = {}) => {
  return typeof window === "undefined"
    ? fetch(`${process.env.AFS_BASE_URL!}/api/${path}`, {
        headers: {
          "x-api-key": createHash("sha256")
            .update(process.env.AFS_PASSWORD!)
            .digest("hex"),
          ...init.headers,
        },
        ...init,
      })
    : fetch(`/api/afs/${path}`, init);
};

export class AFSError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
