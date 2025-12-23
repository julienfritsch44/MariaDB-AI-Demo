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
            const res = await fetch(`${API_BASE}/predict`, {
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
            <Card className="border-border/40 bg-zinc-900/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                            <ShieldAlert className="w-4 h-4 text-emerald-500" />
                            SQL Query Risk Analysis
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadDemoQuery}
                            className="text-xs h-7 border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
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
                        className="w-full h-40 p-3 bg-zinc-950/50 border border-zinc-800 rounded-md font-mono text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none"
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
                        className="w-full h-9 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors font-medium text-xs"
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
        bg: "bg-emerald-500/5",
        border: "border-emerald-900/50",
        text: "text-emerald-500",
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
        bg: "bg-zinc-500/5",
        border: "border-zinc-800",
        text: "text-zinc-500",
        icon: AlertTriangle,
        glow: ""
    }
}

import { CopilotChat, CopilotInput } from "@/components/ui/copilot"
import { Message } from "@/types"

interface PredictorResultPanelProps {
    result: PredictResponse | null
    isLoading: boolean
    // Chat Props
    chatMessages: Message[]
    chatInput: string
    setChatInput: (value: string) => void
    isChatLoading: boolean
    onChatSend: (text?: string) => void
    onChatClear?: () => void
}

function RagScanningAnimation() {
    const [scanText, setScanText] = useState("MDEV-10342")
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        // Animate fake ticket IDs
        const tickets = [
            "MDEV-12932", "KB-4092", "CON-2931", "MDEV-9921", "MDEV-3012",
            "MDEV-11200", "KB-3301", "MDEV-4402", "MDEV-8821", "CON-1021"
        ]

        const interval = setInterval(() => {
            const randomTicket = tickets[Math.floor(Math.random() * tickets.length)]
            setScanText(randomTicket)
        }, 100)

        // Animate progress bar
        const progressInterval = setInterval(() => {
            setProgress(p => Math.min(p + 2, 100))
        }, 50)

        return () => {
            clearInterval(interval)
            clearInterval(progressInterval)
        }
    }, [])

    return (
        <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-8 border-l border-zinc-800 bg-zinc-950">
            <div className="relative mb-6">
                <div className="relative p-4 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Database className="w-8 h-8 text-zinc-400 animate-pulse" />
                </div>
            </div>

            <h3 className="text-sm font-medium text-zinc-300 mb-2">
                Searching Knowledge Base...
            </h3>

            <div className="flex items-center gap-2 mb-6 font-mono text-xs text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Checking:</span>
                <span className="text-zinc-300 w-24">{scanText}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div
                    className="h-full bg-zinc-500 transition-all duration-75"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}

import { SectionHeader } from "@/components/ui/section-header"
import { CopyButton } from "@/components/ui/copy-button"
import { EmptyState } from "@/components/ui/empty-state"
import { CodeContainer } from "@/components/ui/code-container"
import { Bot, User, Send, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"

export function PredictorResultPanel({
    result,
    isLoading,
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading,
    onChatSend,
    onChatClear
}: PredictorResultPanelProps) {

    // Loading state
    if (isLoading) {
        return <RagScanningAnimation />
    }

    // Empty state
    if (!result) {
        return (
            <div className="h-full border-l border-zinc-800 bg-zinc-950">
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
        <div className="flex flex-col h-full border-l border-zinc-800 bg-zinc-950">
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
                                    <div className="text-xs text-zinc-500 mt-1">
                                        Risk Score: <span className="font-mono text-zinc-300">{result.risk_score}/100</span>
                                    </div>
                                </div>
                            </div>

                            {/* Risk Meter */}
                            <div className="w-32">
                                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${result.risk_level === "LOW" ? "bg-emerald-500" :
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
                        <div className="p-4 rounded-md border border-zinc-800 bg-zinc-900/50">
                            <p className="text-sm text-zinc-300 leading-relaxed">{result.reason}</p>
                        </div>
                    </div>

                    {/* Query Analysis */}
                    {result.query_analysis && (
                        <div className="space-y-2">
                            <SectionHeader icon={Lightbulb} title="Technical Analysis" />
                            <div className="p-4 rounded-md border border-zinc-800 bg-zinc-900/50">
                                <p className="text-sm text-zinc-400 leading-relaxed">{result.query_analysis}</p>
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
                        <div className="space-y-2">
                            <SectionHeader icon={ExternalLink} title="Knowledge Base Matches" />
                            <div className="space-y-2">
                                {result.similar_issues.slice(0, 5).map((issue: SimilarIssue) => (
                                    <a
                                        key={issue.id}
                                        href={`https://jira.mariadb.org/browse/${issue.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-3 bg-zinc-900/30 rounded-md border border-zinc-800 hover:border-zinc-600 transition-colors group"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono text-xs text-emerald-500 group-hover:text-emerald-400">
                                                {issue.id}
                                            </span>
                                            <span className="text-[10px] text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded-full">
                                                {issue.similarity.toFixed(0)}% match
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                            {issue.summary}
                                        </p>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Copilot Chat */}
                    <CopilotChat
                        messages={chatMessages}
                        isLoading={isChatLoading}
                        onClear={onChatClear}
                        className="min-h-[200px] max-h-[300px]"
                    />
                </div>
            </div>

            {/* Sticky Bottom Input */}
            <CopilotInput
                value={chatInput}
                onChange={setChatInput}
                onSend={() => onChatSend()}
                isLoading={isChatLoading}
            />
        </div>
    )
}

// Keep old component for backwards compatibility but mark as deprecated
/** @deprecated Use QueryPredictorInput and PredictorResultPanel separately */
export function QueryPredictor() {
    return null
}

