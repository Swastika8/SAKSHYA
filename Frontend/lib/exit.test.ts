import { describe, it, expect } from "vitest";
import { exitPool, pickDestination } from "./exit";
describe("Quick Exit destinations", () => {
  it("uses independent configured hosts and public destinations", () => {
    const urls = exitPool(
      "https://daily.example, javascript:alert(1),https://daily.example",
      "http://localhost:3000",
    );
    expect(urls).toEqual([
      "https://daily.example/",
      "https://www.google.com/",
      "https://en.wikipedia.org/wiki/Special:Random",
    ]);
  });
  it("provides four local disguise copies when not configured", () => {
    expect(
      exitPool("", "http://localhost:3000").filter((url) =>
        url.includes("/d/"),
      ),
    ).toHaveLength(4);
  });
  it("never repeats the previous destination", () => {
    const pool = ["a", "b", "c"];
    for (let n = 0; n < 100; n++)
      expect(pickDestination(pool, "b", () => n)).not.toBe("b");
  });
  it("rejects biased random samples and rotates", () => {
    const values = [0xffffffff, 2];
    expect(pickDestination(["a", "b", "c"], null, () => values.shift()!)).toBe(
      "c",
    );
    expect(pickDestination(["a", "b"], "a", () => 0)).toBe("b");
  });
});
