export type Evidence = {
  index: number;
  timestamp: string;
  fileName: string;
  fileHash: string;
  platform: string;
  note: string;
  prevHash: string;
  entryHash: string;
};
export const ZERO = "0".repeat(64);
export async function sha256(data: string | ArrayBuffer): Promise<string> {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function serialize(e: Omit<Evidence, "entryHash">): string {
  return `${e.index}|${e.timestamp}|${e.fileName}|${e.fileHash}|${e.platform}|${e.note}|${e.prevHash}`;
}
export async function append(
  chain: Evidence[],
  input: Pick<Evidence, "fileName" | "fileHash" | "platform" | "note">,
  timestamp = new Date().toISOString(),
): Promise<Evidence[]> {
  // The specified delimiter format is ambiguous if a field contains "|"; reject it.
  if ([input.fileName, input.platform, input.note].some((v) => v.includes("|")))
    throw new Error("delimiter");
  const entry = {
    ...input,
    index: chain.length + 1,
    timestamp,
    prevHash: chain.at(-1)?.entryHash ?? ZERO,
  };
  return [...chain, { ...entry, entryHash: await sha256(serialize(entry)) }];
}
export async function verify(
  chain: Evidence[],
): Promise<{ ok: boolean; brokenIndex: number | null }> {
  let prev = ZERO;
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (
      e.index !== i + 1 ||
      e.prevHash !== prev ||
      [e.fileName, e.platform, e.note].some((v) => v.includes("|")) ||
      (await sha256(serialize(e))) !== e.entryHash
    )
      return { ok: false, brokenIndex: i + 1 };
    prev = e.entryHash;
  }
  return { ok: true, brokenIndex: null };
}
