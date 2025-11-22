import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export default function PatientCard() {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/patient');
      setPatient(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch patient data');
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card" aria-busy="true" aria-label="Loading patient information">
        {/* Skeleton Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="h-6 skeleton w-48 mb-2"></div>
              <div className="h-4 skeleton w-64"></div>
            </div>
            <div className="h-6 skeleton w-24 rounded-full"></div>
          </div>
        </div>

        {/* Skeleton Content */}
        <div className="p-6 space-y-6">
          {/* Medical History Skeleton */}
          <div>
            <div className="h-4 skeleton w-32 mb-3"></div>
            <div className="flex gap-2">
              <div className="h-6 skeleton w-20 rounded-full"></div>
              <div className="h-6 skeleton w-24 rounded-full"></div>
            </div>
          </div>

          {/* Medications Skeleton */}
          <div>
            <div className="h-4 skeleton w-36 mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 skeleton w-40"></div>
              <div className="h-4 skeleton w-48"></div>
            </div>
          </div>

          {/* Allergies Skeleton */}
          <div>
            <div className="h-4 skeleton w-24 mb-3"></div>
            <div className="h-6 skeleton w-20 rounded-full"></div>
          </div>

          {/* Vitals Skeleton */}
          <div>
            <div className="h-4 skeleton w-28 mb-3"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="h-3 skeleton w-16 mb-2"></div>
                  <div className="h-6 skeleton w-12"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 border-red-200 bg-red-50">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 font-medium">Error loading patient data</span>
        </div>
        <p className="text-red-600 text-sm mt-2">{error}</p>
        <button
          onClick={fetchPatientData}
          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div className="card fade-in" role="region" aria-labelledby="patient-name">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 id="patient-name" className="text-xl font-semibold text-gray-900">{patient.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              <span aria-label="Age">{patient.age} years old</span>
              <span aria-hidden="true"> • </span>
              <span aria-label="Gender">{patient.gender}</span>
              <span aria-hidden="true"> • </span>
              <span aria-label="Medical Record Number">MRN: {patient.mrn}</span>
            </p>
          </div>
          <span className="badge badge-blue" role="status">
            Active Patient
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Medical History */}
        {patient.medical_history && patient.medical_history.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Medical History
            </h3>
            <div className="flex flex-wrap gap-2">
              {patient.medical_history.map((condition, index) => (
                <span key={index} className="badge badge-blue">
                  {condition}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Current Medications */}
        {patient.medications && patient.medications.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Current Medications
            </h3>
            <ul className="space-y-1">
              {patient.medications.map((medication, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-medical-500 mr-2"></span>
                  {medication}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Allergies */}
        {patient.allergies && patient.allergies.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="h-4 w-4 mr-1.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Allergies
            </h3>
            <div className="flex flex-wrap gap-2">
              {patient.allergies.map((allergy, index) => (
                <span key={index} className="badge badge-orange">
                  {allergy}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Vitals */}
        {patient.vitals && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Recent Vitals
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {patient.vitals.blood_pressure && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Blood Pressure</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{patient.vitals.blood_pressure}</p>
                </div>
              )}
              {patient.vitals.heart_rate && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Heart Rate</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{patient.vitals.heart_rate} <span className="text-sm font-normal">bpm</span></p>
                </div>
              )}
              {patient.vitals.temperature && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Temperature</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{patient.vitals.temperature}°F</p>
                </div>
              )}
              {patient.vitals.respiratory_rate && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Resp. Rate</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{patient.vitals.respiratory_rate} <span className="text-sm font-normal">/min</span></p>
                </div>
              )}
              {patient.vitals.oxygen_saturation && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">SpO2</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{patient.vitals.oxygen_saturation}%</p>
                </div>
              )}
              {patient.vitals.weight && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Weight</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{patient.vitals.weight} <span className="text-sm font-normal">lbs</span></p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
