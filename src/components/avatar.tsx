import { useState } from "react";
import Image from "next/image";
import { cn } from "~/lib/utils";

export function Avatar(props: {
  src: string;
  alt: string;
  className?: string;
}) {
  const defaultImage = "/default-profile-picture.jpg";
  const [src, setSrc] = useState(props.src || defaultImage);

  return (
    <Image
      src={src || defaultImage}
      alt={props.alt}
      className={cn("rounded-full", props.className)}
      onError={() => setSrc(defaultImage)}
      width={32}
      height={32}
      priority
    />
  );
}
