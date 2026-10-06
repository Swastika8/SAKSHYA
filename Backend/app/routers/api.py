from fastapi import APIRouter, Request
from fastapi.responses import Response
from ..schemas import (
    ExtractRequest,
    GuidanceRequest,
    DraftRequest,
    Extraction,
    StatementRequest,
)
from .. import llm
from ..rag import retriever, routes
from ..pdfgen import draft, make_pdf, DISCLAIMER
from ..rate_limit import quota

router = APIRouter(prefix="/api")


@router.post("/extract", response_model=Extraction)
async def extract(req: ExtractRequest, request: Request):
    use_ai = (
        req.ai_assist
        and llm.provider() != "mock"
        and quota.allow(request.client.host if request.client else "unknown")
    )
    return await llm.extract(req.text, req.lang, use_ai)


@router.get("/ai/status")
def ai_status():
    return llm.status()


@router.post("/draft/statement")
async def incident_statement(req: StatementRequest, request: Request):
    use_ai = (
        req.ai_assist
        and llm.provider() != "mock"
        and quota.allow(request.client.host if request.client else "unknown")
    )
    return await llm.statement(req, use_ai)


@router.post("/guidance")
async def guidance(req: GuidanceRequest, request: Request):
    text = req.scenario + " " + req.details.description
    items = retriever().retrieve(text, req.is_minor)
    use_ai = (
        req.ai_assist
        and llm.provider() != "mock"
        and quota.allow(request.client.host if request.client else "unknown")
    )
    ranked = await llm.rank(items, text, use_ai)
    why = {p["id"]: p["explanations"][index] for p, index in ranked}
    items = [p for p, _ in ranked]
    provisions = [
        {
            k: v
            for k, v in p.items()
            if k
            in [
                "id",
                "act",
                "section",
                "title",
                "plain_summary",
                "source_url",
                "needs_verification",
            ]
        }
        | {"why_it_applies": why[p["id"]]}
        for p in items
    ]
    return {
        "provisions": provisions,
        "reporting_routes": routes(req.details.platform, req.is_minor),
        "disclaimer": DISCLAIMER[req.lang],
        "retrieval_mode": retriever().mode,
        "no_match": not bool(items),
    }


@router.post("/draft")
def generate_draft(req: DraftRequest):
    return draft(req)


@router.post("/pdf")
def pdf(req: DraftRequest):
    return Response(
        make_pdf(req),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="sakshya-{req.kind}.pdf"'
        },
    )


@router.get("/helplines")
def helplines():
    return {
        "helplines": [
            {"name": "Emergency", "number": "112", "source_url": "https://112.gov.in/"},
            {
                "name": "Women helpline",
                "number": "181",
                "source_url": "https://wcd.gov.in/women/help",
            },
            {
                "name": "Child helpline",
                "number": "1098",
                "source_url": "https://www.india.gov.in/directory/helpline",
            },
        ],
        "routes": routes("", False),
        "note": "Verify numbers and local availability. Use 112 for immediate danger.",
    }
