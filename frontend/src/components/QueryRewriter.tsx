"use client"

import { useState, useEffect } from "react"
import { RewriteResponse, SimilarJiraTicket, Message } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Wand2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Sparkles,
    Copy,
    ArrowRight,
    Zap,
    History,
    ExternalLink,
    Terminal,
    Database,
    Bug,
    ArrowUpRight,
    Search,
    Play
} from "lucide-react"
import { SqlCode } from "@/components/ui/sql-code"
import { SectionHeader } from "@/components/ui/section-header"
import { CopyButton } from "@/components/ui/copy-button"
import { EmptyState } from "@/components/ui/empty-state"
import { CodeContainer } from "@/components/ui/code-container"
import { CopilotChat, CopilotInput } from "@/components/ui/copilot"
import { trackedFetch } from "@/lib/usePerformance"

const API_BASE = "http://localhost:8000"

interface QueryRewriterInputProps {
    initialQuery?: string
    onRewrite: (result: RewriteResponse) => void
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}

export function QueryRewriterInput({ initialQuery, onRewrite, isLoading, setIsLoading }: QueryRewriterInputProps) {
    const [sql, setSql] = useState(initialQuery || "")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (initialQuery && initialQuery !== sql) {
            setSql(initialQuery)
            handleRewrite(initialQuery)
        }
    }, [initialQuery])


    const handleRewrite = async (queryToRewrite?: string) => {
        const finalSql = queryToRewrite || sql
        if (!finalSql.trim()) return

        setIsLoading(true)
        setError(null)

        try {
            const res = await trackedFetch(`${API_BASE}/rewrite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: finalSql.trim() })
            })

            if (!res.ok) throw new Error(`API Error: ${res.status}`)

            const data: RewriteResponse = await res.json()
            onRewrite(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to rewrite query")
        } finally {
            setIsLoading(false)
        }
    }

    const loadDemoQuery = () => {
        setSql(
            "SELECT * FROM orders WHERE customer_id IN (\n" +
            "  SELECT id FROM customers WHERE status = 'active'\n" +
            ") AND total_amount > 1000\n" +
            "ORDER BY created_at DESC"
        )
    }

    return (
        <div className="space-y-4">
            <Card className="border-border/40 bg-muted/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Wand2 className="w-24 h-24 text-foreground" />
                </div>

                <CardHeader className="pb-3 relative z-10">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            Self-Healing SQL Rewriter
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadDemoQuery}
                            className="text-xs h-7 border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        >
                            <Database className="w-3 h-3 mr-1.5" />
                            Load Anti-Pattern
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                    <textarea
                        value={sql}
                        onChange={(e) => setSql(e.target.value)}
                        placeholder="Paste an inefficient query here..."
                        className="w-full h-40 p-3 bg-card/50 border border-border rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border focus:ring-1 focus:ring-border resize-none transition-all"
                    />

                    {error && (
                        <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-md flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-400">{error}</span>
                        </div>
                    )}

                    <Button
                        onClick={() => handleRewrite()}
                        disabled={!sql.trim() || isLoading}
                        className="w-full h-10 bg-background text-foreground hover:bg-muted transition-all font-medium text-xs group"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Applying Intelligence...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform" />
                                Rewrite & Optimize
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <div className="p-4 rounded-md border border-border bg-muted/20">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Supported Anti-Patterns</h4>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        "IN Subqueries", "SELECT *", "LIKE Wildcards", "Cartesian Products", "Implicit Joins"
                    ].map(pattern => (
                        <div key={pattern} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                            {pattern}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

import { ReasoningLoader } from "@/components/ui/reasoning-loader"

const SELF_HEALING_STEPS = [
    "Parsing SQL structure...",
    "Detecting anti-patterns...",
    "Searching knowledge base...",
    "Applying optimizations...",
    "Generating refactored query..."
]

// Local definitions removed in favor of imports from @/types and @/components/ui/section-header

interface RewriterResultPanelProps {
    result: RewriteResponse | null
    isLoading: boolean
}

export function RewriterResultPanel({
    result,
    isLoading
}: RewriterResultPanelProps) {
    const [isApplying, setIsApplying] = useState(false)
    const [applySuccess, setApplySuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const handleApplyFix = async () => {
        if (!result) return

        // If there's a suggested DDL (like CREATE INDEX), use that. 
        // Otherwise, we might be just applying a query rewrite which (in this context) 
        // doesn't usually make sense to "Execute" against the DB unless it's for testing.
        // But for "Self-Healing", it usually means fixing the schema.

        const sqlToExecute = result.suggested_ddl || result.rewritten_sql

        // If it's just a SELECT, the backend might reject it (based on previous error), 
        // so we rely on suggested_ddl being present for actual fixes.
        if (!result.suggested_ddl && result.rewritten_sql.trim().toUpperCase().startsWith("SELECT")) {
            setErrorMessage("No schema fix (Index) suggested. Cannot apply 'SELECT' query as a fix.")
            return
        }

        setIsApplying(true)
        setErrorMessage(null)
        try {
            const res = await trackedFetch("http://localhost:8000/execute-fix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: sqlToExecute })
            })
            const data = await res.json()
            if (data.success) {
                setApplySuccess(true)
            } else {
                setErrorMessage(data.message || "Execution failed")
            }
        } catch (e) {
            console.error(e)
            setErrorMessage("Network error: Failed to connect to server")
        } finally {
            setIsApplying(false)
        }
    }
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center border-l border-border bg-card">
                <ReasoningLoader steps={SELF_HEALING_STEPS} colorVariant="yellow" />
            </div>
        )
    }

    if (!result) {
        return (
            <div className="h-full border-l border-border bg-card">
                <EmptyState
                    icon={Wand2}
                    title="Self-Healing SQL"
                    description="Paste an inefficient query to see how our AI refactors it for performance."
                />
            </div>
        )
    }

    const hasImprovements = result.rewritten_sql !== result.original_sql

    return (
        <div className="flex flex-col h-full border-l border-border bg-card">
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

                    {/* Virtual Validation (Hero Section) */}
                    {result.simulation && (
                        <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Database className="w-12 h-12 text-yellow-500" />
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                        <ArrowUpRight className="w-3 h-3 mr-1" />
                                        +{result.simulation.improvement_percent}% Performance Gain
                                    </Badge>
                                    <span className="text-xs font-semibold text-yellow-500/80 uppercase tracking-wider">
                                        {result.simulation.recommendation}
                                    </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                    VIRTUAL INDEX CLONE ACTIVE
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="p-3 rounded-lg bg-card/50 border border-border">
                                    <div className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Baseline Rows</div>
                                    <div className="text-lg font-mono font-bold text-muted-foreground">
                                        {result.simulation.current_plan.rows_examined.toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-500/20">
                                    <div className="text-[9px] text-yellow-500 uppercase font-bold mb-1">Simulated Rows</div>
                                    <div className="text-lg font-mono font-bold text-yellow-400">
                                        {result.simulation.with_index_plan.rows_examined.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed mb-4 italic">
                                "{result.simulation.ai_analysis}"
                            </p>

                            <div className="space-y-2">
                                <div className="text-[10px] text-muted-foreground uppercase font-bold px-1">Suggested Index Fix</div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 p-2 bg-card border border-border rounded font-mono text-[10px] text-yellow-300">
                                        {result.simulation.create_index_sql}
                                    </div>
                                    <CopyButton text={result.simulation.create_index_sql} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Comparison View */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <SectionHeader icon={Terminal} title="The Transformation" />
                                {result.explanation && (
                                    <p className="text-xs text-muted-foreground pl-6">{result.explanation}</p>
                                )}
                            </div>
                            <Button
                                onClick={handleApplyFix}
                                disabled={isApplying || applySuccess}
                                className={`gap-2 ${applySuccess ? "bg-primary hover:bg-emerald-600 text-foreground" : "bg-yellow-500 hover:bg-yellow-400 text-foreground"}`}
                            >
                                {isApplying ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : applySuccess ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                {isApplying ? "Applying..." : applySuccess ? "Fix Applied" : "Apply Fix"}
                            </Button>
                        </div>
                        {errorMessage && (
                            <div className="text-right">
                                <span className="text-xs text-red-500 font-medium">{errorMessage}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            {/* Original */}
                            <div className="space-y-2 opacity-60 grayscale-[0.5] hover:opacity-100 transition-opacity">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Original Query</span>
                                </div>
                                <div className="p-4 rounded-lg border border-border bg-muted/30 font-mono text-xs text-muted-foreground">
                                    <pre className="whitespace-pre-wrap">{result.original_sql}</pre>
                                </div>
                            </div>

                            {/* Rewritten */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Optimized Query</span>
                                    <CopyButton text={result.rewritten_sql} />
                                </div>
                                <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 font-mono text-xs text-foreground shadow-[0_0_30px_rgba(234,179,8,0.05)]">
                                    <pre className="whitespace-pre-wrap">{result.rewritten_sql}</pre>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Improvements List */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <SectionHeader icon={Bug} title="Issues Detected" />
                            <div className="space-y-2">
                                {result.anti_patterns_detected.map((issue, i) => (
                                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-red-900/20 bg-red-950/10">
                                        <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5" />
                                        <span className="text-xs text-muted-foreground">{issue}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <SectionHeader icon={CheckCircle2} title="Key Improvements" />
                            <div className="space-y-2">
                                {result.improvements.map((imp, i) => (
                                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-emerald-900/20 bg-emerald-950/10">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5" />
                                        <span className="text-xs text-muted-foreground">{imp}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Historical Context (RAG) */}
                    {result.similar_jira_tickets.length > 0 && (
                        <div className="space-y-3">
                            <SectionHeader icon={History} title="Validated by Library Memory" />
                            <div className="flex flex-col gap-1">
                                {result.similar_jira_tickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group transition-colors border border-transparent hover:border-border"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <a
                                                href={`https://jira.mariadb.org/browse/${ticket.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 text-xs font-mono text-primary hover:text-primary flex items-center gap-1"
                                            >
                                                {ticket.id}
                                                <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                                            </a>

                                            <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                                                {ticket.analysis ? (
                                                    ticket.analysis.includes('|') ? (
                                                        <>
                                                            <span className="text-primary/70 uppercase text-[9px] font-bold shrink-0">Fix:</span>
                                                            <span className="italic text-foreground truncate">
                                                                {ticket.analysis.split('|')[1].replace(/SOLUTION:\s*/i, '').trim()}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="truncate">
                                                            "{ticket.analysis.replace(/^Insight:?\s*/i, '').replace(/"/g, '')}"
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="truncate">{ticket.title}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 ml-4">
                                            <span className="text-[10px] font-mono text-muted-foreground group-hover:text-muted-foreground">
                                                {ticket.similarity.toFixed(0)}%
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
