import logging
import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
# No server, SDK or HTTP-client logs may include user text or request bodies.
logging.disable(logging.CRITICAL)
from .routers.api import router

app = FastAPI(title="Sakshya", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class PrivacyBoundary:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def private_send(message):
            if message["type"] == "http.response.start":
                message["headers"] += [
                    (b"cache-control", b"no-store"),
                    (b"x-content-type-options", b"nosniff"),
                    (b"referrer-policy", b"no-referrer"),
                ]
            await send(message)

        if scope["method"] == "POST":
            headers = dict(scope["headers"])
            if (
                not headers.get(b"content-type", b"")
                .lower()
                .startswith(b"application/json")
            ):
                return await JSONResponse(
                    {"detail": "Only text JSON requests are accepted"}, status_code=415
                )(scope, receive, private_send)
            data = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                data.extend(message.get("body", b""))
                if len(data) > 2_000_000:
                    return await JSONResponse(
                        {"detail": "Request too large"}, status_code=413
                    )(scope, receive, private_send)
                if not message.get("more_body"):
                    break
            delivered = False

            async def replay():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {
                        "type": "http.request",
                        "body": bytes(data),
                        "more_body": False,
                    }
                return await receive()

            await self.app(scope, replay, private_send)
        else:
            await self.app(scope, receive, private_send)


app.add_middleware(PrivacyBoundary)
app.include_router(router)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    # Pydantic normally echoes bad inputs. Do not return user content on errors.
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Invalid or oversized input. Check the fields and try again."
        },
    )


@app.exception_handler(Exception)
async def internal_error(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Unable to complete this request. Try again."},
    )


@app.get("/health")
def health():
    return {"status": "ok"}
