from io import BytesIO
from pathlib import Path
from html import escape
import hashlib
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from .schemas import DraftRequest

BSA_URL = (
    "https://www.indiacode.nic.in/indiacode/bitstream/123456789/20063/1/aa202347.pdf"
)
import json

LOCALIZED = {
    lang: json.loads(
        (Path(__file__).parent / "locales" / f"{lang}.json").read_text(encoding="utf-8")
    )
    for lang in ("en", "hi", "mr")
}
TITLES = {lang: value["titles"] for lang, value in LOCALIZED.items()}
DISCLAIMER = {lang: value["disclaimer"] for lang, value in LOCALIZED.items()}


def chain_status(entries):
    previous = "0" * 64
    for index, e in enumerate(entries, 1):
        raw = f"{e.index}|{e.timestamp}|{e.fileName}|{e.fileHash}|{e.platform}|{e.note}|{e.prevHash}"
        if (
            e.index != index
            or e.prevHash != previous
            or any("|" in s for s in [e.fileName, e.platform, e.note])
            or hashlib.sha256(raw.encode()).hexdigest() != e.entryHash
        ):
            return f"BROKEN at entry {index}. Do not represent this timeline as intact."
        previous = e.entryHash
    return "Internally consistent" if entries else "No evidence entries supplied"


def evidence_text(entries):
    if not entries:
        return "[No evidence logged. Add an inventory before filing.]"
    return "\n\n".join(
        f"Entry {e.index} | Logged (device clock): {e.timestamp}\nFile: {e.fileName}\nPlatform: {e.platform}\nNote: {e.note}\nSHA-256 file: {e.fileHash}\nPrevious entry: {e.prevHash}\nEntry hash: {e.entryHash}"
        for e in entries
    )


def draft(req: DraftRequest):
    c = req.case
    headings = LOCALIZED[req.lang]["headings"]
    facts = f'Platform: {c.platform or "[fill in]"}\nAccounts / URLs: {c.usernames or "[fill in]"}\nIncident dates: {c.dates or "[fill in]"}\nPerson under 18: {"Yes" if c.is_minor else "No / not indicated"}\nAccused details (if known): {c.accused or "[unknown]"}\n\nAccount of events (as provided; not independently verified):\n{c.statement or c.description or "[describe events in your own words]"}'
    evidence = evidence_text(req.evidence)
    status = chain_status(req.evidence)
    common = f"\n\n{headings['evidence']}\nChain check: {status}\n{evidence}\n\nA hash comparison can detect changed bytes against a trusted hash. This timeline does not independently prove authenticity, authorship, logging time or legal admissibility. Keep originals safe."
    if req.kind == "complaint":
        # Legal citations always come from the reviewed local corpus, never the LLM.
        from .rag import retriever

        provisions = retriever().retrieve(c.scenario + " " + c.description, c.is_minor)
        citations = (
            "\n\nPotential provisions for professional review (not a legal conclusion; needs verification):\n"
            + "\n".join(
                f"{p['act']} — section {p['section']}: {p['title']}\nSource: {p['source_url']}"
                for p in provisions
            )
            if provisions
            else ""
        )

        body = (
            f"To: The Station House Officer / Cyber Crime Cell\nPolice station / district: ____________________\nComplainant name and safe contact: ____________________\n\nSubject: Request to record and investigate online harassment\n\n{facts}\n\nI request that the reported conduct be assessed, relevant platform records preserved, and appropriate protection and investigation considered. Please provide an acknowledgement or reference number and contact me only through my stated safe channel. I have described facts to the best of my knowledge; I request advice on the applicable provisions.\n\nPlace / date: ____________________\nSignature: ____________________"
            + citations
            + common
        )
    elif req.kind == "takedown":
        body = (
            f'To: Safety / Grievance team, {c.platform or "[platform]"}\nReporter name / safe contact: ____________________\n\nSubject: Review and removal request\n\n{facts}\n\nPlease review the identified content and accounts under your policies, remove or restrict violating content, preserve relevant records for a lawful investigation, and send an acknowledgement to my safe contact. The affected URLs and lack of consent should be confirmed by the reporter before submission. No original image is attached by this app.\n\nDate / signature: ____________________'
            + common
        )
    elif req.kind == "section63":
        body = (
            f"{headings['worksheet']}\nCitation: Bharatiya Sakshya Adhiniyam, 2023, section 63 and Schedule (needs verification).\nSource: {BSA_URL}\nUse the current prescribed Schedule. A lawyer / qualified expert must review and complete the required party and expert portions. Do not sign an assertion you cannot verify.\n\n{headings['party']}\nName / relationship / address: ____________________\nRecord and how its output was produced: ____________________\nDevice / source type: ____________________\nMake / model / colour: ____________________\nSerial / IMEI / UID / MAC / cloud identifier: ____________________\nOwnership / maintenance / management / operation: ____________________\nLawful control and ordinary use facts: ____________________\nRegular input and operation / any malfunction and its effect: ____________________\nHash algorithm: SHA-256\nParty declaration after verification: ____________________\nPlace / date / time / signature: ____________________\n\n{headings['expert']}\nExpert name / qualifications / address: ____________________\nExamination method, device details and findings: ____________________\nIndependent hash verification and hash report attached: ____________________\nExpert declaration in prescribed form: ____________________\nPlace / date / time / expert signature: ____________________\n\n{headings['context']}\n{facts}"
            + common
        )
    else:
        body = (
            f"{headings['timeline']}\nTimestamps are supplied by the local device clock. This is a metadata inventory; no originals are attached."
            + common
        )
    return {"title": TITLES[req.lang][req.kind], "body": body}


def font_name():
    if "SakshyaUnicode" in pdfmetrics.getRegisteredFontNames():
        return "SakshyaUnicode"
    candidates = [
        Path(__file__).resolve().parents[1] / "assets" / "NotoSansDevanagari.ttf",
        Path("C:/Windows/Fonts/Nirmala.ttc"),
    ]
    for path in candidates:
        if path.exists():
            pdfmetrics.registerFont(TTFont("SakshyaUnicode", str(path), shapable=True))
            return "SakshyaUnicode"
    return "Helvetica"


def make_pdf(req: DraftRequest):
    doc = draft(req)
    body = req.edited_body if req.edited_body is not None else doc["body"]
    output = BytesIO()
    font = font_name()
    style = ParagraphStyle(
        "Body",
        fontName=font,
        fontSize=10,
        leading=16,
        spaceAfter=5,
        splitLongWords=True,
        alignment=TA_LEFT,
        shaping=True,
    )
    title = ParagraphStyle(
        "Title",
        parent=style,
        fontSize=19,
        leading=27,
        textColor=colors.HexColor("#153f35"),
        spaceAfter=12,
    )
    story = [
        Paragraph(escape(doc["title"]), title),
        Paragraph(escape(DISCLAIMER[req.lang]), style),
        Paragraph(
            LOCALIZED[req.lang]["review_note"],
            style,
        ),
        Spacer(1, 12),
    ]
    # Escape all text before giving it to ReportLab's small markup parser.
    for line in body.splitlines():
        story.append(Paragraph(escape(line) or "&#160;", style))

    def footer(canvas, document):
        canvas.setFont(font, 9)
        canvas.drawString(42, 24, f"Sakshya | {DISCLAIMER[req.lang]} | {document.page}")

    SimpleDocTemplate(
        output,
        pagesize=(595.28, 841.89),
        rightMargin=42,
        leftMargin=42,
        topMargin=40,
        bottomMargin=48,
        title=doc["title"],
        author="Sakshya",
    ).build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
