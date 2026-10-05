import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test("synthetic full flow, OCR, encrypted storage, citations, PDFs, locales and quick exit", async ({
  page,
  context,
}) => {
  const requests: { path: string; body: string }[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST")
      requests.push({ path: request.url(), body: request.postData() || "" });
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "You deserve to feel safe.",
  );
  await mkdir("test-results/qa", { recursive: true });
  await page.screenshot({
    path: "test-results/qa/mobile-home.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Get help now", exact: true }).click();
  await page.getByRole("button", { name: "Threats or blackmail" }).click();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await page
    .getByLabel("Vault passphrase", { exact: true })
    .fill("Synthetic demo passphrase 2026");
  await page.getByRole("button", { name: "Create / unlock vault" }).click();
  await page.getByRole("button", { name: "Demo mode", exact: true }).click();
  await page.getByRole("button", { name: "Verify chain", exact: true }).click();
  await expect(
    page.getByText("All links verified", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate tampering", exact: true })
    .click();
  await page.getByRole("button", { name: "Verify chain", exact: true }).click();
  await expect(
    page.getByText("First broken link: entry 1", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/qa/mobile-tamper.png",
    fullPage: true,
  });
  // Only the salt, IV and encrypted bytes exist in IndexedDB.
  const stored = await page.evaluate(async () => {
    return await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const r = indexedDB.open("sakshya-private-vault");
      r.onsuccess = () => {
        const db = r.result;
        const q = db.transaction("sealed").objectStore("sealed").getAll();
        q.onsuccess = () => {
          resolve(
            q.result.map((v) => ({
              keys: Object.keys(v),
              cipher: v.data instanceof ArrayBuffer,
              plain: JSON.stringify(v),
            })),
          );
          db.close();
        };
        q.onerror = () => reject(q.error);
      };
    });
  });
  expect(
    stored.every(
      (v) =>
        v.cipher === true && !String(v.plain).includes("synthetic-message"),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Demo mode", exact: true }).click();
  const [timeline] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download timeline PDF" }).click(),
  ]);
  await timeline.saveAs("test-results/qa/timeline.pdf");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // A synthetic text image is created locally. Its bytes must never appear in POSTs.
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 300;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1200, 300);
    ctx.fillStyle = "black";
    ctx.font = "38px Arial";
    ctx.fillText("Instagram @demo_account 2026-10-05", 35, 80);
    ctx.fillText("This is a synthetic threat message.", 35, 155);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByLabel("Choose a text screenshot", { exact: true })
    .setInputFiles({
      name: "synthetic-chat.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await page
    .getByRole("button", { name: "Read screenshot locally", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Review or type the text", exact: true }),
  ).toHaveValue(/Instagram/, { timeout: 60000 });
  await page
    .getByRole("button", { name: "Extract details from text", exact: true })
    .click();
  await expect(page.getByLabel("Platform", { exact: true })).toHaveValue(
    "Instagram",
  );
  await expect(
    page.getByLabel("Usernames or links", { exact: true }),
  ).toHaveValue(/demo_account/);
  await page
    .getByRole("button", { name: "Find cited guidance", exact: true })
    .click();
  await expect(page.locator(".provision")).not.toHaveCount(0);
  for (const card of await page.locator(".provision").all()) {
    await expect(
      card.getByRole("link", { name: "Open source" }),
    ).toHaveAttribute("href", /^https:\/\/www\.indiacode\.nic\.in/);
    await expect(card.getByText("Needs verification")).toBeVisible();
  }
  await page.screenshot({
    path: "test-results/qa/mobile-guidance.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Prepare action pack", exact: true })
    .click();
  const cards = page.locator(".document-card");
  for (let i = 0; i < 3; i++) {
    const card = cards.nth(i);
    await card.getByRole("button", { name: "Create editable draft" }).click();
    const preview = card.getByRole("textbox", {
      name: "Editable preview",
      exact: true,
    });
    await expect(preview).toBeVisible();
    await preview.fill(
      (await preview.inputValue()) + "\nSynthetic reviewer edit.",
    );
    const [pdf] = await Promise.all([
      page.waitForEvent("download"),
      card.getByRole("button", { name: "Download PDF", exact: true }).click(),
    ]);
    await pdf.saveAs(`test-results/qa/document-${i}.pdf`);
  }
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("hi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "आपकी रिपोर्ट की शुरुआत।",
  );
  await cards
    .first()
    .getByRole("button", { name: "संपादन योग्य मसौदा बनाएँ" })
    .click();
  const [hindi] = await Promise.all([
    page.waitForEvent("download"),
    cards
      .first()
      .getByRole("button", { name: "PDF डाउनलोड करें", exact: true })
      .click(),
  ]);
  await hindi.saveAs("test-results/qa/hindi.pdf");
  await page
    .getByRole("combobox", { name: "भाषा", exact: true })
    .selectOption("mr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "तुमच्या तक्रारीची सुरुवात.",
  );
  await cards
    .first()
    .getByRole("button", { name: "बदलता येणारा मसुदा तयार करा" })
    .click();
  const [marathi] = await Promise.all([
    page.waitForEvent("download"),
    cards
      .first()
      .getByRole("button", { name: "PDF डाउनलोड करा", exact: true })
      .click(),
  ]);
  await marathi.saveAs("test-results/qa/marathi.pdf");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("combobox", { name: "भाषा", exact: true })
    .selectOption("en");
  await page.locator("nav").getByRole("button", { name: "Next steps" }).click();
  await page
    .getByLabel("Find a safe place and a trusted person to support you.")
    .check();
  await page.reload();
  await page.getByRole("button", { name: "Get help now", exact: true }).click();
  await page.locator("nav").getByRole("button", { name: "Next steps" }).click();
  await expect(
    page.getByLabel("Find a safe place and a trusted person to support you."),
  ).toBeChecked();
  await page
    .locator("nav")
    .getByRole("button", { name: "Evidence vault" })
    .click();
  await page
    .getByLabel("Vault passphrase", { exact: true })
    .fill("Wrong passphrase 123");
  await page.getByRole("button", { name: "Create / unlock vault" }).click();
  await expect(
    page.getByText(
      "Could not unlock the vault. Check your passphrase or browser storage access.",
    ),
  ).toBeVisible();
  expect(
    requests
      .filter((r) => r.path.includes("/api/"))
      .every(
        (r) =>
          !r.body.includes(png) &&
          !r.body.includes("data:image/") &&
          !r.body.includes("Synthetic demo passphrase"),
      ),
  ).toBe(true);
  expect(errors).toEqual([]);
  // Intercept the neutral destination so this test makes no external navigation.
  await page.route("https://www.google.com/**", (route) =>
    route.fulfill({ body: "Neutral exit test" }),
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("https://www.google.com/");
});

test("danger and minor path, desktop layout and persistent help", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/qa/desktop-home.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Get help now", exact: true }).click();
  await page
    .getByRole("button", { name: "Leaked or deepfaked images" })
    .click();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your safety comes first",
  );
  await expect(
    page.getByRole("link", { name: "112 Emergency", exact: true }),
  ).toHaveAttribute("href", "tel:112");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Support for someone under 18",
  );
  await expect(page.getByRole("link", { name: "Open source" })).toHaveAttribute(
    "href",
    /indiacode/,
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Get support", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
});
