"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { I18n, useI18n, type Key, type Lang } from "@/lib/i18n";
import { append, sha256, verify, type Evidence } from "@/lib/chain";
import * as vault from "@/lib/vault";
import { api, download } from "@/lib/api";
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
};
const stages: Screen[] = [
  "triage",
  "vault",
  "details",
  "guidance",
  "documents",
  "checklist",
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
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {name === "lock" ? (
        <>
          <rect x="5" y="10" width="14" height="11" rx="3" />
          <path d="M8 10V7a4 4 0 018 0v3M12 14v3" />
        </>
      ) : name === "file" ? (
        <>
          <path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" />
        </>
      ) : (
        <>
          <path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z" />
          <path d="m8 12 3 3 5-6" />
        </>
      )}
    </svg>
  );
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
  const [offline, setOffline] = useState(false);
  const [chainResult, setChainResult] = useState<{
    ok: boolean;
    brokenIndex: number | null;
  } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState("");
  const [note, setNote] = useState("");
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const ocrInput = useRef<HTMLInputElement>(null);
  const [ocrLang, setOcrLang] = useState("eng");
  const [ocrText, setOcrText] = useState("");
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [drafts, setDrafts] = useState<
    Partial<Record<Kind, { title: string; body: string }>>
  >({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const revision = useRef(0);
  const worker = useRef<Awaited<
    ReturnType<(typeof import("tesseract.js"))["createWorker"]>
  > | null>(null);
  const workId = useRef(0);
  const lastEscape = useRef(0);
  function go(next: Screen) {
    setScreen(next);
    setStatus(null);
    window.scrollTo({ top: 0 });
  }
  function lock() {
    revision.current++;
    workId.current++;
    void worker.current?.terminate();
    worker.current = null;
    setSession(null);
    setPass("");
    setEntries([]);
    setFiles([]);
    setOcrFile(null);
    setOcrText("");
    setOcrProgress(null);
    setCase(emptyCase);
    setGuidance(null);
    setDrafts({});
    setDemo(false);
    setChainResult(null);
    setNote("");
    setPlatform("");
    setBusy(false);
    setStatus("clearSession");
    setQuestion(0);
    setShowDanger(false);
    setShowMinor(false);
    setScreen("vault");
  }
  function quickExit() {
    lock();
    window.location.replace("https://www.google.com/");
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
    heading.current?.focus();
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
        const open = await vault.unlock(pass);
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
      for (const f of files)
        next = await append(next, {
          fileName: f.name,
          fileHash: await sha256(await f.arrayBuffer()),
          platform,
          note,
        });
      await saveEntries(next);
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
  async function readScreenshot() {
    if (!ocrFile) {
      setStatus("fileRequired");
      return;
    }
    if (ocrFile.size > 25 * 1024 * 1024 || !ocrFile.type.startsWith("image/")) {
      setStatus("fileLimit");
      return;
    }
    const current = revision.current;
    await run(async () => {
      setOcrProgress(0);
      try {
        const { createWorker } = await import("tesseract.js");
        worker.current = await createWorker(ocrLang, 1, {
          workerPath: "/ocr/worker.min.js",
          corePath: "/ocr",
          langPath: "/ocr/lang",
          cacheMethod: "none",
          logger: (m) => {
            if (current === revision.current && m.status === "recognizing text")
              setOcrProgress(Math.round(m.progress * 100));
          },
        });
        const result = await worker.current.recognize(ocrFile);
        if (current === revision.current)
          setOcrText(result.data.text.slice(0, 12000));
      } catch {
        if (current === revision.current) setStatus("ocrError");
      } finally {
        await worker.current?.terminate();
        worker.current = null;
        if (current === revision.current) {
          setOcrProgress(null);
          setOcrFile(null);
          if (ocrInput.current) ocrInput.current.value = "";
        }
      }
    });
  }
  async function extract() {
    await run(async () => {
      const current = revision.current;
      const data = await api("extract", { text: ocrText, lang });
      if (current !== revision.current) return;
      setCase((c) => ({
        ...c,
        platform: data.platform || c.platform,
        usernames: data.usernames.join(", ") || c.usernames,
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
    if (!caseData.description.trim()) {
      go("details");
      setStatus("fieldRequired");
      return;
    }
    await run(async () => {
      const current = revision.current;
      const result = await api("guidance", {
        scenario: caseData.scenario,
        details: caseData,
        lang,
        is_minor: caseData.is_minor,
      });
      if (current !== revision.current) return;
      setGuidance(result);
      go("guidance");
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
      download(blob, `sakshya-${kind}.pdf`);
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
      {key === "description" || key === "accused" ? (
        <textarea
          rows={key === "description" ? 5 : 2}
          value={caseData[key]}
          maxLength={key === "description" ? 12000 : 2000}
          onChange={(e) => changeCase(key, e.target.value)}
        />
      ) : (
        <input
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
              {t(stage as Key)}
            </button>
          ))}
        </nav>
      )}
      <main id="main" className={screen === "home" ? "home" : "workspace"}>
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
                <p className="small reassurance">{t("reassure")}</p>
              </div>
              <aside className="privacy-card">
                <span className="large-icon">
                  <Icon name="lock" />
                </span>
                <h2>{t("local")}</h2>
                <p>{t("localBody")}</p>
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
                  entries.map((e) => (
                    <article
                      className={`evidence card ${chainResult?.brokenIndex === e.index ? "broken" : ""}`}
                      key={e.index}
                    >
                      <div className="evidence-top">
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
                          {(["fileHash", "prevHash", "entryHash"] as const).map(
                            (key) => (
                              <div key={key}>
                                <dt>{t(key)}</dt>
                                <dd>
                                  <code>{e[key]}</code>
                                </dd>
                              </div>
                            ),
                          )}
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
            {caseData.is_minor && minorPanel()}
            <section className="card ocr-card">
              <h2>{t("ocrTitle")}</h2>
              <p>{t("ocrHelp")}</p>
              <div className="form-grid">
                <label>
                  {t("ocrFile")}
                  <input
                    ref={ocrInput}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
                  />
                </label>
                <label>
                  {t("ocrLanguage")}
                  <select
                    value={ocrLang}
                    onChange={(e) => setOcrLang(e.target.value)}
                  >
                    <option value="eng">{t("english")}</option>
                    <option value="hin">{t("hindi")}</option>
                    <option value="mar">{t("marathi")}</option>
                  </select>
                </label>
              </div>
              {button("ocrRun", () => void readScreenshot(), true, !ocrFile)}
              {ocrProgress !== null && (
                <p role="status">
                  {t("ocrWorking")} {ocrProgress}%
                </p>
              )}
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
              {button("getGuidance", () => void getGuidance())}
            </section>
          </>
        )}
        {screen === "guidance" && (
          <>
            {intro("guidanceTitle", "guidanceSubtitle")}
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
                <div className="provision-grid">
                  {guidance.provisions.length === 0 ? (
                    <p className="card">{t("noMatch")}</p>
                  ) : (
                    guidance.provisions.map((p) => (
                      <article className="card provision" key={p.id}>
                        <div className="badge">{t("verification")}</div>
                        <p className="citation">
                          {p.act} · § {p.section}
                        </p>
                        <h2>{p.title}</h2>
                        <p>{p.plain_summary}</p>
                        <h3>{t("why")}</h3>
                        <p>{p.why_it_applies}</p>
                        <Link href={p.source_url}>{t("source")}</Link>
                      </article>
                    ))
                  )}
                </div>
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
