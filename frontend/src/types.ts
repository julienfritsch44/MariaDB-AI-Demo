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
