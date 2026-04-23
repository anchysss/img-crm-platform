"use client";

import { trpc } from "@/lib/trpc-client";
import { COUNTRY_BY_TENANT } from "./country";

/**
 * Hook koji vraća aktivnog tenant-a korisnika (prvi u sesiji) sa
 * ISO kod, glavni grad, naziv za forme koje autofilluju ova polja.
 */
export function useTenant() {
  const me = trpc.users.me.useQuery();
  const first = me.data?.roles?.[0];
  const kod = first?.pravnoLice?.kod;
  const meta = kod ? COUNTRY_BY_TENANT[kod] : undefined;
  return {
    loading: me.isLoading,
    kod,
    iso: meta?.iso ?? "",
    capital: meta?.capital ?? "",
    name: meta?.name ?? "",
    valuta: first?.pravnoLice?.valuta ?? "EUR",
  };
}
