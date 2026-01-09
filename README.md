# MariaDB Local Pilot

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
                        │   Copilot API   │
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

```

### Database Configuration

#### SkySQL Setup

1. **Create a SkySQL Service** (if you don't have one):
   - Go to [SkySQL Console](https://mariadb.com/products/skysql/)
   - Create a new serverless database service
   - Note your connection credentials

2. **Configure Backend Environment**:

Create a `.env` file in the `backend/` directory:

```bash
# MariaDB SkySQL Connection
SKYSQL_HOST=your-service.sysp0000.db2.skysql.com
SKYSQL_PORT=4060
SKYSQL_USERNAME=your_username
SKYSQL_PASSWORD=your_password

# Database Name
DATABASE_NAME=finops_auditor

# Query Poller (optional)
ENABLE_QUERY_POLLER=false
```

3. **IP Allowlist**:
   - In SkySQL Console, go to your service settings
   - Add your IP address to the allowlist, or use `0.0.0.0/0` for development

4. **Test Connection**:
```bash
cd backend
python -c "from database import get_db_connection; conn = get_db_connection(); print('✅ Connected!')"
```

5. **SkySQL API Configuration** (Optional - for AI features):

The application uses SkySQL Copilot API for AI-powered query optimization suggestions.

Add to your `backend/.env`:
```bash
# SkySQL API (for Copilot AI features)
SKYSQL_API_KEY=your_api_key_here
SKYSQL_ORG_ID=your_org_id
SKYSQL_SERVER_ID=your_server_id
```

To get your API key:
- Go to [SkySQL Portal](https://portal.skysql.com/)
- Navigate to Settings → API Keys
- Generate a new API key

6. **Ingest Support Tickets** (Optional - for RAG knowledge base):

To populate the knowledge base with MariaDB support tickets and documentation:

```bash
cd backend
python scripts/fetch_and_ingest_jira.py
```

This will:
- Fetch MariaDB support tickets from Jira
- Generate embeddings using sentence-transformers
- Store vectors in MariaDB Cloud Vector Search
- Enable AI-powered query optimization suggestions

```- Enable AI-powered query optimization suggestions

### MariaDB Server Configuration

To enable slow query analysis, configure your MariaDB server to log slow queries:

**Option 1: Enable via SQL (Runtime)**
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Log queries taking > 1 second
SET GLOBAL log_slow_rate_limit = 1;  -- Log every query
SET GLOBAL log_slow_verbosity = 'query_plan,explain';  -- Include execution plan

-- Log to table (allows querying via SQL)
SET GLOBAL log_output = 'TABLE';

-- Enable performance schema (for detailed metrics)
SET GLOBAL performance_schema = ON;
```

**Option 2: Configure in my.cnf (Persistent)**
```ini
[mysqld]
# Slow Query Log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 1
log_output = TABLE  # Store in mysql.slow_log table

# Log queries not using indexes
log_queries_not_using_indexes = 1

# Performance Schema
performance_schema = ON
performance_schema_instrument = 'statement/%=ON'
```

**For SkySQL:**
- Slow query logging is enabled by default
- Access logs via SkySQL Portal → Monitoring → Slow Queries
- Or use the SkySQL Observability API (configured via `SKYSQL_API_KEY`)

### Frontend Setup

```bash
cd frontend
npm install
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

## License

MIT
