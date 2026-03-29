import io
import re
from dataclasses import dataclass

import fitz
import spacy
from docx import Document

from app.models.enums import ResumeEducationLevel, ResumeFileType
from app.services.skills_catalog import TECH_SKILLS


@dataclass
class ParsedResume:
    extracted_text: str
    skills: list[str]
    job_titles: list[str]
    years_experience: int
    education_level: str
    file_type: str


TITLE_PATTERN = re.compile(
    r"(software engineer|backend engineer|frontend engineer|full[- ]stack engineer|"
    r"data engineer|devops engineer|ml engineer|data scientist|product manager|"
    r"site reliability engineer|qa engineer)",
    re.IGNORECASE,
)
EXPERIENCE_PATTERN = re.compile(r"(\d{1,2})\+?\s+years?", re.IGNORECASE)


class ResumeParserService:
    def __init__(self) -> None:
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            self.nlp = spacy.blank("en")

    def _extract_pdf_text(self, content: bytes) -> str:
        with fitz.open(stream=content, filetype="pdf") as pdf:
            return "\n".join(page.get_text("text") for page in pdf)

    def _extract_docx_text(self, content: bytes) -> str:
        stream = io.BytesIO(content)
        doc = Document(stream)
        return "\n".join(paragraph.text for paragraph in doc.paragraphs)

    def _extract_skills(self, text: str) -> list[str]:
        normalized = text.lower()
        matched = [skill for skill in TECH_SKILLS if skill in normalized]
        return sorted(set(matched))

    def _extract_job_titles(self, text: str) -> list[str]:
        return sorted(set(match.group(1).lower() for match in TITLE_PATTERN.finditer(text)))

    def _extract_years_experience(self, text: str) -> int:
        years = [int(match.group(1)) for match in EXPERIENCE_PATTERN.finditer(text)]
        return max(years) if years else 0

    def _extract_education_level(self, text: str) -> str:
        lower = text.lower()
        if "phd" in lower or "doctorate" in lower:
            return ResumeEducationLevel.DOCTORATE.value
        if "master" in lower or "msc" in lower or "mba" in lower:
            return ResumeEducationLevel.MASTER.value
        if "bachelor" in lower or "bsc" in lower or "bs " in lower:
            return ResumeEducationLevel.BACHELOR.value
        if "associate" in lower:
            return ResumeEducationLevel.ASSOCIATE.value
        if "high school" in lower:
            return ResumeEducationLevel.HIGH_SCHOOL.value
        return ResumeEducationLevel.UNKNOWN.value

    def parse(self, filename: str, content: bytes) -> ParsedResume:
        lower_filename = filename.lower()
        if lower_filename.endswith(".pdf"):
            text = self._extract_pdf_text(content)
            file_type = ResumeFileType.PDF.value
        elif lower_filename.endswith(".docx"):
            text = self._extract_docx_text(content)
            file_type = ResumeFileType.DOCX.value
        else:
            raise ValueError("Only PDF and DOCX resumes are supported")

        doc = self.nlp(text)
        enriched_text = " ".join([text, " ".join(ent.text for ent in doc.ents)])

        skills = self._extract_skills(enriched_text)
        job_titles = self._extract_job_titles(enriched_text)
        years_experience = self._extract_years_experience(enriched_text)
        education_level = self._extract_education_level(enriched_text)

        return ParsedResume(
            extracted_text=text,
            skills=skills,
            job_titles=job_titles,
            years_experience=years_experience,
            education_level=education_level,
            file_type=file_type,
        )
