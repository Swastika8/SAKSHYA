import { describe, it, expect } from "vitest";
import { append, verify, sha256, ZERO } from "./chain";
describe("SHA-256 timeline", () => {
  it("matches a known SHA-256 vector", async () => {
    expect(await sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
  it("builds, verifies and detects the first tampered link", async () => {
    const first = await append(
      [],
      {
        fileName: "synthetic.txt",
        fileHash: await sha256("demo"),
        platform: "Instagram",
        note: "Synthetic",
      },
      "2026-10-05T10:00:00.000Z",
    );
    const chain = await append(first, {
      fileName: "followup.txt",
      fileHash: await sha256("followup"),
      platform: "Instagram",
      note: "",
    });
    expect(chain[0].prevHash).toBe(ZERO);
    expect(chain[1].prevHash).toBe(chain[0].entryHash);
    expect((await verify(chain)).ok).toBe(true);
    chain[0].note = "changed";
    expect(await verify(chain)).toEqual({ ok: false, brokenIndex: 1 });
  });
  it("detects reordered entries and rejects ambiguous delimiters", async () => {
    const one = await append([], {
      fileName: "a",
      fileHash: ZERO,
      platform: "",
      note: "",
    });
    const two = await append(one, {
      fileName: "b",
      fileHash: ZERO,
      platform: "",
      note: "",
    });
    expect((await verify(two.reverse())).ok).toBe(false);
    await expect(
      append([], { fileName: "a|b", fileHash: ZERO, platform: "", note: "" }),
    ).rejects.toThrow();
  });
});
