import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'clinical_form_draft';
const DRAFT_CHECK_KEY = 'clinical_form_draft_timestamp';

const initialFormState = {
  chief_complaint: '',
  hpi: {
    location: [],
    radiation: [],
    quality: [],
    quality_other: '',
    duration: '',
    severity: 5,
    timing: '',
    aggravating_factors: [],
    relieving_factors: []
  },
  associated_symptoms: [],
  physical_exam: {
    general: [],
    vitals: {
      bp: '',
      hr: '',
      temp: '',
      spo2: '',
      rr: ''
    },
    cardiovascular: [],
    respiratory: []
  },
  doctor_notes: ''
};

export default function ClinicalForm({ patientContext, onSubmit, resetTrigger }) {
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPhysicalExam, setShowPhysicalExam] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState(null);

  // Refs for focus management
  const chiefComplaintRef = useRef(null);
  const firstErrorRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Load from localStorage on mount and check for drafts
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(DRAFT_CHECK_KEY);

    if (saved && timestamp) {
      try {
        const parsed = JSON.parse(saved);
        const savedTime = new Date(parseInt(timestamp));

        // Show recovery dialog if draft exists
        if (parsed.chief_complaint || parsed.doctor_notes || parsed.hpi.location.length > 0) {
          setDraftTimestamp(savedTime);
          setShowDraftRecovery(true);
        }
      } catch (e) {
        console.error('Failed to parse saved form data:', e);
      }
    }
  }, []);

  // Keyboard shortcut for form submission (Cmd/Ctrl + Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('clinical-form');
        if (form) {
          form.requestSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle draft recovery
  const handleRecoverDraft = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
        setLastSaved(draftTimestamp);
      } catch (e) {
        console.error('Failed to parse saved form data:', e);
      }
    }
    setShowDraftRecovery(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DRAFT_CHECK_KEY);
    setShowDraftRecovery(false);
  };

  // Prefill vitals from patient context
  useEffect(() => {
    if (patientContext?.vitals) {
      setFormData(prev => ({
        ...prev,
        physical_exam: {
          ...prev.physical_exam,
          vitals: {
            bp: patientContext.vitals.blood_pressure || prev.physical_exam.vitals.bp,
            hr: patientContext.vitals.heart_rate || prev.physical_exam.vitals.hr,
            temp: patientContext.vitals.temperature || prev.physical_exam.vitals.temp,
            spo2: patientContext.vitals.oxygen_saturation || prev.physical_exam.vitals.spo2,
            rr: patientContext.vitals.respiratory_rate || prev.physical_exam.vitals.rr
          }
        }
      }));
    }
  }, [patientContext]);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      localStorage.setItem(DRAFT_CHECK_KEY, now.toString());
      setLastSaved(new Date(now));
    }, 30000);

    return () => clearInterval(interval);
  }, [formData]);

  // Save immediately when form data changes (debounced by the interval)
  useEffect(() => {
    // Save to localStorage on any change with timestamp
    const timeoutId = setTimeout(() => {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      localStorage.setItem(DRAFT_CHECK_KEY, now.toString());
    }, 2000); // Debounce 2 seconds

    return () => clearTimeout(timeoutId);
  }, [formData]);

  // Reset form when resetTrigger changes
  useEffect(() => {
    if (resetTrigger > 0) {
      // Create a deep copy of initialFormState to ensure React detects the change
      setFormData({
        chief_complaint: '',
        hpi: {
          location: [],
          radiation: [],
          quality: [],
          quality_other: '',
          duration: '',
          severity: 5,
          timing: '',
          aggravating_factors: [],
          relieving_factors: []
        },
        associated_symptoms: [],
        physical_exam: {
          general: [],
          vitals: {
            bp: '',
            hr: '',
            temp: '',
            spo2: '',
            rr: ''
          },
          cardiovascular: [],
          respiratory: []
        },
        doctor_notes: ''
      });
      setErrors({});
      setTouched({});
      setShowClearConfirm(false);
      setShowDraftRecovery(false);
      setLastSaved(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DRAFT_CHECK_KEY);

      // Focus on chief complaint field after clearing
      setTimeout(() => {
        if (chiefComplaintRef.current) {
          chiefComplaintRef.current.focus();
        }
      }, 100);
    }
  }, [resetTrigger]);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.chief_complaint.trim()) {
      newErrors.chief_complaint = 'Chief complaint is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.chief_complaint]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ chief_complaint: true });

    if (!validate()) {
      // Focus on first error field
      if (chiefComplaintRef.current) {
        chiefComplaintRef.current.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit?.(formData);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DRAFT_CHECK_KEY);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    // Create a deep copy of initialFormState to ensure React detects the change
    setFormData({
      chief_complaint: '',
      hpi: {
        location: [],
        radiation: [],
        quality: [],
        quality_other: '',
        duration: '',
        severity: 5,
        timing: '',
        aggravating_factors: [],
        relieving_factors: []
      },
      associated_symptoms: [],
      physical_exam: {
        general: [],
        vitals: {
          bp: '',
          hr: '',
          temp: '',
          spo2: '',
          rr: ''
        },
        cardiovascular: [],
        respiratory: []
      },
      doctor_notes: ''
    });
    setErrors({});
    setTouched({});
    setShowClearConfirm(false);
    setLastSaved(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DRAFT_CHECK_KEY);

    // Focus on chief complaint field after clearing
    setTimeout(() => {
      if (chiefComplaintRef.current) {
        chiefComplaintRef.current.focus();
      }
    }, 100);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateHPI = (field, value) => {
    setFormData(prev => ({
      ...prev,
      hpi: { ...prev.hpi, [field]: value }
    }));
  };

  const updatePhysicalExam = (section, value) => {
    setFormData(prev => ({
      ...prev,
      physical_exam: { ...prev.physical_exam, [section]: value }
    }));
  };

  const updateVitals = (field, value) => {
    setFormData(prev => ({
      ...prev,
      physical_exam: {
        ...prev.physical_exam,
        vitals: { ...prev.physical_exam.vitals, [field]: value }
      }
    }));
  };

  const toggleArrayItem = (array, item) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const isFormValid = formData.chief_complaint.trim().length > 0;

  const CheckboxGroup = ({ label, options, selected, onChange, columns = 2 }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className={`grid grid-cols-1 sm:grid-cols-${columns} gap-2`}>
        {options.map(option => (
          <label key={option} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onChange(toggleArrayItem(selected, option))}
              className="h-4 w-4 text-medical-600 border-gray-300 rounded focus:ring-medical-500"
            />
            <span className="text-sm text-gray-600">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Draft Recovery Dialog */}
      {showDraftRecovery && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="draft-recovery-title"
        >
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl modal-content">
            <h4 id="draft-recovery-title" className="text-lg font-semibold text-gray-900 mb-2">
              Recover Draft?
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              You have an unsaved draft from {draftTimestamp?.toLocaleString()}. Would you like to recover it?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleRecoverDraft}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                autoFocus
              >
                Recover
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        id="clinical-form"
        onSubmit={handleSubmit}
        className="space-y-6"
        aria-label="Clinical documentation form"
        noValidate
      >
        {/* Chief Complaint */}
        <div className="card p-6 fade-in">
          <div className="flex items-center mb-4">
            <svg className="h-5 w-5 text-medical-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h3 id="chief-complaint-label" className="text-lg font-semibold text-gray-900">Chief Complaint</h3>
            <span className="ml-2 text-red-500" aria-hidden="true">*</span>
            {formData.chief_complaint.trim() && (
              <svg className="h-5 w-5 text-green-500 ml-auto checkmark-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <input
            ref={chiefComplaintRef}
            type="text"
            id="chief-complaint"
            value={formData.chief_complaint}
            onChange={(e) => updateField('chief_complaint', e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, chief_complaint: true }))}
            placeholder="e.g., Chest pain, Shortness of breath, Headache"
            aria-labelledby="chief-complaint-label"
            aria-required="true"
            aria-invalid={touched.chief_complaint && !!errors.chief_complaint}
            aria-describedby={touched.chief_complaint && errors.chief_complaint ? "chief-complaint-error" : undefined}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 ${
              touched.chief_complaint && errors.chief_complaint
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {touched.chief_complaint && errors.chief_complaint && (
            <p id="chief-complaint-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.chief_complaint}
            </p>
          )}
        </div>

      {/* History of Present Illness */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <svg className="h-5 w-5 text-medical-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">History of Present Illness</h3>
          {formData.hpi.location.length > 0 && (
            <svg className="h-5 w-5 text-green-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <div className="space-y-6">
          {/* Location */}
          <CheckboxGroup
            label="Location"
            options={['Chest (center)', 'Chest (left)', 'Chest (right)', 'Abdomen', 'Other']}
            selected={formData.hpi.location}
            onChange={(value) => updateHPI('location', value)}
          />

          {/* Radiation */}
          <CheckboxGroup
            label="Radiation"
            options={['Left arm', 'Right arm', 'Jaw', 'Back', 'No radiation']}
            selected={formData.hpi.radiation}
            onChange={(value) => updateHPI('radiation', value)}
          />

          {/* Quality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['Sharp', 'Dull', 'Pressure', 'Burning', 'Aching'].map(option => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hpi.quality.includes(option)}
                    onChange={() => updateHPI('quality', toggleArrayItem(formData.hpi.quality, option))}
                    className="h-4 w-4 text-medical-600 border-gray-300 rounded focus:ring-medical-500"
                  />
                  <span className="text-sm text-gray-600">{option}</span>
                </label>
              ))}
              <label className="flex items-center space-x-2 cursor-pointer col-span-2 sm:col-span-3">
                <input
                  type="checkbox"
                  checked={formData.hpi.quality.includes('Other')}
                  onChange={() => updateHPI('quality', toggleArrayItem(formData.hpi.quality, 'Other'))}
                  className="h-4 w-4 text-medical-600 border-gray-300 rounded focus:ring-medical-500"
                />
                <span className="text-sm text-gray-600">Other:</span>
                <input
                  type="text"
                  value={formData.hpi.quality_other}
                  onChange={(e) => updateHPI('quality_other', e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-medical-500 focus:border-medical-500"
                  placeholder="Specify..."
                />
              </label>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <select
              value={formData.hpi.duration}
              onChange={(e) => updateHPI('duration', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
            >
              <option value="">Select duration...</option>
              <option value="<1 hour">&lt;1 hour</option>
              <option value="1-6 hours">1-6 hours</option>
              <option value="6-24 hours">6-24 hours</option>
              <option value="1-3 days">1-3 days</option>
              <option value="3-7 days">3-7 days</option>
              <option value=">1 week">&gt;1 week</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity: <span className="font-bold text-medical-600">{formData.hpi.severity}/10</span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="1"
                max="10"
                value={formData.hpi.severity}
                onChange={(e) => updateHPI('severity', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Mild (1)</span>
                <span>Moderate (5)</span>
                <span>Severe (10)</span>
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500" style={{
              clipPath: `inset(0 ${100 - (formData.hpi.severity * 10)}% 0 0)`
            }}></div>
          </div>

          {/* Timing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timing</label>
            <div className="flex space-x-6">
              {['Constant', 'Intermittent'].map(option => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="timing"
                    value={option}
                    checked={formData.hpi.timing === option}
                    onChange={(e) => updateHPI('timing', e.target.value)}
                    className="h-4 w-4 text-medical-600 border-gray-300 focus:ring-medical-500"
                  />
                  <span className="text-sm text-gray-600">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Aggravating Factors */}
          <CheckboxGroup
            label="Aggravating Factors"
            options={['Physical activity', 'Deep breathing', 'Eating', 'Stress']}
            selected={formData.hpi.aggravating_factors}
            onChange={(value) => updateHPI('aggravating_factors', value)}
          />

          {/* Relieving Factors */}
          <CheckboxGroup
            label="Relieving Factors"
            options={['Rest', 'Medication', 'Position change', 'Nothing helps']}
            selected={formData.hpi.relieving_factors}
            onChange={(value) => updateHPI('relieving_factors', value)}
          />
        </div>
      </div>

      {/* Associated Symptoms */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <svg className="h-5 w-5 text-medical-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Associated Symptoms</h3>
          {formData.associated_symptoms.length > 0 && (
            <svg className="h-5 w-5 text-green-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            'Shortness of breath', 'Nausea/Vomiting', 'Diaphoresis', 'Dizziness',
            'Palpitations', 'Syncope', 'Fatigue', 'Fever', 'Cough', 'Headache'
          ].map(symptom => (
            <label key={symptom} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.associated_symptoms.includes(symptom)}
                onChange={() => updateField('associated_symptoms', toggleArrayItem(formData.associated_symptoms, symptom))}
                className="h-4 w-4 text-medical-600 border-gray-300 rounded focus:ring-medical-500"
              />
              <span className="text-sm text-gray-600">{symptom}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Physical Examination (Collapsible) */}
      <div className="card">
        <button
          type="button"
          onClick={() => setShowPhysicalExam(!showPhysicalExam)}
          className="w-full p-6 flex items-center justify-between text-left"
        >
          <div className="flex items-center">
            <svg className="h-5 w-5 text-medical-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Physical Examination</h3>
            <span className="ml-2 text-sm text-gray-500">(Optional)</span>
          </div>
          <svg
            className={`h-5 w-5 text-gray-400 transform transition-transform ${showPhysicalExam ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showPhysicalExam && (
          <div className="px-6 pb-6 space-y-6 border-t border-gray-200 pt-6">
            {/* General Appearance */}
            <CheckboxGroup
              label="General Appearance"
              options={['Alert and oriented', 'In distress']}
              selected={formData.physical_exam.general}
              onChange={(value) => updatePhysicalExam('general', value)}
              columns={2}
            />

            {/* Vital Signs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Vital Signs</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={formData.physical_exam.vitals.bp}
                    onChange={(e) => updateVitals('bp', e.target.value)}
                    placeholder="120/80"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-medical-500 focus:border-medical-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">HR (bpm)</label>
                  <input
                    type="number"
                    value={formData.physical_exam.vitals.hr}
                    onChange={(e) => updateVitals('hr', e.target.value)}
                    placeholder="72"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-medical-500 focus:border-medical-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Temp (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.physical_exam.vitals.temp}
                    onChange={(e) => updateVitals('temp', e.target.value)}
                    placeholder="98.6"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-medical-500 focus:border-medical-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={formData.physical_exam.vitals.spo2}
                    onChange={(e) => updateVitals('spo2', e.target.value)}
                    placeholder="98"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-medical-500 focus:border-medical-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">RR (/min)</label>
                  <input
                    type="number"
                    value={formData.physical_exam.vitals.rr}
                    onChange={(e) => updateVitals('rr', e.target.value)}
                    placeholder="16"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-medical-500 focus:border-medical-500"
                  />
                </div>
              </div>
            </div>

            {/* Cardiovascular */}
            <CheckboxGroup
              label="Cardiovascular"
              options={['Regular rate/rhythm', 'Murmur', 'S3/S4', 'Peripheral edema']}
              selected={formData.physical_exam.cardiovascular}
              onChange={(value) => updatePhysicalExam('cardiovascular', value)}
            />

            {/* Respiratory */}
            <CheckboxGroup
              label="Respiratory"
              options={['Clear to auscultation', 'Wheezing', 'Crackles', 'Decreased breath sounds']}
              selected={formData.physical_exam.respiratory}
              onChange={(value) => updatePhysicalExam('respiratory', value)}
            />
          </div>
        )}
      </div>

      {/* Doctor's Clinical Notes */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <svg className="h-5 w-5 text-medical-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Doctor's Clinical Notes</h3>
          {formData.doctor_notes.trim() && (
            <svg className="h-5 w-5 text-green-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <textarea
          value={formData.doctor_notes}
          onChange={(e) => updateField('doctor_notes', e.target.value)}
          rows={8}
          placeholder="Enter your clinical observations, reasoning, differential considerations, and additional context..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 resize-y"
        />
        <p className="mt-2 text-xs text-gray-500">
          Recommended: Include differential diagnosis, clinical reasoning, and any additional observations.
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500"
          >
            Clear Form
          </button>
          {lastSaved && (
            <span className="text-xs text-gray-500">
              Auto-saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={`w-full sm:w-auto px-8 py-3 text-base font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 transition-colors ${
            isFormValid && !isSubmitting
              ? 'bg-medical-600 text-white hover:bg-medical-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Analysis...
            </span>
          ) : (
            'Generate AI Analysis'
          )}
        </button>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Clear Form?</h4>
            <p className="text-sm text-gray-600 mb-4">
              This will remove all entered data and cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
      </form>
    </>
  );
}
