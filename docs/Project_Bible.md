# 📖 MariaDB FinOps Auditor - Project Bible
**Single Source of Truth** | **Date** : 22 Dec 2024

---

## 1. 🎯 Vision & Value Proposition

### The Problem
Organizations running MariaDB often struggle with "silent" performance killers: slow queries that degrade user experience and inflate cloud costs. Existing tools (pt-query-digest, SkyCopilot Native) identify *what* is slow but fail to explain *why* or *how to fix it*, especially in the context of historical knowledge.

### The FinOps Auditor Solution
An intelligent agent that goes beyond monitoring:
1.  **Detects** slow queries via MCP (Local) or SkySQL API (Cloud).
2.  **Scores** them based on financial/performance impact (not just duration).
3.  **Prescribes** fixes using a RAG engine fed by **10 years of MariaDB Jira tickets** and documentation.
4.  **Guides** the DBA via an interactive Copilot chat.

### 🧬 Competitive Differentiation (vs SkyCopilot Native)
| Feature | SkyCopilot Native | FinOps Auditor (Us) |
| :--- | :---: | :---: |
| **Approach** | Reactive "Read & Explain" | Proactive "Detect & Correct" |
| **Data Source** | General SQL Knowledge | **Augmented Memory (Jira + Docs)** |
| **Context** | Generic | **Company-Specific (Tickets)** |
| **Outcome** | "This query is slow" | "Fix it like we did in Ticket MDEV-30820" |

---

## 2. 🏗️ System Architecture

### Components
```mermaid
graph TD
    subgraph "Data Sources"
        A[Slow Query Log<br/>(File/API)]
        B[Jira Service Desk<br/>(Historical Tickets)]
        C[MariaDB Docs]
    end

    subgraph "Core Engine (Backend)"
        D[Log Parser]
        E[Impact Scorer]
        F[Vector Store<br/>(MariaDB SkySQL)]
        G[RAG Orchestrator]
    end

    subgraph "Experience (Frontend)"
        H[Dashboard UI]
        I[Copilot Chat]
    end

    A --> D --> E --> G
    B & C --> F --> G
    G --> H
    G --> I
```

### Key Decisions
1.  **Hybrid Connectivity**: Supports both On-Premise (via MCP) and Cloud (SkySQL API) to maximize reach.
2.  **RAG-First**: The "brain" is the Vector Store containing domain-specific knowledge (Jira tickets), which generic LLMs lack.
3.  **Financial Scoring**: We translate technical metrics (ms, rows) into business metrics (Impact Score).

---

## 3. 📅 Implementation Status (Sprint 2/5)

### ✅ Completed
- **POC Validation**: Validated SkySQL connection, Vector Search (Cosine Distance), and Log Parsing.
- **Sprint 1 (Backend Core)**: FastAPI server running, Endpoints `/analyze` and `/health` active.
- **Data Pipeline**: Parser and Scorer modules implemented.

### 🚧 In Progress (Sprint 2)
- **Vector Store**: Schema created (`doc_embeddings`).
- **Data Ingestion**: Script `ingester.py` created to load Jira tickets.
- **BLOCKER**: Google API Key validation failure (Ingestion paused).

### 📅 Next Steps
1.  **Fix API Key**: Enable "Generative Language API" in Google Console.
2.  **Run Ingestion**: Populate Vector Store with 50+ Jira tickets.
3.  **Frontend**: Connect Dashboard to Backend API.
4.  **Demo Recording**: Showcase the "Aha!" moment of finding a fix based on a Jira ticket.
5. **Dark theme**: Add dark mode to the frontend.

---

## 5. 🛡️ Risk Assessment & Mitigation

### 5.1 Technical Risks
| ID | Risk | Prob. | Impact | Mitigation Strategy |
| :--- | :--- | :---: | :---: | :--- |
| **T1** | **Cost Accuracy** (Calculated scores don't match real bill) | High | Med | **Pivot to "Impact Score"** (0-100 relative index) instead of $ dollars. Focus on *efficiency* rather than billing. |
| **T2** | **Privacy** (Submitting SQL/Data to Cloud LLM) | Med | High | **Anonymization**: Use `sqlparse` to fingerprint queries (remove values) *before* sending to LLM. Support Local MCP. |
| **T3** | **Hallucinations** (AI suggests bad usage) | Med | High | **RAG-Grounding**: Strict prompts relying *only* on retrieved docs. **Disclaimer**: "Validated by AI, review required". |
| **T4** | **Data Ingestion** (Jira/Docs API failure) | Low | High | **Fallback Dataset**: Pre-package a "Static Knowledge Base" (JSON) to ensure demo works even without live API. |

### 5.2 Project Risks
| ID | Risk | Prob. | Impact | Mitigation Strategy |
| :--- | :--- | :---: | :---: | :--- |
| **P1** | **Time Constraint** (Demo deadline Jan 9) | High | High | **Strict MVP**: Cut "Chat" bonus if needed. Focus on the core loop: Log -> Score -> Fixed Query. |
| **P2** | **Missing Copilot API** | Med | Med | **Simulation**: Use standard Gemini API to *simulate* the Copilot experience if official API is not ready/documented. |

---

## 6. 📚 References
- **Detailed Analysis**: `roadmap_analysis.md`
- **Initial Brainstorm**: `brainstorming.md`
- **Full Architecture**: `system_design.md`

