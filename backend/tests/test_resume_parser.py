from app.api.resume import _detect_file_type
from app.models.enums import ResumeEducationLevel
from app.services.resume_parser import ResumeParser


def test_detect_file_type_pdf_magic_bytes() -> None:
    assert _detect_file_type(b"%PDF-1.7\nrest") == "pdf"


def test_detect_file_type_invalid_raises() -> None:
    try:
        _detect_file_type(b"not-a-real-file")
        assert False, "Expected ValueError"
    except ValueError:
        assert True


def test_resume_parser_extractors_from_synthetic_text() -> None:
    parser = ResumeParser()
    text = (
        "Senior Software Engineer\n"
        "Worked at Acme from 2018 - 2021 and at Beta from 2021 - Present\n"
        "8 years experience in Python, React, Docker, Kubernetes, TF-IDF and NLP\n"
        "Master of Science in Computer Science"
    )

    skills = parser._extract_skills(text)
    titles = parser._extract_job_titles(text)
    years = parser._extract_years_experience(text)
    education = parser._extract_education_level(text)

    assert "python" in skills
    assert "react" in skills
    assert "docker" in skills
    assert "kubernetes" in skills
    assert "tf-idf" in skills
    assert "nlp" in skills
    assert "senior software engineer" in titles
    assert years >= 6
    assert education == ResumeEducationLevel.MASTER.value


def test_resume_parser_parse_rejects_unsupported_type() -> None:
    parser = ResumeParser()
    try:
        parser.parse(b"hello", file_type="txt")
        assert False, "Expected ValueError"
    except ValueError:
        assert True
