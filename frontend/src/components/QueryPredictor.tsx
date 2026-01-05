"use client"

import { useState } from "react"
import { PredictResponse, SimilarIssue } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Loader2,
    Sparkles,
    ExternalLink,
    Copy,
    ShieldAlert,
    Lightbulb,
    Database
} from "lucide-react"
import { SqlCode } from "@/components/ui/sql-code"
import { trackedFetch } from "@/lib/usePerformance"

import { useEffect } from "react"

const API_BASE = "http://localhost:8000"

interface QueryPredictorInputProps {
    onPredict: (result: PredictResponse) => void
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}

export function QueryPredictorInput({ onPredict, isLoading, setIsLoading }: QueryPredictorInputProps) {
    const [sql, setSql] = useState("")
    const [error, setError] = useState<string | null>(null)

    const handlePredict = async () => {
        if (!sql.trim()) return

        setIsLoading(true)
        setError(null)

        try {
            const res = await trackedFetch(`${API_BASE}/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: sql.trim() })
            })

            if (!res.ok) throw new Error(`API Error: ${res.status}`)

            const data: PredictResponse = await res.json()
            onPredict(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to analyze query")
        } finally {
            setIsLoading(false)
        }
    }

    const loadDemoQuery = () => {
        setSql(
            "SELECT * FROM orders o " +
            "JOIN order_items oi ON o.id = oi.order_id " +
            "WHERE o.customer_id = 12345 " +
            "AND o.order_date > '2023-01-01' " +
            "ORDER BY o.total_amount DESC"
        )
    }

    return (
        <div className="space-y-4">
            <Card className="border-border/40 bg-muted/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <ShieldAlert className="w-4 h-4 text-primary" />
                            SQL Query Risk Analysis
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadDemoQuery}
                            className="text-xs h-7 border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        >
                            <Database className="w-3 h-3 mr-1.5" />
                            Load Demo
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <textarea
                        value={sql}
                        onChange={(e) => setSql(e.target.value)}
                        placeholder="Paste your SQL query here..."
                        className="w-full h-40 p-3 bg-card/50 border border-border rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border focus:ring-1 focus:ring-border resize-none"
                    />

                    {error && (
                        <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-md flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-400">{error}</span>
                        </div>
                    )}

                    <Button
                        onClick={handlePredict}
                        disabled={!sql.trim() || isLoading}
                        className="w-full h-9 bg-background text-foreground hover:bg-muted transition-colors font-medium text-xs"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5 mr-2" />
                                Predict Risk
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

// Risk level styling
const riskStyles = {
    LOW: {
        bg: "bg-primary/5",
        border: "border-emerald-900/50",
        text: "text-primary",
        icon: CheckCircle2,
        glow: ""
    },
    MEDIUM: {
        bg: "bg-amber-500/5",
        border: "border-amber-900/50",
        text: "text-amber-500",
        icon: AlertTriangle,
        glow: ""
    },
    HIGH: {
        bg: "bg-red-500/5",
        border: "border-red-900/50",
        text: "text-red-500",
        icon: XCircle,
        glow: ""
    },
    UNKNOWN: {
        bg: "bg-muted-foreground/30/5",
        border: "border-border",
        text: "text-muted-foreground",
        icon: AlertTriangle,
        glow: ""
    }
}

import { CopilotChat, CopilotInput } from "@/components/ui/copilot"
import { Message } from "@/types"

interface PredictorResultPanelProps {
    result: PredictResponse | null
    isLoading: boolean
}

import { ReasoningLoader } from "@/components/ui/reasoning-loader"

const RISK_ANALYSIS_STEPS = [
    "Parsing SQL syntax...",
    "Analyzing query structure...",
    "Searching knowledge base...",
    "Identifying risk patterns...",
    "Generating assessment..."
]

import { SectionHeader } from "@/components/ui/section-header"
import { CopyButton } from "@/components/ui/copy-button"
import { EmptyState } from "@/components/ui/empty-state"
import { CodeContainer } from "@/components/ui/code-container"
import { Bot, User, Send, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"

export function PredictorResultPanel({
    result,
    isLoading
}: PredictorResultPanelProps) {

    // Loading state
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center border-l border-border bg-card">
                <ReasoningLoader steps={RISK_ANALYSIS_STEPS} colorVariant="amber" />
            </div>
        )
    }

    // Empty state
    if (!result) {
        return (
            <div className="h-full border-l border-border bg-card">
                <EmptyState
                    icon={ShieldAlert}
                    title="No Query Analyzed Yet"
                    description="Paste a SQL query on the left to analyze risks."
                />
            </div>
        )
    }

    const style = riskStyles[result.risk_level]
    const RiskIcon = style.icon

    return (
        <div className="flex flex-col h-full border-l border-border bg-card">
            <div className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Risk Header */}
                    <div className={`p-6 rounded-md ${style.border} ${style.bg} border`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <RiskIcon className={`w-8 h-8 ${style.text}`} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-2xl font-bold tracking-tight ${style.text}`}>
                                            {result.risk_level} RISK
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Risk Score: <span className="font-mono text-foreground">{result.risk_score}/100</span>
                                    </div>
                                </div>
                            </div>

                            {/* Risk Meter */}
                            <div className="w-32">
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${result.risk_level === "LOW" ? "bg-primary" :
                                            result.risk_level === "MEDIUM" ? "bg-amber-500" :
                                                "bg-red-500"
                                            }`}
                                        style={{ width: `${result.risk_score}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <SectionHeader icon={AlertTriangle} title="Risk Assessment" />
                        <div className="p-4 rounded-md border border-border bg-muted/50">
                            <p className="text-sm text-foreground leading-relaxed">{result.reason}</p>
                        </div>
                    </div>

                    {/* Query Analysis */}
                    {result.query_analysis && (
                        <div className="space-y-2">
                            <SectionHeader icon={Lightbulb} title="Technical Analysis" />
                            <div className="p-4 rounded-md border border-border bg-muted/50">
                                <p className="text-sm text-muted-foreground leading-relaxed">{result.query_analysis}</p>
                            </div>
                        </div>
                    )}

                    {/* Suggested Fix */}
                    {result.suggested_fix && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <SectionHeader icon={CheckCircle2} title="Suggested Fix" variant="emerald" />
                                <CopyButton text={result.suggested_fix} />
                            </div>
                            <CodeContainer code={result.suggested_fix} />
                        </div>
                    )}

                    {/* Similar Issues */}
                    {result.similar_issues.length > 0 && (
                        <div className="space-y-3">
                            <SectionHeader icon={ExternalLink} title="Knowledge Base Matches" />
                            <div className="flex flex-col gap-1">
                                {result.similar_issues.slice(0, 5).map((issue: SimilarIssue) => (
                                    <div
                                        key={issue.id}
                                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group transition-colors border border-transparent hover:border-border"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <a
                                                href={`https://jira.mariadb.org/browse/${issue.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 text-xs font-mono text-amber-500 hover:text-amber-400 flex items-center gap-1"
                                            >
                                                {issue.id}
                                                <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                                            </a>

                                            <span className="text-xs text-muted-foreground truncate">
                                                {issue.summary}
                                            </span>
                                        </div>

                                        <div className="shrink-0 ml-4">
                                            <span className="text-[10px] font-mono text-muted-foreground group-hover:text-muted-foreground">
                                                {issue.similarity.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

// Keep old component for backwards compatibility but mark as deprecated
/** @deprecated Use QueryPredictorInput and PredictorResultPanel separately */
export function QueryPredictor() {
    return null
}

