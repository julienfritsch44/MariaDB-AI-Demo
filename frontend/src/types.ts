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
    sources: string[];
    source_justifications: Record<string, string>;
}
