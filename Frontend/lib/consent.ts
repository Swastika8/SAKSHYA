export const CONSENT_KEY = "sakshya-ai-assist";
export function readConsent(storage: Pick<Storage, "getItem">): boolean {
  try {
    return storage.getItem(CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}
export function saveConsent(
  storage: Pick<Storage, "setItem">,
  enabled: boolean,
) {
  try {
    storage.setItem(CONSENT_KEY, String(enabled));
  } catch {
    /* Private modes may block storage. */
  }
}
