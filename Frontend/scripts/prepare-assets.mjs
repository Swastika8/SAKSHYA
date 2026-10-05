import { mkdir, copyFile, readdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
const root = process.cwd();
await mkdir(join(root, "public/ocr/lang"), { recursive: true });
await copyFile(
  join(root, "node_modules/tesseract.js/dist/worker.min.js"),
  join(root, "public/ocr/worker.min.js"),
);
const core = join(root, "node_modules/tesseract.js-core");
await copyFile(
  join(core, "LICENSE"),
  join(root, "public/ocr/LICENSE-core.txt"),
);
for (const name of await readdir(core))
  if (name.endsWith(".wasm") || name.endsWith(".wasm.js"))
    await copyFile(join(core, name), join(root, "public/ocr", name));
for (const language of ["eng", "hin", "mar"]) {
  const path = join(root, "public/ocr/lang", `${language}.traineddata.gz`);
  try {
    await access(path);
  } catch {
    const response = await fetch(
      `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/${language}.traineddata`,
    );
    if (!response.ok) throw new Error(`Language download failed: ${language}`);
    await writeFile(path, gzipSync(Buffer.from(await response.arrayBuffer())));
  }
}
console.log(
  "Local OCR worker, WASM cores and eng/hin/mar language data ready.",
);
