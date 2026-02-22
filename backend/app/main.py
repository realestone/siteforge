from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import boq, catalog, health, photos, projects, tssr


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    from app.database import engine

    await engine.dispose()


app = FastAPI(
    title="SiteForge API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(projects.router)
app.include_router(tssr.router)
app.include_router(boq.router)
app.include_router(catalog.router)
app.include_router(photos.router)

# Serve uploaded files
uploads_path = Path(settings.uploads_dir)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")
