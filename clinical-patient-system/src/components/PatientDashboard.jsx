import { useState, useCallback } from 'react';
import PatientList from './PatientList';
import ClinicalForm from './ClinicalForm';

export default function PatientDashboard({ patients }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [completedPatients, setCompletedPatients] = useState([]);

  const handleSelectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedPatient(null);
  }, []);

  const handleSubmit = useCallback(async (formData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Clinical documentation submitted:', formData);

    // Mark patient as completed
    setCompletedPatients(prev => [...prev, formData.patientId]);

    // Return to patient list
    setSelectedPatient(null);
  }, []);

  // Show clinical form if patient is selected
  if (selectedPatient) {
    return (
      <ClinicalForm
        patientContext={selectedPatient}
        onBack={handleBack}
        onSubmit={handleSubmit}
      />
    );
  }

  // Show patient list
  return (
    <PatientList
      patients={patients}
      completedPatients={completedPatients}
      onSelectPatient={handleSelectPatient}
    />
  );
}
