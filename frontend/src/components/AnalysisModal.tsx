import { Suggestion, SlowQuery } from "@/types"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    CheckCircle2,
    Ticket,
    Lightbulb,
    ExternalLink,
    TrendingDown,
    DollarSign,
    Activity,
    Copy,
    Search,
    AlertTriangle,
    Zap,
    Scale
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface AnalysisModalProps {
    isOpen: boolean
    onClose: () => void
    suggestion: Suggestion | null
    query: SlowQuery | null
    isLoading: boolean
}

const containerVars = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const itemVars = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
}

export function AnalysisModal({ isOpen, onClose, suggestion, query, isLoading }: AnalysisModalProps) {
    const [copied, setCopied] = useState(false)

    if (!suggestion && !isLoading) return null

    // ROI Estimation Logic
    const calculateSavings = () => {
        if (!query) return 0
        const overhead = Math.max(0, query.rows_examined - query.rows_sent)
        return (overhead * 0.0002).toFixed(2)
    }

    const estimatedSavings = calculateSavings()

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success("SQL Fix copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[750px] bg-card/95 text-card-foreground border-border/60 max-h-[90vh] overflow-y-auto shadow-2xl backdrop-blur-xl">
                <DialogHeader className="border-b border-border/50 pb-4">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                        <motion.div
                            initial={{ scale: 0.8, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="p-2 bg-primary/20 rounded-lg"
                        >
                            <Zap className="w-6 h-6 text-primary" />
                        </motion.div>
                        Query Performance Review
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground/60 text-sm">
                        AI-Powered Diagnostics & Remediation
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 space-y-6"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <Search className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                        </div>
                        <p className="text-muted-foreground font-medium animate-pulse tracking-wide">
                            Consulting MariaDB Knowledge Base & 1,400+ Jira Tickets...
                        </p>
                    </motion.div>
                ) : suggestion ? (
                    <motion.div
                        variants={containerVars}
                        initial="hidden"
                        animate="visible"
                        className="space-y-8 py-6"
                    >
                        {/* Status Bar */}
                        <motion.div variants={itemVars} className="flex flex-wrap items-center gap-3">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1.5 font-semibold">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                            </Badge>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5 font-semibold">
                                {suggestion.suggestion_type}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1.5 font-semibold">
                                <TrendingDown className="w-4 h-4 mr-2" />
                                Impact: High
                            </Badge>
                        </motion.div>

                        {/* FinOps High-Visibility Metrics */}
                        <motion.div variants={itemVars} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="group bg-emerald-500/[0.03] border border-emerald-500/20 p-5 rounded-2xl transition-all hover:bg-emerald-500/[0.06] hover:border-emerald-500/40">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                                        <DollarSign className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-400/50 uppercase tracking-widest bg-emerald-500/5 px-2 py-1 rounded">Estimated ROI</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">${estimatedSavings} <span className="text-xs font-normal text-emerald-400/60 lowercase">/ mo</span></p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Projected SkySQL Credit reduction</p>
                                </div>
                            </div>

                            <div className="group bg-violet-500/[0.03] border border-violet-500/20 p-5 rounded-2xl transition-all hover:bg-violet-500/[0.06] hover:border-violet-500/40">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2.5 bg-violet-500/10 rounded-xl">
                                        <Activity className="w-6 h-6 text-violet-400" />
                                    </div>
                                    <span className="text-[10px] font-bold text-violet-400/50 uppercase tracking-widest bg-violet-500/5 px-2 py-1 rounded">IOPS Reduction</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-violet-400 font-mono tracking-tight">
                                        -{query && query.rows_examined > 0 ? ((1 - query.rows_sent / query.rows_examined) * 100).toFixed(1) : 0}%
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Disk I/O efficiency gain</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Structured Analysis (Supabase Style) */}
                        <div className="space-y-6">
                            <motion.section variants={itemVars} className="space-y-3">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4" /> 1) What the query does
                                </h4>
                                <div className="bg-muted/30 p-4 rounded-xl border border-border/40 leading-relaxed text-sm text-foreground/90">
                                    {suggestion.query_explanation}
                                </div>
                            </motion.section>

                            <motion.section variants={itemVars} className="space-y-3">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-amber-500/70 flex items-center gap-2">
                                    <Scale className="w-4 h-4" /> 2) Performance assessment
                                </h4>
                                <div className="bg-muted/30 p-4 rounded-xl border border-border/40 leading-relaxed text-sm text-foreground/90">
                                    {suggestion.performance_assessment}
                                </div>
                            </motion.section>

                            <motion.section variants={itemVars} className="space-y-3">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-500/70 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> 3) Actionable optimization suggestions
                                </h4>
                                <div className="bg-muted/30 p-4 rounded-xl border border-border/40 leading-relaxed text-sm text-foreground/90">
                                    {suggestion.actionable_insights}
                                </div>
                            </motion.section>
                        </div>

                        {/* Direct SQL Fix (If available) */}
                        <AnimatePresence>
                            {suggestion.sql_fix && (
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-primary/5 border border-primary/20 rounded-xl overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border-b border-primary/20">
                                        <span className="text-xs font-bold uppercase tracking-widest text-primary">Prescribed SQL Fix</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 gap-2 text-[10px] hover:bg-primary/20"
                                            onClick={() => copyToClipboard(suggestion.sql_fix!)}
                                        >
                                            <Copy className="w-3 h-3" />
                                            {copied ? "Copied!" : "Copy Fix"}
                                        </Button>
                                    </div>
                                    <div className="p-4 overflow-x-auto">
                                        <code className="text-sm font-mono text-primary/90 whitespace-nowrap">
                                            {suggestion.sql_fix}
                                        </code>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Knowledge Base Sources (Jira Justifications) */}
                        {Object.keys(suggestion.source_justifications).length > 0 && (
                            <motion.div variants={itemVars} className="pt-4 border-t border-border/50">
                                <h4 className="font-bold mb-4 text-sm flex items-center gap-2 text-muted-foreground">
                                    <Ticket className="w-4 h-4" />
                                    Supporting Knowledge Base (MDEVs)
                                </h4>
                                <div className="grid gap-3">
                                    {Object.entries(suggestion.source_justifications).map(([source, justification], idx) => {
                                        const jiraKey = source.includes(":") ? source.split(":")[1] : source;
                                        const jiraUrl = `https://jira.mariadb.org/browse/${jiraKey}`;

                                        return (
                                            <motion.div
                                                key={idx}
                                                whileHover={{ x: 5 }}
                                                className="group bg-muted/20 p-3 rounded-xl border border-border/30 hover:bg-muted/40 transition-colors"
                                            >
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-background/50">
                                                        {source}
                                                    </Badge>
                                                    <a
                                                        href={jiraUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] text-primary hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        View Ticket <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
                                                </div>
                                                <p className="text-xs text-muted-foreground italic leading-relaxed">
                                                    "{justification}"
                                                </p>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
