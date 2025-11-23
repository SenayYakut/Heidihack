from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union


class TranscriptRequest(BaseModel):
    transcript: str


class ExtractedFormData(BaseModel):
    chief_complaint: Optional[str] = None
    symptoms: Optional[List[str]] = None
    duration: Optional[str] = None
    severity: Optional[str] = None
    additional_notes: Optional[str] = None


# HPI (History of Present Illness) data structure
class HPIData(BaseModel):
    location: Optional[List[str]] = []
    radiation: Optional[List[str]] = []
    quality: Optional[List[str]] = []
    quality_other: Optional[str] = ""
    duration: Optional[str] = ""
    severity: Optional[int] = 5
    timing: Optional[str] = ""
    aggravating_factors: Optional[List[str]] = []
    relieving_factors: Optional[List[str]] = []


# Vital signs data structure
class VitalsData(BaseModel):
    bp: Optional[str] = ""
    hr: Optional[Union[str, int, float]] = ""
    temp: Optional[Union[str, int, float]] = ""
    spo2: Optional[Union[str, int, float]] = ""
    rr: Optional[Union[str, int, float]] = ""


# Physical exam data structure
class PhysicalExamData(BaseModel):
    general: Optional[List[str]] = []
    vitals: Optional[VitalsData] = VitalsData()
    cardiovascular: Optional[List[str]] = []
    respiratory: Optional[List[str]] = []


# Complete clinical form data
class ClinicalFormData(BaseModel):
    chief_complaint: str
    hpi: Optional[HPIData] = HPIData()
    associated_symptoms: Optional[List[str]] = []
    physical_exam: Optional[PhysicalExamData] = PhysicalExamData()
    doctor_notes: Optional[str] = ""


# Patient context for analysis
class PatientContext(BaseModel):
    name: Optional[str] = ""
    age: Optional[int] = 0
    gender: Optional[str] = ""
    mrn: Optional[str] = ""
    medical_history: Optional[List[str]] = []
    medications: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    vitals: Optional[Dict[str, Any]] = {}


# Analysis request combining form data and patient context
class AnalysisRequest(BaseModel):
    form_data: ClinicalFormData
    patient_context: Optional[PatientContext] = PatientContext()


# Legacy EncounterFormData for backwards compatibility
class EncounterFormData(BaseModel):
    chief_complaint: Optional[str] = None
    symptoms: Optional[List[str]] = None
    duration: Optional[str] = None
    severity: Optional[str] = None
    additional_notes: Optional[str] = None
    doctor_notes: Optional[str] = None


# ICD-10 code model
class ICD10Code(BaseModel):
    code: str
    description: str


# Task model
class Task(BaseModel):
    description: str
    priority: Optional[str] = None


# SOAP clinical note structure
class ClinicalNote(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str


# Differential diagnosis with risk and details
class DifferentialDiagnosis(BaseModel):
    name: str
    risk: str  # HIGH, MEDIUM, LOW
    supporting_factors: Optional[List[str]] = []
    recommended_actions: Optional[List[str]] = []


# Recommended action item
class RecommendedAction(BaseModel):
    name: str
    category: Optional[str] = ""  # Lab, Imaging, Medication, Referral, Follow-up
    details: Optional[str] = ""


# Recommended actions grouped by priority
class RecommendedActions(BaseModel):
    immediate: Optional[List[RecommendedAction]] = []
    urgent: Optional[List[RecommendedAction]] = []
    routine: Optional[List[RecommendedAction]] = []


# Complete analysis response
class AnalysisResponse(BaseModel):
    clinical_note: ClinicalNote
    icd_codes: List[ICD10Code]
    differential_diagnoses: List[DifferentialDiagnosis]
    recommended_actions: RecommendedActions


# Legacy response format for backwards compatibility
class LegacyAnalysisResponse(BaseModel):
    clinical_note: str
    icd10_codes: List[ICD10Code]
    differential_diagnoses: List[str]
    tasks: List[Task]
