import { test, expect } from "@playwright/test";
test("offline PWA, real file hashing, re-unlock and local Hindi/Marathi OCR", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(
      () => page.evaluate(() => navigator.serviceWorker.controller !== null),
      { timeout: 30000 },
    )
    .toBe(true);
  await page.getByRole("button", { name: "Get help now", exact: true }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Evidence vault" })
    .click();
  await page
    .getByRole("textbox", { name: "Vault passphrase", exact: true })
    .fill("Synthetic offline secret 2026");
  await page.getByRole("button", { name: "Create / unlock vault" }).click();
  await page
    .getByLabel("Choose evidence files", { exact: true })
    .setInputFiles({
      name: "local-synthetic.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("synthetic offline file"),
    });
  await page.getByRole("button", { name: "Hash and add to timeline" }).click();
  await page.getByRole("button", { name: "Verify chain", exact: true }).click();
  await expect(
    page.getByText("All links verified", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "You deserve to feel safe.",
  );
  await page.getByRole("button", { name: "Get help now", exact: true }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Evidence vault" })
    .click();
  await page
    .getByRole("textbox", { name: "Vault passphrase", exact: true })
    .fill("Synthetic offline secret 2026");
  await page.getByRole("button", { name: "Create / unlock vault" }).click();
  await expect(
    page.getByRole("heading", { name: "local-synthetic.txt" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Verify chain", exact: true }).click();
  await expect(
    page.getByText("All links verified", { exact: true }),
  ).toBeVisible();
  await page
    .locator("nav")
    .getByRole("button", { name: "Incident details" })
    .click();
  for (const [language, sample] of [
    ["hin", "नमस्ते यह एक परीक्षण है"],
    ["mar", "नमस्कार ही एक चाचणी आहे"],
  ]) {
    const png = await page.evaluate((text) => {
      const c = document.createElement("canvas");
      c.width = 1200;
      c.height = 200;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "black";
      ctx.font = '52px "Nirmala UI"';
      ctx.fillText(text, 30, 110);
      return c.toDataURL("image/png").split(",")[1];
    }, sample);
    await page
      .getByRole("combobox", { name: "Screenshot language" })
      .selectOption(language);
    await page
      .getByLabel("Choose a text screenshot", { exact: true })
      .setInputFiles({
        name: `synthetic-${language}.png`,
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      });
    await page
      .getByRole("textbox", { name: "Review or type the text", exact: true })
      .fill("");
    await page
      .getByRole("button", { name: "Read screenshot locally", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", {
        name: "Review or type the text",
        exact: true,
      }),
    ).toHaveValue(/[\u0900-\u097f]/, { timeout: 45000 });
  }
  const cacheUrls = await page.evaluate(async () => {
    const out: string[] = [];
    for (const name of await caches.keys())
      for (const req of await (await caches.open(name)).keys())
        out.push(req.url);
    return out;
  });
  expect(
    cacheUrls.every((url) => !url.includes("/api/") && !url.includes("8000")),
  ).toBe(true);
  expect(cacheUrls.some((url) => url.endsWith("hin.traineddata.gz"))).toBe(
    true,
  );
  await context.setOffline(false);
});
