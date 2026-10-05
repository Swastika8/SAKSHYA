# Sakshya — Evidence & Action Navigator

A runnable, local prototype for people in India facing online harassment or image-based abuse. It moves from a calm triage to a private evidence inventory, cited guidance, and editable documents. **Guidance, not legal advice.** The app does not file reports, establish guilt, or guarantee court admissibility.

## Start on Windows 11 / PowerShell

Prerequisites: Python 3.11+ and a current Node.js LTS release (Node 22+ recommended). Tested here with Python 3.13 and Node 24. The Python virtual environment lives at `Backend\.venv`.

Open two PowerShell terminals. Start the backend first:

```powershell
cd D:\ChhatGPT\SheSolves_Proto
powershell -ExecutionPolicy Bypass -File .\run_backend.ps1
```

In the second terminal:

```powershell
cd D:\ChhatGPT\SheSolves_Proto
powershell -ExecutionPolicy Bypass -File .\run_frontend.ps1
```

Open **http://localhost:3000**. Keep both terminals open; Ctrl+C stops each server. The scripts install missing dependencies and copy example environment files. No API key is needed. First setup requires Internet access for packages and OCR language assets; subsequent mock-provider operation can run without Internet. No external service is needed for the vault.

The backend uses port **8000**, frontend **3000**. An existing nginx service occupies IPv4 port 8000 on this machine. The backend script automatically falls back to the IPv6 loopback address `::1` on **the same port** and records it in `Backend/.runtime-host`; the frontend script reads this and sets `NEXT_PUBLIC_API_URL=http://[::1]:8000`. It never stops unrelated programs. If both addresses are occupied, the script explains the conflict. Use `http://localhost:3000` for CORS, rather than opening the frontend through another hostname.

### Manual setup

```powershell
cd D:\ChhatGPT\SheSolves_Proto\Backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log --log-level critical
# On this machine use --host ::1 because IPv4 port 8000 is occupied.
```

```powershell
cd D:\ChhatGPT\SheSolves_Proto\Frontend
npm.cmd ci
npm.cmd run prepare:ocr
Copy-Item .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://[::1]:8000 in .env.local for IPv6.
npm.cmd run dev
```

### Production build and offline PWA

Stop the development frontend before building (both use `.next`). Keep the backend running.

```powershell
cd D:\ChhatGPT\SheSolves_Proto\Frontend
npm.cmd run build
npm.cmd start
```

The production build generates a public asset inventory and registers the service worker. Load the app once and wait for the service worker to finish installing before going offline. The cache contains only the application shell, code, icons, OCR worker/WASM and English/Hindi/Marathi language data. API responses, POST bodies, images and evidence files are never cached. Development mode deliberately does not register the service worker. Browser install options vary. Localhost is a secure context for Web Crypto and service workers; remote hosting would need HTTPS.

## Architecture and code tour

```text
Browser (Next.js App Router / TypeScript / Tailwind)
  file bytes -> Web Crypto SHA-256 -> metadata only
  screenshot -> local Tesseract worker -> editable OCR text
  passphrase -> PBKDF2 -> AES-GCM key -> encrypted Dexie record
  explicit text / metadata actions -> FastAPI (no database)
    extract -> mock rules or configured text-only provider
    guidance -> in-memory corpus retrieval -> constrained explanations
    draft/pdf -> deterministic templates -> ReportLab in-memory PDF
```

| File / directory | Purpose |
| --- | --- |
| `Frontend/app/page.tsx` | Triage, vault, OCR, details, guidance, documents and checklist flow |
| `Frontend/app/globals.css` | Responsive green/off-white design, focus states and touch targets |
| `Frontend/lib/chain.ts` | Pure SHA-256 timeline construction and first-broken-link detection |
| `Frontend/lib/vault.ts` | Dexie database with encrypted metadata records only |
| `Frontend/lib/i18n.tsx`, `locales/` | English, Hindi and Marathi context; no language URL routing |
| `Frontend/public/ocr/` | Local worker, WASM and language data; no OCR CDN calls at runtime |
| `Frontend/public/sw.js` | Application-assets-only offline cache |
| `Backend/app/main.py` | FastAPI, CORS, body limits, no-store headers and scrubbed errors |
| `Backend/app/schemas.py` | Pydantic v2 text/metadata schemas, strict extra-field rejection |
| `Backend/app/llm.py` | Mock, OpenAI, Anthropic and Gemini wrappers |
| `Backend/app/rag.py` | Corpus-only multilingual model / TF-IDF retrieval |
| `Backend/app/pdfgen.py` | Editable draft templates and ReportLab PDF rendering |
| `Backend/app/routers/api.py` | Requested API endpoints |
| `Backend/corpus/` | 18 paraphrased legal provisions and reporting route corpus |
| `Backend/tests/`, `Frontend/lib/chain.test.ts`, `Frontend/e2e/` | API, chain and browser tests |

## Privacy model

- Files are read in browser memory for hashing or OCR, then released; originals are never persisted by the app or uploaded. The file picker may retain a selection until the action finishes. Keep originals yourself.
- The vault stores only a salt, fresh IV and AES-GCM ciphertext in IndexedDB. The payload contains the timeline metadata and hashes. The key is derived using PBKDF2, **200,000 iterations**, SHA-256, a random 16-byte salt, and AES-256-GCM with a fresh 12-byte IV for each save. The key/passphrase are not persisted. A wrong passphrase fails authenticated decryption; no recovery service exists.
- Case forms, OCR text, guidance and drafts live in memory. Refresh or lock clears them. Only locale and checklist completion flags are saved unencrypted in localStorage.
- Demo metadata is encrypted in a **separate** IndexedDB record. Tamper simulation changes only the synthetic record. Leaving demo restores the real timeline. Clicking Demo mode again resets the synthetic chain.
- Backend data is request-scoped and discarded after the response. No database or request-body log exists. Python logging is disabled; start uvicorn with access logs disabled. HTTP validation errors do not echo inputs. Proxies/debuggers outside this application can have separate logging behavior.
- Extraction and guidance send edited text only. Draft/PDF generation also sends hashes and metadata (including file names) to the local backend. If you enable an external LLM, extraction text and guidance scenario text go to that provider; files/images do not. Provider retention policies are outside this app.
- Generated PDF downloads are **unencrypted**. Store them securely. Quick Exit uses `location.replace` to a neutral site and clears live state; it does not erase browser history, existing downloads, screenshots, or the encrypted vault. Press Escape twice within 1.2 seconds to trigger it.

## Hash chain

Each entry contains `index`, ISO timestamp, `fileName`, `fileHash`, `platform`, `note`, `prevHash`, `entryHash`.

```text
entryHash = SHA256(index|timestamp|fileName|fileHash|platform|note|prevHash)
first prevHash = 64 zeros
```

The implementation rejects `|` in free-text chain fields to avoid ambiguous serialization. Verification checks the ordinal, previous link and recomputed entry digest. It rereads encrypted storage before verification, rather than checking only a stale UI copy. A local chain detects modifications relative to its recorded state; it cannot prove time, source authenticity or protect against an attacker who rewrites the whole chain, deletes its tail, or controls the unlocked device. Export and independently retain a trusted digest/inventory if appropriate. This is not a notarization or court certification service.

## Legal corpus and reporting routes

**Read `Backend/corpus/README.md` before any demonstration.** Every provision has an act, section, source link, plain paraphrase and `needs_verification: true`. No fabricated statutory quotes are used. Retrieval can only return corpus IDs. An unrelated query returns no provisions. Minor mode includes appropriate POCSO items and Take It Down instead of suggesting StopNCII eligibility. The Help panel keeps both services clearly labelled.

RAG defaults to `auto`: try the locally cached `paraphrase-multilingual-MiniLM-L12-v2` model, otherwise use scikit-learn character TF-IDF. Set `RAG_MODE=transformer` to allow a first model download (inside `Backend/.model-cache`), or `RAG_MODE=tfidf` for deterministic offline startup. Similarities use numpy; no vector database exists. A keyword gate reduces unrelated results, but is intentionally conservative and can miss paraphrases or multilingual variants. Do not treat no match as no remedy.

The LLM selects **only prewritten corpus explanation choices**. It cannot add a provision, source URL or new legal explanation. This is a deliberate safeguard against uncited model output. Templates are deterministic and editable. Section 63 output includes party and expert preparation fields and all evidence hashes; it is a **preparation worksheet**, not the completed official Schedule. Have a qualified person verify and complete the required form. Legal summaries and document bodies can remain English, visibly disclosed; interface strings and PDF titles are translated. Windows Nirmala UI provides Devanagari PDF glyphs and HarfBuzz shaping. On non-Windows systems, supply `Backend/assets/NotoSansDevanagari.ttf` under its license before generating Hindi/Marathi PDFs.

## Optional LLM credentials

Copy `Backend/.env.example` to `.env`, set `LLM_PROVIDER` to `openai`, `anthropic`, `gemini` or `mock`, and fill the matching key. Never put provider keys in a frontend environment variable.

```dotenv
LLM_PROVIDER=mock
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
LLM_MODEL=
RAG_MODE=auto
```

The requested provider without its key falls back to mock. Provider errors also fall back without logging request content. `LLM_MODEL` overrides provider defaults. Paid-provider calls were not exercised with credentials during the synthetic demonstration.

## API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/health` | `{"status":"ok"}` |
| POST | `/api/extract` | `{text,lang}` -> platform, usernames, dates, threat_type, summary |
| POST | `/api/guidance` | `{scenario,details,lang,is_minor}` -> cited provisions, routes, disclaimer |
| POST | `/api/draft` | `{kind,case,evidence,lang}` -> title and editable body |
| POST | `/api/pdf` | Same request, optional `edited_body`, returns PDF bytes |
| GET | `/api/helplines` | Sourced 112 / 181 / 1098 and reporting resources |

`kind` is `complaint`, `takedown`, `section63`, or the additional `timeline` export. `case` contains platform, usernames (string), dates (string), description, accused, scenario, is_minor. `evidence` uses the chain entry format above. `lang` is `en`, `hi` or `mr`. Maximum request body: 2 MB, text: 12,000 characters, evidence: 200 entries, browser file size: 25 MB. Unknown fields (including image/file payload fields) are rejected. PDFs use escaped plain text, never executable HTML.

## Synthetic demo script

1. Choose **Get help now**. Select threats, no immediate danger, and adult. Separately test Yes danger/Yes minor to see emergency-first support and cited POCSO context.
2. Create a vault with a demo-only passphrase of at least 12 characters. Select **Demo mode**.
3. Click **Verify chain**: all links pass. Click **Simulate tampering**, then verify: entry 1 is highlighted as broken. Reload Demo mode to restore the synthetic timeline. Download its PDF.
4. Continue to details. Use only a synthetic screenshot of text. Choose English, Hindi or Marathi, run OCR locally, review/edit the text, then explicitly extract details. Edit any field.
5. Find guidance. Each card must have a citation, source link and verification flag. Check the reporting options.
6. Create each of the three drafts. Edit the preview and download a PDF. Confirm hashes in the evidence inventory and blanks in the certificate preparation draft.
7. Switch languages. The interface and new PDF headings change. Tick a next-step item and reload to confirm checklist persistence.
8. Lock and unlock with the passphrase. A wrong passphrase must fail. Quick Exit and double Escape should leave for the neutral site.

## Tests

```powershell
cd D:\ChhatGPT\SheSolves_Proto\Backend
.\.venv\Scripts\python.exe -m pytest -q
cd ..\Frontend
npm.cmd test
npm.cmd run typecheck
# Both servers must be running; uses installed Microsoft Edge headlessly.
npx.cmd playwright test
```

The browser suite uses synthetic text/PNG data, checks 375px and desktop layouts, demo verification/tampering, OCR, encrypted IndexedDB records, text-only requests, citations, edited PDF downloads, Hindi/Marathi switches, wrong-passphrase rejection, checklist persistence and Quick Exit. QA screenshots/PDFs live in `Frontend/test-results/qa` and contain synthetic data only. Test tooling may retain traces of synthetic inputs; do not run recording tests with real cases.

## Practical limitations

This is a student prototype, not a production security or legal audit. The small legal corpus requires review before use; document review and formal certificate completion remain human tasks. OCR quality varies and must be checked. A local encrypted vault does not protect an unlocked or compromised device, deleted browser storage, a forgotten passphrase, or a completely rewritten chain. The offline PWA requires an initial successful install/cache; legal APIs still require the local backend running. No image removal or filing is performed automatically. Emergency numbers and platform links need local verification.
