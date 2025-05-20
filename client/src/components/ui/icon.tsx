import React from "react";
import { twMerge } from "tailwind-merge";

interface IconProps {
  name: string;
  className?: string;
  spin?: boolean;
}

export default function Icon({ name, className, spin = false }: IconProps) {
  // Remove the mdi- prefix if present
  const iconName = name.startsWith("mdi-") ? name : `mdi-${name}`;
  
  return (
    <i 
      className={twMerge(
        `mdi ${iconName}`,
        spin && "animate-spin",
        className
      )}
    />
  );
}
