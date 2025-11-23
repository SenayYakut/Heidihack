import os
import json
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import httpx
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from models import (
    TranscriptRequest,
    ExtractedFormData,
    AnalysisRequest,
    AnalysisResponse,
    ClinicalNote,
    ICD10Code,
    DifferentialDiagnosis,
    RecommendedAction,
    RecommendedActions,
)
from mock_data import MOCK_PATIENT
from validate_mock_data import validate_mock_data
from rag_engine import ClinicalRAG

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Clinical AI Assistant", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
HEIDI_API_KEY = os.getenv("HEIDI_API_KEY")
HEIDI_API_URL = os.getenv("HEIDI_API_URL", "https://api.heidi.health")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEVELOPMENT_MODE = os.getenv("DEVELOPMENT_MODE", "true").lower() == "true"

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Global mock data storage
MOCK_DATA = None
MOCK_DATA_PATH = os.path.join(os.path.dirname(__file__), "patients-data.json")

# Global RAG engine
RAG_ENGINE = None


def load_mock_data() -> dict:
    """Load mock data from patients-data.json file."""
    global MOCK_DATA

    if not os.path.exists(MOCK_DATA_PATH):
        logger.error(f"Mock data file not found: {MOCK_DATA_PATH}")
        return None

    try:
        with open(MOCK_DATA_PATH, 'r', encoding='utf-8') as f:
            MOCK_DATA = json.load(f)
        logger.info(f"Loaded mock data with {len(MOCK_DATA.get('scenarios', []))} scenarios")
        return MOCK_DATA
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in mock data file: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to load mock data: {e}")
        return None


def get_mock_patient() -> dict:
    """Get patient data from mock data file."""
    if MOCK_DATA and "patient" in MOCK_DATA:
        patient = MOCK_DATA["patient"]
        # Transform to expected format for API
        return {
            "id": patient.get("id"),
            "mrn": patient.get("mrn"),
            "name": patient.get("name"),
            "age": patient.get("age"),
            "gender": patient.get("gender"),
            "medical_history": patient.get("medical_history", []),
            "medications": patient.get("current_medications", []),
            "allergies": patient.get("allergies", []),
            "vitals": patient.get("vitals", {})
        }
    return MOCK_PATIENT


def select_mock_response(chief_complaint: str) -> dict:
    """
    Select appropriate mock API response based on chief complaint.

    Logic:
    - If chief complaint contains "abdominal" -> use "abdominal_pain" response
    - If chief complaint contains "headache" or "fever" -> use "headache_fever" response
    - Otherwise -> use "default" response
    """
    if not MOCK_DATA or "api_responses" not in MOCK_DATA:
        logger.warning("No mock API responses available")
        return None

    responses = MOCK_DATA["api_responses"]
    complaint_lower = chief_complaint.lower()

    # Determine which response to use
    if "abdominal" in complaint_lower:
        response_key = "abdominal_pain"
    elif "headache" in complaint_lower or "fever" in complaint_lower:
        response_key = "headache_fever"
    else:
        response_key = "default"

    # Get the response, fall back to default if specific one not found
    if response_key in responses:
        logger.info(f"Using mock response: {response_key}")
        return responses[response_key]
    elif "default" in responses:
        logger.info("Falling back to default mock response")
        return responses["default"]
    else:
        logger.error("No default mock response available")
        return None


def get_scenarios() -> list:
    """Get list of available scenarios from mock data."""
    if not MOCK_DATA or "scenarios" not in MOCK_DATA:
        return []

    scenarios = []
    for scenario in MOCK_DATA["scenarios"]:
        scenarios.append({
            "id": scenario.get("id"),
            "name": scenario.get("name"),
            "description": scenario.get("description", "")
        })
    return scenarios


def get_scenario_by_id(scenario_id: str) -> dict:
    """Get a specific scenario's form_data by ID."""
    if not MOCK_DATA or "scenarios" not in MOCK_DATA:
        return None

    for scenario in MOCK_DATA["scenarios"]:
        if scenario.get("id") == scenario_id:
            return scenario.get("form_data")
    return None


class HeidiAPIError(Exception):
    """Custom exception for Heidi API errors"""
    pass


class OpenAIAPIError(Exception):
    """Custom exception for OpenAI API errors"""
    pass


class HeidiClient:
    """Client for interacting with the Heidi Health API"""

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.timeout = 60.0  # 60 second timeout

    def _get_headers(self) -> dict:
        """Get authentication headers for API requests"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True
    )
    async def generate_clinical_note(self, form_data: dict, patient_context: dict) -> dict:
        """Generate SOAP note and ICD-10 codes from form data."""

        endpoint = f"{self.base_url}/v1/clinical-notes/generate"

        payload = {
            "encounter": {
                "chief_complaint": form_data.get("chief_complaint", ""),
                "history_of_present_illness": form_data.get("hpi", {}),
                "associated_symptoms": form_data.get("associated_symptoms", []),
                "physical_examination": form_data.get("physical_exam", {}),
                "provider_notes": form_data.get("doctor_notes", "")
            },
            "patient": {
                "name": patient_context.get("name", ""),
                "age": patient_context.get("age", 0),
                "gender": patient_context.get("gender", ""),
                "mrn": patient_context.get("mrn", ""),
                "medical_history": patient_context.get("medical_history", []),
                "current_medications": patient_context.get("medications", []),
                "allergies": patient_context.get("allergies", []),
                "vital_signs": patient_context.get("vitals", {})
            },
            "options": {
                "generate_icd10": True,
                "note_format": "SOAP",
                "include_differential": False
            }
        }

        logger.info(f"Calling Heidi API: {endpoint}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    endpoint,
                    json=payload,
                    headers=self._get_headers()
                )

                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After", "60")
                    logger.warning(f"Heidi API rate limited. Retry after {retry_after}s")
                    raise HeidiAPIError(f"Rate limited. Please try again in {retry_after} seconds.")

                if response.status_code == 401:
                    logger.error("Heidi API authentication failed")
                    raise HeidiAPIError("Authentication failed. Please check API credentials.")

                if response.status_code >= 400:
                    error_detail = response.text
                    logger.error(f"Heidi API error {response.status_code}: {error_detail}")
                    raise HeidiAPIError(f"API error: {response.status_code}")

                return response.json()

        except httpx.TimeoutException:
            logger.error("Heidi API request timed out")
            raise HeidiAPIError("Request timed out. Please try again.")
        except httpx.NetworkError as e:
            logger.error(f"Network error calling Heidi API: {str(e)}")
            raise HeidiAPIError("Network error. Please check your connection.")
        except Exception as e:
            logger.error(f"Unexpected error calling Heidi API: {str(e)}")
            raise HeidiAPIError(f"Unexpected error: {str(e)}")

    async def generate_clinical_note_mock(self, form_data: dict, patient_context: dict) -> dict:
        """Mock implementation of clinical note generation."""

        chief_complaint = form_data.get("chief_complaint", "Unspecified complaint")
        hpi = form_data.get("hpi", {})
        symptoms = form_data.get("associated_symptoms", [])
        physical_exam = form_data.get("physical_exam", {})
        doctor_notes = form_data.get("doctor_notes", "")

        patient_age = patient_context.get("age", 0)
        patient_gender = patient_context.get("gender", "")
        medical_history = patient_context.get("medical_history", [])
        medications = patient_context.get("medications", [])
        allergies = patient_context.get("allergies", [])

        locations = hpi.get("location", [])
        location_str = ", ".join(locations) if locations else "unspecified location"
        qualities = hpi.get("quality", [])
        quality_str = ", ".join(qualities).lower() if qualities else "unspecified"
        duration = hpi.get("duration", "unspecified duration")
        severity = hpi.get("severity", 5)
        severity_desc = "mild" if severity <= 3 else "moderate" if severity <= 6 else "severe"
        timing = hpi.get("timing", "intermittent")
        aggravating = hpi.get("aggravating_factors", [])
        relieving = hpi.get("relieving_factors", [])
        symptoms_str = ", ".join(symptoms).lower() if symptoms else "none reported"

        subjective = f"""Chief Complaint: {chief_complaint}

History of Present Illness: {patient_age}-year-old {patient_gender.lower()} presents with {chief_complaint.lower()} located in {location_str}. The pain is described as {quality_str}, with {severity_desc} intensity ({severity}/10). Duration: {duration}. The symptoms are {timing.lower()}.

{"Aggravating factors include: " + ", ".join(aggravating).lower() + "." if aggravating else "No specific aggravating factors identified."}
{"Relieving factors include: " + ", ".join(relieving).lower() + "." if relieving else "No specific relieving factors identified."}

Associated Symptoms: {symptoms_str}

Past Medical History: {", ".join(medical_history) if medical_history else "None reported"}
Current Medications: {", ".join(medications) if medications else "None"}
Allergies: {", ".join(allergies) if allergies else "NKDA"}"""

        vitals = physical_exam.get("vitals", {})
        general = physical_exam.get("general", [])
        cardio = physical_exam.get("cardiovascular", [])
        resp = physical_exam.get("respiratory", [])

        objective = f"""Vital Signs:
- Blood Pressure: {vitals.get("bp", "Not recorded")}
- Heart Rate: {vitals.get("hr", "Not recorded")} bpm
- Temperature: {vitals.get("temp", "Not recorded")}°F
- SpO2: {vitals.get("spo2", "Not recorded")}%
- Respiratory Rate: {vitals.get("rr", "Not recorded")}/min

General: {", ".join(general) if general else "Not assessed"}
Cardiovascular: {", ".join(cardio) if cardio else "Not assessed"}
Respiratory: {", ".join(resp) if resp else "Not assessed"}"""

        assessment = f"""{chief_complaint}

Clinical Impression: Patient presents with {severity_desc} {chief_complaint.lower()} with onset {duration} ago. {f"Additional clinical observations: {doctor_notes}" if doctor_notes else ""}

Differential diagnosis to be considered based on presentation and risk factors."""

        plan = f"""1. Diagnostic workup as clinically indicated
2. Monitor vital signs and symptom progression
3. {"Review and continue current medications: " + ", ".join(medications) if medications else "No current medications to review"}
4. Patient education regarding warning signs
5. Follow-up as needed or if symptoms worsen
6. {"Consider allergy precautions for: " + ", ".join(allergies) if allergies else "No known drug allergies"}"""

        icd_codes = self._generate_icd_codes(chief_complaint, symptoms)

        return {
            "clinical_note": {
                "subjective": subjective,
                "objective": objective,
                "assessment": assessment,
                "plan": plan
            },
            "icd_codes": icd_codes
        }

    def _generate_icd_codes(self, chief_complaint: str, symptoms: list) -> list:
        """Generate relevant ICD-10 codes based on chief complaint and symptoms"""

        codes = []
        complaint_lower = chief_complaint.lower()

        if "chest pain" in complaint_lower:
            codes.append({"code": "R07.9", "description": "Chest pain, unspecified"})
            if "shortness of breath" in [s.lower() for s in symptoms]:
                codes.append({"code": "R06.00", "description": "Dyspnea, unspecified"})
        elif "headache" in complaint_lower:
            codes.append({"code": "R51.9", "description": "Headache, unspecified"})
        elif "abdominal pain" in complaint_lower:
            codes.append({"code": "R10.9", "description": "Unspecified abdominal pain"})
        elif "back pain" in complaint_lower:
            codes.append({"code": "M54.9", "description": "Dorsalgia, unspecified"})
        elif "cough" in complaint_lower:
            codes.append({"code": "R05.9", "description": "Cough, unspecified"})
        elif "fever" in complaint_lower:
            codes.append({"code": "R50.9", "description": "Fever, unspecified"})
        elif "dizziness" in complaint_lower:
            codes.append({"code": "R42", "description": "Dizziness and giddiness"})
        elif "fatigue" in complaint_lower:
            codes.append({"code": "R53.83", "description": "Other fatigue"})
        elif "nausea" in complaint_lower:
            codes.append({"code": "R11.0", "description": "Nausea"})
        elif "shortness of breath" in complaint_lower:
            codes.append({"code": "R06.00", "description": "Dyspnea, unspecified"})
        else:
            codes.append({"code": "R69", "description": "Illness, unspecified"})

        symptom_codes = {
            "shortness of breath": {"code": "R06.00", "description": "Dyspnea, unspecified"},
            "nausea/vomiting": {"code": "R11.2", "description": "Nausea with vomiting, unspecified"},
            "diaphoresis": {"code": "R61", "description": "Generalized hyperhidrosis"},
            "dizziness": {"code": "R42", "description": "Dizziness and giddiness"},
            "palpitations": {"code": "R00.2", "description": "Palpitations"},
            "syncope": {"code": "R55", "description": "Syncope and collapse"},
            "fatigue": {"code": "R53.83", "description": "Other fatigue"},
            "fever": {"code": "R50.9", "description": "Fever, unspecified"},
            "cough": {"code": "R05.9", "description": "Cough, unspecified"},
            "headache": {"code": "R51.9", "description": "Headache, unspecified"}
        }

        for symptom in symptoms:
            symptom_lower = symptom.lower()
            if symptom_lower in symptom_codes:
                code = symptom_codes[symptom_lower]
                if not any(c["code"] == code["code"] for c in codes):
                    codes.append(code)

        return codes


# Initialize Heidi client
heidi_client = HeidiClient(
    api_key=HEIDI_API_KEY or "",
    base_url=HEIDI_API_URL or "https://api.heidi.health"
)


# OpenAI Integration Functions

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)
async def generate_differential_diagnosis(
    form_data: dict,
    clinical_note: str,
    patient_context: dict
) -> dict:
    """
    Generate differential diagnoses with reasoning using OpenAI.

    Returns: Dict with differential_diagnoses list containing ranked diagnoses
    with risk levels and supporting evidence.
    """

    if not openai_client:
        logger.warning("OpenAI client not configured, using mock differentials")
        return {"differential_diagnoses": []}

    # Build comprehensive prompt
    medical_history = patient_context.get('medical_history', [])
    medications = patient_context.get('medications', [])
    allergies = patient_context.get('allergies', [])
    hpi = form_data.get('hpi', {})

    prompt = f"""You are an expert clinical decision support system. Based on the following information, provide a differential diagnosis:

PATIENT CONTEXT:
- Name: {patient_context.get('name', 'Unknown')}
- Age: {patient_context.get('age', 'Unknown')}
- Gender: {patient_context.get('gender', 'Unknown')}
- Medical History: {', '.join(medical_history) if medical_history else 'None reported'}
- Current Medications: {', '.join(medications) if medications else 'None'}
- Allergies: {', '.join(allergies) if allergies else 'NKDA'}

CLINICAL PRESENTATION:
- Chief Complaint: {form_data.get('chief_complaint', 'Not specified')}
- Duration: {hpi.get('duration', 'Not specified')}
- Severity: {hpi.get('severity', 'Not specified')}/10
- Location: {', '.join(hpi.get('location', [])) if hpi.get('location') else 'Not specified'}
- Quality: {', '.join(hpi.get('quality', [])) if hpi.get('quality') else 'Not specified'}
- Timing: {hpi.get('timing', 'Not specified')}
- Associated Symptoms: {', '.join(form_data.get('associated_symptoms', [])) if form_data.get('associated_symptoms') else 'None'}
- Aggravating Factors: {', '.join(hpi.get('aggravating_factors', [])) if hpi.get('aggravating_factors') else 'None'}
- Relieving Factors: {', '.join(hpi.get('relieving_factors', [])) if hpi.get('relieving_factors') else 'None'}

CLINICAL NOTE:
{clinical_note}

DOCTOR'S NOTES:
{form_data.get('doctor_notes', 'None provided')}

Please provide:
1. Top 3-5 differential diagnoses ranked by likelihood
2. For each diagnosis:
   - Risk stratification (HIGH/MEDIUM/LOW) based on potential for serious outcome
   - Key supporting evidence from the presentation
   - Recommended next diagnostic steps

IMPORTANT: Flag HIGH risk for any potentially life-threatening conditions that require immediate evaluation (e.g., ACS, PE, aortic dissection for chest pain).

Return as JSON:
{{
  "differential_diagnoses": [
    {{
      "rank": 1,
      "diagnosis": "Diagnosis name",
      "risk_level": "HIGH|MEDIUM|LOW",
      "supporting_evidence": ["point 1", "point 2"],
      "recommended_actions": ["action 1", "action 2"]
    }}
  ]
}}"""

    try:
        logger.info("Calling OpenAI for differential diagnosis generation")

        completion = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert clinical decision support system providing evidence-based differential diagnoses. Always prioritize patient safety by flagging high-risk conditions appropriately."
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2000
        )

        result = json.loads(completion.choices[0].message.content)
        logger.info(f"Generated {len(result.get('differential_diagnoses', []))} differential diagnoses")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI response as JSON: {str(e)}")
        raise OpenAIAPIError("Invalid response format from AI")
    except Exception as e:
        logger.error(f"OpenAI API error in differential diagnosis: {str(e)}")
        raise OpenAIAPIError(f"Failed to generate differential diagnosis: {str(e)}")


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)
async def generate_task_list(
    differential_diagnoses: list,
    form_data: dict,
    patient_context: dict
) -> dict:
    """
    Generate prioritized action items using OpenAI.

    Returns: Dict with immediate_tasks, urgent_tasks, and routine_tasks lists.
    """

    if not openai_client:
        logger.warning("OpenAI client not configured, using mock tasks")
        return {"immediate_tasks": [], "urgent_tasks": [], "routine_tasks": []}

    allergies = patient_context.get('allergies', [])
    medications = patient_context.get('medications', [])

    # Format differential diagnoses for the prompt
    dx_summary = json.dumps(differential_diagnoses, indent=2) if differential_diagnoses else "No differential diagnoses provided"

    prompt = f"""Based on the differential diagnoses and patient information, create a prioritized action plan:

DIFFERENTIAL DIAGNOSES:
{dx_summary}

PATIENT ALLERGIES: {', '.join(allergies) if allergies else 'NKDA (No Known Drug Allergies)'}
CURRENT MEDICATIONS: {', '.join(medications) if medications else 'None'}

CHIEF COMPLAINT: {form_data.get('chief_complaint', 'Not specified')}

Generate a comprehensive task list including:
1. Lab orders (with specific tests and rationale)
2. Imaging orders (with specific studies)
3. Medications to consider (IMPORTANT: CHECK ALLERGIES FIRST - patient is allergic to: {', '.join(allergies) if allergies else 'None'})
4. Specialist referrals
5. Follow-up appointments
6. Patient education

SAFETY REQUIREMENTS:
- DO NOT recommend any medications the patient is allergic to
- Flag any medication interactions with current medications
- Prioritize STAT orders for high-risk conditions
- Include specific test names, not general categories

Categorize each task by urgency:
- IMMEDIATE: Must be done STAT (within 1 hour) - for ruling out life-threatening conditions
- URGENT: Should be done today (within 24 hours)
- ROUTINE: Can be scheduled within 1-7 days

Return as JSON:
{{
  "immediate_tasks": [
    {{"task": "Order name", "category": "Lab|Imaging|Medication|Referral|Follow-up|Education", "reason": "Clinical rationale"}}
  ],
  "urgent_tasks": [...],
  "routine_tasks": [...]
}}"""

    try:
        logger.info("Calling OpenAI for task list generation")

        completion = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a clinical decision support system creating safe, evidence-based action plans. ALWAYS check for drug allergies before recommending medications. Prioritize patient safety above all else."
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2000
        )

        result = json.loads(completion.choices[0].message.content)

        immediate_count = len(result.get('immediate_tasks', []))
        urgent_count = len(result.get('urgent_tasks', []))
        routine_count = len(result.get('routine_tasks', []))
        logger.info(f"Generated tasks - Immediate: {immediate_count}, Urgent: {urgent_count}, Routine: {routine_count}")

        return result

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI response as JSON: {str(e)}")
        raise OpenAIAPIError("Invalid response format from AI")
    except Exception as e:
        logger.error(f"OpenAI API error in task generation: {str(e)}")
        raise OpenAIAPIError(f"Failed to generate task list: {str(e)}")


def generate_mock_differentials(chief_complaint: str) -> list:
    """Generate mock differential diagnoses based on chief complaint"""

    complaint_lower = chief_complaint.lower()

    if "chest pain" in complaint_lower:
        return [
            DifferentialDiagnosis(
                name="Acute Coronary Syndrome",
                risk="HIGH",
                supporting_factors=[
                    "Chest pain presentation",
                    "Risk factors should be evaluated",
                    "ECG changes may be present"
                ],
                recommended_actions=[
                    "Obtain 12-lead ECG immediately",
                    "Check troponin levels",
                    "Continuous cardiac monitoring"
                ]
            ),
            DifferentialDiagnosis(
                name="Musculoskeletal Pain",
                risk="LOW",
                supporting_factors=[
                    "Reproducible with palpation",
                    "Related to movement",
                    "No cardiac risk factors"
                ],
                recommended_actions=[
                    "Trial of NSAIDs",
                    "Physical therapy referral if persistent"
                ]
            ),
            DifferentialDiagnosis(
                name="GERD/Esophageal Spasm",
                risk="MEDIUM",
                supporting_factors=[
                    "Burning quality",
                    "Related to meals",
                    "Relieved by antacids"
                ],
                recommended_actions=[
                    "Trial of PPI therapy",
                    "Dietary modifications"
                ]
            )
        ]
    elif "headache" in complaint_lower:
        return [
            DifferentialDiagnosis(
                name="Tension Headache",
                risk="LOW",
                supporting_factors=[
                    "Bilateral location",
                    "Pressing/tightening quality",
                    "Stress-related"
                ],
                recommended_actions=[
                    "OTC analgesics",
                    "Stress management"
                ]
            ),
            DifferentialDiagnosis(
                name="Migraine",
                risk="MEDIUM",
                supporting_factors=[
                    "Unilateral",
                    "Pulsating quality",
                    "Associated nausea/photophobia"
                ],
                recommended_actions=[
                    "Migraine-specific therapy",
                    "Neurology referral if frequent"
                ]
            )
        ]
    else:
        return [
            DifferentialDiagnosis(
                name="Further evaluation needed",
                risk="MEDIUM",
                supporting_factors=[
                    "Symptoms require additional workup"
                ],
                recommended_actions=[
                    "Complete history and physical",
                    "Appropriate diagnostic testing"
                ]
            )
        ]


def generate_mock_actions(chief_complaint: str) -> RecommendedActions:
    """Generate mock recommended actions based on chief complaint"""

    complaint_lower = chief_complaint.lower()

    if "chest pain" in complaint_lower:
        return RecommendedActions(
            immediate=[
                RecommendedAction(
                    name="12-lead ECG",
                    category="Diagnostic",
                    details="Rule out acute coronary syndrome"
                ),
                RecommendedAction(
                    name="Troponin I/T",
                    category="Lab",
                    details="Serial measurements q3h x 2"
                )
            ],
            urgent=[
                RecommendedAction(
                    name="Chest X-ray",
                    category="Imaging",
                    details="Evaluate for pulmonary pathology"
                ),
                RecommendedAction(
                    name="Basic Metabolic Panel",
                    category="Lab",
                    details="Assess electrolytes and renal function"
                ),
                RecommendedAction(
                    name="CBC with Differential",
                    category="Lab",
                    details="Evaluate for infection/anemia"
                )
            ],
            routine=[
                RecommendedAction(
                    name="Lipid Panel",
                    category="Lab",
                    details="Cardiovascular risk assessment"
                ),
                RecommendedAction(
                    name="Cardiology Consultation",
                    category="Referral",
                    details="If cardiac etiology suspected"
                ),
                RecommendedAction(
                    name="Follow-up in 1 week",
                    category="Follow-up",
                    details="Sooner if symptoms worsen"
                )
            ]
        )
    else:
        return RecommendedActions(
            immediate=[],
            urgent=[
                RecommendedAction(
                    name="Appropriate diagnostic workup",
                    category="Diagnostic",
                    details="Based on clinical presentation"
                )
            ],
            routine=[
                RecommendedAction(
                    name="Follow-up appointment",
                    category="Follow-up",
                    details="As clinically indicated"
                )
            ]
        )


@app.get("/api/patient")
async def get_patient():
    """Return the mock patient data."""
    return get_mock_patient()


@app.get("/api/scenarios")
async def list_scenarios():
    """Return list of available scenarios from mock data."""
    scenarios = get_scenarios()
    if not scenarios:
        raise HTTPException(status_code=500, detail="No scenarios available")
    return {"scenarios": scenarios}


@app.get("/api/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    """Return form_data for a specific scenario."""
    form_data = get_scenario_by_id(scenario_id)
    if form_data is None:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    return {"form_data": form_data}


@app.post("/api/transcribe")
async def transcribe_audio():
    """Placeholder for Heidi transcription API."""
    return {
        "status": "placeholder",
        "message": "Heidi transcription API integration pending",
        "transcript": ""
    }


@app.post("/api/extract-from-transcript", response_model=ExtractedFormData)
async def extract_from_transcript(request: TranscriptRequest):
    """Placeholder for OpenAI extraction."""
    if not request.transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    return ExtractedFormData(
        chief_complaint="",
        symptoms=[],
        duration="",
        severity="",
        additional_notes=""
    )


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_encounter(request: AnalysisRequest):
    """
    Orchestrate Heidi + OpenAI for full clinical analysis.

    Takes form data and patient context, returns structured analysis including:
    - SOAP format clinical note (from Heidi)
    - ICD-10 diagnosis codes (from Heidi)
    - Differential diagnoses (from OpenAI)
    - Recommended actions (from OpenAI)
    """

    form_data = request.form_data
    patient_context = request.patient_context

    # Validate required fields
    if not form_data.chief_complaint:
        raise HTTPException(status_code=400, detail="Chief complaint is required")

    # Convert Pydantic models to dicts for API calls
    form_dict = form_data.model_dump()
    patient_dict = patient_context.model_dump() if patient_context else {}

    # If patient context not provided, use mock patient
    if not patient_dict.get('name'):
        patient_dict = get_mock_patient()

    # Use RAG engine for dynamic analysis
    if RAG_ENGINE:
        logger.info("Using RAG engine for clinical analysis")
        try:
            # Generate analysis using RAG
            rag_response = RAG_ENGINE.generate_analysis(form_dict, patient_dict)

            # Parse clinical note
            note_data = rag_response.get("clinical_note", {})
            clinical_note = ClinicalNote(
                subjective=note_data.get("subjective", ""),
                objective=note_data.get("objective", ""),
                assessment=note_data.get("assessment", ""),
                plan=note_data.get("plan", "")
            )

            # Parse ICD-10 codes
            icd_codes = []
            for code_data in rag_response.get("icd10_codes", []):
                icd_codes.append(ICD10Code(
                    code=code_data.get("code", ""),
                    description=code_data.get("description", "")
                ))

            # Parse differential diagnoses
            differential_diagnoses = []
            for dx in rag_response.get("differential_diagnoses", []):
                differential_diagnoses.append(DifferentialDiagnosis(
                    name=dx.get("name", "Unknown"),
                    risk=dx.get("risk", "MEDIUM"),
                    supporting_factors=dx.get("supporting_factors", []),
                    recommended_actions=dx.get("recommended_actions", [])
                ))

            # Parse recommended actions
            actions = rag_response.get("recommended_actions", {})

            immediate_tasks = []
            for task in actions.get("immediate", []):
                immediate_tasks.append(RecommendedAction(
                    name=task.get("name", ""),
                    category=task.get("category", ""),
                    details=task.get("details", "")
                ))

            urgent_tasks = []
            for task in actions.get("urgent", []):
                urgent_tasks.append(RecommendedAction(
                    name=task.get("name", ""),
                    category=task.get("category", ""),
                    details=task.get("details", "")
                ))

            routine_tasks = []
            for task in actions.get("routine", []):
                routine_tasks.append(RecommendedAction(
                    name=task.get("name", ""),
                    category=task.get("category", ""),
                    details=task.get("details", "")
                ))

            recommended_actions = RecommendedActions(
                immediate=immediate_tasks,
                urgent=urgent_tasks,
                routine=routine_tasks
            )

            logger.info("RAG analysis completed successfully")
            return AnalysisResponse(
                clinical_note=clinical_note,
                icd_codes=icd_codes,
                differential_diagnoses=differential_diagnoses,
                recommended_actions=recommended_actions
            )

        except Exception as e:
            logger.error(f"RAG analysis failed: {e}")
            # Fall through to legacy analysis methods below

    try:
        # Step 1: Generate clinical note with Heidi
        if HEIDI_API_KEY and len(HEIDI_API_KEY) > 10:
            logger.info("Calling Heidi API for clinical note generation")
            heidi_response = await heidi_client.generate_clinical_note(form_dict, patient_dict)
        else:
            logger.info("Using mock Heidi implementation (no API key configured)")
            heidi_response = await heidi_client.generate_clinical_note_mock(form_dict, patient_dict)

        # Parse clinical note from response
        clinical_note_data = heidi_response.get("clinical_note", {})
        clinical_note = ClinicalNote(
            subjective=clinical_note_data.get("subjective", ""),
            objective=clinical_note_data.get("objective", ""),
            assessment=clinical_note_data.get("assessment", ""),
            plan=clinical_note_data.get("plan", "")
        )

        # Parse ICD-10 codes from response
        icd_codes_data = heidi_response.get("icd_codes", [])
        icd_codes = [
            ICD10Code(code=c.get("code", ""), description=c.get("description", ""))
            for c in icd_codes_data
        ]

        # Format clinical note as string for OpenAI
        clinical_note_str = f"""SUBJECTIVE:
{clinical_note.subjective}

OBJECTIVE:
{clinical_note.objective}

ASSESSMENT:
{clinical_note.assessment}

PLAN:
{clinical_note.plan}"""

        # Step 2: Generate differential diagnosis with OpenAI
        differential_diagnoses = []
        recommended_actions = RecommendedActions(immediate=[], urgent=[], routine=[])

        if OPENAI_API_KEY and len(OPENAI_API_KEY) > 10:
            try:
                # Generate differential diagnoses
                logger.info("Generating differential diagnoses with OpenAI")
                differential_dx_response = await generate_differential_diagnosis(
                    form_data=form_dict,
                    clinical_note=clinical_note_str,
                    patient_context=patient_dict
                )

                # Parse differential diagnoses
                raw_differentials = differential_dx_response.get("differential_diagnoses", [])
                for dx in raw_differentials:
                    differential_diagnoses.append(DifferentialDiagnosis(
                        name=dx.get("diagnosis", "Unknown"),
                        risk=dx.get("risk_level", "MEDIUM"),
                        supporting_factors=dx.get("supporting_evidence", []),
                        recommended_actions=dx.get("recommended_actions", [])
                    ))

                # Step 3: Generate task list with OpenAI
                logger.info("Generating task list with OpenAI")
                tasks_response = await generate_task_list(
                    differential_diagnoses=raw_differentials,
                    form_data=form_dict,
                    patient_context=patient_dict
                )

                # Parse tasks into RecommendedActions
                immediate_tasks = []
                for task in tasks_response.get("immediate_tasks", []):
                    immediate_tasks.append(RecommendedAction(
                        name=task.get("task", ""),
                        category=task.get("category", ""),
                        details=task.get("reason", "")
                    ))

                urgent_tasks = []
                for task in tasks_response.get("urgent_tasks", []):
                    urgent_tasks.append(RecommendedAction(
                        name=task.get("task", ""),
                        category=task.get("category", ""),
                        details=task.get("reason", "")
                    ))

                routine_tasks = []
                for task in tasks_response.get("routine_tasks", []):
                    routine_tasks.append(RecommendedAction(
                        name=task.get("task", ""),
                        category=task.get("category", ""),
                        details=task.get("reason", "")
                    ))

                recommended_actions = RecommendedActions(
                    immediate=immediate_tasks,
                    urgent=urgent_tasks,
                    routine=routine_tasks
                )

            except OpenAIAPIError as e:
                logger.warning(f"OpenAI API error, falling back to mock data: {str(e)}")
                differential_diagnoses = generate_mock_differentials(form_data.chief_complaint)
                recommended_actions = generate_mock_actions(form_data.chief_complaint)
        else:
            # Use mock implementation when no OpenAI key
            logger.info("Using mock OpenAI implementation (no API key configured)")
            differential_diagnoses = generate_mock_differentials(form_data.chief_complaint)
            recommended_actions = generate_mock_actions(form_data.chief_complaint)

        return AnalysisResponse(
            clinical_note=clinical_note,
            icd_codes=icd_codes,
            differential_diagnoses=differential_diagnoses,
            recommended_actions=recommended_actions
        )

    except HeidiAPIError as e:
        logger.error(f"Heidi API error: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))
    except OpenAIAPIError as e:
        logger.error(f"OpenAI API error: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in analyze_encounter: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred during analysis")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "heidi_configured": bool(HEIDI_API_KEY),
        "openai_configured": bool(OPENAI_API_KEY),
        "development_mode": DEVELOPMENT_MODE,
        "mock_data_loaded": MOCK_DATA is not None,
        "rag_enabled": RAG_ENGINE is not None,
        "rag_chunks": len(RAG_ENGINE.chunks) if RAG_ENGINE else 0
    }


@app.on_event("startup")
async def startup_event():
    """
    Initialize application on startup.

    - Load mock data from patients-data.json
    - Validate mock data structure
    - Exit if validation fails in DEVELOPMENT_MODE
    """
    logger.info("=" * 60)
    logger.info("Starting Clinical AI Assistant")
    logger.info("=" * 60)
    logger.info(f"Development Mode: {DEVELOPMENT_MODE}")
    logger.info(f"Heidi API configured: {bool(HEIDI_API_KEY)}")
    logger.info(f"OpenAI API configured: {bool(OPENAI_API_KEY)}")

    # Load mock data
    logger.info("Loading mock data...")
    data = load_mock_data()

    if data is None:
        if DEVELOPMENT_MODE:
            logger.error("FATAL: Mock data failed to load in DEVELOPMENT_MODE")
            logger.error("Please ensure patients-data.json exists and is valid JSON")
            import sys
            sys.exit(1)
        else:
            logger.warning("Mock data not loaded - will use API calls")
    else:
        # Validate mock data structure
        logger.info("Validating mock data structure...")
        is_valid = validate_mock_data(MOCK_DATA_PATH)

        if not is_valid:
            if DEVELOPMENT_MODE:
                logger.error("FATAL: Mock data validation failed in DEVELOPMENT_MODE")
                logger.error("Please fix the issues in patients-data.json")
                import sys
                sys.exit(1)
            else:
                logger.warning("Mock data validation failed - will use API calls")
        else:
            logger.info("Mock data validation passed")
            logger.info(f"Loaded {len(MOCK_DATA.get('scenarios', []))} scenarios")
            logger.info(f"Loaded {len(MOCK_DATA.get('api_responses', {}))} API responses")

    # Initialize RAG engine if OpenAI API key is available
    global RAG_ENGINE
    if OPENAI_API_KEY:
        logger.info("Initializing RAG engine...")
        try:
            RAG_ENGINE = ClinicalRAG(
                knowledge_base_path=MOCK_DATA_PATH,
                openai_api_key=OPENAI_API_KEY
            )
            logger.info("RAG engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize RAG engine: {e}")
            RAG_ENGINE = None
    else:
        logger.warning("OpenAI API key not configured - RAG engine disabled")

    logger.info("=" * 60)
    logger.info("Startup complete")
    logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
