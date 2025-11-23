/**
 * Date utility functions for calendar and appointment management
 */

/**
 * Format time for display (e.g., "10:00 AM")
 */
export const formatAppointmentTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format date for display (e.g., "Jan 15, 2024")
 */
export const formatAppointmentDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format date for display with day name (e.g., "Monday, Jan 15, 2024")
 */
export const formatFullDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Get all days in a month as an array of date objects
 * Includes padding days from previous/next months to complete weeks
 */
export const getMonthDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const days = [];

  // Add padding days from previous month
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
      isPadding: true
    });
  }

  // Add days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
      isPadding: false
    });
  }

  // Add padding days from next month to complete the grid (6 rows)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
      isPadding: true
    });
  }

  return days;
};

/**
 * Check if a date is today
 */
export const isToday = (date) => {
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
};

/**
 * Add weeks to a date
 */
export const addWeeks = (date, weeks) => {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
};

/**
 * Add days to a date
 */
export const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Get available time slots for appointments
 */
export const getTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = new Date();
      time.setHours(hour, minute, 0, 0);
      slots.push({
        value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        label: formatAppointmentTime(time)
      });
    }
  }
  return slots;
};

/**
 * Check if a time is within business hours (8 AM - 6 PM)
 */
export const isBusinessHours = (date) => {
  const d = new Date(date);
  const hours = d.getHours();
  return hours >= 8 && hours < 18;
};

/**
 * Check if a date is in the past
 */
export const isPastDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

/**
 * Check if a date is a weekend
 */
export const isWeekend = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6;
};

/**
 * Generate follow-up date suggestions based on timeframe
 * @param {Date} baseDate - Starting date (usually today)
 * @param {string} timeframe - e.g., "1-3 days", "2-4 weeks"
 * @param {Object} options - Additional options
 * @returns {Date[]} Array of 3 suggested dates
 */
export const generateFollowUpDates = (baseDate, timeframe, options = {}) => {
  const base = new Date(baseDate);
  const suggestions = [];

  // Parse timeframe
  let minDays, maxDays;
  if (timeframe.includes('day')) {
    const match = timeframe.match(/(\d+)-(\d+)/);
    if (match) {
      minDays = parseInt(match[1]);
      maxDays = parseInt(match[2]);
    } else {
      minDays = 1;
      maxDays = 3;
    }
  } else if (timeframe.includes('week')) {
    const match = timeframe.match(/(\d+)-(\d+)/);
    if (match) {
      minDays = parseInt(match[1]) * 7;
      maxDays = parseInt(match[2]) * 7;
    } else {
      minDays = 7;
      maxDays = 14;
    }
  } else {
    minDays = 7;
    maxDays = 14;
  }

  // Generate 3 dates spread across the range
  const range = maxDays - minDays;
  const intervals = [
    minDays,
    minDays + Math.floor(range / 2),
    maxDays
  ];

  for (const days of intervals) {
    let suggested = addDays(base, days);

    // Skip weekends unless specified otherwise
    if (!options.includeWeekends) {
      while (isWeekend(suggested)) {
        suggested = addDays(suggested, 1);
      }
    }

    // Set to a reasonable appointment time (10 AM default)
    suggested.setHours(10, 0, 0, 0);

    suggestions.push(suggested);
  }

  return suggestions;
};

/**
 * Get month name
 */
export const getMonthName = (month) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
};

/**
 * Format date for API (ISO string)
 */
export const toAPIDate = (date) => {
  return new Date(date).toISOString();
};

/**
 * Parse API date to local Date object
 */
export const fromAPIDate = (isoString) => {
  return new Date(isoString);
};

/**
 * Get duration options for appointments
 */
export const getDurationOptions = () => [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' }
];

/**
 * Get appointment type options
 */
export const getAppointmentTypes = () => [
  { value: 'initial', label: 'Initial Visit' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'urgent', label: 'Urgent Care' }
];
