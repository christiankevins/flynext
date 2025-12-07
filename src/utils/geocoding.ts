import { env } from "~/env";

interface GeocodingResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodingResult> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${env.GOOGLE_MAPS_API_KEY}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch coordinates");
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results[0]) {
      throw new Error("No results found for the address");
    }

    const location = data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
}

export async function geocodeAddressRaw(address: string) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${env.GOOGLE_MAPS_API_KEY}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch coordinates");
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results[0]) {
      throw new Error("No results found for the address");
    }

    return data.results[0];
  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
}
