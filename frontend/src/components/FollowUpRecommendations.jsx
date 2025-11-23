import { useState } from 'react';
import { formatAppointmentDate, formatAppointmentTime } from '../utils/dateHelpers';

export default function FollowUpRecommendations({ recommendations = [], onAddToCalendar, patientContext }) {
  const [expandedId, setExpandedId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [selectedDates, setSelectedDates] = useState({});

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-red-50 border-red-200',
          badge: 'bg-red-100 text-red-800',
          icon: 'text-red-500'
        };
      case 'routine':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800',
          icon: 'text-yellow-500'
        };
      case 'optional':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          badge: 'bg-blue-100 text-blue-800',
          icon: 'text-blue-500'
        };
    }
  };

  const handleDateSelect = (recId, date) => {
    setSelectedDates(prev => ({
      ...prev,
      [recId]: date
    }));
  };

  const handleAddToCalendar = async (recommendation) => {
    const selectedDate = selectedDates[recommendation.id] || recommendation.suggestedDates[0];

    const appointmentData = {
      patientId: patientContext?.id,
      patientName: patientContext?.name,
      date: selectedDate,
      duration: recommendation.duration || 30,
      type: 'follow-up',
      notes: recommendation.reason,
      isFollowUp: true,
      status: 'scheduled'
    };

    try {
      await onAddToCalendar(appointmentData);
      setAddedIds(prev => new Set([...prev, recommendation.id]));
    } catch (error) {
      console.error('Error adding to calendar:', error);
    }
  };

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">Follow-Up Recommendations</h3>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const styles = getPriorityStyles(rec.priority);
          const isExpanded = expandedId === rec.id;
          const isAdded = addedIds.has(rec.id);
          const selectedDate = selectedDates[rec.id] || rec.suggestedDates?.[0];

          return (
            <div
              key={rec.id || index}
              className={`border rounded-lg overflow-hidden transition-all ${styles.bg} ${
                isAdded ? 'opacity-75' : ''
              }`}
            >
              {/* Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles.badge}`}>
                        {rec.priority.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        {rec.timeframe}
                      </span>
                      {isAdded && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Added
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{rec.reason}</p>
                    {rec.duration && (
                      <p className="text-sm text-gray-600 mt-1">
                        Duration: {rec.duration} minutes
                      </p>
                    )}
                  </div>
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <svg
                      className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-200 bg-white/50">
                  {/* Notes */}
                  {rec.notes && (
                    <p className="text-sm text-gray-600 mt-3 mb-4">{rec.notes}</p>
                  )}

                  {/* Suggested Dates */}
                  {rec.suggestedDates && rec.suggestedDates.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Suggested Dates:</p>
                      <div className="flex flex-wrap gap-2">
                        {rec.suggestedDates.map((date, dateIndex) => {
                          const dateObj = new Date(date);
                          const isSelected = selectedDate && new Date(selectedDate).getTime() === dateObj.getTime();

                          return (
                            <button
                              key={dateIndex}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDateSelect(rec.id, date);
                              }}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                              }`}
                            >
                              <span className="font-medium">{formatAppointmentDate(dateObj)}</span>
                              <span className="ml-1 opacity-75">{formatAppointmentTime(dateObj)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add to Calendar Button */}
                  {!isAdded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCalendar(rec);
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add to Calendar
                    </button>
                  )}

                  {isAdded && (
                    <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Added to calendar</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
