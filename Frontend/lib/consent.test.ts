import { describe, it, expect } from "vitest";
import { CONSENT_KEY, readConsent, saveConsent } from "./consent";
describe("AI consent", () => {
  it("defaults off and persists only a boolean flag", () => {
    let value: string | null = null;
    const storage = {
      getItem: (key: string) => (key === CONSENT_KEY ? value : null),
      setItem: (key: string, next: string) => {
        expect(key).toBe(CONSENT_KEY);
        value = next;
      },
    };
    expect(readConsent(storage)).toBe(false);
    saveConsent(storage, true);
    expect(readConsent(storage)).toBe(true);
    saveConsent(storage, false);
    expect(readConsent(storage)).toBe(false);
  });
  it("fails closed for unavailable or malformed storage", () => {
    expect(readConsent({ getItem: () => "yes" })).toBe(false);
    expect(
      readConsent({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe(false);
  });
});
