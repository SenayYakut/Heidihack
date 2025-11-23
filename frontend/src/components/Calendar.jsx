import { useState, useMemo } from 'react';
import {
  getMonthDays,
  getMonthName,
  isToday,
  isSameDay,
  isPastDate,
  formatAppointmentTime
} from '../utils/dateHelpers';

export default function Calendar({ appointments = [], onDateClick, onAppointmentClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Get all days for the current month view
  const monthDays = useMemo(() => {
    return getMonthDays(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped = {};
    appointments.forEach(apt => {
      const dateKey = new Date(apt.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(apt);
    });
    // Sort appointments by time within each day
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(a.date) - new Date(b.date));
    });
    return grouped;
  }, [appointments]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getAppointmentColor = (appointment) => {
    if (appointment.status === 'pending') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    if (appointment.isFollowUp) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {getMonthName(currentMonth)} {currentYear}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handlePrevMonth}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map(day => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {monthDays.map((dayInfo, index) => {
          const { date, isCurrentMonth, isPadding } = dayInfo;
          const dateKey = date.toDateString();
          const dayAppointments = appointmentsByDate[dateKey] || [];
          const hasAppointments = dayAppointments.length > 0;
          const isCurrentDay = isToday(date);
          const isPast = isPastDate(date) && !isCurrentDay;

          return (
            <div
              key={index}
              className={`min-h-[120px] border-b border-r border-gray-100 p-1 transition-colors ${
                !isCurrentMonth ? 'bg-gray-50' : ''
              } ${isPast ? 'bg-gray-50/50' : ''} ${
                isCurrentDay ? 'bg-blue-50/50' : ''
              } hover:bg-gray-50 cursor-pointer`}
              onClick={() => onDateClick && onDateClick(date, dayAppointments)}
              role="button"
              tabIndex={0}
              aria-label={`${date.toLocaleDateString()}, ${dayAppointments.length} appointments`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDateClick && onDateClick(date, dayAppointments);
                }
              }}
            >
              {/* Date Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${
                    isCurrentDay
                      ? 'bg-blue-600 text-white font-semibold'
                      : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {date.getDate()}
                </span>
                {hasAppointments && (
                  <span className="text-xs text-gray-500">
                    {dayAppointments.length}
                  </span>
                )}
              </div>

              {/* Appointments */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((apt, aptIndex) => (
                  <button
                    key={apt.id || aptIndex}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick && onAppointmentClick(apt);
                    }}
                    className={`w-full text-left px-1.5 py-0.5 text-xs rounded border truncate ${getAppointmentColor(apt)} hover:opacity-80 transition-opacity`}
                    title={`${formatAppointmentTime(apt.date)} - ${apt.patientName}`}
                  >
                    <span className="font-medium">{formatAppointmentTime(apt.date)}</span>
                    <span className="hidden sm:inline ml-1">{apt.patientName}</span>
                  </button>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 px-1.5">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></span>
            <span className="text-gray-600">Regular</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-200"></span>
            <span className="text-gray-600">Follow-up</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></span>
            <span className="text-gray-600">Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}
