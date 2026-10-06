const PUBLIC_DESTINATIONS = [
  "https://www.google.com/",
  "https://en.wikipedia.org/wiki/Special:Random",
];
export function exitPool(config: string, origin: string): string[] {
  const urls = config
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((value) => {
      try {
        const url = new URL(value);
        return ["https:", "http:"].includes(url.protocol) &&
          !url.username &&
          !url.password
          ? [url.href]
          : [];
      } catch {
        return [];
      }
    });
  const pages = urls.length
    ? urls
    : ["weather", "recipe", "blog", "misc"].map(
        (name) => `${origin}/d/${name}/index.html`,
      );
  return [...new Set([...pages, ...PUBLIC_DESTINATIONS])];
}
export function pickDestination(
  pool: string[],
  previous: string | null,
  random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0],
): string {
  const choices = pool.filter((url) => url !== previous);
  if (!choices.length) return pool[0] || PUBLIC_DESTINATIONS[0];
  // Rejection sampling keeps every eligible destination equally likely.
  const limit = Math.floor(2 ** 32 / choices.length) * choices.length;
  let value = random();
  while (value >= limit) value = random();
  return choices[value % choices.length];
}
export function performExit(clear: () => void) {
  const pool = exitPool(
    process.env.NEXT_PUBLIC_DISGUISE_URLS || "",
    location.origin,
  );
  let previous: null | string = null;
  try {
    previous = sessionStorage.getItem("last-neutral-destination");
  } catch {}
  const destination = pickDestination(pool, previous);
  try {
    sessionStorage.setItem("last-neutral-destination", destination);
  } catch {}
  clear();
  document.body.replaceChildren();
  document.body.style.background = "#f5f7fb";
  document.title = "Daily notes";
  document
    .querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]')
    .forEach((node) => node.remove());
  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.href =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%235879a2'/%3E%3C/svg%3E";
  document.head.appendChild(icon);
  history.replaceState(null, "", location.pathname);
  location.replace(destination);
}
