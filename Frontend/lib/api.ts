export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export async function api(path: string, data: unknown, pdf = false) {
  const response = await fetch(`${API}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
    credentials: "omit",
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error("api");
  return pdf ? response.blob() : response.json();
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
