import { readdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
async function walk(root, prefix) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const url = prefix + "/" + entry.name;
    result.push(
      ...(entry.isDirectory()
        ? await walk(join(root, entry.name), url)
        : [url]),
    );
  }
  return result;
}
const files = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  ...(await walk(".next/static", "/_next/static")),
  ...(await walk("public/ocr", "/ocr")),
];
await writeFile("public/precache.json", JSON.stringify(files));
const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
const worker = await readFile("public/sw.js", "utf8");
await writeFile(
  "public/sw.js",
  worker.replace(
    /const CACHE\s*=\s*["'][^"']+["'];/,
    `const CACHE = "sakshya-shell-${buildId}";`,
  ),
);
console.log(`Prepared ${files.length} application assets for offline use.`);
