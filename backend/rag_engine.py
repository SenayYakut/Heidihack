"""
Clinical RAG (Retrieval-Augmented Generation) Engine

This module implements a RAG pipeline for clinical decision support:
1. Loads clinical knowledge from patients-data.json
2. Creates embeddings using OpenAI text-embedding-3-small
3. Builds FAISS index for similarity search
4. Generates dynamic clinical analysis using retrieved context
"""

import json
import logging
import os
import hashlib
import pickle
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
from openai import OpenAI

logger = logging.getLogger(__name__)

# Try to import faiss, provide helpful error if missing
try:
    import faiss
except ImportError:
    logger.error("faiss-cpu not installed. Run: pip install faiss-cpu")
    faiss = None


class ClinicalRAG:
    """
    RAG engine for clinical decision support.

    Loads clinical knowledge base, creates embeddings, and generates
    dynamic clinical analysis based on patient presentations.
    """

    def __init__(self, knowledge_base_path: str, openai_api_key: str):
        """
        Initialize the RAG engine.

        Args:
            knowledge_base_path: Path to patients-data.json
            openai_api_key: OpenAI API key for embeddings and generation
        """
        self.knowledge_base_path = knowledge_base_path
        self.client = OpenAI(api_key=openai_api_key)
        self.embedding_model = "text-embedding-3-small"
        self.generation_model = "gpt-4o"
        self.embedding_dimension = 1536  # Dimension for text-embedding-3-small

        # Knowledge storage
        self.chunks: List[Dict[str, Any]] = []
        self.embeddings: Optional[np.ndarray] = None
        self.index: Optional[Any] = None  # FAISS index

        # Cache settings
        self.cache_dir = os.path.join(os.path.dirname(knowledge_base_path), ".rag_cache")
        os.makedirs(self.cache_dir, exist_ok=True)

        # Load and initialize
        self._load_knowledge_base()
        self._build_index()

        logger.info(f"ClinicalRAG initialized with {len(self.chunks)} knowledge chunks")

    def _load_knowledge_base(self):
        """Load and chunk the knowledge base from patients-data.json."""
        try:
            with open(self.knowledge_base_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load knowledge base: {e}")
            raise

        self.chunks = []

        # Extract chunks from scenarios
        for scenario in data.get("scenarios", []):
            self._extract_scenario_chunks(scenario)

        # Extract chunks from API responses (clinical patterns)
        for response_key, response in data.get("api_responses", {}).items():
            self._extract_response_chunks(response_key, response)

        logger.info(f"Extracted {len(self.chunks)} chunks from knowledge base")

    def _extract_scenario_chunks(self, scenario: Dict):
        """Extract searchable chunks from a scenario."""
        scenario_id = scenario.get("id", "unknown")
        scenario_name = scenario.get("name", "")
        description = scenario.get("description", "")
        form_data = scenario.get("form_data", {})

        # Chunk 1: Scenario overview
        overview_text = f"""
Clinical Scenario: {scenario_name}
Description: {description}
Chief Complaint: {form_data.get('chief_complaint', '')}
Associated Symptoms: {', '.join(form_data.get('associated_symptoms', []))}
"""
        self.chunks.append({
            "id": f"scenario_{scenario_id}_overview",
            "type": "scenario_overview",
            "scenario_id": scenario_id,
            "text": overview_text.strip(),
            "metadata": {
                "chief_complaint": form_data.get('chief_complaint', ''),
                "symptoms": form_data.get('associated_symptoms', [])
            }
        })

        # Chunk 2: HPI pattern
        hpi = form_data.get("hpi", {})
        hpi_text = f"""
Clinical Pattern - History of Present Illness:
Chief Complaint: {form_data.get('chief_complaint', '')}
Location: {', '.join(hpi.get('location', []))}
Radiation: {', '.join(hpi.get('radiation', []))}
Quality: {', '.join(hpi.get('quality', []))} {hpi.get('quality_other', '')}
Duration: {hpi.get('duration', '')}
Severity: {hpi.get('severity', '')}/10
Timing: {hpi.get('timing', '')}
Aggravating Factors: {', '.join(hpi.get('aggravating_factors', []))}
Relieving Factors: {', '.join(hpi.get('relieving_factors', []))}
"""
        self.chunks.append({
            "id": f"scenario_{scenario_id}_hpi",
            "type": "hpi_pattern",
            "scenario_id": scenario_id,
            "text": hpi_text.strip(),
            "metadata": {"chief_complaint": form_data.get('chief_complaint', '')}
        })

        # Chunk 3: Physical exam pattern
        pe = form_data.get("physical_exam", {})
        if pe:
            pe_text = f"""
Physical Examination Pattern for {form_data.get('chief_complaint', '')}:
General: {', '.join(pe.get('general', []))}
Vitals: BP {pe.get('vitals', {}).get('bp', '')}, HR {pe.get('vitals', {}).get('hr', '')}, Temp {pe.get('vitals', {}).get('temp', '')}, SpO2 {pe.get('vitals', {}).get('spo2', '')}%, RR {pe.get('vitals', {}).get('rr', '')}
Cardiovascular: {', '.join(pe.get('cardiovascular', []))}
Respiratory: {', '.join(pe.get('respiratory', []))}
"""
            self.chunks.append({
                "id": f"scenario_{scenario_id}_pe",
                "type": "physical_exam_pattern",
                "scenario_id": scenario_id,
                "text": pe_text.strip(),
                "metadata": {"chief_complaint": form_data.get('chief_complaint', '')}
            })

        # Chunk 4: Doctor notes (clinical reasoning)
        if form_data.get("doctor_notes"):
            notes_text = f"""
Clinical Reasoning for {form_data.get('chief_complaint', '')}:
{form_data.get('doctor_notes', '')}
"""
            self.chunks.append({
                "id": f"scenario_{scenario_id}_notes",
                "type": "clinical_reasoning",
                "scenario_id": scenario_id,
                "text": notes_text.strip(),
                "metadata": {"chief_complaint": form_data.get('chief_complaint', '')}
            })

    def _extract_response_chunks(self, response_key: str, response: Dict):
        """Extract searchable chunks from an API response."""

        # Chunk: Clinical note pattern
        if response.get("clinical_note"):
            note = response["clinical_note"]
            # Extract just the first 500 chars for embedding (full note used in generation)
            note_preview = note[:500] + "..." if len(note) > 500 else note
            self.chunks.append({
                "id": f"response_{response_key}_note",
                "type": "clinical_note_pattern",
                "response_key": response_key,
                "text": f"Clinical Note Pattern:\n{note_preview}",
                "metadata": {"full_note": note}
            })

        # Chunks: Differential diagnoses
        for i, dx in enumerate(response.get("differential_diagnoses", [])):
            dx_text = f"""
Differential Diagnosis Pattern:
Diagnosis: {dx.get('diagnosis', '')}
Risk Level: {dx.get('risk_level', '')}
Supporting Evidence: {', '.join(dx.get('supporting_evidence', []))}
Opposing Evidence: {', '.join(dx.get('opposing_evidence', []))}
Recommended Actions: {', '.join(dx.get('recommended_actions', []))}
"""
            self.chunks.append({
                "id": f"response_{response_key}_dx_{i}",
                "type": "differential_diagnosis",
                "response_key": response_key,
                "text": dx_text.strip(),
                "metadata": {
                    "diagnosis": dx.get('diagnosis', ''),
                    "risk_level": dx.get('risk_level', ''),
                    "rank": dx.get('rank', i+1)
                }
            })

        # Chunks: Tasks by category
        tasks = response.get("tasks", {})
        for task_type in ["immediate_tasks", "urgent_tasks", "routine_tasks"]:
            task_list = tasks.get(task_type, [])
            if task_list:
                priority = task_type.replace("_tasks", "").upper()
                task_texts = []
                for task in task_list:
                    task_texts.append(f"- {task.get('task', '')} ({task.get('category', '')}): {task.get('reason', '')}")

                task_chunk_text = f"""
Clinical Tasks - {priority} Priority:
{chr(10).join(task_texts)}
"""
                self.chunks.append({
                    "id": f"response_{response_key}_{task_type}",
                    "type": "task_pattern",
                    "response_key": response_key,
                    "text": task_chunk_text.strip(),
                    "metadata": {
                        "priority": priority,
                        "task_count": len(task_list)
                    }
                })

        # Chunk: ICD-10 codes
        icd_codes = response.get("icd10_codes", [])
        if icd_codes:
            icd_text = "ICD-10 Diagnosis Codes:\n"
            for code in icd_codes:
                icd_text += f"- {code.get('code', '')}: {code.get('description', '')} ({code.get('type', '')})\n"

            self.chunks.append({
                "id": f"response_{response_key}_icd",
                "type": "icd_codes",
                "response_key": response_key,
                "text": icd_text.strip(),
                "metadata": {"codes": icd_codes}
            })

    def _get_cache_key(self) -> str:
        """Generate a cache key based on knowledge base content."""
        with open(self.knowledge_base_path, 'rb') as f:
            content_hash = hashlib.md5(f.read()).hexdigest()
        return content_hash

    def _build_index(self):
        """Build FAISS index from embeddings."""
        if faiss is None:
            logger.error("FAISS not available - RAG retrieval will be disabled")
            return

        cache_key = self._get_cache_key()
        embeddings_cache_path = os.path.join(self.cache_dir, f"embeddings_{cache_key}.pkl")
        index_cache_path = os.path.join(self.cache_dir, f"index_{cache_key}.faiss")

        # Try to load from cache
        if os.path.exists(embeddings_cache_path) and os.path.exists(index_cache_path):
            try:
                with open(embeddings_cache_path, 'rb') as f:
                    self.embeddings = pickle.load(f)
                self.index = faiss.read_index(index_cache_path)
                logger.info("Loaded embeddings and index from cache")
                return
            except Exception as e:
                logger.warning(f"Failed to load cache: {e}")

        # Generate embeddings
        logger.info(f"Generating embeddings for {len(self.chunks)} chunks...")
        texts = [chunk["text"] for chunk in self.chunks]

        try:
            # Batch embeddings (OpenAI supports up to 2048 inputs)
            embeddings_list = []
            batch_size = 100

            for i in range(0, len(texts), batch_size):
                batch = texts[i:i+batch_size]
                response = self.client.embeddings.create(
                    model=self.embedding_model,
                    input=batch
                )
                batch_embeddings = [item.embedding for item in response.data]
                embeddings_list.extend(batch_embeddings)

            self.embeddings = np.array(embeddings_list, dtype=np.float32)

            # Build FAISS index
            self.index = faiss.IndexFlatIP(self.embedding_dimension)  # Inner product for cosine similarity

            # Normalize embeddings for cosine similarity
            faiss.normalize_L2(self.embeddings)
            self.index.add(self.embeddings)

            # Save to cache
            with open(embeddings_cache_path, 'wb') as f:
                pickle.dump(self.embeddings, f)
            faiss.write_index(self.index, index_cache_path)

            logger.info(f"Built FAISS index with {self.index.ntotal} vectors")

        except Exception as e:
            logger.error(f"Failed to build embeddings/index: {e}")
            self.embeddings = None
            self.index = None

    def retrieve(self, query: str, top_k: int = 8) -> List[Dict[str, Any]]:
        """
        Retrieve most relevant chunks for a query.

        Args:
            query: Search query (typically patient presentation)
            top_k: Number of results to return

        Returns:
            List of relevant chunks with scores
        """
        if self.index is None or self.embeddings is None:
            logger.warning("Index not available - returning empty results")
            return []

        try:
            # Generate query embedding
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=query
            )
            query_embedding = np.array([response.data[0].embedding], dtype=np.float32)
            faiss.normalize_L2(query_embedding)

            # Search
            scores, indices = self.index.search(query_embedding, top_k)

            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < len(self.chunks):
                    chunk = self.chunks[idx].copy()
                    chunk["score"] = float(score)
                    results.append(chunk)

            logger.info(f"Retrieved {len(results)} chunks for query")
            return results

        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            return []

    def generate_analysis(
        self,
        form_data: Dict[str, Any],
        patient_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate clinical analysis using RAG.

        Args:
            form_data: Clinical form data from frontend
            patient_context: Patient demographics and history

        Returns:
            Analysis result matching the expected API structure
        """
        # Build query from form data
        query = self._build_query(form_data, patient_context)

        # Retrieve relevant clinical patterns
        retrieved_chunks = self.retrieve(query, top_k=10)

        # Build context from retrieved chunks
        context = self._build_context(retrieved_chunks)

        # Generate analysis
        try:
            analysis = self._generate_with_openai(form_data, patient_context, context)
            return analysis
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            # Fallback to basic generation without retrieval
            return self._generate_fallback(form_data, patient_context)

    def _build_query(self, form_data: Dict, patient_context: Dict) -> str:
        """Build a search query from form data."""
        parts = []

        # Chief complaint is most important
        if form_data.get("chief_complaint"):
            parts.append(f"Chief complaint: {form_data['chief_complaint']}")

        # Associated symptoms
        if form_data.get("associated_symptoms"):
            parts.append(f"Symptoms: {', '.join(form_data['associated_symptoms'])}")

        # HPI details
        hpi = form_data.get("hpi", {})
        if hpi.get("location"):
            parts.append(f"Location: {', '.join(hpi['location'])}")
        if hpi.get("quality"):
            parts.append(f"Quality: {', '.join(hpi['quality'])}")
        if hpi.get("severity"):
            parts.append(f"Severity: {hpi['severity']}/10")

        # Patient context
        if patient_context.get("age"):
            parts.append(f"Age: {patient_context['age']}")
        if patient_context.get("gender"):
            parts.append(f"Gender: {patient_context['gender']}")

        return " | ".join(parts)

    def _build_context(self, chunks: List[Dict]) -> str:
        """Build context string from retrieved chunks."""
        if not chunks:
            return "No relevant clinical patterns found."

        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            chunk_type = chunk.get("type", "unknown")
            text = chunk.get("text", "")
            score = chunk.get("score", 0)

            context_parts.append(f"[Pattern {i}] (Relevance: {score:.2f})\n{text}")

        return "\n\n---\n\n".join(context_parts)

    def _generate_with_openai(
        self,
        form_data: Dict,
        patient_context: Dict,
        context: str
    ) -> Dict[str, Any]:
        """Generate analysis using OpenAI with retrieved context."""

        # Build patient summary
        patient_summary = self._build_patient_summary(patient_context)

        # Build form summary
        form_summary = self._build_form_summary(form_data)

        # System prompt
        system_prompt = """You are an expert clinical decision support system. Your role is to analyze patient presentations and provide comprehensive clinical analysis.

CRITICAL SAFETY RULES:
1. ALWAYS check patient allergies before recommending any medications
2. If patient has Penicillin allergy, do NOT recommend penicillin-based antibiotics (amoxicillin, ampicillin, etc.)
3. Flag any potential drug interactions or contraindications
4. Prioritize immediate life-threatening conditions

You must return a valid JSON object with the exact structure specified."""

        # User prompt
        user_prompt = f"""Analyze this patient presentation and generate a comprehensive clinical analysis.

## PATIENT INFORMATION
{patient_summary}

## CLINICAL PRESENTATION
{form_summary}

## RELEVANT CLINICAL PATTERNS FROM KNOWLEDGE BASE
{context}

## REQUIRED OUTPUT
Generate a JSON response with this EXACT structure:
{{
  "clinical_note": {{
    "subjective": "Detailed subjective findings in SOAP format...",
    "objective": "Detailed objective findings...",
    "assessment": "Clinical assessment and impression...",
    "plan": "Detailed treatment plan..."
  }},
  "icd10_codes": [
    {{"code": "I20.9", "description": "Angina pectoris, unspecified", "type": "primary"}},
    {{"code": "R07.9", "description": "Chest pain, unspecified", "type": "secondary"}}
  ],
  "differential_diagnoses": [
    {{
      "name": "Diagnosis name",
      "risk": "HIGH/MEDIUM/LOW",
      "supporting_factors": ["factor1", "factor2"],
      "recommended_actions": ["action1", "action2"]
    }}
  ],
  "recommended_actions": {{
    "immediate": [
      {{"name": "Task name", "category": "Category", "details": "Reason/details"}}
    ],
    "urgent": [
      {{"name": "Task name", "category": "Category", "details": "Reason/details"}}
    ],
    "routine": [
      {{"name": "Task name", "category": "Category", "details": "Reason/details"}}
    ]
  }}
}}

IMPORTANT:
- Generate 3-5 differential diagnoses ranked by likelihood
- Include at least 2-4 ICD-10 codes
- Distribute tasks across immediate (STAT), urgent (today), and routine categories
- Reference patient allergies ({patient_context.get('allergies', ['None known'])}) when recommending medications
- Use the clinical patterns from the knowledge base as examples but adapt to this specific patient"""

        try:
            response = self.client.chat.completions.create(
                model=self.generation_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)

            # Validate and fix structure if needed
            result = self._validate_response_structure(result)

            logger.info("Successfully generated RAG analysis")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {e}")
            raise
        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            raise

    def _build_patient_summary(self, patient_context: Dict) -> str:
        """Build a formatted patient summary."""
        parts = []

        if patient_context.get("name"):
            parts.append(f"Name: {patient_context['name']}")
        if patient_context.get("age"):
            parts.append(f"Age: {patient_context['age']} years")
        if patient_context.get("gender"):
            parts.append(f"Gender: {patient_context['gender']}")
        if patient_context.get("mrn"):
            parts.append(f"MRN: {patient_context['mrn']}")

        # Medical history
        pmhx = patient_context.get("medical_history", [])
        if pmhx:
            parts.append(f"Past Medical History: {', '.join(pmhx)}")
        else:
            parts.append("Past Medical History: None documented")

        # Medications
        meds = patient_context.get("medications", [])
        if meds:
            parts.append(f"Current Medications: {', '.join(meds)}")
        else:
            parts.append("Current Medications: None")

        # Allergies - CRITICAL
        allergies = patient_context.get("allergies", [])
        if allergies:
            parts.append(f"⚠️ ALLERGIES: {', '.join(allergies)}")
        else:
            parts.append("Allergies: NKDA (No Known Drug Allergies)")

        # Vitals
        vitals = patient_context.get("vitals", {})
        if vitals:
            vitals_str = []
            if vitals.get("blood_pressure"):
                vitals_str.append(f"BP {vitals['blood_pressure']}")
            if vitals.get("heart_rate"):
                vitals_str.append(f"HR {vitals['heart_rate']}")
            if vitals.get("temperature"):
                vitals_str.append(f"Temp {vitals['temperature']}°F")
            if vitals.get("oxygen_saturation"):
                vitals_str.append(f"SpO2 {vitals['oxygen_saturation']}%")
            if vitals.get("respiratory_rate"):
                vitals_str.append(f"RR {vitals['respiratory_rate']}")
            if vitals_str:
                parts.append(f"Baseline Vitals: {', '.join(vitals_str)}")

        return "\n".join(parts)

    def _build_form_summary(self, form_data: Dict) -> str:
        """Build a formatted form summary."""
        parts = []

        # Chief complaint
        parts.append(f"Chief Complaint: {form_data.get('chief_complaint', 'Not specified')}")

        # HPI
        hpi = form_data.get("hpi", {})
        if hpi:
            hpi_parts = []
            if hpi.get("location"):
                hpi_parts.append(f"Location: {', '.join(hpi['location'])}")
            if hpi.get("radiation"):
                hpi_parts.append(f"Radiation: {', '.join(hpi['radiation'])}")
            if hpi.get("quality"):
                quality = ', '.join(hpi['quality'])
                if hpi.get("quality_other"):
                    quality += f" ({hpi['quality_other']})"
                hpi_parts.append(f"Quality: {quality}")
            if hpi.get("duration"):
                hpi_parts.append(f"Duration: {hpi['duration']}")
            if hpi.get("severity"):
                hpi_parts.append(f"Severity: {hpi['severity']}/10")
            if hpi.get("timing"):
                hpi_parts.append(f"Timing: {hpi['timing']}")
            if hpi.get("aggravating_factors"):
                hpi_parts.append(f"Aggravating: {', '.join(hpi['aggravating_factors'])}")
            if hpi.get("relieving_factors"):
                hpi_parts.append(f"Relieving: {', '.join(hpi['relieving_factors'])}")

            if hpi_parts:
                parts.append("HPI:\n  " + "\n  ".join(hpi_parts))

        # Associated symptoms
        symptoms = form_data.get("associated_symptoms", [])
        if symptoms:
            parts.append(f"Associated Symptoms: {', '.join(symptoms)}")

        # Physical exam
        pe = form_data.get("physical_exam", {})
        if pe:
            pe_parts = []
            if pe.get("general"):
                pe_parts.append(f"General: {', '.join(pe['general'])}")

            vitals = pe.get("vitals", {})
            if any(vitals.values()):
                vitals_str = []
                if vitals.get("bp"):
                    vitals_str.append(f"BP {vitals['bp']}")
                if vitals.get("hr"):
                    vitals_str.append(f"HR {vitals['hr']}")
                if vitals.get("temp"):
                    vitals_str.append(f"Temp {vitals['temp']}")
                if vitals.get("spo2"):
                    vitals_str.append(f"SpO2 {vitals['spo2']}%")
                if vitals.get("rr"):
                    vitals_str.append(f"RR {vitals['rr']}")
                pe_parts.append(f"Vitals: {', '.join(vitals_str)}")

            if pe.get("cardiovascular"):
                pe_parts.append(f"CV: {', '.join(pe['cardiovascular'])}")
            if pe.get("respiratory"):
                pe_parts.append(f"Resp: {', '.join(pe['respiratory'])}")

            if pe_parts:
                parts.append("Physical Exam:\n  " + "\n  ".join(pe_parts))

        # Doctor notes
        if form_data.get("doctor_notes"):
            parts.append(f"Clinical Notes: {form_data['doctor_notes']}")

        return "\n".join(parts)

    def _validate_response_structure(self, result: Dict) -> Dict:
        """Validate and fix response structure to match expected format."""

        # Ensure clinical_note exists with all fields
        if "clinical_note" not in result:
            result["clinical_note"] = {
                "subjective": "",
                "objective": "",
                "assessment": "",
                "plan": ""
            }
        else:
            for field in ["subjective", "objective", "assessment", "plan"]:
                if field not in result["clinical_note"]:
                    result["clinical_note"][field] = ""

        # Ensure icd10_codes is a list
        if "icd10_codes" not in result:
            result["icd10_codes"] = []

        # Ensure differential_diagnoses is a list
        if "differential_diagnoses" not in result:
            result["differential_diagnoses"] = []

        # Ensure recommended_actions has all categories
        if "recommended_actions" not in result:
            result["recommended_actions"] = {
                "immediate": [],
                "urgent": [],
                "routine": []
            }
        else:
            for cat in ["immediate", "urgent", "routine"]:
                if cat not in result["recommended_actions"]:
                    result["recommended_actions"][cat] = []

        return result

    def _generate_fallback(
        self,
        form_data: Dict,
        patient_context: Dict
    ) -> Dict[str, Any]:
        """Generate basic analysis without RAG retrieval as fallback."""
        logger.warning("Using fallback generation without RAG retrieval")

        patient_summary = self._build_patient_summary(patient_context)
        form_summary = self._build_form_summary(form_data)

        system_prompt = """You are a clinical decision support system. Analyze the patient presentation and provide comprehensive clinical analysis.

CRITICAL: Always check patient allergies before recommending medications.

Return a valid JSON object with the required structure."""

        user_prompt = f"""Analyze this patient and generate clinical analysis.

## PATIENT
{patient_summary}

## PRESENTATION
{form_summary}

## OUTPUT (JSON)
Return JSON with: clinical_note (subjective/objective/assessment/plan), icd10_codes, differential_diagnoses, recommended_actions (immediate/urgent/routine)."""

        try:
            response = self.client.chat.completions.create(
                model=self.generation_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            return self._validate_response_structure(result)

        except Exception as e:
            logger.error(f"Fallback generation also failed: {e}")
            # Return minimal valid structure
            return {
                "clinical_note": {
                    "subjective": f"Patient presents with: {form_data.get('chief_complaint', 'Unknown')}",
                    "objective": "Unable to generate - please check system logs",
                    "assessment": "Analysis generation failed",
                    "plan": "Please review manually"
                },
                "icd10_codes": [],
                "differential_diagnoses": [],
                "recommended_actions": {
                    "immediate": [],
                    "urgent": [],
                    "routine": []
                }
            }
