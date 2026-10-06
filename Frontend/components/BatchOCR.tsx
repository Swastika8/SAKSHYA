"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { suggestLanguage } from "@/lib/preprocess";
import type { Worker as OCRWorker } from "tesseract.js";
export function BatchOCR({ onText }: { onText: (text: string) => void }) {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]),
    [results, setResults] = useState<
      { name: string; text: string; confidence: number }[]
    >([]),
    [lang, setLang] = useState("eng"),
    [threshold, setThreshold] = useState(false),
    [progress, setProgress] = useState<string>(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const ocr = useRef<OCRWorker | null>(null),
    prep = useRef<Worker | null>(null),
    generation = useRef(0),
    cancelPrep = useRef<(() => void) | null>(null);
  function cancel() {
    generation.current++;
    cancelPrep.current?.();
    cancelPrep.current = null;
    prep.current?.terminate();
    prep.current = null;
    void ocr.current?.terminate();
    ocr.current = null;
    setBusy(false);
    setProgress("");
  }
  useEffect(
    () => () => {
      generation.current++;
      cancelPrep.current?.();
      prep.current?.terminate();
      void ocr.current?.terminate();
    },
    [],
  );
  function add(input: File[]) {
    if (!input.length) return;
    if (
      input.length + files.length > 5 ||
      input.some(
        (f) =>
          !/^image\/(png|jpeg|webp|bmp)$/.test(f.type) ||
          f.size > 25 * 1024 * 1024,
      )
    ) {
      setError(true);
      return;
    }
    setFiles((old) => [...old, ...input]);
    setError(false);
  }
  async function run() {
    cancel();
    const token = generation.current;
    setBusy(true);
    setError(false);
    setResults([]);
    onText("");
    const collected: { name: string; text: string; confidence: number }[] = [];
    try {
      const { createWorker } = await import("tesseract.js");
      const current = await createWorker(lang, 1, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr",
        langPath: "/ocr/lang",
        logger: (m) => {
          if (token === generation.current && m.status === "recognizing text")
            setProgress(
              `${collected.length + 1}/${files.length} · ${Math.round(m.progress * 100)}%`,
            );
        },
      });
      if (token !== generation.current) {
        await current.terminate();
        return;
      }
      ocr.current = current;
      for (const file of files) {
        if (token !== generation.current) break;
        setProgress(`${collected.length + 1}/${files.length}`);
        const image = await new Promise<Blob>((resolve, reject) => {
          const w = new Worker("/preprocess-worker.js");
          prep.current = w;
          cancelPrep.current = () => reject(new Error("cancelled"));
          w.onmessage = (e) => {
            w.terminate();
            prep.current = null;
            cancelPrep.current = null;
            e.data.error ? reject(new Error("image")) : resolve(e.data.blob);
          };
          w.onerror = () => {
            w.terminate();
            reject(new Error("worker"));
          };
          w.postMessage({ file, threshold });
        });
        if (token !== generation.current) break;
        const result = await current.recognize(image);
        if (token !== generation.current) break;
        collected.push({
          name: file.name,
          text: result.data.text.slice(0, 12000),
          confidence: result.data.confidence,
        });
        setResults([...collected]);
        onText(
          collected
            .map((r) => r.text)
            .join("\n\n")
            .slice(0, 12000),
        );
      }
    } catch {
      if (token === generation.current) setError(true);
    } finally {
      if (token === generation.current) {
        void ocr.current?.terminate();
        ocr.current = null;
        setFiles([]);
        setBusy(false);
        setProgress("");
      }
    }
  }
  return (
    <div
      className="batch-ocr"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!busy) add(Array.from(e.dataTransfer.files));
      }}
      onPaste={(e) => {
        if (e.clipboardData.files.length && !busy) {
          e.preventDefault();
          add(Array.from(e.clipboardData.files));
        }
      }}
    >
      <p className="small">{t("batchHelp")}</p>
      <label>
        {t("ocrFile")}
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/bmp"
          disabled={busy}
          onChange={(e) => {
            add(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
      </label>
      {files.map((f, i) => (
        <p key={i}>
          {f.name}{" "}
          <button
            disabled={busy}
            onClick={() => setFiles((old) => old.filter((_, j) => j !== i))}
            aria-label={`${t("remove")} ${f.name}`}
          >
            ×
          </button>
        </p>
      ))}
      <label>
        {t("ocrLanguage")}
        <select
          disabled={busy}
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          <option value="eng">{t("english")}</option>
          <option value="hin">{t("hindi")}</option>
          <option value="mar">{t("marathi")}</option>
        </select>
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={threshold}
          onChange={(e) => setThreshold(e.target.checked)}
        />
        {t("threshold")}
      </label>
      <div className="button-row">
        <button
          className="button secondary"
          disabled={busy || !files.length}
          onClick={() => void run()}
        >
          {t("ocrRun")}
        </button>
        {busy && (
          <button className="button secondary" onClick={cancel}>
            {t("cancel")}
          </button>
        )}
      </div>
      {progress && (
        <p role="status">
          {t("ocrWorking")} {progress}
        </p>
      )}
      {error && (
        <p role="alert" className="callout">
          {t("batchError")}
        </p>
      )}
      {results.map((r, i) => (
        <label key={i}>
          {r.name} · {t("confidence")} {Math.round(r.confidence)}%
          {suggestLanguage(r.text, r.confidence) && (
            <span className="callout small">{t("lowConfidence")}</span>
          )}
          <textarea
            rows={4}
            value={r.text}
            maxLength={12000}
            onChange={(e) => {
              const next = results.map((v, j) =>
                j === i ? { ...v, text: e.target.value } : v,
              );
              setResults(next);
              onText(
                next
                  .map((v) => v.text)
                  .join("\n\n")
                  .slice(0, 12000),
              );
            }}
          />
        </label>
      ))}
    </div>
  );
}
