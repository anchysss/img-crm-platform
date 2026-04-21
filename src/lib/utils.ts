import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency: string, locale = "sr-Latn") {
  const num = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(num);
}

export function formatDate(d: Date | string, locale = "sr-Latn") {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(d));
}
