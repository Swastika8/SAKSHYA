"use client";
import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { readConsent, saveConsent } from "@/lib/consent";
import { useI18n } from "@/lib/i18n";
export function useAIConsent() {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState("mock");
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    try {
      setEnabled(readConsent(localStorage));
    } catch {}
    const abort = new AbortController();
    fetch(`${API}/api/ai/status`, {
      cache: "no-store",
      credentials: "omit",
      signal: abort.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setAvailable(data.available === true);
          setProvider(data.provider);
        }
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  function toggle(value: boolean) {
    setEnabled(value);
    try {
      saveConsent(localStorage, value);
    } catch {}
  }
  return { enabled, toggle, provider, available };
}
export function AIAssist({ ai }: { ai: ReturnType<typeof useAIConsent> }) {
  const { t } = useI18n();
  return (
    <aside className="ai-consent card">
      <div className="switch-row">
        <div>
          <h2>{t("aiAssist")}</h2>
          <p className="small">{t("aiOptional")}</p>
        </div>
        <label className="switch-control">
          <input
            type="checkbox"
            role="switch"
            aria-label={t("aiAssist")}
            checked={ai.enabled}
            onChange={(e) => ai.toggle(e.target.checked)}
          />
          <span>{t(ai.enabled ? "on" : "off")}</span>
        </label>
      </div>
      <p>
        {t("aiConsent").replace(
          "{provider}",
          ai.provider === "mock"
            ? "Groq"
            : ai.provider === "groq"
              ? "Groq"
              : ai.provider,
        )}
      </p>
      {!ai.available && <p className="small">{t("aiUnavailable")}</p>}
    </aside>
  );
}
