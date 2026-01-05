"use client"

import { useState, useEffect, useRef } from "react"
import { IndexSimulationResponse, ExplainPlan } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Loader2,
    Sparkles,
    TrendingUp,
    ArrowRight,
    Zap,
    Database,
    Lightbulb
} from "lucide-react"

import { AnimatedNumber } from "@/components/ui/animated-number"
import { SectionHeader } from "@/components/ui/section-header"
import { CopyButton } from "@/components/ui/copy-button"
import { EmptyState } from "@/components/ui/empty-state"
import { CodeContainer } from "@/components/ui/code-container"
import { ReasoningLoader } from "@/components/ui/reasoning-loader"
import { trackedFetch } from "@/lib/usePerformance"

const INDEX_SIMULATION_STEPS = [
    "Parsing index definition...",
    "Creating virtual index clone...",
    "Searching knowledge base...",
    "Running EXPLAIN analysis...",
    "Calculating improvement..."
]

const API_BASE = "http://localhost:8000"

interface IndexSimulatorInputProps {
    onSimulate: (result: IndexSimulationResponse) => void
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}

export function IndexSimulatorInput({ onSimulate, isLoading, setIsLoading }: IndexSimulatorInputProps) {
    const [sql, setSql] = useState("")
    const [proposedIndex, setProposedIndex] = useState("")
    const [error, setError] = useState<string | null>(null)

    const handleSimulate = async () => {
        if (!sql.trim() || !proposedIndex.trim()) return

        setIsLoading(true)
        setError(null)

        try {
            const res = await trackedFetch(`${API_BASE}/simulate-index`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sql: sql.trim(),
                    proposed_index: proposedIndex.trim()
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || `API Error: ${res.status}`)
            }

            const data: IndexSimulationResponse = await res.json()
            onSimulate(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to simulate index")
        } finally {
            setIsLoading(false)
        }
    }

    const loadDemoData = () => {
        setSql("SELECT * FROM orders WHERE customer_id = 9921 AND status = 'PENDING'")
        setProposedIndex("CREATE INDEX idx_cust_status ON orders(customer_id, status)")
    }

    return (
        <div className="space-y-4">
            <Card className="border-border/40 bg-muted/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Zap className="w-4 h-4 text-primary" />
                            Virtual Index Simulator
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadDemoData}
                            className="text-xs h-7 border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        >
                            <Database className="w-3 h-3 mr-1.5" />
                            Load Demo
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                            SQL Query
                        </label>
                        <textarea
                            value={sql}
                            onChange={(e) => setSql(e.target.value)}
                            placeholder="SELECT * FROM orders WHERE customer_id = 123"
                            className="w-full h-24 p-3 bg-card/50 border border-border rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border focus:ring-1 focus:ring-border resize-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                            Proposed Index
                        </label>
                        <textarea
                            value={proposedIndex}
                            onChange={(e) => setProposedIndex(e.target.value)}
                            placeholder="CREATE INDEX idx_customer ON orders(customer_id)"
                            className="w-full h-16 p-3 bg-card/50 border border-border rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border focus:ring-1 focus:ring-border resize-none"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-md flex items-center gap-2">
                            <div className="text-xs text-red-400">{error}</div>
                        </div>
                    )}

                    <Button
                        onClick={handleSimulate}
                        disabled={!sql.trim() || !proposedIndex.trim() || isLoading}
                        className="w-full h-9 bg-background text-foreground hover:bg-muted transition-colors font-medium text-xs"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Simulating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5 mr-2" />
                                Simulate Index
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

// Recommendation styling
const recommendationStyles = {
    "HIGHLY RECOMMENDED": {
        bg: "bg-primary/5",
        border: "border-emerald-900/50",
        text: "text-primary"
    },
    "RECOMMENDED": {
        bg: "bg-primary/5",
        border: "border-emerald-900/50",
        text: "text-primary"
    },
    "MARGINAL": {
        bg: "bg-amber-500/5",
        border: "border-amber-900/50",
        text: "text-amber-500"
    },
    "NOT RECOMMENDED": {
        bg: "bg-red-500/5",
        border: "border-red-900/50",
        text: "text-red-500"
    }
}

interface IndexSimulatorResultPanelProps {
    result: IndexSimulationResponse | null
    isLoading: boolean
}

function ExplainPlanCard({ plan, title, variant }: { plan: ExplainPlan, title: string, variant: "before" | "after" }) {
    const isBefore = variant === "before"

    return (
        <Card className={`flex-1 transition-all duration-500 ${isBefore ? "border-border bg-muted/30" : "border-emerald-900/30 bg-emerald-950/10"}`}>
            <CardHeader className="pb-2">
                <CardTitle className={`text-xs font-bold uppercase tracking-wider ${isBefore ? "text-muted-foreground" : "text-primary"}`}>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Access Type</span>
                    <Badge
                        variant="outline"
                        className={`font-mono text-[10px] transition-all duration-500 ${plan.access_type === "ALL" ? "text-red-400 border-red-900/50 bg-red-950/20" :
                            plan.access_type === "ref" || plan.access_type === "eq_ref" ? "text-primary border-emerald-900/50 bg-emerald-950/20" :
                                "text-amber-400 border-amber-900/50 bg-amber-950/20"
                            }`}
                    >
                        {plan.access_type}
                    </Badge>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Rows Examined</span>
                    <AnimatedNumber
                        value={plan.rows_examined}
                        duration={1200}
                        className={`font-mono text-sm font-bold ${isBefore ? "text-red-400" : "text-primary"}`}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Key</span>
                    <span className={`font-mono text-xs ${isBefore ? "text-muted-foreground" : "text-primary"}`}>
                        {plan.key || "None"}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Est. Time</span>
                    <AnimatedNumber
                        value={plan.estimated_time_ms}
                        duration={1200}
                        formatFn={(n) => `${n.toFixed(2)} ms`}
                        className={`font-mono text-sm ${isBefore ? "text-red-400" : "text-primary"}`}
                    />
                </div>

                {plan.extra && (
                    <div className="pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">Extra: </span>
                        <span className="text-[10px] text-muted-foreground">{plan.extra}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

import { CopilotChat, CopilotInput } from "@/components/ui/copilot"
import { Message } from "@/types"
import { Bot, Trash2 } from "lucide-react"

export function IndexSimulatorResultPanel({
    result,
    isLoading
}: IndexSimulatorResultPanelProps) {

    // Loading state
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center border-l border-border bg-card">
                <ReasoningLoader steps={INDEX_SIMULATION_STEPS} colorVariant="emerald" />
            </div>
        )
    }

    // Empty state
    if (!result) {
        return (
            <div className="h-full border-l border-border bg-card">
                <EmptyState
                    icon={Database}
                    title="No Simulation Yet"
                    description="Enter SQL and proposed index to see improvement."
                />
            </div>
        )
    }

    const style = recommendationStyles[result.recommendation] || recommendationStyles["RECOMMENDED"]

    return (
        <div className="flex flex-col h-full border-l border-border bg-card">
            <div className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Improvement Header */}
                    <div className={`p-6 rounded-md ${style.border} ${style.bg} border transition-all duration-500`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className={`w-6 h-6 ${style.text}`} />
                                <div>
                                    <div className={`text-3xl font-bold ${style.text} tracking-tight`}>
                                        <AnimatedNumber
                                            value={result.improvement_percent}
                                            duration={1500}
                                            formatFn={(n) => `${n.toFixed(1)}%`}
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Improvement</div>
                                </div>
                            </div>
                            <Badge className={`${style.bg} ${style.border} ${style.text} border px-3 py-1 text-xs font-mono tracking-wide`}>
                                {result.recommendation}
                            </Badge>
                        </div>

                        {/* Improvement Bar */}
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-1000"
                                style={{ width: `${Math.min(result.improvement_percent, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Before/After Comparison */}
                    <div className="flex gap-4">
                        <ExplainPlanCard plan={result.current_plan} title="Current Plan" variant="before" />
                        <div className="flex items-center justify-center pt-8">
                            <ArrowRight className="w-5 h-5 text-foreground" />
                        </div>
                        <ExplainPlanCard plan={result.with_index_plan} title="With Index" variant="after" />
                    </div>

                    {/* AI Analysis */}
                    <div className="space-y-2">
                        <SectionHeader icon={Lightbulb} title="AI Analysis" />
                        <div className="p-4 rounded-md border border-border bg-muted/50">
                            <p className="text-sm text-foreground leading-relaxed">{result.ai_analysis}</p>
                        </div>
                    </div>

                    {/* CREATE INDEX SQL */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <SectionHeader icon={Database} title="Create Index SQL" variant="emerald" />
                            <CopyButton text={result.create_index_sql} />
                        </div>
                        <CodeContainer code={result.create_index_sql} />
                    </div>

                </div>
            </div>
        </div>
    )
}
