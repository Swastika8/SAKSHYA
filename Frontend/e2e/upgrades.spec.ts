import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import en from "../locales/en.json";
import hi from "../locales/hi.json";
import mr from "../locales/mr.json";

test("consent is off, explicit opt-in affects only text requests, and edits remain reviewable", async ({
  page,
}) => {
  const flags: boolean[] = [];
  await page.route("**/api/ai/status", (r) =>
    r.fulfill({ json: { provider: "groq", available: true } }),
  );
  await page.route("**/api/extract", (r) => {
    const data = r.request().postDataJSON();
    expect(Object.keys(data).sort()).toEqual(["ai_assist", "lang", "text"]);
    flags.push(data.ai_assist);
    return r.fulfill({
      json: {
        platform: "Instagram",
        usernames: ["@synthetic"],
        urls: [],
        phone_numbers: [],
        dates: [],
        threat_type: "threats",
        summary: "Supplied synthetic facts.",
        confidence: 0.9,
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: en.homeOptions, exact: true }).click();
  const toggle = page.getByRole("switch", { name: en.aiAssist });
  await expect(toggle).not.toBeChecked();
  await page
    .getByRole("textbox", { name: en.ocrText, exact: true })
    .fill("Instagram @synthetic: supplied synthetic facts.");
  await page.getByRole("button", { name: en.extract, exact: true }).click();
  await expect(page.getByLabel(en.platform, { exact: true })).toHaveValue(
    "Instagram",
  );
  await toggle.check();
  await page.getByRole("button", { name: en.extract, exact: true }).click();
  await expect.poll(() => flags.length).toBe(2);
  expect(flags).toEqual([false, true]);
  await page.getByLabel(en.platform, { exact: true }).fill("Edited platform");
  await expect(page.getByLabel(en.platform, { exact: true })).toHaveValue(
    "Edited platform",
  );
  await page.reload();
  await page.getByRole("button", { name: en.homeOptions, exact: true }).click();
  await expect(toggle).toBeChecked();
  await expect(page.getByLabel(en.platform, { exact: true })).toHaveValue("");
});

test("batch OCR edits, confidence, local preprocessing and cancellation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: en.homeOptions, exact: true }).click();
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 200;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "black";
    ctx.font = "48px Arial";
    ctx.fillText("Synthetic Instagram message", 30, 100);
    return c.toDataURL().split(",")[1];
  });
  const files = ["one.png", "two.png"].map((name) => ({
    name,
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  }));
  await page.getByLabel(en.ocrFile, { exact: true }).setInputFiles(files);
  await page.getByRole("button", { name: en.ocrRun, exact: true }).click();
  await page.getByRole("button", { name: en.cancel, exact: true }).click();
  await expect(
    page.getByRole("button", { name: en.cancel, exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: en.ocrRun, exact: true }).click();
  await expect(page.locator(".batch-ocr textarea")).toHaveCount(2, {
    timeout: 60000,
  });
  await expect(page.locator(".batch-ocr")).toContainText(en.confidence);
  await page.locator(".batch-ocr textarea").first().fill("Reviewed image one");
  await expect(
    page.getByRole("textbox", { name: en.ocrText, exact: true }),
  ).toHaveValue(/Reviewed image one/);
  await expect(page.locator(".batch-ocr input[type=file]")).toHaveValue("");
});

test("all locales and viewport sizes remain usable with larger text", async ({
  page,
}) => {
  await page.goto("/");
  for (const [language, copy] of [
    ["en", en],
    ["hi", hi],
    ["mr", mr],
  ] as const) {
    await page.locator(".language select").selectOption(language);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        copy.headline,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("button", { name: copy.exit, exact: false }),
      ).toBeVisible();
    }
  }
  await mkdir("docs/screenshots", { recursive: true });
  for (const [language, copy] of [
    ["hi", hi],
    ["mr", mr],
  ] as const) {
    await page.locator(".language select").selectOption(language);
    await page.setViewportSize({ width: 375, height: 900 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      copy.headline,
    );
    await page.screenshot({
      path: `docs/screenshots/${language}-home.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: mr.sizeText }).click();
  await expect(page.getByRole("button", { name: mr.sizeText })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("four everyday pages make no external requests and converter works", async ({
  page,
}) => {
  const outside: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://localhost:3000") &&
      !r.url().startsWith("data:")
    )
      outside.push(r.url());
  });
  for (const name of ["weather", "recipe", "blog", "misc"]) {
    await page.goto(`/d/${name}/index.html`);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(await page.locator("body").innerText()).not.toMatch(
      /Sakshya|harassment|evidence vault/i,
    );
  }
  await page.locator("#amount").fill("2");
  await expect(page.locator("#result")).toHaveText("0.002 Kilometres");
  expect(outside).toEqual([]);
});

test("Quick Exit wipes the visible session, replaces history and avoids repeat destinations", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = ((array: Uint32Array) => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = 0;
        return array;
      }
      return original(array);
    }) as typeof crypto.getRandomValues;
  });
  await page.goto("/");
  await page.getByRole("button", { name: en.homeOptions, exact: true }).click();
  await page
    .getByRole("textbox", { name: en.ocrText, exact: true })
    .fill("Synthetic private text");
  await page.getByRole("button", { name: en.exit, exact: false }).click();
  await expect(page).toHaveURL(/\/d\/weather\/index.html/);
  await expect(page.locator("body")).not.toContainText(
    "Synthetic private text",
  );
  await page.goto("/");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/d\/recipe\/index.html/);
  await page.goBack();
  await expect(page).toHaveURL(/\/d\/weather\/index.html/);
});

test("reviewed statement becomes the exact complaint preview and PDF input", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: en.homeOptions, exact: true }).click();
  await page
    .getByLabel(en.description, { exact: true })
    .fill("A synthetic threat was sent to me. These are supplied facts.");
  await page
    .locator("nav")
    .getByRole("button", { name: en.yourDocuments })
    .click();
  await page
    .getByRole("button", { name: en.statementHelper, exact: true })
    .click();
  const statement = page.getByRole("textbox", {
    name: "Draft: please review and edit",
    exact: true,
  });
  await expect(statement).toHaveValue(/I am reporting/);
  await statement.fill(
    (await statement.inputValue()) + "\nReviewed synthetic correction.",
  );
  const card = page.locator(".document-card").first();
  await card.getByRole("button", { name: en.generate, exact: true }).click();
  const preview = card.getByRole("textbox", { name: en.preview, exact: true });
  await expect(preview).toHaveValue(/Reviewed synthetic correction/);
  await expect(preview).toHaveValue(/section 351/);
  const [request, pdf] = await Promise.all([
    page.waitForRequest(
      (r) => r.url().endsWith("/api/pdf") && r.method() === "POST",
    ),
    page.waitForEvent("download"),
    card.getByRole("button", { name: en.download, exact: true }).click(),
  ]);
  expect(request.postDataJSON().edited_body).toBe(await preview.inputValue());
  expect(request.postDataJSON().case.statement).toContain(
    "Reviewed synthetic correction.",
  );
  expect(pdf.suggestedFilename()).toMatch(/^Complaint_\d{4}-\d{2}-\d{2}\.pdf$/);
});
