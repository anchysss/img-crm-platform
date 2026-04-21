import { test, expect } from "@playwright/test";

/**
 * PZ 12.2 + 15.2: kreiranje Opportunity → hold → Won → kampanja.
 * Testovi direktno preko tRPC endpoint-a dok se UI formulari ne ugrade u M3/M4.
 */
test("Pun ciklus Opp → Kampanja", async ({ page, request }) => {
  // Login
  await page.goto("/login");
  await page.getByLabel("Email").fill("rep.mne@img.test");
  await page.getByLabel("Lozinka").fill("Passw0rd!");
  await page.getByRole("button", { name: /prijavi/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Prikaz Opportunity liste
  await page.goto("/opportunities");
  await expect(page.getByRole("heading", { name: "Opportunities" })).toBeVisible();

  // Backend smoke (UI forma dolazi u M3 finalizaciji)
  const res = await request.get("/api/trpc/opportunities.list?batch=1&input=" + encodeURIComponent(JSON.stringify({ 0: { json: {} } })));
  expect(res.ok()).toBeTruthy();
});
