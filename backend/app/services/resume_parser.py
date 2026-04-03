import io
import re
from dataclasses import dataclass
from datetime import UTC, datetime

import fitz
import spacy
from docx import Document

from app.models.enums import ResumeEducationLevel, ResumeFileType
from app.services.skills_catalog import TECH_SKILLS

BASE_SKILLS = set(TECH_SKILLS)
EXTRA_SKILLS = {
    "spring boot",
    "spring security",
    "spring data",
    "hibernate",
    "jpa",
    "asp.net",
    ".net",
    ".net core",
    "entity framework",
    "linq",
    "blazor",
    "wpf",
    "winforms",
    "tf-idf",
    "cosine similarity",
    "feature store",
    "vectorization",
    "tokenization",
    "lemmatization",
    "stemming",
    "named entity recognition",
    "bert",
    "transformers",
    "prompt engineering",
    "rag",
    "faiss",
    "pinecone",
    "weaviate",
    "chroma",
    "milvus",
    "qdrant",
    "rabbit mq",
    "azure devops",
    "sonarqube",
    "black",
    "isort",
    "ruff",
    "mypy",
    "fastify",
    "prisma",
    "typeorm",
    "sequelize",
    "react query",
    "tanstack query",
    "zustand",
    "recoil",
    "mobx",
    "rxjs",
    "styled-components",
    "framer motion",
    "webpack",
    "rollup",
    "parcel",
    "babel",
    "esbuild",
    "pnpm",
    "yarn",
    "npm",
    "open telemetry",
    "loki",
    "tempo",
    "kibana",
    "fluentd",
    "fluent bit",
    "debezium",
    "kinesis",
    "pubsub",
    "eventbridge",
    "step functions",
    "auth0",
    "keycloak",
    "okta",
    "oauth",
    "saml",
    "jwt auth",
    "grpc gateway",
    "protobuf schema",
    "sidecar",
    "service mesh",
    "api management",
    "micro frontends",
    "monorepo",
    "nx",
    "turbo repo",
}
SKILLS_LIST: tuple[str, ...] = tuple(sorted(BASE_SKILLS | EXTRA_SKILLS))

YEAR_RANGE_PATTERN = re.compile(
    r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)?\s*"
    r"(?P<start>19\d{2}|20\d{2})\s*(?:-|to|–|—)\s*"
    r"(?:"
    r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)?\s*"
    r"(?P<end>19\d{2}|20\d{2})|(?P<present>present|current|now)"
    r")",
    re.IGNORECASE,
)
YEARS_EXPERIENCE_PATTERN = re.compile(r"(\d{1,2})\+?\s+years?", re.IGNORECASE)

TITLE_PATTERN = re.compile(
    r"(software engineer|senior software engineer|staff software engineer|principal engineer|"
    r"backend engineer|frontend engineer|full[- ]stack engineer|platform engineer|"
    r"devops engineer|site reliability engineer|data engineer|ml engineer|ai engineer|"
    r"data scientist|machine learning scientist|qa engineer|test engineer|engineering manager|"
    r"product manager|technical program manager|solutions architect|cloud architect)",
    re.IGNORECASE,
)


@dataclass
class ResumeData:
    extracted_text: str
    skills: list[str]
    job_titles: list[str]
    years_experience: int
    education_level: str
    file_type: str


class ResumeParser:
    def __init__(self) -> None:
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            self.nlp = spacy.blank("en")

    def _extract_pdf_text(self, file_bytes: bytes) -> str:
        with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
            return "\n".join(page.get_text("text") for page in pdf)

    def _extract_docx_text(self, file_bytes: bytes) -> str:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(paragraph.text for paragraph in doc.paragraphs)

    def _extract_skills(self, text: str) -> list[str]:
        normalized = text.lower()
        return sorted({skill for skill in SKILLS_LIST if skill in normalized})

    def _extract_job_titles(self, text: str) -> list[str]:
        titles = {match.group(1).lower() for match in TITLE_PATTERN.finditer(text)}
        return sorted(titles)

    def _extract_years_experience(self, text: str) -> int:
        intervals: list[tuple[int, int]] = []
        now_year = datetime.now(tz=UTC).year

        for match in YEAR_RANGE_PATTERN.finditer(text):
            start_year = int(match.group("start"))
            end_year = now_year if match.group("present") else int(match.group("end"))
            if end_year < start_year:
                start_year, end_year = end_year, start_year
            intervals.append((start_year, end_year))

        total_years = 0
        if intervals:
            intervals.sort(key=lambda item: item[0])
            merged: list[tuple[int, int]] = [intervals[0]]
            for start, end in intervals[1:]:
                prev_start, prev_end = merged[-1]
                if start <= prev_end:
                    merged[-1] = (prev_start, max(prev_end, end))
                else:
                    merged.append((start, end))
            total_years = sum(max(0, end - start) for start, end in merged)

        direct_years = [int(m.group(1)) for m in YEARS_EXPERIENCE_PATTERN.finditer(text)]
        max_direct = max(direct_years) if direct_years else 0
        return max(total_years, max_direct)

    def _extract_education_level(self, text: str) -> str:
        lower = text.lower()
        if any(token in lower for token in ["phd", "ph.d", "doctorate", "dphil"]):
            return ResumeEducationLevel.DOCTORATE.value
        if any(token in lower for token in ["msc", "m.sc", "master", "mtech", "m.eng", "mba"]):
            return ResumeEducationLevel.MASTER.value
        if any(token in lower for token in ["btech", "b.tech", "bachelor", "bsc", "b.sc", "be ", "b.e"]):
            return ResumeEducationLevel.BACHELOR.value
        if any(token in lower for token in ["diploma", "polytechnic"]):
            return ResumeEducationLevel.ASSOCIATE.value
        return ResumeEducationLevel.UNKNOWN.value

    def parse(self, file_bytes: bytes, file_type: str) -> ResumeData:
        normalized_type = file_type.lower()
        if normalized_type == ResumeFileType.PDF.value:
            text = self._extract_pdf_text(file_bytes)
        elif normalized_type == ResumeFileType.DOCX.value:
            text = self._extract_docx_text(file_bytes)
        else:
            raise ValueError("Unsupported resume file type")

        doc = self.nlp(text)
        enriched_text = f"{text}\n" + " ".join(ent.text for ent in doc.ents)

        return ResumeData(
            extracted_text=text,
            skills=self._extract_skills(enriched_text),
            job_titles=self._extract_job_titles(enriched_text),
            years_experience=self._extract_years_experience(enriched_text),
            education_level=self._extract_education_level(enriched_text),
            file_type=normalized_type,
        )
