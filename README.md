# MariaDB FinOps Auditor

🚀 **AI-powered slow query analyzer and optimizer for MariaDB**

An intelligent tool that analyzes slow queries, calculates impact scores, and provides AI-driven optimization suggestions based on MariaDB documentation and historical support tickets.

## Features

- 📊 **Slow Query Analysis** - Parse and analyze slow query logs
- 🎯 **Impact Scoring** - Weighted scoring based on query time, rows examined, frequency
- 🤖 **AI Suggestions** - CREATE INDEX recommendations via RAG
- 💬 **Copilot Integration** - Interactive optimization guidance
- 🔍 **Vector Search** - Find solutions from documentation and tickets

For a deep dive into the architecture and optimizations, see [Technical Walkthrough](docs/walkthrough.md).

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   MariaDB       │
│   (Next.js)     │     │   (FastAPI)     │     │   SkySQL        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   Gemini LLM    │
                        │   + Copilot API │
                        └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- MariaDB SkySQL account

### Installation

```bash
# Clone the repo
git clone https://github.com/julienfritschheydon/MariaDB-AI-Demo.git
cd mariadb-finops-auditor

# Backend setup
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### Development

#### Option A: Quick Start (Recommended)

Use the provided batch script to launch both Backend and Frontend in separate local terminals:

```bash
.\run_launch_app.bat
```

#### Option B: Manual Start

```bash
# Start backend (port 8000)
cd backend
uvicorn main:app --reload

# Start frontend (port 3000)
cd frontend
npm run dev
```

## Project Structure

```
mariadb-finops-auditor/
├── backend/           # FastAPI Python backend
│   ├── main.py        # API routes
│   ├── parser/        # Slow query log parser
│   ├── scorer/        # Impact score calculator
│   ├── rag/           # Vector search & LLM
│   └── requirements.txt
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   └── components/
│   └── package.json
├── poc/               # Proof of concepts
└── .env               # Environment variables
```

## Competition

This project is built for the **MariaDB AI Demo Competition** (Deadline: Jan 9, 2025).

**Technologies used:**
- ✅ MariaDB Cloud (Vector Search)
- ✅ SkyAI Copilot API
- ✅ AI Framework (Gemini 2.0 Flash)

## License

MIT
