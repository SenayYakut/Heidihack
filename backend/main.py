import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import httpx

from models import (
    TranscriptRequest,
    ExtractedFormData,
    EncounterFormData,
    AnalysisResponse,
    ICD10Code,
    Task
)
from mock_data import MOCK_PATIENT

load_dotenv()

app = FastAPI(title="Clinical AI Assistant", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
HEIDI_API_KEY = os.getenv("HEIDI_API_KEY")
HEIDI_API_URL = os.getenv("HEIDI_API_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


@app.get("/api/patient")
async def get_patient():
    """Return the mock patient data."""
    return MOCK_PATIENT


@app.post("/api/transcribe")
async def transcribe_audio():
    """
    Placeholder for Heidi transcription API.
    Will accept audio and return transcript.
    """
    # TODO: Implement Heidi transcription API integration
    # Expected flow:
    # 1. Receive audio file
    # 2. Send to Heidi API for transcription
    # 3. Return transcript text

    return {
        "status": "placeholder",
        "message": "Heidi transcription API integration pending",
        "transcript": ""
    }


@app.post("/api/extract-from-transcript", response_model=ExtractedFormData)
async def extract_from_transcript(request: TranscriptRequest):
    """
    Placeholder for OpenAI extraction.
    Will extract structured form data from transcript.
    """
    # TODO: Implement OpenAI extraction
    # Expected flow:
    # 1. Receive transcript text
    # 2. Use OpenAI to extract structured data
    # 3. Return ExtractedFormData

    if not request.transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    # Placeholder response
    return ExtractedFormData(
        chief_complaint="",
        symptoms=[],
        duration="",
        severity="",
        additional_notes=""
    )


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_encounter(form_data: EncounterFormData):
    """
    Placeholder for full analysis orchestration.
    Will generate clinical notes, ICD-10 codes, diagnoses, and tasks.
    """
    # TODO: Implement full analysis orchestration
    # Expected flow:
    # 1. Receive encounter form data
    # 2. Combine with patient data
    # 3. Use OpenAI to generate:
    #    - Clinical note
    #    - ICD-10 codes
    #    - Differential diagnoses
    #    - Follow-up tasks

    if not form_data.chief_complaint:
        raise HTTPException(status_code=400, detail="Chief complaint is required")

    # Placeholder response
    return AnalysisResponse(
        clinical_note="Clinical note generation pending implementation",
        icd10_codes=[
            ICD10Code(code="R00.0", description="Placeholder code")
        ],
        differential_diagnoses=["Diagnosis pending implementation"],
        tasks=[
            Task(description="Follow-up task pending implementation", priority="medium")
        ]
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
