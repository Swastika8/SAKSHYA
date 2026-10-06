self.onmessage = async ({ data: { file, threshold } }) => {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(
      2400 / Math.max(bitmap.width, bitmap.height),
      Math.max(1, 1000 / Math.max(bitmap.width, bitmap.height)),
    );
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.round(bitmap.width * scale)),
      Math.max(1, Math.round(bitmap.height * scale)),
    );
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height),
      d = pixels.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = Math.max(0, Math.min(255, (gray - 128) * 1.25 + 128));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    if (threshold) {
      const w = canvas.width,
        h = canvas.height,
        integral = new Float64Array((w + 1) * (h + 1));
      for (let y = 1; y <= h; y++) {
        let sum = 0;
        for (let x = 1; x <= w; x++) {
          sum += d[((y - 1) * w + x - 1) * 4];
          integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + sum;
        }
      }
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const x0 = Math.max(0, x - 15),
            x1 = Math.min(w, x + 16),
            y0 = Math.max(0, y - 15),
            y1 = Math.min(h, y + 16);
          const avg =
            (integral[y1 * (w + 1) + x1] -
              integral[y0 * (w + 1) + x1] -
              integral[y1 * (w + 1) + x0] +
              integral[y0 * (w + 1) + x0]) /
            ((x1 - x0) * (y1 - y0));
          const i = (y * w + x) * 4,
            v = d[i] > avg - 12 ? 255 : 0;
          d[i] = d[i + 1] = d[i + 2] = v;
        }
    }
    ctx.putImageData(pixels, 0, 0);
    self.postMessage({
      blob: await canvas.convertToBlob({ type: "image/png" }),
    });
  } catch {
    self.postMessage({ error: true });
  }
};
