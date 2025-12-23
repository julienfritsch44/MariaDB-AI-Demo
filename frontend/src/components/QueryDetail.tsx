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
    Trash2
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

interface QueryDetailProps {
    suggestion: Suggestion | null
    query: SlowQuery | null
    isLoading: boolean

    // Chat Props
    chatMessages: Message[]
    chatInput: string
    setChatInput: (value: string) => void
    isChatLoading: boolean
    onChatSend: (text?: string) => void
    onChatClear?: () => void
}

export function QueryDetail({
    suggestion,
    query,
    isLoading,
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading,
    onChatSend,
    onChatClear
}: QueryDetailProps) {


    // Pre-fill chat input when query changes
    useEffect(() => {
        if (query) {
            setChatInput("How can I optimize this query?")
        }
    }, [query, setChatInput])

    const [sectionsOpen, setSectionsOpen] = useState({
        explanation: false,
        assessment: false,
        insights: false,
        risks: false,
        confidence: false,
        sources: false,
        costAnalysis: false
    })

    const toggleSection = (section: keyof typeof sectionsOpen) => {
        setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }))
    }


    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center border-l border-zinc-800 bg-zinc-950">
                <ReasoningLoader />
            </div>
        )
    }

    if (!suggestion || !query) {
        return (
            <div className="h-full border-l border-zinc-800 bg-zinc-950">
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
        <div className="flex flex-col h-full border-l border-zinc-800 bg-zinc-950">
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
                                        <Badge variant="outline" className="text-[10px] bg-zinc-950/50 border-zinc-800 text-zinc-400">
                                            Rows: {query.rows_examined.toLocaleString()}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] bg-zinc-950/50 border-zinc-800 text-zinc-400">
                                            Time: {(query.query_time * 1000).toFixed(2)}ms
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Savings & Confidence Grid */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-right">
                                {/* Savings (Primary) */}
                                <div className="col-span-2 group cursor-pointer" onClick={() => toggleSection('costAnalysis')}>
                                    <div className="text-[10px] uppercase text-emerald-500/70 font-bold flex items-center justify-end gap-1">
                                        Est. Monthly Savings
                                        <ChevronDown className="w-3 h-3" />
                                    </div>
                                    <div className="text-2xl font-mono font-bold text-emerald-400 flex items-center justify-end">
                                        <DollarSign className="w-5 h-5 mr-0.5" />
                                        {estimatedSavings}
                                    </div>
                                </div>

                                {/* Confidence (Secondary) */}
                                <div className="group cursor-pointer mt-2" onClick={() => toggleSection('confidence')}>
                                    <div className="text-[10px] uppercase text-zinc-500 font-semibold mb-0.5 flex items-center justify-end gap-1">
                                        Confidence
                                        <ChevronDown className="w-3 h-3" />
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5">
                                        <div className="h-1.5 w-12 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full"
                                                style={{ width: `${suggestion.confidence * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono font-bold text-emerald-500">{(suggestion.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                </div>

                                {/* Cost (Secondary) */}
                                <div className="mt-2">
                                    <div className="text-[10px] uppercase text-zinc-500 font-semibold mb-0.5">
                                        New Cost
                                    </div>
                                    <div className="text-xs font-mono font-bold text-zinc-300">
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
                                            <span className="text-zinc-500 block">Rows Examined (Overhead)</span>
                                            <span className="text-zinc-300 font-mono">{query.rows_examined.toLocaleString()} rows</span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500 block">Estimated Compute Cost</span>
                                            <span className="text-zinc-300 font-mono">
                                                {((query.rows_examined / 1000000) * 0.02).toFixed(4)} credits/exec
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-600 pt-2 border-t border-emerald-900/20 mt-2">
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
                                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                                    <SectionHeader icon={Info} title="Why this confidence?" className="mb-2" />
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        {suggestion.confidence_breakdown}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Original */}
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase text-zinc-500 font-semibold pl-1">Current Slow Query</div>
                                    <CodeContainer code={query.sql_text} className="bg-zinc-900/30 border border-zinc-800" />
                                </div>

                                {/* New */}
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase text-emerald-500/70 font-semibold pl-1">Optimized Query</div>
                                    <CodeContainer code={suggestion.sql_fix} className="bg-zinc-950 border border-emerald-900/30" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Progressive Disclosure Sections (Grid Layout) */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Diagnosis */}
                        <div className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/20 h-fit">
                            <button
                                onClick={() => toggleSection('explanation')}
                                className="w-full flex items-center justify-between p-3 px-4 hover:bg-zinc-900 transition-colors"
                            >
                                <span className="text-sm font-semibold flex items-center gap-2 text-zinc-400">
                                    <Search className="w-4 h-4" /> Diagnosis
                                </span>
                                {sectionsOpen.explanation ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                            </button>
                            <AnimatePresence>
                                {sectionsOpen.explanation && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 pt-0 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800">
                                            <div className="pt-3">{suggestion.query_explanation}</div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Performance Assessment */}
                        <div className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/20 h-fit">
                            <button
                                onClick={() => toggleSection('assessment')}
                                className="w-full flex items-center justify-between p-3 px-4 hover:bg-zinc-900 transition-colors"
                            >
                                <span className="text-sm font-semibold flex items-center gap-2 text-zinc-400">
                                    <Scale className="w-4 h-4" /> Performance Assessment
                                </span>
                                {sectionsOpen.assessment ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                            </button>
                            <AnimatePresence>
                                {sectionsOpen.assessment && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 pt-0 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800">
                                            <div className="pt-3">{suggestion.performance_assessment}</div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Detailed Insights */}
                        <div className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/20 h-fit">
                            <button
                                onClick={() => toggleSection('insights')}
                                className="w-full flex items-center justify-between p-3 px-4 hover:bg-zinc-900 transition-colors"
                            >
                                <span className="text-sm font-semibold flex items-center gap-2 text-zinc-400">
                                    <Lightbulb className="w-4 h-4" /> Detailed Insights
                                </span>
                                {sectionsOpen.insights ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                            </button>
                            <AnimatePresence>
                                {sectionsOpen.insights && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 pt-0 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800">
                                            <div className="pt-3">{suggestion.actionable_insights}</div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Risk Assessment (Normalized Style) */}
                        <div className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/20 h-fit">
                            <button
                                onClick={() => toggleSection('risks')}
                                className="w-full flex items-center justify-between p-3 px-4 hover:bg-zinc-900 transition-colors"
                            >
                                <span className="text-sm font-semibold flex items-center gap-2 text-zinc-400">
                                    <ShieldAlert className="w-4 h-4" /> Risk Assessment
                                </span>
                                {sectionsOpen.risks ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                            </button>
                            <AnimatePresence>
                                {sectionsOpen.risks && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 pt-0 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800">
                                            {suggestion.risks && suggestion.risks.length > 0 ? (
                                                <ul className="space-y-1.5 pt-3">
                                                    {suggestion.risks.map((risk, idx) => (
                                                        <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                                                            <span className="text-zinc-600 block mt-0.5">•</span>
                                                            {risk}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-zinc-500 pt-3">No significant risks identified.</p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 5. Sources Footnote (Now Grid Item) */}
                        {Object.keys(suggestion.source_justifications).length > 0 && (
                            <div className="col-span-2 border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/20 h-fit">
                                <button
                                    onClick={() => toggleSection('sources')}
                                    className="w-full flex items-center justify-between p-3 px-4 hover:bg-zinc-900 transition-colors"
                                >
                                    <span className="text-sm font-semibold flex items-center gap-2 text-zinc-400">
                                        <Ticket className="w-4 h-4" /> Grounded in Real Data ({Object.keys(suggestion.source_justifications).length})
                                    </span>
                                    {sectionsOpen.sources ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                                </button>

                                <AnimatePresence>
                                    {sectionsOpen.sources && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 grid grid-cols-1 gap-2 border-t border-zinc-800">
                                                <div className="pt-3 space-y-2">
                                                    {Object.entries(suggestion.source_justifications).map(([source, justification], idx) => (
                                                        <div key={idx} className="flex flex-col border border-zinc-800 rounded-md hover:bg-zinc-900/50 transition-colors">
                                                            <div
                                                                className="block p-3 bg-zinc-900/30 rounded-md border border-zinc-800 hover:border-zinc-600 transition-colors group cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const isJira = source.toLowerCase().startsWith("jira:");
                                                                    const jiraKey = source.split(":")[1];
                                                                    const docUrl = source.substring("documentation:".length);
                                                                    const url = isJira
                                                                        ? `https://jira.mariadb.org/browse/${jiraKey}`
                                                                        : (docUrl.startsWith("http") ? docUrl : `https://mariadb.com/kb/en/${docUrl}`);
                                                                    window.open(url, '_blank');
                                                                }}
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-mono text-xs text-emerald-500 group-hover:text-emerald-400 font-bold uppercase tracking-wider">
                                                                        {source.toLowerCase().startsWith("jira") ? source.split(":")[1] : "MariaDB Docs"}
                                                                    </span>
                                                                    <span className="text-[10px] text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                                        <ExternalLink className="w-2 h-2" /> Open
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                                                    {justification}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Copilot Chat (Log Only) */}
                    <CopilotChat
                        messages={chatMessages}
                        isLoading={isChatLoading}
                        onClear={onChatClear}
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
