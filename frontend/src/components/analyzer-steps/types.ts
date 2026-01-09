// Shared types for the Query Analyzer workflow

export interface PredictResponse {
    risk_level: string
    risk_score: number
    reason: string
    similar_issues: Array<{
        id: string
        title: string
        similarity: number
    }>
    suggested_fix?: string
}

export interface SandboxResponse {
    success: boolean
    mode: string
    message: string
    result?: {
        columns: string[]
        rows: any[][]
        rows_affected: number
        execution_time_ms: number
    }
    error?: string
    query_type?: string
    warning?: string
}

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
    recommendation: string
    create_index_sql: string
    ai_analysis: string
}

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
    suggested_ddl?: string
    simulation?: IndexSimulationResponse
}

export interface CostEstimate {
    sql: string
    cloud_provider: string
    io_cost_per_execution: number
    cpu_cost_per_execution: number
    total_cost_per_execution: number
    daily_cost: number
    monthly_cost: number
    annual_cost: number
    estimated_io_requests: number
    execution_frequency: number
    cost_breakdown: {
        io_percentage: number
        cpu_percentage: number
    }
}

export interface WaitEventDetail {
    event_name: string
    count: number
    total_wait_ms: number
    avg_wait_ms: number
    percentage: number
}

export interface WaitEventsResponse {
    success: boolean
    mode: string
    summary: {
        total_wait_events: number
        total_lock_waits: number
        total_threads: number
        threads_waiting_locks: number
        total_wait_time_ms: number
    }
    top_wait_events: WaitEventDetail[]
    lock_waits: any[]
    recommendations: string[]
}

export interface ResourceGroupAssignment {
    sql: string
    risk_score: number
    recommended_group: string
    cpu_limit: string
    thread_priority: number
    reason: string
}

export interface ResourceGroupResponse {
    success: boolean
    mode: string
    assignment: ResourceGroupAssignment
    available_groups: any[]
    recommendations: string[]
}

export type WorkflowStep = "input" | "risk" | "sandbox" | "healing" | "comparison"

export const riskStyles = {
    LOW: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-500",
        icon: "CheckCircle2"
    },
    MEDIUM: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-500",
        icon: "AlertTriangle"
    },
    HIGH: {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        text: "text-red-500",
        icon: "XCircle"
    }
} as const
