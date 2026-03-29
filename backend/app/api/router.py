from fastapi import APIRouter

from app.api import auth, jobs, resume, scraper


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(resume.router)
api_router.include_router(jobs.router)
api_router.include_router(scraper.router)
