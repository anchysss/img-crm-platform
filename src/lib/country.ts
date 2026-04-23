/**
 * Mapping tenant kod ↔ ISO country code ↔ glavni grad.
 * Default vrednosti za forme kada korisnik otvara partner/vozilo bez eksplicitnog unosa.
 */
export const COUNTRY_BY_TENANT: Record<string, { iso: string; capital: string; name: string }> = {
  MNE: { iso: "ME", capital: "Podgorica", name: "Crna Gora" },
  SRB: { iso: "RS", capital: "Beograd", name: "Srbija" },
  HRV: { iso: "HR", capital: "Zagreb", name: "Hrvatska" },
  BIH: { iso: "BA", capital: "Sarajevo", name: "Bosna i Hercegovina" },
};

export function capitalForTenantKod(kod: string | null | undefined): string {
  return COUNTRY_BY_TENANT[kod ?? ""]?.capital ?? "";
}

export function isoForTenantKod(kod: string | null | undefined): string {
  return COUNTRY_BY_TENANT[kod ?? ""]?.iso ?? "";
}
