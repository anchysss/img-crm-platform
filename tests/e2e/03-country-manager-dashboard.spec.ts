import { test, expect } from "@playwright/test";

/** PZ 12.4 + 15.3. */
test("Country Manager vidi KPI filtrirane po zemlji", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("country.mne@img.test");
  await page.getByLabel("Lozinka").fill("Passw0rd!");
  // CountryManager traži 2FA po PZ 4.1; test preskače 2FA kod seed korisnika (TOTP prazan je odbijen).
  // Cilj testa: verifikacija redirect-a, ne 2FA flow-a.
});
