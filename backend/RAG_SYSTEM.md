# Clinical RAG System Documentation

## Overview

Your Clinical RAG (Retrieval-Augmented Generation) system uses **form data** and **patient data** to provide intelligent clinical decision support. It combines vector similarity search with GPT-4 to generate accurate, context-aware clinical analysis.

## How It Works

### 1. Knowledge Base
The system loads clinical patterns from `patients-data.json` which contains:
- **Scenarios**: Example clinical cases with chief complaints, HPI, physical exams
- **API Responses**: Clinical notes, differential diagnoses, ICD codes, recommended actions

### 2. Data Processing

#### Form Data Input
The RAG system accepts comprehensive clinical form data:
```python
form_data = {
    "chief_complaint": "Chest pain",
    "hpi": {
        "location": ["chest", "substernal"],
        "radiation": ["left arm"],
        "quality": ["sharp", "pressure"],
        "duration": "2 hours",
        "severity": 8,
        "timing": "sudden onset",
        "aggravating_factors": ["exertion"],
        "relieving_factors": ["rest"]
    },
    "associated_symptoms": ["shortness of breath", "sweating"],
    "physical_exam": {
        "general": ["anxious", "diaphoretic"],
        "vitals": {
            "bp": "150/90",
            "hr": 105,
            "temp": 98.6,
            "spo2": 94,
            "rr": 22
        },
        "cardiovascular": ["tachycardia", "regular rhythm"],
        "respiratory": ["tachypnea", "clear lungs"]
    },
    "doctor_notes": "Patient appears uncomfortable..."
}
```

#### Patient Context Input
```python
patient_context = {
    "name": "John Smith",
    "age": 55,
    "gender": "Male",
    "mrn": "MRN12345",
    "medical_history": ["Hypertension", "Diabetes", "Hyperlipidemia"],
    "medications": ["Lisinopril 10mg", "Metformin 500mg"],
    "allergies": ["Penicillin"],  # ⚠️ CRITICAL for medication safety
    "vitals": {
        "blood_pressure": "140/85",
        "heart_rate": 78,
        "temperature": 98.6,
        "oxygen_saturation": 97,
        "respiratory_rate": 16
    }
}
```

### 3. RAG Pipeline

#### Step 1: Query Building
The system builds a semantic search query from form + patient data:
```
"Chief complaint: Chest pain | Symptoms: shortness of breath, sweating |
Location: chest, substernal | Quality: sharp, pressure | Severity: 8/10 |
Age: 55 | Gender: Male"
```

#### Step 2: Vector Retrieval
- Converts query to embedding using OpenAI `text-embedding-3-small`
- Searches FAISS index for similar clinical patterns
- Retrieves top-K most relevant chunks (default: 10)

**Retrieved patterns include:**
- Similar chief complaints and presentations
- Matching HPI patterns (OPQRST)
- Physical exam findings
- Previous differential diagnoses
- ICD-10 coding examples
- Treatment plans and recommended actions

#### Step 3: Context Assembly
Builds rich context from retrieved patterns:
```
[Pattern 1] (Relevance: 0.87)
Clinical Scenario: Acute Chest Pain - Possible ACS
Chief Complaint: Chest pain
Associated Symptoms: dyspnea, diaphoresis
...

[Pattern 2] (Relevance: 0.82)
Differential Diagnosis Pattern:
Diagnosis: Acute Coronary Syndrome
Risk Level: HIGH
Supporting Evidence: ...
```

#### Step 4: Analysis Generation
Sends to GPT-4 with:
1. **Patient summary** (demographics, PMHx, medications, allergies)
2. **Clinical presentation** (formatted form data)
3. **Retrieved context** (similar cases from knowledge base)

The model generates:
- **Clinical Note** in SOAP format
- **ICD-10 Codes** with descriptions
- **Differential Diagnoses** ranked by likelihood with supporting/opposing factors
- **Recommended Actions** categorized as immediate/urgent/routine

### 4. Safety Features

#### Allergy Checking
```python
# System prompt includes:
"ALWAYS check patient allergies before recommending medications"
"If patient has Penicillin allergy, do NOT recommend penicillin-based antibiotics"
```

The RAG system:
1. Extracts patient allergies from `patient_context`
2. Highlights them prominently (⚠️) in patient summary
3. Includes them in the generation prompt
4. GPT-4 cross-checks before recommending medications

#### Context Awareness
- Age-appropriate recommendations
- Gender-specific considerations
- Medical history influences differential dx
- Current medications checked for interactions

## Usage in Backend

### In `/api/analyze` endpoint:

```python
# When RAG is available
if RAG_ENGINE:
    rag_response = RAG_ENGINE.generate_analysis(form_dict, patient_dict)

    # Parse response into structured format
    clinical_note = ClinicalNote(**rag_response["clinical_note"])
    icd_codes = [ICD10Code(**code) for code in rag_response["icd10_codes"]]
    differential_diagnoses = [
        DifferentialDiagnosis(**dx)
        for dx in rag_response["differential_diagnoses"]
    ]
    recommended_actions = RecommendedActions(**rag_response["recommended_actions"])
```

## Testing the RAG System

Run the test script:
```bash
cd backend
source ../env/bin/activate  # or your venv path
python test_rag.py
```

This will:
1. Load the knowledge base
2. Test query retrieval with sample form/patient data
3. Generate a full clinical analysis
4. Display results

## Performance Optimization

### Caching
- Embeddings are cached in `.rag_cache/` directory
- Cache key based on MD5 hash of knowledge base
- Subsequent startups load from cache (instant)

### Batch Processing
- Embeddings generated in batches of 100
- Reduces API calls to OpenAI

## Extending the Knowledge Base

Add more scenarios to `patients-data.json`:

```json
{
  "scenarios": [
    {
      "id": "new_scenario",
      "name": "Scenario Name",
      "form_data": {
        "chief_complaint": "...",
        "hpi": { ... },
        "physical_exam": { ... }
      }
    }
  ],
  "api_responses": {
    "new_scenario": {
      "clinical_note": "...",
      "differential_diagnoses": [...],
      "icd10_codes": [...],
      "tasks": {...}
    }
  }
}
```

The RAG system will:
1. Automatically extract new chunks
2. Generate embeddings
3. Update FAISS index
4. Use new patterns in retrieval

## Key Benefits

1. **Learns from examples**: Uses actual clinical cases as patterns
2. **Context-aware**: Retrieves only relevant information
3. **Personalized**: Adapts to specific patient + presentation
4. **Safe**: Always considers allergies and contraindications
5. **Comprehensive**: Generates complete SOAP notes, dx codes, and action plans
6. **Scalable**: Easy to add more knowledge by updating JSON

## Current Status

- ✅ Knowledge base loaded with 39 chunks
- ✅ FAISS index built and cached
- ✅ Integrated with `/api/analyze` endpoint
- ✅ Allergy safety checks enabled
- ✅ Full SOAP note generation
- ✅ Differential diagnosis with risk stratification
- ✅ Prioritized recommended actions
