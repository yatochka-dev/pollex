import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// utility function for merging tailwind classes
// copied from shadcn docs lol
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
