from enum import Enum


class ResumeFileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"


class ResumeEducationLevel(str, Enum):
    HIGH_SCHOOL = "high_school"
    ASSOCIATE = "associate"
    BACHELOR = "bachelor"
    MASTER = "master"
    DOCTORATE = "doctorate"
    UNKNOWN = "unknown"


class JobSource(str, Enum):
    REMOTEOK = "remoteok"
    REMOTIVE = "remotive"
    ADZUNA = "adzuna"
    GREENHOUSE = "greenhouse"
    LEVER = "lever"


class ScraperRunStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"
