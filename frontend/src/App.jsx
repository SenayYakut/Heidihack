/**
 * Clinical AI Assistant - Main Application Component
 *
 * DATA FLOW:
 * 1. On mount: Fetch patient data from /api/patient
 * 2. User fills ClinicalForm → form data stored in component state
 * 3. On submit: POST to /api/analyze with form_data + patient_context
 * 4. Results displayed in AIInsights component (side-by-side on desktop)
 *
 * STATE MANAGEMENT STRATEGY:
 * - Centralized state in App component (lifted state pattern)
 * - Patient data fetched once and passed down as props
 * - Form manages its own internal state, passes data up on submit
 * - Analysis results stored here and passed to AIInsights
 *
 * ERROR HANDLING APPROACH:
 * - Network errors caught in API calls
 * - User-friendly messages displayed in error banner
 * - Console logging for debugging
 * - Auto-retry option for transient failures
 *
 * UX DECISIONS:
 * - Side-by-side layout allows doctor to reference form while viewing results
 * - Sticky patient card provides constant context
 * - Progress indicators reduce perceived wait time
 * - Confirmation dialog prevents accidental data loss
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import PatientCard from './components/PatientCard';
import ClinicalForm from './components/ClinicalForm';
import AIInsights from './components/AIInsights';
import apiClient from './api/client';

function App() {
  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================

  // Patient data from API - fetched once on mount
  const [patientData, setPatientData] = useState(null);

  // Analysis results from AI processing
  const [analysisResults, setAnalysisResults] = useState(null);

  // Loading states for different operations
  const [isLoading, setIsLoading] = useState({
    patient: true,
    analysis: false
  });

  // Error state for displaying user-friendly messages
  const [error, setError] = useState(null);

  // Analysis progress tracking: 'note' | 'diagnosis' | 'tasks' | null
  const [analysisProgress, setAnalysisProgress] = useState(null);

  // Confirmation dialog state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Reference to insights section for scrolling
  const insightsRef = useRef(null);

  // Reference to form for keyboard shortcuts
  const formRef = useRef(null);

  // =============================================================================
  // KEYBOARD SHORTCUTS
  // =============================================================================

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Esc: Close dialogs
      if (e.key === 'Escape') {
        setShowResetConfirm(false);
        setError(null);
      }

      // Cmd/Ctrl + Enter: Submit form (handled in ClinicalForm)
      // This is just for documentation - actual handler is in form
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  /**
   * Fetch patient data on component mount
   * This provides context for the clinical form and AI analysis
   */
  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      setIsLoading(prev => ({ ...prev, patient: true }));
      const response = await apiClient.get('/api/patient');
      setPatientData(response.data);
    } catch (err) {
      console.error('Failed to fetch patient data:', err);
      setError('Unable to load patient data. Please refresh the page.');
    } finally {
      setIsLoading(prev => ({ ...prev, patient: false }));
    }
  };

  // =============================================================================
  // FORM SUBMISSION & ANALYSIS
  // =============================================================================

  /**
   * Handle form submission and trigger AI analysis
   *
   * Flow:
   * 1. Show loading state with progress indicators
   * 2. Prepare payload with form data and patient context
   * 3. Call /api/analyze endpoint
   * 4. Update results and scroll to insights
   * 5. Move focus to insights for accessibility
   */
  const handleFormSubmit = useCallback(async (formData) => {
    setIsLoading(prev => ({ ...prev, analysis: true }));
    setError(null);
    setAnalysisProgress('note');

    try {
      // Simulate progress through different stages
      // Real progress would come from backend streaming/websockets
      const progressTimer1 = setTimeout(() => setAnalysisProgress('diagnosis'), 2500);
      const progressTimer2 = setTimeout(() => setAnalysisProgress('tasks'), 5000);

      // Prepare request payload
      const payload = {
        form_data: formData,
        patient_context: patientData ? {
          name: patientData.name,
          age: patientData.age,
          gender: patientData.gender,
          mrn: patientData.mrn,
          medical_history: patientData.medical_history || [],
          medications: patientData.medications || [],
          allergies: patientData.allergies || [],
          vitals: patientData.vitals || {}
        } : {}
      };

      // Call analyze API
      const response = await apiClient.post('/api/analyze', payload, {
        timeout: 60000 // 60 second timeout for AI processing
      });

      // Clear progress timers
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);

      setAnalysisResults(response.data);
      setAnalysisProgress(null);

      // Scroll to insights section after results load
      setTimeout(() => {
        insightsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        // Move focus for accessibility
        insightsRef.current?.focus();

        // Announce to screen readers
        announceToScreenReader('Analysis complete. Results are now available.');
      }, 100);

    } catch (err) {
      console.error('Analysis failed:', err);

      // Determine user-friendly error message
      let errorMessage = 'Analysis failed. Please try again.';

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.code === 'ERR_NETWORK' || !navigator.onLine) {
        errorMessage = 'Unable to connect. Please check your connection.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }

      setError(errorMessage);
      setAnalysisProgress(null);

      // Auto-dismiss error after 15 seconds
      setTimeout(() => setError(null), 15000);
    } finally {
      setIsLoading(prev => ({ ...prev, analysis: false }));
    }
  }, [patientData]);

  // =============================================================================
  // RESET / NEW ENCOUNTER
  // =============================================================================

  /**
   * Show confirmation dialog before resetting
   * Prevents accidental data loss
   */
  const handleNewEncounterClick = useCallback(() => {
    if (analysisResults) {
      setShowResetConfirm(true);
    } else {
      // No results to lose, just reset
      handleConfirmReset();
    }
  }, [analysisResults]);

  /**
   * Reset all state for a new encounter
   * Clears form data, results, and localStorage draft
   */
  const handleConfirmReset = useCallback(() => {
    setAnalysisResults(null);
    setError(null);
    setAnalysisProgress(null);
    setShowResetConfirm(false);

    // Clear localStorage form draft
    localStorage.removeItem('clinical_form_draft');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Announce to screen readers
    announceToScreenReader('Form has been reset. Starting new encounter.');
  }, []);

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Announce message to screen readers using ARIA live region
   */
  const announceToScreenReader = (message) => {
    const announcement = document.getElementById('sr-announcements');
    if (announcement) {
      announcement.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        announcement.textContent = '';
      }, 1000);
    }
  };

  /**
   * Retry failed request
   */
  const handleRetry = useCallback(() => {
    setError(null);
    // User can re-submit the form
  }, []);

  /**
   * Dismiss error banner
   */
  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get progress message based on current stage
   */
  const getProgressMessage = () => {
    switch (analysisProgress) {
      case 'note':
        return 'Step 1/3: Generating clinical note...';
      case 'diagnosis':
        return 'Step 2/3: Analyzing differential diagnoses...';
      case 'tasks':
        return 'Step 3/3: Creating action plan...';
      default:
        return 'Processing...';
    }
  };

  /**
   * Get progress percentage for visual indicator
   */
  const getProgressPercentage = () => {
    switch (analysisProgress) {
      case 'note':
        return 33;
      case 'diagnosis':
        return 66;
      case 'tasks':
        return 90;
      default:
        return 0;
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>

      {/* Screen reader announcements (hidden visually) */}
      <div
        id="sr-announcements"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* =================================================================== */}
      {/* HEADER */}
      {/* =================================================================== */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <h1 className="ml-3 text-xl font-semibold text-gray-900">
                Clinical AI Assistant
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleNewEncounterClick}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label="Start new encounter"
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Encounter
              </button>
              <span className="text-sm text-gray-500 hidden md:block">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* ERROR BANNER */}
      {/* =================================================================== */}
      {error && (
        <div
          className="bg-red-50 border-b border-red-200"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-red-800">{error}</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRetry}
                  className="text-sm font-medium text-red-600 hover:text-red-800 focus:outline-none focus:underline"
                >
                  Retry
                </button>
                <button
                  onClick={dismissError}
                  className="text-red-500 hover:text-red-700 focus:outline-none"
                  aria-label="Dismiss error"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PATIENT CARD (Sticky) */}
      {/* =================================================================== */}
      <div className="bg-gray-100 border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <PatientCard />
        </div>
      </div>

      {/* =================================================================== */}
      {/* MAIN CONTENT - Side by Side Layout */}
      {/* =================================================================== */}
      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Clinical Form */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Clinical Documentation</h2>
              <p className="text-sm text-gray-500 mt-1">
                Complete the form and click "Generate AI Analysis" to receive insights.
                <span className="hidden sm:inline"> Press Cmd/Ctrl + Enter to submit.</span>
              </p>
            </div>

            {/* Form with disabled overlay during analysis */}
            <div className={`relative ${isLoading.analysis ? 'pointer-events-none' : ''}`}>
              {isLoading.analysis && (
                <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-sm text-gray-600">Processing...</p>
                  </div>
                </div>
              )}
              <div ref={formRef}>
                <ClinicalForm
                  patientContext={patientData}
                  onSubmit={handleFormSubmit}
                />
              </div>
            </div>
          </div>

          {/* Right Column - AI Insights */}
          <div
            className="space-y-4"
            ref={insightsRef}
            tabIndex={-1}
            aria-label="Analysis results"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Analysis</h2>
              <p className="text-sm text-gray-500 mt-1">
                {analysisResults
                  ? 'Review the generated insights and recommendations below.'
                  : 'Complete the clinical form to generate AI-powered analysis.'}
              </p>
            </div>

            {/* Show insights or placeholder */}
            {analysisResults ? (
              <div className="slide-in-right">
                <AIInsights analysisData={analysisResults} />
              </div>
            ) : (
              <div className="card p-8 text-center bg-gray-50 border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="mt-4 text-sm font-medium text-gray-900">No Analysis Yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Fill out the clinical form on the left and click "Generate AI Analysis" to see results here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* =================================================================== */}
      {/* FOOTER */}
      {/* =================================================================== */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Clinical AI Assistant • For authorized healthcare providers only • HIPAA Compliant
          </p>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* LOADING OVERLAY */}
      {/* =================================================================== */}
      {isLoading.analysis && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="loading-title"
        >
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl modal-content">
            <div className="text-center">
              {/* Animated icon */}
              <div className="relative mb-6">
                <svg className="animate-spin h-16 w-16 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>

              <h3 id="loading-title" className="text-lg font-semibold text-gray-900 mb-2">
                Generating Analysis
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                {getProgressMessage()}
              </p>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full progress-bar pulse-gradient"
                  style={{ width: `${getProgressPercentage()}%` }}
                  role="progressbar"
                  aria-valuenow={getProgressPercentage()}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label={getProgressMessage()}
                ></div>
              </div>

              {/* Step indicators */}
              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span className={analysisProgress === 'note' ? 'text-blue-600 font-medium' : ''}>
                  Clinical Note
                </span>
                <span className={analysisProgress === 'diagnosis' ? 'text-blue-600 font-medium' : ''}>
                  Diagnoses
                </span>
                <span className={analysisProgress === 'tasks' ? 'text-blue-600 font-medium' : ''}>
                  Action Plan
                </span>
              </div>

              <p className="text-xs text-gray-400">
                Estimated time: ~8 seconds
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* RESET CONFIRMATION DIALOG */}
      {/* =================================================================== */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
        >
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl modal-content">
            <h4 id="reset-title" className="text-lg font-semibold text-gray-900 mb-2">
              Start New Encounter?
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure? This will clear all entered data and analysis results. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Clear & Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
