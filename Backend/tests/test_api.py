import os

os.environ["LLM_PROVIDER"] = "mock"
os.environ["RAG_MODE"] = "tfidf"
import hashlib
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.rag import CORPUS
from app.pdfgen import chain_status
from app.schemas import Evidence

client = TestClient(app)


def evidence():
    data = {
        "index": 1,
        "timestamp": "2026-10-05T10:00:00.000Z",
        "fileName": "synthetic.txt",
        "fileHash": hashlib.sha256(b"synthetic").hexdigest(),
        "platform": "Instagram",
        "note": "Synthetic only",
        "prevHash": "0" * 64,
    }
    data["entryHash"] = hashlib.sha256(
        "|".join(
            str(data[k])
            for k in [
                "index",
                "timestamp",
                "fileName",
                "fileHash",
                "platform",
                "note",
                "prevHash",
            ]
        ).encode()
    ).hexdigest()
    return data


def test_health():
    response = client.get("/health")
    assert response.json() == {"status": "ok"}
    assert response.headers["cache-control"] == "no-store"


def test_mock_extraction():
    r = client.post(
        "/api/extract",
        json={
            "text": "Instagram @demo_user threatened to leak images on 2026-10-05.",
            "lang": "en",
        },
    )
    assert r.status_code == 200
    assert r.json()["platform"] == "Instagram"
    assert r.json()["usernames"] == ["@demo_user"]
    assert r.json()["dates"] == ["2026-10-05"]


@pytest.mark.parametrize("lang", ["en", "hi", "mr"])
def test_cited_guidance(lang):
    r = client.post(
        "/api/guidance",
        json={
            "scenario": "threats or leaked images",
            "details": {
                "platform": "Instagram",
                "description": "A threat to leak private images",
            },
            "lang": lang,
            "is_minor": False,
        },
    )
    assert r.status_code == 200
    result = r.json()
    assert result["provisions"]
    by_id = {p["id"]: p for p in CORPUS}
    for p in result["provisions"]:
        assert p["id"] in by_id
        assert p["act"] and p["section"] and p["source_url"].startswith("https://")
        assert p["source_url"] == by_id[p["id"]]["source_url"]
        assert p["needs_verification"] is True
        assert p["why_it_applies"] in by_id[p["id"]]["explanations"]


def test_no_match():
    r = client.post(
        "/api/guidance",
        json={
            "scenario": "gardening",
            "details": {"description": "Tomatoes need fertilizer"},
        },
    )
    assert r.json()["provisions"] == []
    assert r.json()["no_match"]


def test_minor_routes_and_provisions():
    r = client.post(
        "/api/guidance",
        json={"scenario": "sexual images of a child", "details": {}, "is_minor": True},
    ).json()
    assert any(p["id"].startswith("pocso") for p in r["provisions"])
    assert any("takeitdown" in x["source_url"] for x in r["reporting_routes"])
    assert not any("stopncii" in x["source_url"] for x in r["reporting_routes"])


@pytest.mark.parametrize("kind", ["complaint", "takedown", "section63", "timeline"])
@pytest.mark.parametrize("lang", ["en", "hi", "mr"])
def test_pdf(kind, lang):
    payload = {
        "kind": kind,
        "case": {"description": "Synthetic incident only. नमस्ते नमस्कार"},
        "evidence": [evidence()],
        "lang": lang,
    }
    r = client.post("/api/pdf", json=payload)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF-") and b"%%EOF" in r.content[-50:]
    assert len(r.content) > 1000
    d = client.post("/api/draft", json=payload).json()
    assert evidence()["fileHash"] in d["body"]
    assert "Signature" in d["body"] or kind != "complaint"


def test_certificate_has_both_parts_and_source():
    result = client.post(
        "/api/draft", json={"kind": "section63", "case": {}, "evidence": [evidence()]}
    ).json()["body"]
    assert "PART A" in result and "PART B" in result and "indiacode.nic.in" in result
    assert "NOT A COMPLETED" in result


def test_editable_pdf_and_markup_escaping():
    r = client.post(
        "/api/pdf",
        json={
            "kind": "complaint",
            "case": {},
            "edited_body": "Edited facts <b>literal</b> & <script>no execution</script>",
        },
    )
    assert r.status_code == 200


def test_tamper_marked_in_draft():
    item = evidence()
    item["note"] = "tampered"
    r = client.post(
        "/api/draft", json={"kind": "timeline", "case": {}, "evidence": [item]}
    ).json()
    assert "BROKEN at entry 1" in r["body"]
    assert chain_status([Evidence(**evidence())]) == "Internally consistent"


def test_validation_does_not_echo_content():
    r = client.post("/api/extract", json={"text": "PRIVATE-CONTENT" * 2000})
    assert r.status_code == 422 and "PRIVATE-CONTENT" not in r.text
    r = client.post(
        "/api/extract", json={"text": "demo", "image": "data:image/png;base64,AAAA"}
    )
    assert r.status_code == 422
    assert (
        client.post(
            "/api/extract",
            content=b"x" * 2_000_001,
            headers={"Content-Type": "application/json"},
        ).status_code
        == 413
    )
    assert (
        client.post(
            "/api/extract", content=b"image", headers={"Content-Type": "image/png"}
        ).status_code
        == 415
    )


def test_helplines_and_cors():
    assert [x["number"] for x in client.get("/api/helplines").json()["helplines"]] == [
        "112",
        "181",
        "1098",
    ]
    r = client.options(
        "/api/extract",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_allowed_and_disallowed_origins():
    allowed = client.options(
        "/api/extract",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"

    disallowed = client.options(
        "/api/extract",
        headers={
            "Origin": "https://malicious.example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert "access-control-allow-origin" not in disallowed.headers

