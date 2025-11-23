/**
 * Mock patient data for Clinical Patient Management System
 * Appointments span the next 2-3 hours from current time
 */

// Helper to create appointment times relative to now
const createAppointmentTime = (minutesFromNow) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutesFromNow);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date.toISOString();
};

export const mockPatients = [
  {
    id: 1,
    name: "Maria Alvarez",
    age: 42,
    gender: "Female",
    appointmentTime: createAppointmentTime(-10), // Started 10 min ago
    mrn: "MRN-2024-001",
    vitals: {
      bp: "142/88",
      hr: 92,
      temp: 98.4,
      spo2: 96,
      rr: 20
    },
    medicalHistory: [
      "Mild anemia",
      "Seasonal allergies",
      "Hypertension"
    ],
    currentMedications: [
      "Lisinopril 10mg daily",
      "Multivitamin daily",
      "Iron supplement 65mg daily"
    ],
    allergies: ["Penicillin", "Sulfa drugs"]
  },
  {
    id: 2,
    name: "James Thompson",
    age: 67,
    gender: "Male",
    appointmentTime: createAppointmentTime(5), // In 5 minutes
    mrn: "MRN-2024-002",
    vitals: {
      bp: "158/92",
      hr: 78,
      temp: 98.6,
      spo2: 94,
      rr: 18
    },
    medicalHistory: [
      "Type 2 Diabetes",
      "COPD",
      "Coronary artery disease",
      "Hyperlipidemia"
    ],
    currentMedications: [
      "Metformin 1000mg twice daily",
      "Atorvastatin 40mg daily",
      "Aspirin 81mg daily",
      "Tiotropium inhaler daily",
      "Albuterol inhaler PRN"
    ],
    allergies: ["Codeine"]
  },
  {
    id: 3,
    name: "Emily Chen",
    age: 28,
    gender: "Female",
    appointmentTime: createAppointmentTime(35), // In 35 minutes
    mrn: "MRN-2024-003",
    vitals: {
      bp: "118/72",
      hr: 88,
      temp: 100.2,
      spo2: 98,
      rr: 16
    },
    medicalHistory: [
      "Migraines",
      "Anxiety disorder"
    ],
    currentMedications: [
      "Sumatriptan 50mg PRN",
      "Sertraline 50mg daily"
    ],
    allergies: []
  },
  {
    id: 4,
    name: "Robert Williams",
    age: 55,
    gender: "Male",
    appointmentTime: createAppointmentTime(65), // In 65 minutes
    mrn: "MRN-2024-004",
    vitals: {
      bp: "128/82",
      hr: 98,
      temp: 98.1,
      spo2: 97,
      rr: 22
    },
    medicalHistory: [
      "Gastroesophageal reflux disease",
      "Obesity",
      "Sleep apnea",
      "Osteoarthritis"
    ],
    currentMedications: [
      "Omeprazole 20mg daily",
      "CPAP nightly",
      "Ibuprofen 400mg PRN"
    ],
    allergies: ["Latex", "Shellfish"]
  },
  {
    id: 5,
    name: "Sarah Johnson",
    age: 34,
    gender: "Female",
    appointmentTime: createAppointmentTime(95), // In 95 minutes
    mrn: "MRN-2024-005",
    vitals: {
      bp: "110/68",
      hr: 72,
      temp: 98.4,
      spo2: 99,
      rr: 14
    },
    medicalHistory: [
      "Hypothyroidism",
      "Vitamin D deficiency"
    ],
    currentMedications: [
      "Levothyroxine 75mcg daily",
      "Vitamin D 2000 IU daily"
    ],
    allergies: []
  },
  {
    id: 6,
    name: "Michael Davis",
    age: 71,
    gender: "Male",
    appointmentTime: createAppointmentTime(125), // In 125 minutes
    mrn: "MRN-2024-006",
    vitals: {
      bp: "146/86",
      hr: 68,
      temp: 97.8,
      spo2: 95,
      rr: 16
    },
    medicalHistory: [
      "Atrial fibrillation",
      "Chronic kidney disease stage 3",
      "Benign prostatic hyperplasia",
      "Gout"
    ],
    currentMedications: [
      "Warfarin 5mg daily",
      "Metoprolol 50mg twice daily",
      "Tamsulosin 0.4mg daily",
      "Allopurinol 100mg daily"
    ],
    allergies: ["NSAIDs", "ACE inhibitors"]
  },
  {
    id: 7,
    name: "Jennifer Martinez",
    age: 45,
    gender: "Female",
    appointmentTime: createAppointmentTime(155), // In 155 minutes
    mrn: "MRN-2024-007",
    vitals: {
      bp: "132/84",
      hr: 82,
      temp: 98.8,
      spo2: 98,
      rr: 18
    },
    medicalHistory: [
      "Fibromyalgia",
      "Depression",
      "Irritable bowel syndrome"
    ],
    currentMedications: [
      "Duloxetine 60mg daily",
      "Gabapentin 300mg three times daily",
      "Dicyclomine 10mg PRN"
    ],
    allergies: ["Tramadol"]
  },
  {
    id: 8,
    name: "David Kim",
    age: 52,
    gender: "Male",
    appointmentTime: createAppointmentTime(185), // In 185 minutes
    mrn: "MRN-2024-008",
    vitals: {
      bp: "138/88",
      hr: 76,
      temp: 98.2,
      spo2: 97,
      rr: 16
    },
    medicalHistory: [
      "Hypertension",
      "Prediabetes",
      "Erectile dysfunction"
    ],
    currentMedications: [
      "Amlodipine 5mg daily",
      "Sildenafil 50mg PRN"
    ],
    allergies: []
  }
];

export default mockPatients;
