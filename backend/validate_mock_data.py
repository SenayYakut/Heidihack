"""
Validation script for patients-data.json

This script validates the structure of the mock patient data file
against the required schema and reports any issues found.
"""

import json
import os
import sys
from typing import Any

# ANSI color codes for terminal output
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"
BOLD = "\033[1m"


def print_status(status: str, message: str):
    """Print a formatted status message."""
    try:
        if status == "ok":
            print(f"  {GREEN}[OK] {message}{RESET}")
        elif status == "warn":
            print(f"  {YELLOW}[WARN] {message}{RESET}")
        elif status == "error":
            print(f"  {RED}[ERROR] {message}{RESET}")
        elif status == "info":
            print(f"  [INFO] {message}")
    except UnicodeEncodeError:
        # Fallback for consoles that don't support colors
        if status == "ok":
            print(f"  [OK] {message}")
        elif status == "warn":
            print(f"  [WARN] {message}")
        elif status == "error":
            print(f"  [ERROR] {message}")
        elif status == "info":
            print(f"  [INFO] {message}")


def validate_array_field(data: Any, field_name: str, parent: str = "") -> tuple[bool, str]:
    """
    Validate that a field is an array (can be empty).
    Returns (is_valid, message).
    """
    full_path = f"{parent}.{field_name}" if parent else field_name

    if field_name not in data:
        return False, f"{full_path} is missing"

    if not isinstance(data[field_name], list):
        return False, f"{full_path} must be an array, got {type(data[field_name]).__name__}"

    return True, f"{full_path} is valid array"


def validate_patient(patient: dict) -> tuple[bool, list[str], list[str], list[str]]:
    """
    Validate the patient object structure.

    Required fields: id, mrn, name, age, gender, medical_history,
                    current_medications, allergies
    Optional fields: date_of_birth, vitals

    Returns: (is_valid, errors, warnings, successes)
    """
    errors = []
    warnings = []
    successes = []

    # Required scalar fields
    required_scalars = {
        "id": (int, "number"),
        "mrn": (str, "string"),
        "name": (str, "string"),
        "age": (int, "number"),
        "gender": (str, "string"),
    }

    for field, (expected_type, type_name) in required_scalars.items():
        if field not in patient:
            errors.append(f"patient.{field} is missing (required)")
        elif not isinstance(patient[field], expected_type):
            errors.append(f"patient.{field} must be {type_name}, got {type(patient[field]).__name__}")
        else:
            successes.append(f"patient.{field} is valid")

    # Required array fields
    required_arrays = ["medical_history", "current_medications", "allergies"]
    for field in required_arrays:
        valid, msg = validate_array_field(patient, field, "patient")
        if valid:
            successes.append(msg)
        else:
            errors.append(msg)

    # Optional fields
    if "date_of_birth" not in patient:
        warnings.append("patient.date_of_birth is missing (optional but recommended)")
    else:
        successes.append("patient.date_of_birth is present")

    # Validate vitals if present
    if "vitals" in patient:
        vitals = patient["vitals"]
        vitals_fields = {
            "blood_pressure": str,
            "heart_rate": (int, float),
            "temperature": (int, float),
            "oxygen_saturation": (int, float),
            "respiratory_rate": (int, float)
        }

        for field, expected_type in vitals_fields.items():
            if field not in vitals:
                warnings.append(f"patient.vitals.{field} is missing")
            elif not isinstance(vitals[field], expected_type):
                errors.append(f"patient.vitals.{field} has wrong type")
            else:
                successes.append(f"patient.vitals.{field} is valid")
    else:
        warnings.append("patient.vitals is missing (optional but recommended)")

    is_valid = len(errors) == 0
    return is_valid, errors, warnings, successes


def validate_hpi(hpi: dict, scenario_id: str) -> tuple[bool, list[str], list[str], list[str]]:
    """
    Validate HPI (History of Present Illness) structure.

    Required fields: location, radiation, quality, quality_other, duration,
                    severity, timing, aggravating_factors, relieving_factors

    Returns: (is_valid, errors, warnings, successes)
    """
    errors = []
    warnings = []
    successes = []

    prefix = f"scenarios[{scenario_id}].form_data.hpi"

    # Array fields in HPI
    hpi_arrays = ["location", "radiation", "quality", "aggravating_factors", "relieving_factors"]
    for field in hpi_arrays:
        if field not in hpi:
            errors.append(f"{prefix}.{field} is missing")
        elif not isinstance(hpi[field], list):
            errors.append(f"{prefix}.{field} must be array")
        else:
            successes.append(f"{prefix}.{field} is valid")

    # String fields
    if "quality_other" not in hpi:
        errors.append(f"{prefix}.quality_other is missing")
    elif not isinstance(hpi["quality_other"], str):
        errors.append(f"{prefix}.quality_other must be string")
    else:
        successes.append(f"{prefix}.quality_other is valid")

    if "duration" not in hpi:
        errors.append(f"{prefix}.duration is missing")
    elif not isinstance(hpi["duration"], str):
        errors.append(f"{prefix}.duration must be string")
    else:
        successes.append(f"{prefix}.duration is valid")

    # Numeric severity (1-10)
    if "severity" not in hpi:
        errors.append(f"{prefix}.severity is missing")
    elif not isinstance(hpi["severity"], (int, float)):
        errors.append(f"{prefix}.severity must be number")
    elif not 1 <= hpi["severity"] <= 10:
        warnings.append(f"{prefix}.severity should be 1-10, got {hpi['severity']}")
    else:
        successes.append(f"{prefix}.severity is valid")

    # Timing (Constant or Intermittent)
    if "timing" not in hpi:
        errors.append(f"{prefix}.timing is missing")
    elif not isinstance(hpi["timing"], str):
        errors.append(f"{prefix}.timing must be string")
    elif hpi["timing"] not in ["Constant", "Intermittent"]:
        warnings.append(f"{prefix}.timing should be 'Constant' or 'Intermittent'")
    else:
        successes.append(f"{prefix}.timing is valid")

    is_valid = len(errors) == 0
    return is_valid, errors, warnings, successes


def validate_scenario(scenario: dict, index: int) -> tuple[bool, list[str], list[str], list[str]]:
    """
    Validate a single scenario structure.

    Required: id, name, form_data with chief_complaint, hpi, associated_symptoms
    Optional: description, physical_exam

    Returns: (is_valid, errors, warnings, successes)
    """
    errors = []
    warnings = []
    successes = []

    scenario_id = scenario.get("id", f"index_{index}")
    prefix = f"scenarios[{scenario_id}]"

    # Required top-level fields
    if "id" not in scenario:
        errors.append(f"{prefix}.id is missing")
    elif not isinstance(scenario["id"], str):
        errors.append(f"{prefix}.id must be string")
    else:
        successes.append(f"{prefix}.id is valid")

    if "name" not in scenario:
        errors.append(f"{prefix}.name is missing")
    elif not isinstance(scenario["name"], str):
        errors.append(f"{prefix}.name must be string")
    else:
        successes.append(f"{prefix}.name is valid")

    if "description" not in scenario:
        warnings.append(f"{prefix}.description is missing (optional)")
    else:
        successes.append(f"{prefix}.description is present")

    # Validate form_data
    if "form_data" not in scenario:
        errors.append(f"{prefix}.form_data is missing")
        return False, errors, warnings, successes

    form_data = scenario["form_data"]

    # Chief complaint
    if "chief_complaint" not in form_data:
        errors.append(f"{prefix}.form_data.chief_complaint is missing")
    elif not isinstance(form_data["chief_complaint"], str):
        errors.append(f"{prefix}.form_data.chief_complaint must be string")
    else:
        successes.append(f"{prefix}.form_data.chief_complaint is valid")

    # Associated symptoms
    valid, msg = validate_array_field(form_data, "associated_symptoms", f"{prefix}.form_data")
    if valid:
        successes.append(msg)
    else:
        errors.append(msg)

    # Validate HPI
    if "hpi" not in form_data:
        errors.append(f"{prefix}.form_data.hpi is missing")
    else:
        hpi_valid, hpi_errors, hpi_warnings, hpi_successes = validate_hpi(form_data["hpi"], scenario_id)
        errors.extend(hpi_errors)
        warnings.extend(hpi_warnings)
        successes.extend(hpi_successes)

    # Validate physical_exam if present (optional)
    if "physical_exam" in form_data:
        pe = form_data["physical_exam"]
        pe_prefix = f"{prefix}.form_data.physical_exam"

        for field in ["general", "cardiovascular", "respiratory"]:
            if field in pe:
                if not isinstance(pe[field], list):
                    errors.append(f"{pe_prefix}.{field} must be array")
                else:
                    successes.append(f"{pe_prefix}.{field} is valid")

        if "vitals" in pe:
            vitals = pe["vitals"]
            for field in ["bp", "hr", "temp", "spo2", "rr"]:
                if field not in vitals:
                    warnings.append(f"{pe_prefix}.vitals.{field} is missing")

    # Doctor notes (optional)
    if "doctor_notes" in form_data:
        if not isinstance(form_data["doctor_notes"], str):
            errors.append(f"{prefix}.form_data.doctor_notes must be string")
        else:
            successes.append(f"{prefix}.form_data.doctor_notes is valid")

    is_valid = len(errors) == 0
    return is_valid, errors, warnings, successes


def validate_task(task: dict, task_type: str, index: int) -> tuple[bool, list[str]]:
    """
    Validate a single task structure.
    Required: task, category, reason
    """
    errors = []
    prefix = f"api_responses.*.tasks.{task_type}[{index}]"

    for field in ["task", "category", "reason"]:
        if field not in task:
            errors.append(f"{prefix}.{field} is missing")
        elif not isinstance(task[field], str):
            errors.append(f"{prefix}.{field} must be string")

    return len(errors) == 0, errors


def validate_diagnosis(dx: dict, index: int) -> tuple[bool, list[str], list[str]]:
    """
    Validate a differential diagnosis structure.
    Required: rank, diagnosis, risk_level, supporting_evidence, opposing_evidence, recommended_actions
    """
    errors = []
    warnings = []
    prefix = f"api_responses.*.differential_diagnoses[{index}]"

    # Rank
    if "rank" not in dx:
        errors.append(f"{prefix}.rank is missing")
    elif not isinstance(dx["rank"], int):
        errors.append(f"{prefix}.rank must be number")

    # Diagnosis name
    if "diagnosis" not in dx:
        errors.append(f"{prefix}.diagnosis is missing")
    elif not isinstance(dx["diagnosis"], str):
        errors.append(f"{prefix}.diagnosis must be string")

    # Risk level
    if "risk_level" not in dx:
        errors.append(f"{prefix}.risk_level is missing")
    elif dx["risk_level"] not in ["HIGH", "MEDIUM", "LOW"]:
        warnings.append(f"{prefix}.risk_level should be HIGH, MEDIUM, or LOW")

    # Array fields
    for field in ["supporting_evidence", "opposing_evidence", "recommended_actions"]:
        if field not in dx:
            errors.append(f"{prefix}.{field} is missing")
        elif not isinstance(dx[field], list):
            errors.append(f"{prefix}.{field} must be array")

    return len(errors) == 0, errors, warnings


def validate_api_response(response: dict, key: str) -> tuple[bool, list[str], list[str], list[str]]:
    """
    Validate a single API response structure.
    Required: clinical_note, icd10_codes, differential_diagnoses, tasks
    """
    errors = []
    warnings = []
    successes = []
    prefix = f"api_responses.{key}"

    # Clinical note
    if "clinical_note" not in response:
        errors.append(f"{prefix}.clinical_note is missing")
    elif not isinstance(response["clinical_note"], str):
        errors.append(f"{prefix}.clinical_note must be string")
    else:
        successes.append(f"{prefix}.clinical_note is valid")

    # ICD-10 codes
    if "icd10_codes" not in response:
        errors.append(f"{prefix}.icd10_codes is missing")
    elif not isinstance(response["icd10_codes"], list):
        errors.append(f"{prefix}.icd10_codes must be array")
    else:
        for i, code in enumerate(response["icd10_codes"]):
            for field in ["code", "description", "type"]:
                if field not in code:
                    errors.append(f"{prefix}.icd10_codes[{i}].{field} is missing")
        successes.append(f"{prefix}.icd10_codes structure validated")

    # Differential diagnoses
    if "differential_diagnoses" not in response:
        errors.append(f"{prefix}.differential_diagnoses is missing")
    elif not isinstance(response["differential_diagnoses"], list):
        errors.append(f"{prefix}.differential_diagnoses must be array")
    else:
        for i, dx in enumerate(response["differential_diagnoses"]):
            _, dx_errors, dx_warnings = validate_diagnosis(dx, i)
            errors.extend(dx_errors)
            warnings.extend(dx_warnings)
        successes.append(f"{prefix}.differential_diagnoses validated ({len(response['differential_diagnoses'])} items)")

    # Tasks
    if "tasks" not in response:
        errors.append(f"{prefix}.tasks is missing")
    else:
        tasks = response["tasks"]
        for task_type in ["immediate_tasks", "urgent_tasks", "routine_tasks"]:
            if task_type not in tasks:
                errors.append(f"{prefix}.tasks.{task_type} is missing")
            elif not isinstance(tasks[task_type], list):
                errors.append(f"{prefix}.tasks.{task_type} must be array")
            else:
                for i, task in enumerate(tasks[task_type]):
                    _, task_errors = validate_task(task, task_type, i)
                    errors.extend(task_errors)
        successes.append(f"{prefix}.tasks structure validated")

    is_valid = len(errors) == 0
    return is_valid, errors, warnings, successes


def validate_mock_data(file_path: str) -> bool:
    """
    Main validation function for patients-data.json.

    Validates:
    1. JSON syntax
    2. Top-level structure (patient, scenarios, api_responses)
    3. Patient data structure
    4. Each scenario structure
    5. API response structures

    Returns True if valid, False otherwise.
    """

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  Mock Data Validation Report{RESET}")
    print(f"{BOLD}{'='*60}{RESET}\n")

    all_errors = []
    all_warnings = []
    all_successes = []

    # Check if file exists
    if not os.path.exists(file_path):
        print_status("error", f"File not found: {file_path}")
        return False

    # Load and parse JSON
    print(f"{BOLD}1. JSON Parsing{RESET}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print_status("ok", "JSON syntax is valid")
    except json.JSONDecodeError as e:
        print_status("error", f"Invalid JSON: {str(e)}")
        return False
    except Exception as e:
        print_status("error", f"Failed to read file: {str(e)}")
        return False

    # Check top-level structure
    print(f"\n{BOLD}2. Top-Level Structure{RESET}")
    required_keys = ["patient", "scenarios", "api_responses"]
    for key in required_keys:
        if key not in data:
            print_status("error", f"Missing required key: {key}")
            all_errors.append(f"Missing top-level key: {key}")
        else:
            print_status("ok", f"Found required key: {key}")
            all_successes.append(f"Top-level key '{key}' present")

    if all_errors:
        print(f"\n{RED}Validation failed - missing required top-level keys{RESET}")
        return False

    # Validate patient
    print(f"\n{BOLD}3. Patient Data{RESET}")
    patient_valid, patient_errors, patient_warnings, patient_successes = validate_patient(data["patient"])

    for err in patient_errors:
        print_status("error", err)
    for warn in patient_warnings:
        print_status("warn", warn)
    for success in patient_successes[:3]:  # Show first 3 successes
        print_status("ok", success)
    if len(patient_successes) > 3:
        print_status("info", f"...and {len(patient_successes) - 3} more valid fields")

    all_errors.extend(patient_errors)
    all_warnings.extend(patient_warnings)
    all_successes.extend(patient_successes)

    # Validate scenarios
    print(f"\n{BOLD}4. Scenarios{RESET}")
    scenarios = data.get("scenarios", [])

    if not isinstance(scenarios, list):
        print_status("error", "scenarios must be an array")
        all_errors.append("scenarios must be an array")
    elif len(scenarios) == 0:
        print_status("error", "scenarios array is empty (need at least 1)")
        all_errors.append("scenarios array is empty")
    else:
        print_status("ok", f"Found {len(scenarios)} scenario(s)")

        for i, scenario in enumerate(scenarios):
            scenario_valid, scenario_errors, scenario_warnings, scenario_successes = validate_scenario(scenario, i)

            scenario_id = scenario.get("id", f"index_{i}")
            if scenario_errors:
                print_status("error", f"Scenario '{scenario_id}' has {len(scenario_errors)} error(s)")
                for err in scenario_errors[:3]:
                    print_status("error", f"  - {err}")
            else:
                print_status("ok", f"Scenario '{scenario_id}' is valid")

            all_errors.extend(scenario_errors)
            all_warnings.extend(scenario_warnings)
            all_successes.extend(scenario_successes)

    # Validate api_responses
    print(f"\n{BOLD}5. API Responses{RESET}")
    api_responses = data.get("api_responses", {})

    if not isinstance(api_responses, dict):
        print_status("error", "api_responses must be an object")
        all_errors.append("api_responses must be an object")
    elif "default" not in api_responses:
        print_status("error", "api_responses.default is required")
        all_errors.append("api_responses.default is required")
    else:
        print_status("ok", f"Found {len(api_responses)} response(s)")

        for key, response in api_responses.items():
            resp_valid, resp_errors, resp_warnings, resp_successes = validate_api_response(response, key)

            if resp_errors:
                print_status("error", f"Response '{key}' has {len(resp_errors)} error(s)")
                for err in resp_errors[:3]:
                    print_status("error", f"  - {err}")
            else:
                print_status("ok", f"Response '{key}' is valid")

            all_errors.extend(resp_errors)
            all_warnings.extend(resp_warnings)
            all_successes.extend(resp_successes)

    # Summary
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  Summary{RESET}")
    print(f"{BOLD}{'='*60}{RESET}\n")

    print(f"  {GREEN}Valid fields: {len(all_successes)}{RESET}")
    print(f"  {YELLOW}Warnings: {len(all_warnings)}{RESET}")
    print(f"  {RED}Errors: {len(all_errors)}{RESET}")

    if all_errors:
        print(f"\n{RED}{BOLD}VALIDATION FAILED{RESET}")
        print(f"\nTop errors to fix:")
        for err in all_errors[:5]:
            print(f"  - {err}")
        if len(all_errors) > 5:
            print(f"  ...and {len(all_errors) - 5} more")
        return False
    elif all_warnings:
        print(f"\n{YELLOW}{BOLD}VALIDATION PASSED WITH WARNINGS{RESET}")
        return True
    else:
        print(f"\n{GREEN}{BOLD}VALIDATION PASSED{RESET}")
        return True


def main():
    """Main entry point for validation script."""
    # Determine file path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_path = os.path.join(script_dir, "patients-data.json")

    file_path = sys.argv[1] if len(sys.argv) > 1 else default_path

    # Run validation
    is_valid = validate_mock_data(file_path)

    # Exit with appropriate code
    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
