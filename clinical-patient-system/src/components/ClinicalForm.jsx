import { useState, useEffect } from 'react';

export default function ClinicalForm({ patientContext, onBack, onSubmit }) {
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    vitals: {
      bp: '',
      hr: '',
      temp: '',
      spo2: '',
      rr: ''
    },
    assessment: '',
    plan: '',
    additionalNotes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Pre-fill vitals from patient context
  useEffect(() => {
    if (patientContext?.vitals) {
      setFormData(prev => ({
        ...prev,
        vitals: {
          bp: patientContext.vitals.bp || '',
          hr: String(patientContext.vitals.hr || ''),
          temp: String(patientContext.vitals.temp || ''),
          spo2: String(patientContext.vitals.spo2 || ''),
          rr: String(patientContext.vitals.rr || '')
        }
      }));
    }
  }, [patientContext]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleVitalsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.chiefComplaint.trim()) {
      newErrors.chiefComplaint = 'Chief complaint is required';
    }
    if (!formData.historyOfPresentIllness.trim()) {
      newErrors.historyOfPresentIllness = 'History of present illness is required';
    }
    if (!formData.assessment.trim()) {
      newErrors.assessment = 'Assessment is required';
    }
    if (!formData.plan.trim()) {
      newErrors.plan = 'Plan is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        patientId: patientContext.id,
        ...formData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut for submit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData]);

  return (
    <div className="fade-in">
      {/* Patient Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to patient list"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-gray-900">{patientContext.name}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>{patientContext.age} years old</span>
              <span>{patientContext.gender}</span>
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{patientContext.mrn}</span>
            </div>
          </div>

          {/* Allergies Alert */}
          {patientContext.allergies && patientContext.allergies.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold">Allergies</span>
              </div>
              <p className="mt-1 text-sm text-red-700 font-medium">
                {patientContext.allergies.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Medical History and Medications */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {patientContext.medicalHistory && patientContext.medicalHistory.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Medical History</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {patientContext.medicalHistory.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {patientContext.currentMedications && patientContext.currentMedications.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Medications</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {patientContext.currentMedications.map((med, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-medical-500">•</span>
                    {med}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Clinical Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Chief Complaint */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label htmlFor="chiefComplaint" className="block text-sm font-semibold text-gray-900 mb-2">
            Chief Complaint <span className="text-red-500">*</span>
          </label>
          <textarea
            id="chiefComplaint"
            value={formData.chiefComplaint}
            onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
            placeholder="Patient's primary reason for visit..."
            rows={3}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 ${
              errors.chiefComplaint ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            aria-invalid={!!errors.chiefComplaint}
            aria-describedby={errors.chiefComplaint ? 'chiefComplaint-error' : undefined}
          />
          {errors.chiefComplaint && (
            <p id="chiefComplaint-error" className="mt-1 text-sm text-red-600">
              {errors.chiefComplaint}
            </p>
          )}
        </div>

        {/* Vitals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label htmlFor="bp" className="block text-xs font-medium text-gray-600 mb-1">
                Blood Pressure
              </label>
              <input
                type="text"
                id="bp"
                value={formData.vitals.bp}
                onChange={(e) => handleVitalsChange('bp', e.target.value)}
                placeholder="120/80"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
                aria-label="Blood pressure"
              />
            </div>
            <div>
              <label htmlFor="hr" className="block text-xs font-medium text-gray-600 mb-1">
                Heart Rate
              </label>
              <input
                type="text"
                id="hr"
                value={formData.vitals.hr}
                onChange={(e) => handleVitalsChange('hr', e.target.value)}
                placeholder="72"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
                aria-label="Heart rate"
              />
            </div>
            <div>
              <label htmlFor="temp" className="block text-xs font-medium text-gray-600 mb-1">
                Temperature
              </label>
              <input
                type="text"
                id="temp"
                value={formData.vitals.temp}
                onChange={(e) => handleVitalsChange('temp', e.target.value)}
                placeholder="98.6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
                aria-label="Temperature"
              />
            </div>
            <div>
              <label htmlFor="spo2" className="block text-xs font-medium text-gray-600 mb-1">
                SpO2
              </label>
              <input
                type="text"
                id="spo2"
                value={formData.vitals.spo2}
                onChange={(e) => handleVitalsChange('spo2', e.target.value)}
                placeholder="98"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
                aria-label="Oxygen saturation"
              />
            </div>
            <div>
              <label htmlFor="rr" className="block text-xs font-medium text-gray-600 mb-1">
                Resp Rate
              </label>
              <input
                type="text"
                id="rr"
                value={formData.vitals.rr}
                onChange={(e) => handleVitalsChange('rr', e.target.value)}
                placeholder="16"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
                aria-label="Respiratory rate"
              />
            </div>
          </div>
        </div>

        {/* History of Present Illness */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label htmlFor="hpi" className="block text-sm font-semibold text-gray-900 mb-2">
            History of Present Illness <span className="text-red-500">*</span>
          </label>
          <textarea
            id="hpi"
            value={formData.historyOfPresentIllness}
            onChange={(e) => handleInputChange('historyOfPresentIllness', e.target.value)}
            placeholder="Detailed description of the current illness including onset, duration, severity, associated symptoms..."
            rows={5}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 ${
              errors.historyOfPresentIllness ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            aria-invalid={!!errors.historyOfPresentIllness}
            aria-describedby={errors.historyOfPresentIllness ? 'hpi-error' : undefined}
          />
          {errors.historyOfPresentIllness && (
            <p id="hpi-error" className="mt-1 text-sm text-red-600">
              {errors.historyOfPresentIllness}
            </p>
          )}
        </div>

        {/* Assessment */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label htmlFor="assessment" className="block text-sm font-semibold text-gray-900 mb-2">
            Assessment <span className="text-red-500">*</span>
          </label>
          <textarea
            id="assessment"
            value={formData.assessment}
            onChange={(e) => handleInputChange('assessment', e.target.value)}
            placeholder="Clinical impression, differential diagnoses..."
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 ${
              errors.assessment ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            aria-invalid={!!errors.assessment}
            aria-describedby={errors.assessment ? 'assessment-error' : undefined}
          />
          {errors.assessment && (
            <p id="assessment-error" className="mt-1 text-sm text-red-600">
              {errors.assessment}
            </p>
          )}
        </div>

        {/* Plan */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label htmlFor="plan" className="block text-sm font-semibold text-gray-900 mb-2">
            Plan <span className="text-red-500">*</span>
          </label>
          <textarea
            id="plan"
            value={formData.plan}
            onChange={(e) => handleInputChange('plan', e.target.value)}
            placeholder="Treatment plan, medications, follow-up instructions..."
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 ${
              errors.plan ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            aria-invalid={!!errors.plan}
            aria-describedby={errors.plan ? 'plan-error' : undefined}
          />
          {errors.plan && (
            <p id="plan-error" className="mt-1 text-sm text-red-600">
              {errors.plan}
            </p>
          )}
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 mb-2">
            Additional Notes
          </label>
          <textarea
            id="notes"
            value={formData.additionalNotes}
            onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
            placeholder="Any additional observations or notes..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-medical-600 text-white rounded-lg hover:bg-medical-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                Complete Documentation
                <span className="text-xs opacity-75">(Ctrl+Enter)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
