"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { I18n, useI18n, type Key, type Lang } from "@/lib/i18n";
import { append, sha256, verify, type Evidence } from "@/lib/chain";
import * as vault from "@/lib/vault";
import { api, download } from "@/lib/api";
import { AIAssist, useAIConsent } from "@/components/AIAssist";
import { performExit } from "@/lib/exit";
import {
  ShieldCheck,
  LockKeyhole,
  FileText,
  Camera,
  MessageCircle,
  Send,
  Globe,
} from "lucide-react";
import { BatchOCR } from "@/components/BatchOCR";
import { flushSync } from "react-dom";
type Screen =
  | "home"
  | "triage"
  | "vault"
  | "details"
  | "guidance"
  | "documents"
  | "checklist";
type Kind = "complaint" | "takedown" | "section63";
type Case = {
  platform: string;
  usernames: string;
  dates: string;
  description: string;
  accused: string;
  scenario: string;
  is_minor: boolean;
  statement: string;
};
type Guidance = {
  provisions: {
    id: string;
    act: string;
    section: string;
    title: string;
    plain_summary: string;
    why_it_applies: string;
    source_url: string;
    needs_verification: boolean;
  }[];
  reporting_routes: { name: string; source_url: string; note: string }[];
};
const emptyCase: Case = {
  platform: "",
  usernames: "",
  dates: "",
  description: "",
  accused: "",
  scenario: "",
  is_minor: false,
  statement: "",
};
const stages: Screen[] = [
  "triage",
  "vault",
  "details",
  "guidance",
  "documents",
];
const scenarios = {
  images: "leaked or deepfaked images",
  threats: "threats or blackmail",
  stalking: "stalking",
  impersonation: "impersonation",
};
const BSA =
  "https://www.indiacode.nic.in/indiacode/bitstream/123456789/20063/1/aa202347.pdf";
const POCSO = "https://www.indiacode.nic.in/handle/123456789/17804";
function Icon({ name = "shield" }: { name?: string }) {
  const icons: Record<string, typeof ShieldCheck> = {
    shield: ShieldCheck,
    lock: LockKeyhole,
    file: FileText,
    instagram: Camera,
    whatsapp: MessageCircle,
    telegram: Send,
    facebook: Globe,
  };
  const Component = icons[name.toLowerCase()] || FileText;
  return <Component size={24} strokeWidth={1.6} aria-hidden="true" />;
}
function cover(id: string) {
  return id.startsWith("pocso") || id === "it67b"
    ? "coverChild"
    : ["bns351", "bns78"].includes(id)
      ? "coverThreats"
      : ["it66c", "it66d", "bns356"].includes(id)
        ? "coverIdentity"
        : "coverPrivacy";
}
function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
    >
      {children}
    </a>
  );
}
export default function Page() {
  return (
    <I18n>
      <App />
    </I18n>
  );
}
function App() {
  const { t, lang, setLang } = useI18n();
  const ai = useAIConsent();
  const [statementLabel, setStatementLabel] = useState("");
  const [screen, setScreen] = useState<Screen>("home");
  const [question, setQuestion] = useState(0);
  const [showDanger, setShowDanger] = useState(false);
  const [showMinor, setShowMinor] = useState(false);
  const [caseData, setCase] = useState<Case>(emptyCase);
  const [help, setHelp] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [pass, setPass] = useState("");
  const [session, setSession] = useState<{
    key: CryptoKey;
    salt: Uint8Array<ArrayBuffer>;
  } | null>(null);
  const [entries, setEntries] = useState<Evidence[]>([]);
  const [demo, setDemo] = useState(false);
  const [status, setStatus] = useState<Key | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!busy) return;
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [busy]);
  const [offline, setOffline] = useState(false);
  const [chainResult, setChainResult] = useState<{
    ok: boolean;
    brokenIndex: number | null;
  } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState("");
  const [note, setNote] = useState("");
  const [fileNotes, setFileNotes] = useState<Record<number, string>>({});
  const [saveProgress, setSaveProgress] = useState("");
  const [search, setSearch] = useState("");
  const [autoFields, setAutoFields] = useState<string[]>([]);
  const [largeText, setLargeText] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [drafts, setDrafts] = useState<
    Partial<Record<Kind, { title: string; body: string }>>
  >({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const revision = useRef(0);
  const workId = useRef(0);
  const lastEscape = useRef(0);
  function go(next: Screen) {
    history.replaceState({ step: next }, "", location.pathname);
    setScreen(next);
    setStatus(null);
    window.scrollTo({ top: 0 });
  }
  function lock() {
    revision.current++;
    workId.current++;
    setSession(null);
    setPass("");
    setEntries([]);
    setFiles([]);
    setOcrText("");
    setCase(emptyCase);
    setStatementLabel("");
    setGuidance(null);
    setDrafts({});
    setDemo(false);
    setChainResult(null);
    setNote("");
    setFileNotes({});
    setSearch("");
    setAutoFields([]);
    setSaveProgress("");
    setPlatform("");
    setBusy(false);
    setStatus("clearSession");
    setQuestion(0);
    setShowDanger(false);
    setShowMinor(false);
    setScreen("vault");
  }
  function quickExit() {
    performExit(() => flushSync(lock));
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const now = Date.now();
        if (now - lastEscape.current < 1200) quickExit();
        lastEscape.current = now;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [screen, question, showDanger, showMinor]);
  useEffect(() => {
    if (help) dialog.current?.showModal();
    else dialog.current?.close();
  }, [help]);
  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("sakshya-checks") || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        setChecks(parsed);
    } catch {}
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    setDrafts({});
    setGuidance(null);
  }, [lang]);
  function changeCase(key: keyof Case, value: string | boolean) {
    setCase((c) => ({ ...c, [key]: value }));
    setAutoFields((fields) => fields.filter((field) => field !== key));
    setGuidance(null);
    setDrafts({});
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    const current = workId.current;
    try {
      await fn();
    } catch (e) {
      if (current === workId.current)
        setStatus(
          e instanceof Error && e.message === "delimiter"
            ? "delimiter"
            : "error",
        );
    } finally {
      if (current === workId.current) setBusy(false);
    }
  }
  async function saveEntries(next: Evidence[], isDemo = demo) {
    if (!session) return;
    const current = revision.current;
    await vault.save(
      next,
      session.key,
      session.salt,
      isDemo ? "demo-timeline" : "timeline",
    );
    if (current !== revision.current) return;
    setEntries(next);
    setChainResult(null);
    setDrafts({});
  }
  async function unlock() {
    if (pass.length < 12) {
      setStatus("passError");
      return;
    }
    await run(async () => {
      try {
        const current = revision.current;
        const open = await vault.unlock(pass);
        if (current !== revision.current) return;
        setSession({ key: open.key, salt: open.salt });
        setEntries(open.entries);
        setPass("");
        setStatus("unlocked");
      } catch {
        setStatus("unlockError");
      }
    });
  }
  async function loadDemo() {
    if (!session) return;
    await run(async () => {
      const current = revision.current;
      let next: Evidence[] = [];
      next = await append(
        next,
        {
          fileName: "synthetic-message.txt",
          fileHash: await sha256(
            "Sakshya synthetic message 1. No real person or image.",
          ),
          platform: "Instagram",
          note: t("demoNoteOne"),
        },
        "2026-10-05T10:00:00.000Z",
      );
      next = await append(
        next,
        {
          fileName: "synthetic-followup.txt",
          fileHash: await sha256(
            "Sakshya synthetic message 2. No real person or image.",
          ),
          platform: "Instagram",
          note: t("demoNoteTwo"),
        },
        "2026-10-05T10:05:00.000Z",
      );
      await saveEntries(next, true);
      if (current !== revision.current) return;
      setDemo(true);
      setCase({
        ...emptyCase,
        platform: "Instagram",
        usernames: "@demo_account",
        dates: "2026-10-05",
        description: t("demoDescription"),
        scenario: "threats or blackmail",
        is_minor: caseData.is_minor,
      });
      setGuidance(null);
      setStatus("demoLoaded");
    });
  }
  async function addFiles() {
    if (!session) return;
    if (!files.length) {
      setStatus("fileRequired");
      return;
    }
    if (
      files.some((f) => f.size > 25 * 1024 * 1024) ||
      entries.length + files.length > 200
    ) {
      setStatus("fileLimit");
      return;
    }
    await run(async () => {
      let next = await vault.read(
        session.key,
        demo ? "demo-timeline" : "timeline",
      );
      if (!(await verify(next)).ok) {
        setStatus("checkFirst");
        return;
      }
      for (const [i, f] of files.entries()) {
        setSaveProgress(`${i + 1}/${files.length}`);
        next = await append(next, {
          fileName: f.name,
          fileHash: await sha256(await f.arrayBuffer()),
          platform,
          note: fileNotes[i] ?? note,
        });
      }
      await saveEntries(next);
      setSaveProgress("");
      setFileNotes({});
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
      setNote("");
      setStatus("saved");
    });
  }
  async function checkChain() {
    if (!session) return;
    await run(async () => {
      const stored = await vault.read(
        session.key,
        demo ? "demo-timeline" : "timeline",
      );
      setEntries(stored);
      if (!stored.length) {
        setStatus("chainEmpty");
        return;
      }
      setChainResult(await verify(stored));
    });
  }
  async function extract() {
    await run(async () => {
      const current = revision.current;
      const data = await api("extract", {
        text: ocrText,
        lang,
        ai_assist: ai.enabled,
      });
      if (current !== revision.current) return;
      setAutoFields([
        ...(data.platform ? ["platform"] : []),
        ...(data.usernames.length ||
        data.urls.length ||
        data.phone_numbers.length
          ? ["usernames"]
          : []),
        ...(data.dates.length ? ["dates"] : []),
        ...(data.summary ? ["description"] : []),
      ]);
      setCase((c) => ({
        ...c,
        platform: data.platform || c.platform,
        usernames:
          [...data.usernames, ...data.urls, ...data.phone_numbers].join(", ") ||
          c.usernames,
        dates: data.dates.join(", ") || c.dates,
        description: data.summary || c.description,
        scenario:
          data.threat_type === "unspecified" ? c.scenario : data.threat_type,
      }));
      setGuidance(null);
      setDrafts({});
      setStatus("extractDone");
    });
  }
  async function getGuidance() {
    await run(async () => {
      const current = revision.current;
      const result = await api("guidance", {
        scenario: caseData.scenario,
        details: caseData,
        lang,
        is_minor: caseData.is_minor,
        ai_assist: ai.enabled,
      });
      if (current !== revision.current) return;
      setGuidance(result);
      go("guidance");
    });
  }
  async function makeStatement() {
    await run(async () => {
      const current = revision.current;
      const result = await api("draft/statement", {
        case: caseData,
        lang,
        ai_assist: ai.enabled,
      });
      if (current !== revision.current) return;
      changeCase("statement", result.body);
      setStatementLabel(result.label);
    });
  }
  async function makeDraft(kind: Kind) {
    await run(async () => {
      const current = revision.current;
      const result = await api("draft", {
        kind,
        case: caseData,
        evidence: entries,
        lang,
      });
      if (current !== revision.current) return;
      setDrafts((d) => ({ ...d, [kind]: result }));
      setStatus("draftReady");
    });
  }
  async function getPdf(kind: Kind | "timeline") {
    await run(async () => {
      const current = revision.current;
      const blob = await api(
        "pdf",
        {
          kind,
          case: caseData,
          evidence: entries,
          lang,
          ...(kind !== "timeline" && drafts[kind]
            ? { edited_body: drafts[kind]!.body }
            : {}),
        },
        true,
      );
      if (current !== revision.current) return;
      download(
        blob,
        `${{ complaint: "Complaint", takedown: "Takedown", section63: "Section63", timeline: "Timeline" }[kind]}_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      setStatus("pdfReady");
    });
  }
  function toggleCheck(key: string) {
    const next = { ...checks, [key]: !checks[key] };
    setChecks(next);
    try {
      localStorage.setItem("sakshya-checks", JSON.stringify(next));
    } catch {
      setStatus("storageError");
    }
  }
  const button = (
    key: Key,
    action: () => void,
    secondary = false,
    disabled = false,
  ) => (
    <button
      className={secondary ? "button secondary" : "button"}
      onClick={action}
      disabled={busy || disabled}
    >
      {t(key)}
    </button>
  );
  const intro = (title: Key, body: Key) => (
    <div className="section-intro">
      <p className="eyebrow">
        {t(screen === "home" ? "eyebrow" : (screen as Key))}
      </p>
      <h1 ref={heading} tabIndex={-1}>
        {t(title)}
      </h1>
      <p>{t(body)}</p>
    </div>
  );
  const helplines = () => (
    <>
      <div className="helplines">
        {(["emergency", "women", "child"] as Key[]).map((key, i) => (
          <a key={key} href={`tel:${["112", "181", "1098"][i]}`}>
            <strong>{["112", "181", "1098"][i]}</strong>
            <span>{t(key)}</span>
          </a>
        ))}
      </div>
      <p className="small">
        {t("verifyNumbers")} <Link href="https://112.gov.in/">112</Link> ·{" "}
        <Link href="https://wcd.gov.in/women/help">181</Link> ·{" "}
        <Link href="https://www.india.gov.in/directory/helpline">1098</Link>
      </p>
    </>
  );
  const minorPanel = () => (
    <aside className="callout">
      <h2>{t("minorTitle")}</h2>
      <p>{t("minorBody")}</p>
      <p>
        {t("pocso")} <Link href={POCSO}>{t("source")}</Link>
      </p>
    </aside>
  );
  const field = (
    key: "platform" | "usernames" | "dates" | "description" | "accused",
  ) => (
    <label className={key === "description" ? "span-two" : ""} key={key}>
      {t(key)}
      {autoFields.includes(key) && caseData[key] && (
        <span className="source-tag">{t("fromScreenshot")}</span>
      )}
      {key === "description" || key === "accused" ? (
        <textarea
          rows={key === "description" ? 5 : 2}
          aria-label={t(key)}
          value={caseData[key]}
          maxLength={key === "description" ? 12000 : 2000}
          onChange={(e) => changeCase(key, e.target.value)}
        />
      ) : (
        <input
          aria-label={t(key)}
          value={caseData[key]}
          maxLength={key === "usernames" ? 2000 : 500}
          onChange={(e) => changeCase(key, e.target.value)}
        />
      )}
    </label>
  );
  return (
    <>
      <a className="skip-link" href="#main">
        {t("continue")}
      </a>
      <header className="topbar">
        <button className="brand" onClick={() => go("home")}>
          <span className="brand-mark">
            <Icon />
          </span>
          <span>
            <strong>{t("brand")}</strong>
            <small>{t("tagline")}</small>
          </span>
        </button>
        <div className="header-actions">
          <button
            className="text-size"
            aria-label={t("sizeText")}
            aria-pressed={largeText}
            onClick={() => setLargeText((v) => !v)}
          >
            A+
          </button>
          <label className="language">
            <span className="sr-only">{t("language")}</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              aria-label={t("language")}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी</option>
            </select>
          </label>
          <button className="exit" onClick={quickExit}>
            {t("exit")} <span aria-hidden="true">×</span>
          </button>
        </div>
      </header>
      <div className="support-strip">
        <span>
          <Icon name="lock" />
          {t("reassure")}
        </span>
        <button onClick={() => setHelp(true)}>{t("help")}</button>
      </div>
      {screen !== "home" && (
        <nav className="stepnav" aria-label={t("stepsIntro")}>
          {stages.map((stage, i) => (
            <button
              key={stage}
              onClick={() => {
                if (stage === "triage") {
                  setQuestion(0);
                  setShowDanger(false);
                  setShowMinor(false);
                }
                go(stage);
              }}
              aria-current={screen === stage ? "step" : undefined}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {t(
                (
                  [
                    "understand",
                    "saveProof",
                    "checkDetails",
                    "yourOptions",
                    "yourDocuments",
                  ] as Key[]
                )[i],
              )}
            </button>
          ))}
        </nav>
      )}
      <main
        style={{ fontSize: largeText ? "1.2em" : undefined }}
        id="main"
        className={screen === "home" ? "home" : "workspace"}
      >
        {screen !== "home" && (
          <div className="utility-nav">
            <button
              onClick={() =>
                go(stages[Math.max(0, stages.indexOf(screen) - 1)] || "home")
              }
            >
              {t("back")}
            </button>
            <button onClick={() => go("checklist")}>{t("checklist")}</button>
          </div>
        )}
        {screen === "home" && (
          <details className="exit-guidance">
            <summary>{t("browsingPrivacy")}</summary>
            <p>{t("privateWindow")}</p>
          </details>
        )}
        {busy && (
          <div role="status" aria-live="polite" className="loading-card">
            <div className="skeleton" />
            <p>{slow ? t("waking") : t("busy")}</p>
          </div>
        )}
        {offline && (
          <p className="callout" role="status">
            {t("offline")}
          </p>
        )}
        {screen === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">{t("eyebrow")}</p>
                <h1 ref={heading} tabIndex={-1}>
                  {t("headline")}
                </h1>
                <p className="hero-intro">{t("intro")}</p>
                {button("start", () => {
                  setQuestion(0);
                  setShowDanger(false);
                  setShowMinor(false);
                  go("triage");
                })}
                <div className="home-choices">
                  <button
                    className="button secondary"
                    onClick={() => go("vault")}
                  >
                    <Icon name="file" />
                    {t("homeSave")}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => go("details")}
                  >
                    <Icon />
                    {t("homeOptions")}
                  </button>
                </div>
                <p className="small reassurance">{t("reassure")}</p>
              </div>
              <aside className="privacy-card">
                <span className="large-icon">
                  <Icon name="lock" />
                </span>
                <h2>{t("local")}</h2>
                <p>{t("localBody")}</p>
                <div className="privacy-icons">
                  <p>
                    <Icon name="file" />
                    {t("privateImages")}
                  </p>
                  <p>
                    <Icon name="lock" />
                    {t("privateVault")}
                  </p>
                  <p>
                    <Icon />
                    {t("privateAI")}
                  </p>
                </div>
                <div className="privacy-rule" />
                <span className="small">{t("privacyFooter")}</span>
              </aside>
            </section>
            <section className="journey">
              <p className="eyebrow">{t("stepsIntro")}</p>
              <div className="journey-grid">
                {(["step1", "step2", "step3"] as const).map((key, i) => (
                  <article key={key}>
                    <span className="number">0{i + 1}</span>
                    <h2>{t(key)}</h2>
                    <p>{t(`${key}Body`)}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
        {screen === "triage" && (
          <div className="narrow">
            <p className="eyebrow">
              {t("question")} {question + 1} / 3
            </p>
            <div className="progress-track">
              <span style={{ width: `${((question + 1) / 3) * 100}%` }} />
            </div>
            {showDanger ? (
              <>
                <h1 ref={heading} tabIndex={-1}>
                  {t("dangerTitle")}
                </h1>
                <p>{t("dangerBody")}</p>
                {helplines()}
                {button("continue", () => {
                  setShowDanger(false);
                  setQuestion(2);
                })}
              </>
            ) : showMinor ? (
              <>
                <h1 ref={heading} tabIndex={-1}>
                  {t("minorTitle")}
                </h1>
                {minorPanel()}
                {helplines()}
                {button("continue", () => go("vault"))}
              </>
            ) : (
              <>
                <h1 ref={heading} tabIndex={-1}>
                  {t(
                    (["what", "dangerQuestion", "minorQuestion"] as Key[])[
                      question
                    ],
                  )}
                </h1>
                <div className="choice-list">
                  {question === 0
                    ? (
                        Object.keys(scenarios) as (keyof typeof scenarios)[]
                      ).map((key, i) => (
                        <button
                          className="choice"
                          key={key}
                          onClick={() => {
                            changeCase("scenario", scenarios[key]);
                            setQuestion(1);
                          }}
                        >
                          <span className="choice-number">0{i + 1}</span>
                          {t(key)}
                        </button>
                      ))
                    : (["yes", "no"] as const).map((answer) => (
                        <button
                          className="choice"
                          key={answer}
                          onClick={() => {
                            const yes = answer === "yes";
                            if (question === 1) {
                              if (yes) setShowDanger(true);
                              else setQuestion(2);
                            } else {
                              changeCase("is_minor", yes);
                              if (yes) setShowMinor(true);
                              else go("vault");
                            }
                          }}
                        >
                          {t(answer)}
                        </button>
                      ))}
                </div>
                {question > 0 &&
                  button("back", () => setQuestion(question - 1), true)}
              </>
            )}
            <p className="small">{t("reassure")}</p>
          </div>
        )}
        {screen === "vault" && (
          <>
            {intro("vaultTitle", "vaultSubtitle")}
            {caseData.is_minor && minorPanel()}
            <div className="vault-layout">
              <section className="card vault-controls">
                {!session ? (
                  <>
                    <Icon name="lock" />
                    <h2>{t("locked")}</h2>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void unlock();
                      }}
                    >
                      <label>
                        {t("passphrase")}
                        <input
                          type="password"
                          value={pass}
                          minLength={12}
                          maxLength={500}
                          autoComplete="off"
                          onChange={(e) => setPass(e.target.value)}
                        />
                      </label>
                      <p className="small">{t("passHelp")}</p>
                      <button className="button" disabled={busy}>
                        {t("unlock")}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="card-heading">
                      <h2>{t("unlocked")}</h2>
                      {button("lock", lock, true)}
                    </div>
                    <div className="button-row">
                      {button("demo", () => void loadDemo(), true)}
                      {demo &&
                        button(
                          "leaveDemo",
                          () =>
                            void run(async () => {
                              setEntries(await vault.read(session.key));
                              setDemo(false);
                              setChainResult(null);
                              setDrafts({});
                            }),
                          true,
                        )}
                    </div>
                    {demo ? (
                      <p className="callout">{t("demoNote")}</p>
                    ) : (
                      <>
                        <label>
                          {t("file")}
                          <input
                            ref={fileInput}
                            type="file"
                            multiple
                            onChange={(e) =>
                              setFiles(Array.from(e.target.files || []))
                            }
                          />
                        </label>
                        <p className="small">{t("fileHelp")}</p>
                        {files.map((f, i) => (
                          <label key={i}>
                            {f.name} · {t("perFileNote")}
                            <input
                              maxLength={2000}
                              value={fileNotes[i] ?? note}
                              onChange={(e) =>
                                setFileNotes((old) => ({
                                  ...old,
                                  [i]: e.target.value,
                                }))
                              }
                            />
                          </label>
                        ))}
                        {saveProgress && <p role="status">{saveProgress}</p>}
                        <label>
                          {t("platform")}
                          <input
                            value={platform}
                            maxLength={500}
                            onChange={(e) => setPlatform(e.target.value)}
                          />
                        </label>
                        <label>
                          {t("note")}
                          <textarea
                            rows={3}
                            value={note}
                            maxLength={2000}
                            onChange={(e) => setNote(e.target.value)}
                          />
                        </label>
                        {button("add", () => void addFiles())}
                      </>
                    )}
                    <div className="button-row">
                      {button(
                        "verify",
                        () => void checkChain(),
                        true,
                        entries.length === 0,
                      )}
                      {demo &&
                        button(
                          "tamper",
                          () =>
                            void run(async () => {
                              const stored = await vault.read(
                                session.key,
                                "demo-timeline",
                              );
                              stored[0] = {
                                ...stored[0],
                                note: stored[0].note + " " + t("demoChanged"),
                              };
                              await saveEntries(stored);
                              setStatus("tampered");
                            }),
                          true,
                          !entries.length,
                        )}
                    </div>
                  </>
                )}
                <div className="vault-tip">
                  <Icon />
                  <p>{t("originals")}</p>
                </div>
                <p className="small">
                  {t("hashLimit")} <Link href={BSA}>{t("section63")}</Link>
                </p>
                <p className="small">{t("tips")}</p>
                {caseData.is_minor && (
                  <p className="small">{t("minorEvidence")}</p>
                )}
              </section>
              <section className="timeline">
                <div className="card-heading">
                  <h2>
                    {t("vault")} <span className="count">{entries.length}</span>
                  </h2>
                </div>
                <label>
                  {t("searchEvidence")}
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                {chainResult && (
                  <div
                    role="status"
                    className={`chain-status ${chainResult.ok ? "good" : "bad"}`}
                  >
                    {chainResult.ok
                      ? t("valid")
                      : `${t("broken")} ${chainResult.brokenIndex}`}
                  </div>
                )}
                {entries.length === 0 ? (
                  <div className="empty card">
                    <Icon name="file" />
                    <h3>{t("emptyVault")}</h3>
                    <p>{t("emptyVaultBody")}</p>
                  </div>
                ) : (
                  entries
                    .filter((e) =>
                      `${e.fileName} ${e.platform} ${e.note}`
                        .toLocaleLowerCase()
                        .includes(search.toLocaleLowerCase()),
                    )
                    .map((e) => (
                      <article
                        className={`evidence card ${chainResult?.brokenIndex === e.index ? "broken" : ""}`}
                        key={e.index}
                      >
                        <div className="evidence-top">
                          <Icon name={e.platform || "file"} />
                          <span className="number">
                            {String(e.index).padStart(2, "0")}
                          </span>
                          <div>
                            <h3>{e.fileName}</h3>
                            <p className="small">
                              {e.platform} · {e.timestamp}
                            </p>
                          </div>
                        </div>
                        <p>{e.note}</p>
                        <details>
                          <summary>{t("fileHash")}</summary>
                          <dl>
                            {(
                              ["fileHash", "prevHash", "entryHash"] as const
                            ).map((key) => (
                              <div key={key}>
                                <dt>{t(key)}</dt>
                                <dd>
                                  <code>{e[key]}</code>
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      </article>
                    ))
                )}
                {entries.length > 0 && (
                  <>
                    <p className="small">{t("exportPrivacy")}</p>
                    {button(
                      "exportTimeline",
                      () => void getPdf("timeline"),
                      true,
                    )}
                  </>
                )}
              </section>
            </div>
            <div className="page-actions">
              {button(session ? "continue" : "skip", () => go("details"))}
            </div>
          </>
        )}
        {screen === "details" && (
          <>
            {intro("detailsTitle", "detailsSubtitle")}
            <AIAssist ai={ai} />
            {caseData.is_minor && minorPanel()}
            <section className="card ocr-card">
              <h2>{t("ocrTitle")}</h2>
              <p>{t("ocrHelp")}</p>
              <BatchOCR onText={setOcrText} />
              <label>
                {t("ocrText")}
                <textarea
                  rows={4}
                  maxLength={12000}
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                />
              </label>
              <p className="small">{t("extractNotice")}</p>
              {button("extract", () => void extract(), true, !ocrText.trim())}
            </section>
            <section className="card">
              <div className="form-grid">
                {(
                  [
                    "platform",
                    "usernames",
                    "dates",
                    "accused",
                    "description",
                  ] as const
                ).map(field)}
                <label>
                  {t("threatType")}
                  <input
                    value={caseData.scenario}
                    maxLength={500}
                    onChange={(e) => changeCase("scenario", e.target.value)}
                  />
                </label>
              </div>
              <p className="small">{t("textNotice")}</p>
              <div className="page-actions">
                {button("getGuidance", () => void getGuidance())}
              </div>
            </section>
          </>
        )}
        {screen === "guidance" && (
          <>
            {intro("guidanceTitle", "guidanceSubtitle")}
            <AIAssist ai={ai} />
            <p className="callout">
              {t("disclaimer")} · {t("legalEnglish")}
            </p>
            {caseData.is_minor && minorPanel()}
            {!guidance ? (
              <div className="card">
                <p>{t("textNotice")}</p>
                {button("getGuidance", () => void getGuidance())}
              </div>
            ) : (
              <>
                {guidance.provisions.length === 0 ? (
                  <p className="card">{t("noMatch")}</p>
                ) : (
                  (
                    [
                      "coverThreats",
                      "coverPrivacy",
                      "coverIdentity",
                      "coverChild",
                    ] as const
                  ).map((group) => {
                    const matching = guidance.provisions.filter(
                      (p) => cover(p.id) === group,
                    );
                    return matching.length ? (
                      <section className="provision-group" key={group}>
                        <h2>{t(group)}</h2>
                        <div className="provision-grid">
                          {matching.map((p) => (
                            <article className="card provision" key={p.id}>
                              <div className="badge">{t("verification")}</div>
                              <h3>{p.title}</h3>
                              <p>{p.why_it_applies}</p>
                              <p>{p.plain_summary}</p>
                              <p className="citation">
                                {p.act} · § {p.section}
                              </p>
                              <Link href={p.source_url}>{t("source")}</Link>
                            </article>
                          ))}
                        </div>
                      </section>
                    ) : null;
                  })
                )}
                <section className="card">
                  <h2>{t("reporting")}</h2>
                  <p className="small">{t("external")}</p>
                  {guidance.reporting_routes.map((r, i) => (
                    <div className="report-route" key={`${r.name}-${i}`}>
                      <Link href={r.source_url}>
                        {r.source_url.includes("cybercrime.gov.in")
                          ? t("cyber")
                          : r.source_url.includes("stopncii.org")
                            ? t("stopncii")
                            : r.source_url.includes("takeitdown.ncmec.org")
                              ? t("takeDown")
                              : `${r.name.replace(" reporting", "")} · ${t("reporting")}`}
                      </Link>
                      <p>
                        {r.source_url.includes("stopncii.org")
                          ? t("stopNote")
                          : r.source_url.includes("takeitdown.ncmec.org")
                            ? t("minorEvidence")
                            : t("external")}
                      </p>
                    </div>
                  ))}
                </section>
                <div className="page-actions">
                  {button("prepare", () => go("documents"))}
                  {button("refreshGuidance", () => void getGuidance(), true)}
                </div>
              </>
            )}
          </>
        )}
        {screen === "documents" && (
          <>
            {intro("documentsTitle", "documentsSubtitle")}
            <AIAssist ai={ai} />
            <section className="card">
              <h2>{t("statementHelper")}</h2>
              <p>{t("statementHelp")}</p>
              {button("statementHelper", () => void makeStatement(), true)}
              {caseData.statement && (
                <label>
                  {statementLabel || t("statementPreview")}
                  <textarea
                    rows={8}
                    maxLength={20000}
                    value={caseData.statement}
                    onChange={(e) => changeCase("statement", e.target.value)}
                  />
                </label>
              )}
            </section>
            <p className="callout">
              {t("disclaimer")} · {t("legalEnglish")}
            </p>
            <p className="small">{t("exportPrivacy")}</p>
            {(["complaint", "takedown", "section63"] as Kind[]).map((kind) => (
              <section className="card document-card" key={kind}>
                <div className="card-heading">
                  <h2>{t(kind)}</h2>
                  <Icon name="file" />
                </div>
                {kind === "section63" && (
                  <p>
                    {t("sectionNote")} <Link href={BSA}>{t("source")}</Link>
                  </p>
                )}
                {button("generate", () => void makeDraft(kind), true)}
                {drafts[kind] && (
                  <>
                    <label>
                      {t("preview")}
                      <textarea
                        className="draft-preview"
                        rows={16}
                        maxLength={250000}
                        value={drafts[kind]!.body}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [kind]: { ...d[kind]!, body: e.target.value },
                          }))
                        }
                      />
                    </label>
                    {button("download", () => void getPdf(kind))}
                  </>
                )}
              </section>
            ))}
            <div className="page-actions">
              {button("checklist", () => go("checklist"))}
            </div>
          </>
        )}
        {screen === "checklist" && (
          <>
            {intro("checklistTitle", "checklistSubtitle")}
            <p className="check-count">
              {Object.values(checks).filter((v) => v === true).length} / 7{" "}
              {t("progress")}
            </p>
            {(
              [
                { title: "hour", items: ["checkSafe", "checkOriginal"] },
                {
                  title: "day",
                  items: ["checkVault", "checkReport", "checkDraft"],
                },
                { title: "week", items: ["checkSupport", "checkFollow"] },
              ] as { title: Key; items: Key[] }[]
            ).map((group, i) => (
              <section className="card checklist-card" key={group.title}>
                <h2>
                  <span className="number">0{i + 1}</span>
                  {t(group.title)}
                </h2>
                {group.items.map((item) => (
                  <label className="check-item" key={item}>
                    <input
                      type="checkbox"
                      checked={checks[item] === true}
                      onChange={() => toggleCheck(item)}
                    />
                    <span>{t(item)}</span>
                  </label>
                ))}
              </section>
            ))}
          </>
        )}
        {(status || busy) && (
          <div className="toast" role="status" aria-live="polite">
            {busy ? t("busy") : status ? t(status) : ""}
          </div>
        )}
      </main>
      <footer>
        <p>{t("disclaimer")}</p>
        <span>{t("privacyFooter")}</span>
        <p className="small">{t("exitHint")}</p>
      </footer>
      <dialog
        ref={dialog}
        className="help-dialog"
        onCancel={() => setHelp(false)}
        onClose={() => setHelp(false)}
        aria-labelledby="help-title"
      >
        <div className="card-heading">
          <h2 id="help-title">{t("help")}</h2>
          <button className="button secondary" onClick={() => setHelp(false)}>
            {t("close")}
          </button>
        </div>
        {helplines()}
        <p>
          <Link href="https://cybercrime.gov.in/">{t("cyber")}</Link>
        </p>
        <p>
          <Link href="https://stopncii.org/">{t("stopncii")}</Link>
        </p>
        <p className="small">{t("stopNote")}</p>
        <p>
          <Link href="https://takeitdown.ncmec.org/">{t("takeDown")}</Link>
        </p>
        <p className="small">{t("external")}</p>
        <p className="small">{t("disclaimer")}</p>
      </dialog>
    </>
  );
}
