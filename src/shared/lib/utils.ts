// ============================================================
// FILE: utils.ts
// SECTION: shared > lib
// PURPOSE: Puri app mein common use hone wali utility functions.
//          Shadcn/ui ke liye cn() class merge function bhi yahan hai.
// ============================================================
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
