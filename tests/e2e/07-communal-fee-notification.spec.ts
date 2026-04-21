import { test } from "@playwright/test";

/** PZ 12.8. Cron job detektuje isteklu komunalnu naknadu i šalje KOMUNALNA_ISTEKLA notifikaciju. */
test.skip("Istekla komunalna naknada generiše notifikaciju", async () => {
  // Seed expired KomunalnaNaknada + run script + check Notifikacija.
});
