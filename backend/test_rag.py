"""
Test script to demonstrate RAG functionality with form and patient data
"""
import os
import json
from dotenv import load_dotenv
from rag_engine import ClinicalRAG

load_dotenv()

# Initialize RAG
knowledge_base_path = "patients-data.json"
openai_api_key = os.getenv("OPENAI_API_KEY")

print("=" * 60)
print("Clinical RAG System Test")
print("=" * 60)
print()

# Initialize RAG engine
print("Initializing RAG engine...")
rag = ClinicalRAG(knowledge_base_path, openai_api_key)
print(f"✓ RAG engine loaded with {len(rag.chunks)} knowledge chunks")
print()

# Test 1: Query retrieval with form data
print("=" * 60)
print("TEST 1: Retrieving similar clinical patterns")
print("=" * 60)
print()

test_form = {
    "chief_complaint": "Chest pain",
    "hpi": {
        "location": ["chest", "substernal"],
        "quality": ["sharp", "pressure"],
        "severity": 8,
        "duration": "2 hours"
    },
    "associated_symptoms": ["shortness of breath", "sweating"]
}

test_patient = {
    "name": "Test Patient",
    "age": 55,
    "gender": "Male",
    "medical_history": ["Hypertension", "Diabetes"],
    "allergies": ["Penicillin"]
}

# Build query
query = rag._build_query(test_form, test_patient)
print(f"Query built from form data:\n{query}")
print()

# Retrieve similar patterns
results = rag.retrieve(query, top_k=5)
print(f"Retrieved {len(results)} relevant clinical patterns:")
print()

for i, result in enumerate(results, 1):
    print(f"Pattern {i} (Score: {result['score']:.3f}):")
    print(f"  Type: {result['type']}")
    print(f"  Text: {result['text'][:200]}...")
    print()

# Test 2: Full analysis generation
print("=" * 60)
print("TEST 2: Generating clinical analysis with RAG")
print("=" * 60)
print()

print("Generating comprehensive analysis...")
analysis = rag.generate_analysis(test_form, test_patient)

print("\n✓ Analysis generated successfully!")
print()
print("Clinical Note (SOAP):")
print(f"  Subjective: {analysis['clinical_note']['subjective'][:150]}...")
print(f"  Assessment: {analysis['clinical_note']['assessment'][:150]}...")
print()

print(f"ICD-10 Codes ({len(analysis['icd_codes'])} codes):")
for code in analysis['icd_codes'][:3]:
    print(f"  - {code['code']}: {code['description']}")
print()

print(f"Differential Diagnoses ({len(analysis['differential_diagnoses'])} diagnoses):")
for dx in analysis['differential_diagnoses'][:3]:
    print(f"  - {dx['name']} (Risk: {dx['risk']})")
    print(f"    Supporting: {', '.join(dx.get('supporting_factors', [])[:2])}")
print()

print("Recommended Actions:")
print(f"  Immediate: {len(analysis['recommended_actions']['immediate'])} tasks")
print(f"  Urgent: {len(analysis['recommended_actions']['urgent'])} tasks")
print(f"  Routine: {len(analysis['recommended_actions']['routine'])} tasks")

if analysis['recommended_actions']['immediate']:
    print("\n  First immediate action:")
    action = analysis['recommended_actions']['immediate'][0]
    print(f"    - {action['name']} ({action.get('category', 'N/A')})")
    print(f"      {action.get('details', '')}")

print()
print("=" * 60)
print("RAG System Test Complete!")
print("=" * 60)
