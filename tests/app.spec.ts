import { test, expect } from "@playwright/test";

test("user can open app and select a seat", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Event Seating Map/i)).toBeVisible();

  const firstSeat = page.getByRole("button", { name: /Seat 1/i }).first();
  await firstSeat.click();

  await expect(page.getByText(/Selected Seats/i)).toBeVisible();
});


