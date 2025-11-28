# Heidihack - Clinical AI Assistant

> An intelligent clinical decision support system powered by RAG (Retrieval-Augmented Generation) and GPT-4, designed to assist healthcare professionals with comprehensive clinical analysis, diagnosis, and treatment planning.

## 🚀 Features

### Core Capabilities
- **🎤 Voice Transcription**: Convert clinical conversations into structured data using Heidi API
- **🧠 RAG-Powered Analysis**: Intelligent retrieval of similar clinical cases from knowledge base
- **📋 SOAP Note Generation**: Automatic generation of comprehensive clinical notes
- **🔍 Differential Diagnosis**: AI-generated differential diagnoses with risk stratification
- **💊 ICD-10 Coding**: Automated medical coding with descriptions
- **✅ Treatment Recommendations**: Categorized action items (immediate, urgent, routine)
- **📅 Appointment Management**: Calendar system for scheduling patient appointments
- **⚠️ Safety Checks**: Automatic allergy checking and contraindication warnings

### Advanced Features
- **Vector Similarity Search**: FAISS-powered semantic search for relevant clinical patterns
- **Context-Aware Recommendations**: Personalized suggestions based on patient history and demographics
- **Real-time Analysis**: Fast response times with caching and batch processing
- **Comprehensive Dashboard**: Intuitive UI for clinical workflow management

## 🏗️ Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **OpenAI GPT-4**: Advanced language model for clinical analysis
- **FAISS**: Facebook AI Similarity Search for vector retrieval
- **Pydantic**: Data validation and settings management
- **Uvicorn**: ASGI server implementation
- **Python 3.11+**: Core programming language

### Frontend
- **React 18**: Modern UI library
- **Vite**: Next-generation frontend tooling
- **Axios**: HTTP client for API communication
- **Tailwind CSS**: Utility-first CSS framework
- **Date Helpers**: Custom utilities for appointment management

### AI & Machine Learning
- **OpenAI Embeddings**: `text-embedding-3-small` for semantic search
- **GPT-4**: Clinical analysis and generation
- **RAG Architecture**: Knowledge retrieval with generation

## 📁 Project Structure

```
heidihack/
├── Heidihack/              # Main application directory
│   ├── backend/            # Backend API server
│   │   ├── main.py         # FastAPI application entry point
│   │   ├── rag_engine.py   # RAG system implementation
│   │   ├── models.py       # Pydantic data models
│   │   ├── patients-data.json  # Clinical knowledge base
│   │   ├── test_rag.py     # RAG testing script
│   │   ├── RAG_SYSTEM.md   # RAG documentation
│   │   ├── requirements.txt # Python dependencies
│   │   └── venv/           # Python virtual environment
│   └── frontend/           # React frontend application
│       ├── src/
│       │   ├── App.jsx     # Main application component
│       │   ├── components/ # React components
│       │   └── utils/      # Utility functions
│       └── package.json    # Node dependencies
├── backend/                # Pulled backend code
├── frontend/               # Pulled frontend code
├── clinical-patient-system/ # Dashboard system
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 16+**
- **OpenAI API Key**
- **Heidi API Key** (optional, for transcription)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/SenayYakut/Heidihack.git
cd Heidihack/Heidihack
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

**Configure `.env` file:**
```env
HEIDI_API_KEY=your_heidi_api_key_here
HEIDI_API_URL=https://api.heidi.health
OPENAI_API_KEY=your_openai_api_key_here
DEVELOPMENT_MODE=true
```

#### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd ../frontend

# Install dependencies
npm install
```

### Running the Application

#### Start Backend Server
```bash
# From Heidihack/backend directory with venv activated
uvicorn main:app --reload --port 8000
```

Backend will be available at: `http://localhost:8000`

#### Start Frontend Development Server
```bash
# From Heidihack/frontend directory
npm run dev
```

Frontend will be available at: `http://localhost:5173`

## 📚 API Documentation

### Core Endpoints

#### Health Check
```
GET /health
```
Returns server status and configuration.

#### Patient Data
```
GET /api/patient
```
Retrieves mock patient data for testing.

#### Clinical Analysis
```
POST /api/analyze
```
**Request Body:**
```json
{
  "form_data": {
    "chief_complaint": "Chest pain",
    "hpi": {
      "location": ["chest", "substernal"],
      "quality": ["sharp", "pressure"],
      "severity": 8,
      "duration": "2 hours"
    },
    "associated_symptoms": ["shortness of breath", "sweating"],
    "physical_exam": {
      "vitals": {
        "bp": "150/90",
        "hr": 105,
        "temp": 98.6
      }
    }
  },
  "patient_context": {
    "name": "John Doe",
    "age": 55,
    "gender": "Male",
    "medical_history": ["Hypertension", "Diabetes"],
    "allergies": ["Penicillin"]
  }
}
```

**Response:**
```json
{
  "clinical_note": {
    "subjective": "...",
    "objective": "...",
    "assessment": "...",
    "plan": "..."
  },
  "icd10_codes": [
    {
      "code": "I20.0",
      "description": "Unstable angina"
    }
  ],
  "differential_diagnoses": [
    {
      "name": "Acute Coronary Syndrome",
      "risk": "HIGH",
      "supporting_factors": ["..."],
      "opposing_factors": ["..."]
    }
  ],
  "recommended_actions": {
    "immediate": [...],
    "urgent": [...],
    "routine": [...]
  }
}
```

#### Appointments
```
GET /api/appointments
POST /api/appointments
```
Manage patient appointments and calendar events.

#### Interactive API Documentation
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🧪 Testing the RAG System

Run the RAG test script to verify the system is working:

```bash
cd Heidihack/backend
source venv/bin/activate
python test_rag.py
```

This will:
1. Load the clinical knowledge base
2. Test query retrieval with sample data
3. Generate a full clinical analysis
4. Display results

## 🔒 Security & Safety

- **Allergy Checking**: Automatic cross-referencing of patient allergies before medication recommendations
- **Data Validation**: Pydantic models ensure data integrity
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **API Key Protection**: Environment variables for sensitive credentials

## 🎯 Use Cases

1. **Clinical Documentation**: Automatically generate SOAP notes from patient encounters
2. **Decision Support**: Get AI-assisted differential diagnoses based on symptoms
3. **Medical Coding**: Automatic ICD-10 code suggestions
4. **Treatment Planning**: Receive prioritized action items for patient care
5. **Appointment Management**: Schedule and track patient appointments

## 📖 Documentation

- **[RAG System Documentation](Heidihack/backend/RAG_SYSTEM.md)**: Detailed explanation of the RAG architecture
- **[API Documentation](http://localhost:8000/docs)**: Interactive API documentation (when server is running)

## 🤝 Contributing

### Team
- **Senay Yakut** - RAG enhancement, documentation, appointments API, testing
- **Yogita Senthil** - Initial development, RAG engine, frontend, dashboard, calendar system

### Development Workflow
1. Pull latest changes: `git pull origin master`
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m "Description of changes"`
6. Push: `git push origin feature/your-feature`
7. Create a Pull Request

## 🐛 Known Issues

- Backend uses absolute imports (not relative) for direct execution
- HEIDI_API_KEY may need to be configured for transcription features
- In-memory appointment storage (resets on server restart)

## 🚧 Future Enhancements

- [ ] Persistent database for appointments (PostgreSQL/MongoDB)
- [ ] User authentication and authorization
- [ ] Multi-tenant support for different healthcare facilities
- [ ] Export clinical notes to PDF/FHIR format
- [ ] Integration with EHR systems
- [ ] Real-time collaboration features
- [ ] Mobile application
- [ ] Advanced analytics and reporting
- [ ] HIPAA compliance features

## 📄 License

This project was developed during a hackathon. Please contact the authors for licensing information.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4 and embeddings API
- **Heidi Health** for transcription API
- **Facebook Research** for FAISS
- **FastAPI** and **React** communities

## 📞 Support

For questions or issues:
- Create an issue on GitHub
- Contact: senaykt@gmail.com

---

**Built with ❤️ for better healthcare**
