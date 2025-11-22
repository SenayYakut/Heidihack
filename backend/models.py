from pydantic import BaseModel
from typing import Optional, List


class TranscriptRequest(BaseModel):
    transcript: str


class ExtractedFormData(BaseModel):
    chief_complaint: Optional[str] = None
    symptoms: Optional[List[str]] = None
    duration: Optional[str] = None
    severity: Optional[str] = None
    additional_notes: Optional[str] = None


class EncounterFormData(BaseModel):
    chief_complaint: Optional[str] = None
    symptoms: Optional[List[str]] = None
    duration: Optional[str] = None
    severity: Optional[str] = None
    additional_notes: Optional[str] = None
    doctor_notes: Optional[str] = None


class ICD10Code(BaseModel):
    code: str
    description: str


class Task(BaseModel):
    description: str
    priority: Optional[str] = None


class AnalysisResponse(BaseModel):
    clinical_note: str
    icd10_codes: List[ICD10Code]
    differential_diagnoses: List[str]
    tasks: List[Task]
