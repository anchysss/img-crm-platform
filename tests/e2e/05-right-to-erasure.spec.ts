import { test } from "@playwright/test";

/** PZ 12.7 + 15.5. Admin pokreće pseudonimizaciju kontakta; proverava audit trag. */
test.skip("Pravo na zaborav — pseudonimizacija + audit", async () => {
  // Admin trpc mutacija gdpr.rightToErasure → kontakt[i].ime == "[redacted]" i audit akcija GDPR_ERASURE.
});
