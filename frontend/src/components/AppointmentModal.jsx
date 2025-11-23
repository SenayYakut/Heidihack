import { useState, useEffect } from 'react';
import {
  formatAppointmentTime,
  formatFullDate,
  getTimeSlots,
  getDurationOptions,
  getAppointmentTypes
} from '../utils/dateHelpers';

export default function AppointmentModal({
  isOpen,
  onClose,
  selectedDate,
  appointments = [],
  onAddAppointment,
  mode = 'view',
  patients = [],
  prefillData = null
}) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    date: '',
    time: '09:00',
    duration: 30,
    type: 'follow-up',
    notes: '',
    isFollowUp: false
  });

  // Reset form when modal opens or prefillData changes
  useEffect(() => {
    if (isOpen) {
      setCurrentMode(mode);
      if (prefillData) {
        const prefillDate = new Date(prefillData.date);
        setFormData({
          patientId: prefillData.patientId || '',
          patientName: prefillData.patientName || '',
          date: prefillDate.toISOString().split('T')[0],
          time: prefillDate.toTimeString().slice(0, 5),
          duration: prefillData.duration || 30,
          type: prefillData.type || 'follow-up',
          notes: prefillData.notes || '',
          isFollowUp: prefillData.isFollowUp || true
        });
      } else if (selectedDate) {
        setFormData(prev => ({
          ...prev,
          date: selectedDate.toISOString().split('T')[0],
          patientId: '',
          patientName: '',
          notes: '',
          isFollowUp: false
        }));
      }
    }
  }, [isOpen, selectedDate, prefillData, mode]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePatientSelect = (e) => {
    const patientId = e.target.value;
    const patient = patients.find(p => p.id.toString() === patientId);
    setFormData(prev => ({
      ...prev,
      patientId,
      patientName: patient ? patient.name : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Combine date and time
      const appointmentDate = new Date(`${formData.date}T${formData.time}`);

      const appointmentData = {
        patientId: formData.patientId,
        patientName: formData.patientName,
        date: appointmentDate.toISOString(),
        duration: formData.duration,
        type: formData.type,
        notes: formData.notes,
        isFollowUp: formData.isFollowUp,
        status: 'scheduled'
      };

      await onAddAppointment(appointmentData);
      onClose();
    } catch (error) {
      console.error('Error adding appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      pending: 'bg-orange-100 text-orange-800'
    };
    return styles[status] || styles.scheduled;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
              {currentMode === 'view' ? (
                <>Appointments for {selectedDate && formatFullDate(selectedDate)}</>
              ) : (
                <>Add New Appointment</>
              )}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentMode === 'view' ? (
            /* View Mode - List appointments */
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-4 text-sm text-gray-500">No appointments scheduled for this date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt, index) => (
                    <div
                      key={apt.id || index}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{apt.patientName}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatAppointmentTime(apt.date)} ({apt.duration} min)
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(apt.status)}`}>
                          {apt.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          apt.isFollowUp ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {apt.type}
                        </span>
                      </div>
                      {apt.notes && (
                        <p className="mt-2 text-xs text-gray-500">{apt.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setCurrentMode('add')}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Appointment
              </button>
            </div>
          ) : (
            /* Add Mode - Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Patient Selection */}
              <div>
                <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-1">
                  Patient <span className="text-red-500">*</span>
                </label>
                {patients.length > 0 ? (
                  <select
                    id="patient"
                    value={formData.patientId}
                    onChange={handlePatientSelect}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a patient</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} ({patient.mrn})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    id="patient"
                    value={formData.patientName}
                    onChange={(e) => handleInputChange('patientName', e.target.value)}
                    required
                    placeholder="Patient name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {getTimeSlots().map(slot => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Duration and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <select
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {getDurationOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {getAppointmentTypes().map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => mode === 'view' ? setCurrentMode('view') : onClose()}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {isSubmitting ? 'Saving...' : 'Save Appointment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
