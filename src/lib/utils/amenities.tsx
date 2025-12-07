import {
  Wifi,
  Tv,
  Wind,
  Coffee,
  Bath,
  Utensils,
  Car,
  WavesLadder,
  Dumbbell,
  Snowflake,
  Wine,
  Phone,
  Lock,
  PawPrint,
  Shirt,
  Baby,
  Cigarette,
  CigaretteOff,
  type LucideIcon,
} from "lucide-react";

interface AmenityIcon {
  icon: LucideIcon;
  label: string;
}

// Define available amenities and their corresponding icons/labels
export const amenityIcons: Record<string, AmenityIcon> = {
  wifi: { icon: Wifi, label: "WiFi" },
  tv: { icon: Tv, label: "TV" },
  ac: { icon: Snowflake, label: "Air Conditioning" },
  coffee: { icon: Coffee, label: "Coffee Maker" },
  bathroom: { icon: Bath, label: "Private Bathroom" },
  kitchen: { icon: Utensils, label: "Kitchen" },
  kitchenette: { icon: Utensils, label: "Kitchenette" },
  parking: { icon: Car, label: "Parking" },
  pool: { icon: WavesLadder, label: "Pool" },
  gym: { icon: Dumbbell, label: "Gym" },
  fitness: { icon: Dumbbell, label: "Fitness Center" },
  minibar: { icon: Wine, label: "Minibar" },
  phone: { icon: Phone, label: "Phone" },
  safe: { icon: Lock, label: "Safe" },
  petfriendly: { icon: PawPrint, label: "Pet Friendly" },
  laundry: { icon: Shirt, label: "Laundry" },
  babycrib: { icon: Baby, label: "Baby Crib" },
  smoking: { icon: Cigarette, label: "Smoking" },
  nonsmoking: { icon: CigaretteOff, label: "Non-Smoking" },
};

// Derive available amenities from the keys of the icons object
export const availableAmenities = Object.keys(amenityIcons);

export function parseAmenities(amenitiesString: string): AmenityIcon[] {
  if (!amenitiesString) return [];

  // Split the string by commas and clean up each amenity
  const amenitiesList = amenitiesString
    .split(",")
    .map((amenity) => amenity.trim().toLowerCase());

  // Map each amenity to its icon and label if available
  return amenitiesList
    .map((amenity) => amenityIcons[amenity])
    .filter((icon): icon is AmenityIcon => icon !== undefined);
}
