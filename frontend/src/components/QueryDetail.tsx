import { Suggestion, SlowQuery, Message } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    CheckCircle2,
    Ticket,
    Lightbulb,
    ExternalLink,
    DollarSign,
    Search,
    Zap,
    Scale,
    Info,
    ShieldAlert,
    ChevronDown,
    ChevronUp,
    Bot,
    Send,
    User,
    Sparkles,
    Trash2,
    Database
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { ReasoningLoader } from "@/components/ui/reasoning-loader"
import { SectionHeader } from "@/components/ui/section-header"
import { CopyButton } from "@/components/ui/copy-button"
import { EmptyState } from "@/components/ui/empty-state"
import { CodeContainer } from "@/components/ui/code-container"
import { CopilotChat, CopilotInput } from "@/components/ui/copilot"
import { ComparisonPanel } from "@/components/ui/comparison-panel"
import { trackedFetch } from "@/lib/usePerformance"

interface QueryDetailProps {
    suggestion: Suggestion | null
    query: SlowQuery | null
    isLoading: boolean
}

export function QueryDetail({
    suggestion,
    query,
    isLoading
}: QueryDetailProps) {



    const [sectionsOpen, setSectionsOpen] = useState({
        explanation: false,
        assessment: false,
        insights: false,
        risks: false,
        confidence: false,
        sources: false,
        costAnalysis: false,
        comparison: false
    })

    const toggleSection = (section: keyof typeof sectionsOpen) => {
        setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const [isApplyingFix, setIsApplyingFix] = useState(false)

    const handleApplyFix = async () => {
        if (!suggestion?.sql_fix) return

        setIsApplyingFix(true)
        try {
            const res = await trackedFetch("http://localhost:8000/execute-fix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sql: suggestion.sql_fix,
                    database: query?.db || "shop_demo"
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success("Optimization applied successfully!", {
                    description: "The database has been updated with the suggested fix.",
                    duration: 5000
                })
            } else {
                toast.error("Execution failed", {
                    description: data.error || "Unknown error occurred"
                })
            }
        } catch (error) {
            toast.error("Connection failed", {
                description: "Ensure backend is running."
            })
        } finally {
            setIsApplyingFix(false)
        }
    }


    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center border-l border-border bg-card">
                <ReasoningLoader />
            </div>
        )
    }

    if (!suggestion || !query) {
        return (
            <div className="h-full border-l border-border bg-card">
                <EmptyState
                    icon={Search}
                    title="Select a Query"
                    description="Choose a slow query to analyze."
                />
            </div>
        )
    }

    // ROI Estimation Logic
    const calculateSavings = () => {
        if (!query) return 0
        const overhead = Math.max(0, query.rows_examined - query.rows_sent)
        return (overhead * 0.0002).toFixed(2)
    }

    const estimatedSavings = calculateSavings()

    return (
        <div className="flex flex-col h-full border-l border-border bg-card">
            <div className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-zinc-800">
                {/* 1. Ultra-Dense Header Metrics Row (Sticky) */}
                {/* ... (Keep existing Metric Header as is, but maybe less sticky if scroll container changes?) */}
                {/* Actually, if we want sticky header inside the scroll view, it works fine. */}

                {/* Main Content Area */}
                <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

                    {/* 1. Hero Card Summary (Unified Design) */}
                    <div className={cn(
                        "p-6 rounded-md border",
                        query.impact_score > 80 ? "bg-red-500/10 border-red-900/50" :
                            query.impact_score > 50 ? "bg-amber-500/10 border-amber-900/50" :
                                "bg-teal-500/10 border-teal-900/50"
                    )}>
                        <div className="flex items-start justify-between">
                            {/* Left: Impact Score */}
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-3 rounded-full border",
                                    query.impact_score > 80 ? "bg-red-500/20 border-red-500/30" :
                                        query.impact_score > 50 ? "bg-amber-500/20 border-amber-500/30" :
                                            "bg-teal-500/20 border-teal-500/30"
                                )}>
                                    <Zap className={cn(
                                        "w-6 h-6",
                                        query.impact_score > 80 ? "text-red-500" :
                                            query.impact_score > 50 ? "text-amber-500" :
                                                "text-teal-500"
                                    )} />
                                </div>
                                <div>
                                    <h3 className={cn(
                                        "text-2xl font-bold tracking-tight",
                                        query.impact_score > 80 ? "text-red-500" :
                                            query.impact_score > 50 ? "text-amber-500" :
                                                "text-teal-500"
                                    )}>
                                        {query.impact_score} <span className="text-sm font-medium opacity-80">IMPACT SCORE</span>
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-[10px] bg-card/50 border-border text-muted-foreground">
                                            Rows: {query.rows_examined.toLocaleString()}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] bg-card/50 border-border text-muted-foreground">
                                            Time: {(query.query_time * 1000).toFixed(2)}ms
                                        </Badge>
                                        {suggestion.analysis_time_ms && (
                                            <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary/80 flex items-center gap-1">
                                                <Zap className="w-2.5 h-2.5" /> AI: {suggestion.analysis_time_ms}ms
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Savings & Confidence Grid */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-right">
                                {/* Savings (Primary) */}
                                <div className="col-span-2 group cursor-pointer" onClick={() => toggleSection('costAnalysis')}>
                                    <div className="text-[10px] uppercase text-primary/70 font-bold flex items-center justify-end gap-1">
                                        Est. Monthly Savings
                                        <ChevronDown className="w-3 h-3" />
                                    </div>
                                    <div className="text-2xl font-mono font-bold text-primary flex items-center justify-end">
                                        <DollarSign className="w-5 h-5 mr-0.5" />
                                        {estimatedSavings}
                                    </div>
                                </div>

                                {/* Confidence (Secondary) */}
                                <div className="group cursor-pointer mt-2" onClick={() => toggleSection('confidence')}>
                                    <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5 flex items-center justify-end gap-1">
                                        Confidence
                                        <ChevronDown className="w-3 h-3" />
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5">
                                        <div className="h-1.5 w-12 bg-muted/50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full"
                                                style={{ width: `${suggestion.confidence * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono font-bold text-primary">{(suggestion.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                </div>

                                {/* Cost (Secondary) */}
                                <div className="mt-2">
                                    <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">
                                        New Cost
                                    </div>
                                    <div className="text-xs font-mono font-bold text-foreground">
                                        ${suggestion.cost_with_fix || '0.00'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cost Analysis Details (Collapsible) */}
                    <AnimatePresence>
                        {sectionsOpen.costAnalysis && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                                animate={{ height: "auto", opacity: 1, marginBottom: 20 }}
                                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-md p-4 space-y-2">
                                    <SectionHeader icon={DollarSign} title="ROI Calculation Logic" variant="emerald" className="mb-2" />
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="text-muted-foreground block">Rows Examined (Overhead)</span>
                                            <span className="text-foreground font-mono">{query.rows_examined.toLocaleString()} rows</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Estimated Compute Cost</span>
                                            <span className="text-foreground font-mono">
                                                {((query.rows_examined / 1000000) * 0.02).toFixed(4)} credits/exec
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-emerald-900/20 mt-2">
                                        *Estimates based on standard cloud compute credits per million rows scanned. Actual savings depend on query frequency and instance type.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>


                    {/* Confidence Details (Collapsible) */}
                    <AnimatePresence>
                        {sectionsOpen.confidence && suggestion.confidence_breakdown && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                                animate={{ height: "auto", opacity: 1, marginBottom: 20 }}
                                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-muted border border-border rounded-md p-4">
                                    <SectionHeader icon={Info} title="Why this confidence?" className="mb-2" />
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {suggestion.confidence_breakdown}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Why FinOps? Comparison Section */}
                    <div className="border border-border rounded-md overflow-hidden bg-gradient-to-r from-emerald-500/5 to-zinc-900/20">
                        <button
                            onClick={() => toggleSection('comparison')}
                            className="w-full flex items-center justify-between p-3 px-4 hover:bg-muted/50 transition-colors"
                        >
                            <span className="text-sm font-semibold flex items-center gap-2 text-primary">
                                <Sparkles className="w-4 h-4" /> Why FinOps Auditor?
                            </span>
                            {sectionsOpen.comparison ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <AnimatePresence>
                            {sectionsOpen.comparison && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 pt-0 border-t border-border">
                                        <div className="pt-3">
                                            <ComparisonPanel
                                                copilotResponse="This query performs a full table scan because there is no index on the filtered column. Consider adding an index to improve performance."
                                                finopsResponse={{
                                                    suggestion: suggestion.sql_fix || "CREATE INDEX for faster lookups",
                                                    jiraTicket: Object.keys(suggestion.source_justifications).length > 0 ? {
                                                        id: Object.keys(suggestion.source_justifications)[0]?.split(':')[1] || "MDEV-30820",
                                                        title: Object.values(suggestion.source_justifications)[0]?.slice(0, 60) + "..." || "Optimizer issue",
                                                        similarity: suggestion.confidence
                                                    } : undefined
                                                }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 2. Side-by-Side Comparison */}
                    {suggestion.sql_fix && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <SectionHeader icon={Zap} title="Optimization Proposal" />
                                <div className="flex items-center gap-2">
                                    <CopyButton
                                        text={suggestion.sql_fix!}
                                        label="Copy New SQL"
                                        className="h-6 gap-2 text-[10px]"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 gap-2 text-[10px] bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:text-emerald-300 transition-all"
                                        onClick={handleApplyFix}
                                        disabled={isApplyingFix}
                                    >
                                        <Database className={cn("w-3 h-3", isApplyingFix && "animate-spin")} />
                                        {isApplyingFix ? "Applying..." : "Apply Optimization"}
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Original */}
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase text-muted-foreground font-semibold pl-1">Current Slow Query</div>
                                    <CodeContainer code={query.sql_text} className="bg-muted/30 border border-border" />
                                </div>

                                {/* New */}
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase text-primary/70 font-semibold pl-1">Optimized Query</div>
                                    <CodeContainer code={suggestion.sql_fix} className="bg-card border border-emerald-900/30" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Progressive Disclosure Sections (Grid Layout) */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Diagnosis */}
                        {suggestion.query_explanation && (
                            <div className="border border-border rounded-md overflow-hidden bg-muted/20 h-fit">
                                <button
                                    onClick={() => toggleSection('explanation')}
                                    className="w-full flex items-center justify-between p-3 px-4 hover:bg-muted transition-colors"
                                >
                                    <span className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                        <Search className="w-4 h-4" /> Diagnosis
                                    </span>
                                    {sectionsOpen.explanation ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                </button>
                                <AnimatePresence>
                                    {sectionsOpen.explanation && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 text-sm text-foreground leading-relaxed border-t border-border">
                                                <div className="pt-3">{suggestion.query_explanation}</div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Performance Assessment */}
                        {suggestion.performance_assessment && (
                            <div className="border border-border rounded-md overflow-hidden bg-muted/20 h-fit">
                                <button
                                    onClick={() => toggleSection('assessment')}
                                    className="w-full flex items-center justify-between p-3 px-4 hover:bg-muted transition-colors"
                                >
                                    <span className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                        <Scale className="w-4 h-4" /> Performance Assessment
                                    </span>
                                    {sectionsOpen.assessment ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                </button>
                                <AnimatePresence>
                                    {sectionsOpen.assessment && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 text-sm text-foreground leading-relaxed border-t border-border">
                                                <div className="pt-3">{suggestion.performance_assessment}</div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Detailed Insights */}
                        {suggestion.actionable_insights && (
                            <div className="border border-border rounded-md overflow-hidden bg-muted/20 h-fit">
                                <button
                                    onClick={() => toggleSection('insights')}
                                    className="w-full flex items-center justify-between p-3 px-4 hover:bg-muted transition-colors"
                                >
                                    <span className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                        <Lightbulb className="w-4 h-4" /> Detailed Insights
                                    </span>
                                    {sectionsOpen.insights ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                </button>
                                <AnimatePresence>
                                    {sectionsOpen.insights && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 text-sm text-foreground leading-relaxed border-t border-border">
                                                <div className="pt-3">{suggestion.actionable_insights}</div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Risk Assessment (Normalized Style) */}
                        <div className="border border-border rounded-md overflow-hidden bg-muted/20 h-fit">
                            <button
                                onClick={() => toggleSection('risks')}
                                className="w-full flex items-center justify-between p-3 px-4 hover:bg-muted transition-colors"
                            >
                                <span className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                    <ShieldAlert className="w-4 h-4" /> Risk Assessment
                                </span>
                                {sectionsOpen.risks ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </button>
                            <AnimatePresence>
                                {sectionsOpen.risks && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 pt-0 text-sm text-foreground leading-relaxed border-t border-border">
                                            {suggestion.risks && suggestion.risks.length > 0 ? (
                                                <ul className="space-y-1.5 pt-3">
                                                    {suggestion.risks.map((risk, idx) => (
                                                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                                            <span className="text-muted-foreground block mt-0.5">•</span>
                                                            {risk}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-muted-foreground pt-3">No significant risks identified.</p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 5. Sources Footnote (Now Grid Item) */}
                        {Object.keys(suggestion.source_justifications).length > 0 && (
                            <div className="col-span-2 border border-border rounded-md overflow-hidden bg-muted/20 h-fit">
                                <button
                                    onClick={() => toggleSection('sources')}
                                    className="w-full flex items-center justify-between p-3 px-4 hover:bg-muted transition-colors"
                                >
                                    <span className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                        <Ticket className="w-4 h-4" /> Grounded in Real Data ({Object.keys(suggestion.source_justifications).length})
                                    </span>
                                    {sectionsOpen.sources ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                </button>

                                <AnimatePresence>
                                    {sectionsOpen.sources && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 border-t border-border">
                                                <div className="pt-3 flex flex-col gap-1">
                                                    {Object.entries(suggestion.source_justifications).map(([source, justification], idx) => {
                                                        const isJira = source.toLowerCase().startsWith("jira:");
                                                        const jiraKey = source.split(":")[1];
                                                        const docUrl = source.substring("documentation:".length);
                                                        const url = isJira
                                                            ? `https://jira.mariadb.org/browse/${jiraKey}`
                                                            : (docUrl.startsWith("http") ? docUrl : `https://mariadb.com/kb/en/${docUrl}`);

                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group transition-colors border border-transparent hover:border-border cursor-pointer"
                                                                onClick={() => window.open(url, '_blank')}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <span className="shrink-0 text-xs font-mono text-primary group-hover:text-primary flex items-center gap-1">
                                                                        {isJira ? jiraKey : "MariaDB Docs"}
                                                                        <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                                                                    </span>

                                                                    <span className="text-xs text-muted-foreground truncate">
                                                                        {justification}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
