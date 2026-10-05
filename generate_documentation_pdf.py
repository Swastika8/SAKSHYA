"""
Generate comprehensive, publication-quality PDF documentation and Judge Pitch Guide for Sakshya.
Output: D:/ChhatGPT/SheSolves_Proto/Sakshya_Documentation_and_Judge_Guide.pdf
"""

import sys
import os
from pathlib import Path


from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Colors
C_FOREST = colors.HexColor("#173f35")
C_SAGE = colors.HexColor("#2d6a4f")
C_LIGHT_SAGE = colors.HexColor("#e8f0ec")
C_GOLD = colors.HexColor("#b26b16")
C_CARD_BG = colors.HexColor("#f8faf8")
C_LINE = colors.HexColor("#d7dfd4")
C_BODY = colors.HexColor("#263238")
C_MUTED = colors.HexColor("#546e7a")
C_RED = colors.HexColor("#b71c1c")
C_WHITE = colors.HexColor("#ffffff")

# Font registration
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_ITALIC = "Helvetica-Oblique"

if Path("C:/Windows/Fonts/Nirmala.ttc").exists():
    try:
        pdfmetrics.registerFont(TTFont("Nirmala", "C:/Windows/Fonts/Nirmala.ttc", subfontIndex=0))
        FONT_REGULAR = "Nirmala"
        FONT_BOLD = "Nirmala"
    except Exception:
        pass


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Suppress on cover page
        if self._pageNumber > 1:
            # Header
            self.setFont(FONT_REGULAR, 8)
            self.setFillColor(C_MUTED)
            self.drawString(42, 805, "Sakshya (साक्ष्य) — Evidence & Action Navigator | She Solves 3.0")
            self.setStrokeColor(C_LINE)
            self.setLineWidth(0.6)
            self.line(42, 798, 553, 798)

            # Footer
            self.line(42, 45, 553, 45)
            self.drawString(42, 32, "CONFIDENTIAL & PROPRIETARY — GUIDANCE, NOT LEGAL ADVICE")
            self.drawRightString(553, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def create_documentation_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=42,
        rightMargin=42,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=26,
        leading=32,
        textColor=C_FOREST,
        alignment=TA_CENTER
    )
    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=13,
        leading=18,
        textColor=C_SAGE,
        alignment=TA_CENTER
    )
    meta_style = ParagraphStyle(
        "CoverMeta",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=9.5,
        leading=14,
        textColor=C_MUTED,
        alignment=TA_CENTER
    )
    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=17,
        leading=21,
        textColor=C_FOREST,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=12,
        leading=16,
        textColor=C_SAGE,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )
    h3_style = ParagraphStyle(
        "Heading3_Custom",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=10,
        leading=14,
        textColor=C_FOREST,
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=9,
        leading=13.5,
        textColor=C_BODY,
        alignment=TA_LEFT,
        spaceAfter=5
    )
    body_bold = ParagraphStyle(
        "BodyBold_Custom",
        parent=body_style,
        fontName=FONT_BOLD
    )
    callout_style = ParagraphStyle(
        "CalloutText",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=8.5,
        leading=12.5,
        textColor=C_BODY
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName=FONT_REGULAR,
        fontSize=8.2,
        leading=11.5,
        textColor=C_BODY
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=table_cell,
        fontName=FONT_BOLD,
        textColor=C_FOREST
    )
    table_cell_header = ParagraphStyle(
        "TableHeader",
        parent=table_cell,
        fontName=FONT_BOLD,
        textColor=C_WHITE,
        alignment=TA_CENTER
    )
    qa_question = ParagraphStyle(
        "QAQuestion",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=9.5,
        leading=13.5,
        textColor=C_FOREST,
        spaceBefore=7,
        spaceAfter=2,
        keepWithNext=True
    )

    story = []

    # ==========================================
    # COVER / HEADER BANNER
    # ==========================================
    story.append(Spacer(1, 15))
    story.append(Paragraph("SAKSHYA · साक्ष्य", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Evidence & Action Navigator for Online Harassment & Image-Based Abuse", subtitle_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("She Solves 3.0 Hackathon | Complete Architectural Guide & Judge Defense Manual", meta_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=C_FOREST, spaceBefore=4, spaceAfter=12))

    # Executive Overview Callout Table
    exec_text = (
        "<b>Executive Summary:</b> Sakshya is a privacy-first, client-side progressive web application designed for "
        "women and girls in India facing non-consensual intimate image dissemination, deepfakes, cyberstalking, and digital extortion. "
        "It takes a victim from acute trauma and panic to a legally grounded, court-ready <b>Action Pack</b>: on-device cryptographic "
        "evidence hashing, tamper-evident timeline generation, local multilingual OCR, statutory retrieval with verified India Code citations, "
        "and Section 63 BSA certificate drafting. <i>Files never leave the user's browser, the backend is 100% stateless, and guidance is "
        "strictly cited and non-hallucinatory.</i>"
    )
    exec_table = Table([[Paragraph(exec_text, callout_style)]], colWidths=[511])
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_LIGHT_SAGE),
        ('BOX', (0,0), (-1,-1), 1, C_SAGE),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 1: THE 5 NON-NEGOTIABLE PRIVACY RULES
    # ==========================================
    story.append(Paragraph("1. The 5 Non-Negotiable Privacy Tenets", h1_style))
    story.append(Paragraph(
        "Victims of image-based abuse cannot risk their private photos or screenshots leaking to a cloud database, "
        "an LLM training pool, or a server log. Sakshya enforces 5 absolute architectural boundaries:",
        body_style
    ))

    privacy_data = [
        [Paragraph("Tenet", table_cell_header), Paragraph("Architectural Enforcement & Proof", table_cell_header)],
        [
            Paragraph("<b>1. Zero Image Uploads</b>", table_cell_bold),
            Paragraph("Original files and screenshots <b>never leave the browser</b>. Web Crypto API computes SHA-256 digests in memory. Only the 64-char hex hash and metadata are recorded. The backend rejects any non-JSON or multipart payload with HTTP 415.", table_cell)
        ],
        [
            Paragraph("<b>2. Stateless Backend</b>", table_cell_bold),
            Paragraph("Zero database (no SQLite/PostgreSQL/MongoDB). Request bodies are never logged or stored. Python logging is suppressed with <code>logging.disable(CRITICAL)</code>. Headers enforce <code>Cache-Control: no-store</code>, <code>nosniff</code>, and <code>no-referrer</code>.", table_cell)
        ],
        [
            Paragraph("<b>3. Zero LLM Image Exposure</b>", table_cell_bold),
            Paragraph("Images never reach an AI model. Optical Character Recognition (OCR) executes entirely on-device using Tesseract.js WebAssembly. Only user-reviewed, edited text is sent to extraction endpoints.", table_cell)
        ],
        [
            Paragraph("<b>4. 100% Sourced Citations</b>", table_cell_bold),
            Paragraph("Every legal provision returned is strictly retrieved from an audited corpus of 18 sections (BNS, IT Act, BSA Section 63, POCSO). Every claim flags <code>needs_verification: true</code> and links directly to official India Code acts. If no match exists, the system explicitly states so.", table_cell)
        ],
        [
            Paragraph("<b>5. Ubiquitous Disclaimer</b>", table_cell_bold),
            Paragraph("The prominent notice <i>'Guidance, not legal advice'</i> appears persistently across every screen, dialog, PDF export header, and canvas footer. Sakshya assists preparation; it does not replace an advocate.", table_cell)
        ]
    ]
    t_privacy = Table(privacy_data, colWidths=[135, 376])
    t_privacy.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_FOREST),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, C_LINE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_CARD_BG, C_WHITE]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_privacy)
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 2: PAGE-BY-PAGE TOUR & USER FLOW
    # ==========================================
    story.append(Paragraph("2. Site Flow & Page-by-Page Breakdown", h1_style))
    story.append(Paragraph(
        "Sakshya is architected as an intuitive 6-stage progressive workflow designed with trauma-informed UX principles, "
        "ensuring users never feel overwhelmed.",
        body_style
    ))

    pages = [
        ("Screen 1: Landing Page (Safe Entry)",
         "<b>Features:</b> Calming hero section, 'You deserve to feel safe' reassurance, immediate 'Get help now' action, "
         "overview of the 3-step path, and prominent security card explaining that data stays on device.<br/>"
         "<b>Security Controls:</b> Persistent <b>Quick Exit</b> button in header; language switcher (English, Hindi, Marathi); "
         "skip link for accessibility; zero external tracking or analytics scripts."),

        ("Screen 2: Triage Flow (Safety & Urgency Filter)",
         "<b>Features:</b> 3-question progressive wizard:<br/>"
         "1. <i>Incident category</i>: Leaked/deepfaked images, threats/blackmail, stalking, or impersonation.<br/>"
         "2. <i>Immediate danger check</i>: If 'Yes', instantly shifts to emergency mode displaying direct dial links to <b>112 (Emergency)</b>, <b>181 (Women Helpline)</b>, and <b>1098 (Childline)</b>.<br/>"
         "3. <i>Minor status check</i>: If affected person is under 18, routes to specialized POCSO guidance, highlights Take It Down (NCMEC), and cites POCSO Act Sections 11 & 19."),

        ("Screen 3: Evidence Vault (Tamper-Evident SHA-256 Chain)",
         "<b>Features:</b> Client-side evidence inventory. Users drag-and-drop screenshots/files. The browser reads bytes, "
         "hashes via Web Crypto SHA-256, and constructs an immutable ledger.<br/>"
         "<b>Hash Chain Architecture:</b> Each record contains <code>index, timestamp, fileName, fileHash, platform, note, prevHash, entryHash</code>. "
         "Genesis previous hash is 64 zeros. Entry hash is <code>SHA256(index|timestamp|fileName|fileHash|platform|note|prevHash)</code>.<br/>"
         "<b>Encryption:</b> IndexedDB is encrypted with AES-GCM-256 derived via PBKDF2 (200,000 iterations, SHA-256) from user's secret passphrase.<br/>"
         "<b>Demo & Verification:</b> 'Verify Chain' recalculates all hashes; 'Simulate Tampering' deliberately modifies an encrypted block to visually show "
         "how broken links are pinpointed (e.g., 'Broken at entry 1'). Downloadable Timeline PDF."),

        ("Screen 4: Incident Details & Local In-Browser OCR",
         "<b>Features:</b> Users upload chat screenshots for local text extraction. Uses bundled <b>Tesseract.js WebAssembly</b> "
         "with pre-cached English, Hindi, and Marathi trained data. Runs 100% offline without sending pixels anywhere.<br/>"
         "<b>Extraction Endpoint:</b> Cleaned text is submitted to <code>POST /api/extract</code>, which parses usernames (@handle), dates, "
         "threat categories, and a concise summary. The form populates automatically, allowing the user to review, edit, or redact every single field."),

        ("Screen 5: Legal Guidance (Grounded RAG Pipeline)",
         "<b>Features:</b> Submits case summary to <code>POST /api/guidance</code>. Uses Sentence-Transformers cosine similarity "
         "backed by a strict keyword eligibility gate. Returns applicable provisions from the 18-section statutory corpus.<br/>"
         "<b>Card Details:</b> Each provision displays the Act, Section number, Title, Plain-language summary, 'Why it applies' rationale, "
         "'Needs verification' warning badge, and a direct hyperlink to <b>India Code</b>.<br/>"
         "<b>Reporting Routes:</b> Direct links to National Cyber Crime Reporting Portal (cybercrime.gov.in), StopNCII.org (for adults), "
         "Take It Down (for minors), and major platform grievance reporting URLs (Instagram, WhatsApp, Facebook, X, Telegram, Snapchat, YouTube)."),

        ("Screen 6: Action Pack & Document Generator",
         "<b>Features:</b> Generates 3 court-ready, customized documents via <code>POST /api/draft</code> and <code>POST /api/pdf</code>:<br/>"
         "1. <b>Police / Cybercrime Complaint</b>: Addressed to SHO/Cyber Cell, structured incident facts, safe contact, and evidence inventory.<br/>"
         "2. <b>Platform Takedown Request</b>: Grievance officer request citing non-consensual sharing and IT Rules preservation notice.<br/>"
         "3. <b>Section 63 BSA Electronic Evidence Certificate</b>: Complete preparation worksheet formatted per Bharatiya Sakshya Adhiniyam, 2023 "
         "Schedule (Part A: Party in lawful control; Part B: Expert hash verification).<br/>"
         "<b>Live Editing:</b> Users can edit any text in the preview box before generating the final ReportLab PDF."),

        ("Screen 7: Next Steps & Local Action Checklist",
         "<b>Features:</b> Trauma-informed recovery milestones divided into actionable time horizons: <i>Next 1 Hour</i>, <i>Next 24 Hours</i>, "
         "and <i>This Week</i>. Checkboxes persist locally in <code>localStorage</code> without storing sensitive case facts."),

        ("Global Features: Quick Exit & Helplines Modal",
         "<b>Quick Exit:</b> Pressing <b>Escape twice within 1.2 seconds</b> or clicking 'Quick exit' instantly locks the session, clears memory, "
         "and executes <code>window.location.replace('https://www.google.com/')</code>.<br/>"
         "<b>Support Dialog:</b> Accessible from any screen via 'Get support' button, listing emergency helplines and reporting resources.")
    ]

    for title, desc in pages:
        story.append(Paragraph(title, h2_style))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 3))

    story.append(PageBreak())

    # ==========================================
    # SECTION 3: TECH STACKS & WHY THEY WERE CHOSEN
    # ==========================================
    story.append(Paragraph("3. Technology Stacks & Architectural Justifications", h1_style))
    story.append(Paragraph(
        "Every library and framework in Sakshya was chosen to satisfy strict privacy constraints, zero-cloud dependency, "
        "fast hackathon demonstration, and resilience against surveillance.",
        body_style
    ))

    story.append(Paragraph("Frontend Technology Stack", h2_style))
    fe_tech = [
        [Paragraph("Technology", table_cell_header), Paragraph("Role", table_cell_header), Paragraph("Why Chosen & Justification", table_cell_header)],
        [
            Paragraph("<b>Next.js 15 (App Router)</b>", table_cell_bold),
            Paragraph("Application Framework", table_cell),
            Paragraph("Enables fast production asset bundling, zero-latency client-side navigation, and seamless static exports suitable for local or edge hosting.", table_cell)
        ],
        [
            Paragraph("<b>TypeScript 5.8</b>", table_cell_bold),
            Paragraph("Type Safety & Schemas", table_cell),
            Paragraph("Guarantees strict end-to-end interface parity with backend Pydantic models. Eliminates runtime null pointer errors during sensitive evidence handling.", table_cell)
        ],
        [
            Paragraph("<b>Tailwind CSS 4</b>", table_cell_bold),
            Paragraph("Design System & UI", table_cell),
            Paragraph("Permits creating a calming, trauma-informed palette (forest green #173f35 and warm paper #f6f7f1), high contrast accessible focus states, and responsive styling down to 375px mobile screens.", table_cell)
        ],
        [
            Paragraph("<b>Dexie.js (IndexedDB)</b>", table_cell_bold),
            Paragraph("Encrypted Client Storage", table_cell),
            Paragraph("Provides reliable, structured client-side storage for encrypted timeline records without requiring any remote database or third-party cookies.", table_cell)
        ],
        [
            Paragraph("<b>Web Crypto API</b>", table_cell_bold),
            Paragraph("Hardware-Accelerated Cryptography", table_cell),
            Paragraph("Standard browser API executing PBKDF2 (200,000 iterations, SHA-256) and AES-GCM-256 encryption. Fast, native, and guarantees cryptographic operations stay in browser memory.", table_cell)
        ],
        [
            Paragraph("<b>Tesseract.js (WASM)</b>", table_cell_bold),
            Paragraph("In-Browser Client OCR", table_cell),
            Paragraph("Runs optical character recognition directly on device WebAssembly threads with pre-cached English, Hindi, and Marathi models. Ensures user screenshots never touch any network API.", table_cell)
        ],
        [
            Paragraph("<b>Custom i18n Context</b>", table_cell_bold),
            Paragraph("Multilingual Localization", table_cell),
            Paragraph("Instant, state-based translation across English, Hindi, and Marathi with zero URL routing, avoiding page reloads or leaking user language state to web servers.", table_cell)
        ],
        [
            Paragraph("<b>PWA / Service Worker</b>", table_cell_bold),
            Paragraph("Offline Resilience", table_cell),
            Paragraph("Pre-caches 39 static application assets, icons, and WASM/OCR cores. Allows victims to reload the app, unlock their vault, and verify evidence completely offline.", table_cell)
        ],
        [
            Paragraph("<b>Vitest & Playwright</b>", table_cell_bold),
            Paragraph("Automated Testing", table_cell),
            Paragraph("Vitest tests pure cryptographic hash chain logic; Playwright automates end-to-end browser user journeys, locale switches, tamper detection, and mobile responsiveness.", table_cell)
        ]
    ]
    t_fe = Table(fe_tech, colWidths=[105, 105, 301])
    t_fe.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_FOREST),
        ('GRID', (0,0), (-1,-1), 0.5, C_LINE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_CARD_BG, C_WHITE]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_fe)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Backend Technology Stack", h2_style))
    be_tech = [
        [Paragraph("Technology", table_cell_header), Paragraph("Role", table_cell_header), Paragraph("Why Chosen & Justification", table_cell_header)],
        [
            Paragraph("<b>Python 3.11+ / FastAPI</b>", table_cell_bold),
            Paragraph("Stateless API Framework", table_cell),
            Paragraph("Asynchronous ASGI server offering sub-millisecond response times, automated Pydantic schema validation, and minimal memory footprint.", table_cell)
        ],
        [
            Paragraph("<b>Pydantic v2 (StrictModel)</b>", table_cell_bold),
            Paragraph("Input Sanitization", table_cell),
            Paragraph("Configured with <code>extra='forbid'</code> and <code>max_length</code> bounds. Immediately rejects unexpected fields (e.g. uploaded images or tokens) and scrubs error messages to avoid reflecting user input.", table_cell)
        ],
        [
            Paragraph("<b>Sentence-Transformers & TF-IDF</b>", table_cell_bold),
            Paragraph("Dual-Mode Legal RAG", table_cell),
            Paragraph("Embeds queries with <code>paraphrase-multilingual-MiniLM-L12-v2</code> using NumPy cosine similarity. If the model is absent or offline, seamlessly falls back to Scikit-Learn character TF-IDF with zero external calls.", table_cell)
        ],
        [
            Paragraph("<b>ReportLab & UHarfBuzz</b>", table_cell_bold),
            Paragraph("Court-Ready PDF Engine", table_cell),
            Paragraph("Builds deterministic in-memory PDF documents (Complaints, Takedowns, BSA 63). Uses UHarfBuzz for proper Indic/Devanagari text shaping and Windows Nirmala UI font fallback.", table_cell)
        ],
        [
            Paragraph("<b>PrivacyBoundary Middleware</b>", table_cell_bold),
            Paragraph("Zero-Leakage Network Shield", table_cell),
            Paragraph("Custom ASGI middleware that enforces a 2 MB request ceiling, limits content-type strictly to <code>application/json</code>, and injects <code>Cache-Control: no-store</code> into all responses.", table_cell)
        ],
        [
            Paragraph("<b>Pluggable LLM Adapter</b>", table_cell_bold),
            Paragraph("Deterministic & Cloud AI", table_cell),
            Paragraph("Defaults to a zero-cloud, rule-based <b>Mock provider</b> that works with no API key. Can be toggled to OpenAI, Anthropic, or Gemini for text summarization while strictly forbidding the LLM from inventing statutes.", table_cell)
        ]
    ]
    t_be = Table(be_tech, colWidths=[115, 100, 296])
    t_be.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_SAGE),
        ('GRID', (0,0), (-1,-1), 0.5, C_LINE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_CARD_BG, C_WHITE]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_be)
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 4: HOW TO EXPLAIN / PITCH TO JUDGES
    # ==========================================
    story.append(Paragraph("4. How to Pitch Sakshya to Judges (The 3-Minute Script)", h1_style))
    story.append(Paragraph(
        "Judges evaluate three things: <b>Empathy for the Problem</b>, <b>Technical Elegance</b>, and <b>Real-World Defensibility</b>. "
        "Here is the ideal pitch narrative:",
        body_style
    ))

    pitch_steps = [
        ("Step 1: The Problem (0:00 - 0:35)",
         "<i>'Good morning judges. When an Indian woman discovers her private photos leaked or deepfaked on Telegram or Instagram, her first reaction is acute panic. "
         "She deletes the chat, blocks the abuser, and closes her phone. In doing so, she destroys the very evidence the police need under the new Bharatiya Sakshya Adhiniyam, 2023. "
         "If she seeks help online, current tools ask her to upload her private images to cloud servers or type into ChatGPT, leaking her data even further. "
         "We built <b>Sakshya (साक्ष्य)</b> — an Evidence and Action Navigator designed to be her private, calm, digital first responder.'</i>"),

        ("Step 2: The Core Tech & Privacy Innovation (0:35 - 1:20)",
         "<i>'Sakshya operates on a non-negotiable principle: <b>zero trust, zero cloud storage</b>. "
         "Using browser Web Crypto, we hash her evidence on-device using SHA-256. Original photos never leave her browser. "
         "We build a tamper-evident hash chain stored in AES-GCM encrypted IndexedDB with a 200,000-iteration PBKDF2 key. "
         "If an attacker alters a logged record, our chain verification algorithm instantly pinpoints the exact broken link. "
         "Her chat screenshots are parsed in-browser via WebAssembly Tesseract OCR — offline and private.'</i>"),

        ("Step 3: Grounded Legal Guidance & Section 63 BSA (1:20 - 2:10)",
         "<i>'Instead of generative legal hallucination, Sakshya uses a strictly gated multilingual RAG engine across 18 provisions of the BNS, IT Act, and POCSO. "
         "Every legal provision links directly to India Code and carries a 'needs verification' notice. "
         "Finally, Sakshya generates three court-ready documents: a police complaint, a platform takedown request, and crucially, a preparation worksheet "
         "for the Section 63 BSA electronic evidence certificate, listing the exact SHA-256 hashes of her preserved files.'</i>"),

        ("Step 4: Victim Safety & Closing (2:10 - 3:00)",
         "<i>'If an abuser enters the room, pressing Escape twice triggers our Quick Exit, instantly clearing session memory and replacing the tab with Google. "
         "Sakshya is fully localized in English, Hindi, and Marathi, works offline as an installable PWA, and requires zero paid API keys. "
         "It transforms helplessness into a structured legal action pack. Thank you, and we welcome your questions.'</i>")
    ]
    for title, script in pitch_steps:
        story.append(Paragraph(title, h2_style))
        story.append(Paragraph(script, body_style))
        story.append(Spacer(1, 3))

    story.append(PageBreak())

    # ==========================================
    # SECTION 5: CONCEPTUAL & ARCHITECTURAL QUESTIONS (JUDGE Q&A)
    # ==========================================
    story.append(Paragraph("5. Comprehensive Judge Q&A & Conceptual Deep-Dive", h1_style))
    story.append(Paragraph(
        "Anticipate these rigorous questions from technical, legal, and product judges. Here are the exact architectural answers:",
        body_style
    ))

    qas = [
        ("Q1: How do you mathematically guarantee that images never leave the victim's device?",
         "<b>Answer:</b> Through three distinct architectural barriers:<br/>"
         "1. <i>Browser Memory Sandbox:</i> The file input event reads the file as an <code>ArrayBuffer</code> directly into the browser's JavaScript V8 heap. "
         "We invoke <code>crypto.subtle.digest('SHA-256', arrayBuffer)</code> on-device. The binary buffer is immediately garbage collected.<br/>"
         "2. <i>Strict Network Payloads:</i> The API client (<code>Frontend/lib/api.ts</code>) only ever transmits JSON text payloads containing <code>{ fileName, fileHash, platform, note }</code>. "
         "Our Playwright automated tests sniff network packets and verify that neither binary data nor base64 image strings ever appear in HTTP requests.<br/>"
         "3. <i>Backend Rejection:</i> The FastAPI <code>PrivacyBoundary</code> middleware inspects incoming HTTP headers. If <code>Content-Type</code> is not <code>application/json</code>, "
         "it rejects the call with HTTP 415. Pydantic schemas enforce <code>extra='forbid'</code>, rejecting any unexpected fields."),

        ("Q2: Why does the backend not have a database? Isn't state persistence necessary?",
         "<b>Answer:</b> In victim privacy engineering, <i>data you don't possess cannot be breached, subpoenaed, or leaked</i>. "
         "A central database storing harassment reports or evidence hashes would become a catastrophic target for hackers and malicious actors. "
         "Instead, persistence is delegated entirely to the client's device using Dexie IndexedDB, encrypted with AES-256-GCM. "
         "The FastAPI backend is purely a stateless computation utility (NLP feature extraction, vector RAG retrieval, and ReportLab PDF compilation). "
         "Each HTTP request is self-contained, executed in memory, and immediately released."),

        ("Q3: Can an attacker modify the local timeline? What does the hash chain actually prove?",
         "<b>Answer:</b> The hash chain proves <b>internal integrity against tampering</b> relative to the recorded state.<br/>"
         "Each block entry digest is computed as <code>SHA256(index | timestamp | fileName | fileHash | platform | note | prevHash)</code>. "
         "Because each block embeds the cryptographic hash of the prior block, changing any byte in entry #1 alters its digest, invalidating entry #2's <code>prevHash</code>. "
         "Our verification algorithm iterates from index 1 to N, detecting the exact link where the chain breaks.<br/>"
         "<i>What it does NOT prove:</i> We explicitly disclaim that a client-side chain cannot prove independent third-party time or absolute source authenticity "
         "against an attacker with full unlocked root device access who completely rewrites the chain. That is why our UI advises exporting the timeline PDF "
         "and sharing the digest with a trusted third party or advocate immediately."),

        ("Q4: What is Section 63 of Bharatiya Sakshya Adhiniyam, 2023 (BSA), and why is it important?",
         "<b>Answer:</b> In July 2024, India replaced the Indian Evidence Act, 1872 with the Bharatiya Sakshya Adhiniyam, 2023 (BSA). "
         "Section 63 of the BSA replaces the famous Section 65B of the old act regarding the admissibility of electronic records in court. "
         "Section 63 mandates a formal certificate comprising two distinct parts: <b>Part A</b> (signed by the person in lawful control of the device/account) "
         "and <b>Part B</b> (signed by an authorized expert/forensic examiner).<br/>"
         "Sakshya generates a <i>Section 63 Preparation Worksheet</i> that pre-populates all cryptographic file hashes, device details, and required statutory "
         "clauses. It helps victims and their advocates collect the exact parameters required by the court, preventing evidence from being rejected as inadmissible."),

        ("Q5: How does Quick Exit / Smart Exit work? Does it delete browser history?",
         "<b>Answer:</b> Quick Exit is triggered either by clicking the top-right button or pressing <b>Escape twice within 1.2 seconds</b>. "
         "It executes three operations in sequence:<br/>"
         "1. <code>lock()</code>: Terminates any running Tesseract WebAssembly worker, clears unencrypted React memory state (case details, OCR text, drafts).<br/>"
         "2. Destroys the unlocked in-memory CryptoKey so the encrypted vault cannot be decrypted without re-entering the passphrase.<br/>"
         "3. Calls <code>window.location.replace('https://www.google.com/')</code>. <code>location.replace</code> replaces the current entry in the session history, "
         "meaning clicking the browser's 'Back' button will not return to Sakshya.<br/>"
         "<i>Forensic Transparency:</i> We explicitly disclose in the UI footer that Quick Exit does not delete browser cache, downloaded PDFs, or local IndexedDB files. "
         "True private browsing still requires using Incognito/Private mode."),

        ("Q6: How would Sakshya handle crowd control, viral surges, and DDoS attacks in production?",
         "<b>Answer:</b> Sakshya's architecture is uniquely optimized for high-concurrency crowd control because the heavy computational work is decentralized:<br/>"
         "1. <i>Client-Side Offloading:</i> Hashing (SHA-256), encryption (AES-GCM), database storage (IndexedDB), and image OCR (Tesseract WASM) run entirely on the "
         "client's CPU/GPU. The server does not process image bytes or store data.<br/>"
         "2. <i>Edge Caching of Static Shell:</i> The Next.js frontend is fully exportable to Cloudflare CDN or Vercel Edge, absorbing unlimited traffic.<br/>"
         "3. <i>Stateless API Scalability:</i> The FastAPI backend handles only tiny text JSON payloads (~1 KB each). It can be horizontally scaled in Docker containers "
         "behind Nginx/HAProxy with token-bucket rate limiting (e.g., 20 requests/minute per IP) to prevent denial-of-service abuse.<br/>"
         "4. <i>Deterministic Offline Fallback:</i> If backend load spikes, users can still record evidence, run OCR, and verify vaults completely offline."),

        ("Q7: Why did you build a Progressive Web App (PWA) instead of a Native Android/iOS App?",
         "<b>Answer:</b> In domestic abuse and cyberstalking scenarios, having an app icon called 'Sakshya Harassment Navigator' on a woman's phone is dangerous. "
         "If the abuser or family member inspects the phone, app store download histories and installed icons reveal that she is gathering evidence.<br/>"
         "A PWA accessed via an Incognito browser tab leaves zero app store receipts. The user can bookmark it or install it discretely. "
         "Furthermore, web technologies ensure instant access across all device types (Android, iOS, Windows, macOS, Linux) without requiring app store approval."),

        ("Q8: How do you prevent LLM hallucinations from misinforming victims on the law?",
         "<b>Answer:</b> By strictly constraining the AI's role in the architecture:<br/>"
         "1. <i>No Free-Form Legal Generation:</i> The LLM is <b>strictly prohibited from writing statutory text or inventing sections</b>. "
         "All legal provisions are retrieved deterministically from our curated 18-provision corpus.<br/>"
         "2. <i>Constrained Explanation Choices:</i> When generating the 'Why it applies' rationale, the LLM is given a discrete multiple-choice index "
         "of pre-audited explanations mapped to each corpus ID. It only selects the most relevant index.<br/>"
         "3. <i>Keyword Gate:</i> If a query does not mention terms relevant to cyber harassment (e.g., queries about gardening or rent), "
         "the keyword filter intercepts the request and returns <code>no_match: true</code>, preventing false legal matches.<br/>"
         "4. <i>Zero-Key Mock Mode:</i> In default mode, Sakshya uses deterministic rule-based NLP requiring no external API, ensuring 100% predictable output."),

        ("Q9: How does the system handle cases involving minors (under 18)?",
         "<b>Answer:</b> Minor cases fall under the strict provisions of the <b>POCSO Act, 2012</b> and Section 67B of the IT Act:<br/>"
         "1. <i>Mandatory Reporting Notice:</i> Section 19 of POCSO mandates reporting child sexual exploitation to the Special Juvenile Police Unit or local police.<br/>"
         "2. <i>Childline 1098 Priority:</i> Triage immediately surfaces 1098 Childline and urges involving a trusted guardian.<br/>"
         "3. <i>Take It Down vs StopNCII:</i> StopNCII.org is strictly for adults (images taken at 18+). For minors, Sakshya directs the victim to NCMEC's "
         "<b>Take It Down</b> service (takeitdown.ncmec.org), which creates hashes for youth under 18.<br/>"
         "4. <i>Evidence Warning:</i> The app warns: <i>'For a minor, seek specialist help on safe preservation. Do not download, forward, or redistribute sexual images.'</i>"),

        ("Q10: What is the roadmap for taking Sakshya from hackathon prototype to production?",
         "<b>Answer:</b><br/>"
         "1. <i>Direct StopNCII API Integration:</i> Partnering with SWGfL / Meta to submit client-computed PDQ image hashes directly to StopNCII from the browser.<br/>"
         "2. <i>EXIF Metadata Cryptographic Binding:</i> Extracting and hashing camera metadata (device serial, timestamp, GPS) alongside raw file bytes.<br/>"
         "3. <i>Advocate Network Handoff:</i> End-to-end encrypted peer-to-peer package export (via WebRTC or QR code) directly to verified legal aid clinics.<br/>"
         "4. <i>India Code Live Synchronization:</i> Automated scrapers to alert users of statutory amendments or commencement notifications.")
    ]

    for q, a in qas:
        story.append(Paragraph(q, qa_question))
        story.append(Paragraph(a, body_style))
        story.append(Spacer(1, 2))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Documentation PDF successfully created at: {output_path}")

if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "Sakshya_Documentation_and_Judge_Guide.pdf"
    create_documentation_pdf(output)
