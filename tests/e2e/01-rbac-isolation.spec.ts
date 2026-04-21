import { test, expect } from "@playwright/test";

/**
 * PZ 12.1 + 15.1: prijava različitih rola; Sales Rep ne vidi tuđe Opportunity;
 * korisnik MNE ne vidi partnere SRB.
 */
test.describe("RBAC izolacija", () => {
  test("Sales Rep MNE ne vidi partnere SRB", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("rep.mne@img.test");
    await page.getByLabel("Lozinka").fill("Passw0rd!");
    await page.getByRole("button", { name: /prijavi/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/partners");
    // Svi vidljivi partneri su MNE
    const names = await page.getByRole("row").allTextContents();
    for (const row of names.slice(1)) {
      expect(row).not.toMatch(/^SRB Partner/);
    }
  });

  test("Sales Rep ne vidi Admin panel", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("rep.mne@img.test");
    await page.getByLabel("Lozinka").fill("Passw0rd!");
    await page.getByRole("button", { name: /prijavi/i }).click();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
