import { describe, it, expect } from "vitest";
import { dimensions, suggestLanguage } from "./preprocess";
describe("OCR preparation", () => {
  it("bounds large images and enlarges small images without changing aspect ratio", () => {
    expect(dimensions(4800, 2400)).toEqual({ width: 2400, height: 1200 });
    expect(dimensions(500, 250)).toEqual({ width: 1000, height: 500 });
  });
  it("suggests Devanagari languages only when useful", () => {
    expect(suggestLanguage("hello", 90)).toBe(false);
    expect(suggestLanguage("नमस्ते", 90)).toBe(true);
    expect(suggestLanguage("hello", 40)).toBe(true);
  });
});
