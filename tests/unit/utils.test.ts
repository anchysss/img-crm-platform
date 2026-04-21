import { describe, it, expect } from "vitest";
import { formatCurrency, cn } from "@/lib/utils";

describe("utils", () => {
  it("formatCurrency formats EUR", () => {
    const out = formatCurrency(1234.5, "EUR", "en-US");
    expect(out).toContain("€");
    expect(out).toContain("1,234.5");
  });

  it("cn merges tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});
