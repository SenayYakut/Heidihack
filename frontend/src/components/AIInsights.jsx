import { useState } from 'react';

export default function AIInsights({ analysisData }) {
  const [expandedDiagnoses, setExpandedDiagnoses] = useState({});
  const [copiedNote, setCopiedNote] = useState(false);
  const [selectedActions, setSelectedActions] = useState({});

  const toggleDiagnosis = (index) => {
    setExpandedDiagnoses(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleAction = (category, index) => {
    const key = `${category}-${index}`;
    setSelectedActions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const selectAllInCategory = (category, items) => {
    const newSelections = { ...selectedActions };
    items.forEach((_, index) => {
      newSelections[`${category}-${index}`] = true;
    });
    setSelectedActions(newSelections);
  };

  const getRiskBadgeClass = (risk) => {
    switch (risk?.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'IMMEDIATE':
      case 'STAT':
        return 'bg-red-100 text-red-800';
      case 'URGENT':
      case 'TODAY':
        return 'bg-orange-100 text-orange-800';
      case 'ROUTINE':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatClinicalNote = (note) => {
    if (!note) return '';
    return `SUBJECTIVE:\n${note.subjective || 'N/A'}\n\nOBJECTIVE:\n${note.objective || 'N/A'}\n\nASSESSMENT:\n${note.assessment || 'N/A'}\n\nPLAN:\n${note.plan || 'N/A'}`;
  };

  // Loading skeleton
  if (!analysisData) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { clinical_note, icd_codes, differential_diagnoses, recommended_actions } = analysisData;

  return (
    <div className="space-y-6">
      {/* Structured Clinical Note */}
      {clinical_note && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-medical-50 to-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-medical-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Clinical Note</h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(formatClinicalNote(clinical_note))}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500"
                >
                  {copiedNote ? (
                    <>
                      <svg className="h-4 w-4 mr-1.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500">
                  <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Subjective */}
            <div>
              <h4 className="text-sm font-semibold text-medical-700 uppercase tracking-wide mb-2">Subjective</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{clinical_note.subjective || 'No subjective data recorded.'}</p>
            </div>
            {/* Objective */}
            <div>
              <h4 className="text-sm font-semibold text-medical-700 uppercase tracking-wide mb-2">Objective</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{clinical_note.objective || 'No objective data recorded.'}</p>
            </div>
            {/* Assessment */}
            <div>
              <h4 className="text-sm font-semibold text-medical-700 uppercase tracking-wide mb-2">Assessment</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{clinical_note.assessment || 'No assessment recorded.'}</p>
            </div>
            {/* Plan */}
            <div>
              <h4 className="text-sm font-semibold text-medical-700 uppercase tracking-wide mb-2">Plan</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{clinical_note.plan || 'No plan recorded.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ICD-10 Diagnosis Codes */}
      {icd_codes && icd_codes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-medical-50 to-white border-b border-gray-200">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-medical-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Diagnosis Codes</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {icd_codes.map((code, index) => (
                <div
                  key={index}
                  className={`flex items-center p-3 rounded-lg ${
                    index === 0 ? 'bg-medical-50 border border-medical-200' : 'bg-gray-50'
                  }`}
                >
                  {index === 0 && (
                    <span className="badge badge-blue mr-3">Primary</span>
                  )}
                  <span className="font-mono font-semibold text-gray-900 mr-2">
                    {code.code}
                  </span>
                  <span className="text-gray-600">-</span>
                  <span className="ml-2 text-gray-700">{code.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Differential Diagnoses */}
      {differential_diagnoses && differential_diagnoses.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-medical-50 to-white border-b border-gray-200">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-medical-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Differential Diagnoses</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {differential_diagnoses.map((diagnosis, index) => (
              <div key={index} className="p-4">
                <button
                  onClick={() => toggleDiagnosis(index)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-sm font-semibold text-gray-700 mr-3">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{diagnosis.name}</span>
                      <span className={`ml-3 px-2 py-0.5 text-xs font-semibold rounded border ${getRiskBadgeClass(diagnosis.risk)}`}>
                        {diagnosis.risk?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                    <svg
                      className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedDiagnoses[index] ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedDiagnoses[index] && (
                  <div className="mt-4 ml-9 space-y-3 animate-fadeIn">
                    {/* Supporting Factors */}
                    {diagnosis.supporting_factors && diagnosis.supporting_factors.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Supporting Factors</h5>
                        <ul className="space-y-1">
                          {diagnosis.supporting_factors.map((factor, i) => (
                            <li key={i} className="flex items-start text-sm text-gray-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-medical-500 mt-1.5 mr-2 flex-shrink-0"></span>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {diagnosis.recommended_actions && diagnosis.recommended_actions.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommended Actions</h5>
                        <ul className="space-y-1">
                          {diagnosis.recommended_actions.map((action, i) => (
                            <li key={i} className="flex items-start text-sm text-gray-600">
                              <svg className="h-4 w-4 text-medical-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {recommended_actions && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-medical-50 to-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-medical-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Recommended Actions</h3>
              </div>
              <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-medical-600 rounded-md hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500">
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Order Selected
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Immediate Actions */}
            {recommended_actions.immediate && recommended_actions.immediate.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getPriorityBadgeClass('IMMEDIATE')}`}>
                      IMMEDIATE (STAT)
                    </span>
                  </div>
                  <button
                    onClick={() => selectAllInCategory('immediate', recommended_actions.immediate)}
                    className="text-xs text-medical-600 hover:text-medical-800"
                  >
                    Select All
                  </button>
                </div>
                <div className="space-y-2">
                  {recommended_actions.immediate.map((action, index) => (
                    <label key={index} className="flex items-start p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedActions[`immediate-${index}`] || false}
                        onChange={() => toggleAction('immediate', index)}
                        className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-0.5"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">{action.name}</span>
                        {action.category && (
                          <span className="ml-2 text-xs text-gray-500">({action.category})</span>
                        )}
                        {action.details && (
                          <p className="text-xs text-gray-600 mt-1">{action.details}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Urgent Actions */}
            {recommended_actions.urgent && recommended_actions.urgent.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getPriorityBadgeClass('URGENT')}`}>
                      URGENT (Today)
                    </span>
                  </div>
                  <button
                    onClick={() => selectAllInCategory('urgent', recommended_actions.urgent)}
                    className="text-xs text-medical-600 hover:text-medical-800"
                  >
                    Select All
                  </button>
                </div>
                <div className="space-y-2">
                  {recommended_actions.urgent.map((action, index) => (
                    <label key={index} className="flex items-start p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedActions[`urgent-${index}`] || false}
                        onChange={() => toggleAction('urgent', index)}
                        className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mt-0.5"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">{action.name}</span>
                        {action.category && (
                          <span className="ml-2 text-xs text-gray-500">({action.category})</span>
                        )}
                        {action.details && (
                          <p className="text-xs text-gray-600 mt-1">{action.details}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Routine Actions */}
            {recommended_actions.routine && recommended_actions.routine.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getPriorityBadgeClass('ROUTINE')}`}>
                      ROUTINE
                    </span>
                  </div>
                  <button
                    onClick={() => selectAllInCategory('routine', recommended_actions.routine)}
                    className="text-xs text-medical-600 hover:text-medical-800"
                  >
                    Select All
                  </button>
                </div>
                <div className="space-y-2">
                  {recommended_actions.routine.map((action, index) => (
                    <label key={index} className="flex items-start p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedActions[`routine-${index}`] || false}
                        onChange={() => toggleAction('routine', index)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">{action.name}</span>
                        {action.category && (
                          <span className="ml-2 text-xs text-gray-500">({action.category})</span>
                        )}
                        {action.details && (
                          <p className="text-xs text-gray-600 mt-1">{action.details}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Start New Encounter
          </button>
          <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Summary
          </button>
          <button className="inline-flex items-center justify-center px-6 py-2 text-sm font-semibold text-white bg-medical-600 rounded-lg hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Encounter
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!clinical_note && (!icd_codes || icd_codes.length === 0) && (!differential_diagnoses || differential_diagnoses.length === 0) && !recommended_actions && (
        <div className="card p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Analysis Available</h3>
          <p className="mt-2 text-sm text-gray-500">
            Complete the clinical form and generate an analysis to see AI-powered insights here.
          </p>
        </div>
      )}
    </div>
  );
}
