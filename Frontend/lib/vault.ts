import Dexie, { type Table } from "dexie";
import type { Evidence } from "./chain";
type Sealed = {
  id: string;
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  data: ArrayBuffer;
};
class VaultDB extends Dexie {
  sealed!: Table<Sealed, string>;
  constructor() {
    super("sakshya-private-vault");
    this.version(1).stores({ sealed: "id" });
  }
}
const db = new VaultDB();
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
async function derive(pass: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function unlock(
  pass: string,
): Promise<{
  entries: Evidence[];
  key: CryptoKey;
  salt: Uint8Array<ArrayBuffer>;
}> {
  const record = await db.sealed.get("timeline");
  const salt = record?.salt ?? random(16);
  const key = await derive(pass, salt);
  const entries = record
    ? JSON.parse(
        new TextDecoder().decode(
          await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: record.iv },
            key,
            record.data,
          ),
        ),
      )
    : [];
  if (!record) await save(entries, key, salt);
  return { entries, key, salt };
}
export async function read(
  key: CryptoKey,
  id = "timeline",
): Promise<Evidence[]> {
  const record = await db.sealed.get(id);
  if (!record) return [];
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: record.iv },
        key,
        record.data,
      ),
    ),
  );
}
export async function save(
  entries: Evidence[],
  key: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
  id = "timeline",
) {
  const iv = random(12);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(entries)),
  );
  await db.sealed.put({ id, salt, iv, data });
}
