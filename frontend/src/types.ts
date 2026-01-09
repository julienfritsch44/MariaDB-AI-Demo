export interface SlowQuery {
    id: number;
    query_time: number;
    lock_time: number;
    rows_sent: number;
    rows_examined: number;
    sql_text: string;
    fingerprint: string;
    impact_score: number;
    start_time?: string;
    user_host?: string;
    db?: string;
    estimated_cost_usd?: number;
    explain?: string;
    query_plan?: string;
}

export interface QueryAnalysis {
    total_queries: number;
    global_score: number;
    top_queries: SlowQuery[];
    kb_count: number;
}

export interface Suggestion {
    query_id: number;
    suggestion_type: string;
    suggestion_text: string;
    query_explanation: string;
    performance_assessment: string;
    actionable_insights: string;
    sql_fix: string | null;
    confidence: number;
    confidence_breakdown: string;
    risks: string[];
    sources: string[];
    source_justifications: Record<string, string>;
    // Query Cost Analysis (Supabase-style)
    cost_current: number | null;
    cost_with_fix: number | null;
    cost_reduction_percent: number | null;
    analysis_time_ms: number | null;
}

export interface Message {
    id: string
    role: "user" | "assistant"
    text: string
}

// Query Risk Predictor Types (Phase 1 - Competition Feature)
export interface SimilarIssue {
    id: string
    title: string
    similarity: number
    summary: string
    analysis?: string
}

export interface PredictResponse {
    risk_level: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
    risk_score: number
    reason: string
    similar_issues: SimilarIssue[]
    suggested_fix: string | null
    query_analysis: string | null
}

// Virtual Index Simulator Types (Phase 2 - Competition WOW Feature)
export interface ExplainPlan {
    access_type: string
    rows_examined: number
    key: string | null
    key_len: string | null
    extra: string | null
    estimated_time_ms: number
}

export interface IndexSimulationResponse {
    current_plan: ExplainPlan
    with_index_plan: ExplainPlan
    improvement_percent: number
    recommendation: "HIGHLY RECOMMENDED" | "RECOMMENDED" | "MARGINAL" | "NOT RECOMMENDED"
    create_index_sql: string
    ai_analysis: string
}

// Self-Healing SQL Types (Phase 4 - Query Rewriter)
export interface SimilarJiraTicket {
    id: string
    title: string
    similarity: number
    analysis?: string
}

export interface RewriteResponse {
    original_sql: string
    rewritten_sql: string
    improvements: string[]
    estimated_speedup: string
    confidence: number
    explanation: string
    similar_jira_tickets: SimilarJiraTicket[]
    anti_patterns_detected: string[]
    simulation?: IndexSimulationResponse
    suggested_ddl?: string | null
    knowledge_source?: {
        id: string;
        description: string;
    }
}

export interface DiagnosticCheck {
    service: string;
    status: "online" | "offline" | "error" | "config_missing" | "empty" | "timeout_or_error";
    latency_ms?: number;
    message?: string;
    error?: string;
    hint?: string;
    info?: DiagnosticInfo;
    document_count?: number;
    http_status?: number;
}

// Diagnostic Info - replaces info?: any
export interface DiagnosticInfo {
    model?: string
    version?: string
    [key: string]: string | number | undefined
}

// Wait Events and Lock Waits
export interface WaitEvent {
    event_name: string
    count: number
    total_wait_time_ms: number
}

export interface LockWait {
    blocking_query: string
    waiting_query: string
    lock_type: string
    duration_ms: number
}

// Extended Analysis with detailed information
export interface QueryAnalysisDetailed extends QueryAnalysis {
    wait_events?: WaitEvent[]
    lock_waits?: LockWait[]
    available_groups?: string[]
}

// Analysis History Item (used by UnifiedQueryAnalyzer)
export interface AnalysisHistoryItem {
    id: string
    sql: string
    risk_score: number
    risk_level: string
    timestamp: Date
}

// Alias for backward compatibility
export type HistoryItem = AnalysisHistoryItem

// Chat Message
export interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
}

// Sandbox Result
export interface SandboxResult {
    columns: string[]
    rows: (string | number | null)[][]
    execution_time_ms?: number
    error?: string
    sql?: string
}

// MCP Log Entry
export interface MCPLogEntry {
    id: string
    timestamp: string
    time?: string
    tool: string
    status: 'success' | 'error' | 'pending'
    message: string
    detail?: string
}

// Dashboard Tab Types
export type DashboardTab =
    | "shop"
    | "predictor"
    | "simulator"
    | "rewriter"
    | "sandbox"
    | "unified"
    | "queries"
    | "diagnostic"
    | "mcp"
    | "planstability"
    | "branching"
    | "neural";
