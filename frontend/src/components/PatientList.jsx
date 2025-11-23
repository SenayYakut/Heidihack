import { useState, useMemo } from 'react';

export default function PatientList({ patients, completedPatients = [], onSelectPatient }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get patient status
  const getPatientStatus = (patient) => {
    if (completedPatients.includes(patient.id)) {
      return 'completed';
    }
    const now = new Date();
    const appointmentTime = new Date(patient.appointmentTime);
    const diffMinutes = (appointmentTime - now) / (1000 * 60);

    if (diffMinutes < -30) return 'overdue';
    if (diffMinutes <= 0) return 'in_progress';
    return 'waiting';
  };

  // Format time for display
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get time indicator text
  const getTimeIndicator = (isoString) => {
    const now = new Date();
    const appointmentTime = new Date(isoString);
    const diffMinutes = Math.round((appointmentTime - now) / (1000 * 60));

    if (diffMinutes <= -30) return 'Overdue';
    if (diffMinutes < 0) return 'Now';
    if (diffMinutes === 0) return 'Now';
    if (diffMinutes <= 5) return 'Starting soon';
    if (diffMinutes <= 15) return `In ${diffMinutes} min`;
    if (diffMinutes <= 60) return `In ${diffMinutes} min`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return mins > 0 ? `In ${hours}h ${mins}m` : `In ${hours}h`;
  };

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    return patients
      .filter(patient => {
        // Search filter
        const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            patient.mrn.toLowerCase().includes(searchTerm.toLowerCase());

        // Status filter
        const status = getPatientStatus(patient);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(a.appointmentTime) - new Date(b.appointmentTime));
  }, [patients, searchTerm, statusFilter, completedPatients]);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const styles = {
      waiting: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200'
    };

    const labels = {
      waiting: 'Waiting',
      in_progress: 'In Progress',
      completed: 'Completed',
      overdue: 'Overdue'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="fade-in">
      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Search patients"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="waiting">Waiting</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Patient Count */}
      <p className="text-sm text-gray-500 mb-4">
        {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} scheduled
      </p>

      {/* Patient Cards */}
      {filteredPatients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No patients found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'No patients are scheduled at this time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPatients.map((patient) => {
            const status = getPatientStatus(patient);
            const timeIndicator = getTimeIndicator(patient.appointmentTime);
            const isUrgent = status === 'in_progress' || status === 'overdue';

            return (
              <button
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className={`w-full text-left bg-white rounded-lg border-2 p-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  status === 'completed'
                    ? 'border-green-200 bg-green-50/50'
                    : isUrgent
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                aria-label={`Select patient ${patient.name}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Patient Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {patient.name}
                      </h3>
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>{patient.age} yrs</span>
                      <span>{patient.gender}</span>
                      <span className="font-mono">{patient.mrn}</span>
                    </div>
                    {patient.allergies && patient.allergies.length > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-xs text-red-600 font-medium">
                          Allergies: {patient.allergies.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Time and Vitals */}
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center gap-4">
                    {/* Appointment Time */}
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatTime(patient.appointmentTime)}
                      </p>
                      <p className={`text-sm font-medium ${
                        isUrgent ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {timeIndicator}
                      </p>
                    </div>

                    {/* Quick Vitals */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-gray-100 rounded px-2 py-1">
                        <span className="text-gray-500">BP</span>
                        <span className="ml-1 font-semibold text-gray-700">{patient.vitals.bp}</span>
                      </div>
                      <div className="bg-gray-100 rounded px-2 py-1">
                        <span className="text-gray-500">HR</span>
                        <span className="ml-1 font-semibold text-gray-700">{patient.vitals.hr}</span>
                      </div>
                      <div className="bg-gray-100 rounded px-2 py-1">
                        <span className="text-gray-500">Temp</span>
                        <span className="ml-1 font-semibold text-gray-700">{patient.vitals.temp}°</span>
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <svg
                      className="h-5 w-5 text-gray-400 hidden lg:block"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
