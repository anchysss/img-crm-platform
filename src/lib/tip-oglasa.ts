/**
 * UI mapping za TipOglasa enum — labele i grupe za drop-down i prikaz.
 */

export const TIP_OGLASA_LABEL: Record<string, string> = {
  // Outdoor
  OUTDOOR_FULL_BRANDING: "Outdoor — Full branding",
  OUTDOOR_STANDARD_BRANDING: "Outdoor — Standard branding",
  OUTDOOR_PARCIJAL: "Outdoor — Parcijal",
  OUTDOOR_SUPER_PARCIJAL: "Outdoor — Super-parcijal",
  OUTDOOR_OPEN_TOP: "Outdoor — Open top",
  OUTDOOR_TOTAL: "Outdoor — Total (legacy)",
  // Indoor
  INDOOR_STANDARD: "Indoor — Standard",
  INDOOR_OSVETLJENI_PANO: "Indoor — Osvetljeni pano",
  INDOOR_BACKLIGHT: "Indoor — Backlight (legacy)",
  INDOOR_DIGITAL: "Indoor — Digital ekran",
  INDOOR_POSTER: "Indoor — Poster (legacy)",
  // Dodaci
  DODATAK_HENGER_STANDARD: "Dodatak — Henger standard",
  DODATAK_HENGER_NESTANDARD: "Dodatak — Henger nestandard",
  DODATAK_VOBLER: "Dodatak — Vobler",
  DODATAK_RUCKE_VALJKASTE: "Dodatak — Ručke valjkaste",
  DODATAK_RUCKE_PLJOSNATE: "Dodatak — Ručke pljosnate",
  DODATAK_BLENDIRANJE_PLAFONA: "Dodatak — Blendiranje plafona",
  DODATAK_NALEPNICE_SEDISTA: "Dodatak — Nalepnice sedišta",
  // Legacy / generic
  DIGITAL: "Digital (legacy)",
  KOMUNALNA: "Komunalna",
  OSTALO: "Ostalo",
};

export const TIP_OGLASA_GROUPS: Array<{ label: string; values: string[] }> = [
  {
    label: "OUTDOOR — spoljašnji branding",
    values: [
      "OUTDOOR_FULL_BRANDING",
      "OUTDOOR_STANDARD_BRANDING",
      "OUTDOOR_PARCIJAL",
      "OUTDOOR_SUPER_PARCIJAL",
      "OUTDOOR_OPEN_TOP",
    ],
  },
  {
    label: "INDOOR — unutrašnji formati",
    values: [
      "INDOOR_STANDARD",
      "INDOOR_OSVETLJENI_PANO",
      "INDOOR_DIGITAL",
    ],
  },
  {
    label: "DODACI — specijalni formati",
    values: [
      "DODATAK_HENGER_STANDARD",
      "DODATAK_HENGER_NESTANDARD",
      "DODATAK_VOBLER",
      "DODATAK_RUCKE_VALJKASTE",
      "DODATAK_RUCKE_PLJOSNATE",
      "DODATAK_BLENDIRANJE_PLAFONA",
      "DODATAK_NALEPNICE_SEDISTA",
    ],
  },
];

export function isOutdoor(tip: string): boolean {
  return tip.startsWith("OUTDOOR_");
}
export function isIndoor(tip: string): boolean {
  return tip.startsWith("INDOOR_");
}
export function isDigital(tip: string): boolean {
  return tip === "INDOOR_DIGITAL" || tip === "DIGITAL";
}
export function isDodatak(tip: string): boolean {
  return tip.startsWith("DODATAK_");
}

/**
 * Vraća tip skice koji je relevantan za dati tip brendinga.
 * - OUTDOOR_* → spoljna skica
 * - INDOOR_*, DODATAK_* (osim ručki) → unutrašnja skica
 */
export function skicaTip(tip: string): "spoljna" | "unutrasnja" | "obe" {
  if (isOutdoor(tip)) return "spoljna";
  if (isIndoor(tip)) return "unutrasnja";
  if (tip === "DODATAK_RUCKE_VALJKASTE" || tip === "DODATAK_RUCKE_PLJOSNATE") return "unutrasnja";
  if (tip === "DODATAK_BLENDIRANJE_PLAFONA") return "unutrasnja";
  if (tip === "DODATAK_NALEPNICE_SEDISTA") return "unutrasnja";
  if (tip === "DODATAK_HENGER_STANDARD" || tip === "DODATAK_HENGER_NESTANDARD") return "unutrasnja";
  if (tip === "DODATAK_VOBLER") return "unutrasnja";
  return "obe";
}
