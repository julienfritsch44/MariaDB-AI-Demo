import { motion } from "framer-motion"
import { Bot, Database, Zap, Ticket, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ComparisonPanelProps {
    className?: string
    copilotResponse?: string
    finopsResponse?: {
        suggestion: string
        jiraTicket?: { id: string; title: string; similarity: number }
    }
    isLoading?: boolean
}

export function ComparisonPanel({
    className,
    copilotResponse = "This query performs a full table scan because there is no index on the customer_id column. Consider adding an index to improve performance.",
    finopsResponse = {
        suggestion: "CREATE INDEX idx_customer_id ON orders(customer_id)",
        jiraTicket: {
            id: "MDEV-30820",
            title: "Optimizer chooses full scan even when index exists",
            similarity: 0.92
        }
    },
    isLoading = false
}: ComparisonPanelProps) {
    return (
        <div className={cn("grid grid-cols-2 gap-4", className)}>
            {/* Left: Generic Copilot Response */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                        <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-zinc-300">Generic AI Copilot</h4>
                        <p className="text-[10px] text-zinc-500">Standard LLM response</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-sm text-zinc-400 leading-relaxed">
                        {copilotResponse}
                    </p>

                    {/* Limitations */}
                    <div className="mt-4 pt-3 border-t border-zinc-800">
                        <div className="flex items-start gap-2 text-xs text-zinc-500">
                            <span className="text-amber-500">⚠️</span>
                            <span>No knowledge of your past incidents or internal solutions</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Right: FinOps Auditor Response */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-zinc-900/50 border border-emerald-500/30 rounded-lg overflow-hidden relative"
            >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-900/20 border-b border-emerald-500/20 relative">
                    <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                        <Database className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-emerald-300">FinOps Auditor</h4>
                        <p className="text-[10px] text-emerald-500/70">Powered by your Jira knowledge base</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold uppercase">
                        Recommended
                    </span>
                </div>

                {/* Content */}
                <div className="p-4 relative">
                    {/* The Ah-ha moment: Jira ticket match */}
                    {finopsResponse.jiraTicket && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mb-4 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Ticket className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-bold text-emerald-400 uppercase">
                                        Historical Match Found!
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-12 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full"
                                            style={{ width: `${finopsResponse.jiraTicket.similarity * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-mono text-emerald-400">
                                        {(finopsResponse.jiraTicket.similarity * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>

                            <div
                                className="cursor-pointer hover:bg-emerald-900/30 p-2 -m-1 rounded transition-colors"
                                onClick={() => window.open(`https://jira.mariadb.org/browse/${finopsResponse.jiraTicket?.id}`, '_blank')}
                            >
                                <div className="font-mono text-sm text-emerald-300 font-bold">
                                    {finopsResponse.jiraTicket.id}
                                </div>
                                <div className="text-xs text-zinc-400 mt-0.5">
                                    {finopsResponse.jiraTicket.title}
                                </div>
                            </div>

                            <p className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-emerald-500/20">
                                💡 This exact issue was solved by your team in 2021
                            </p>
                        </motion.div>
                    )}

                    {/* Solution */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-semibold text-zinc-300 uppercase">
                                Proven Solution
                            </span>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                            <code className="text-sm text-emerald-300 font-mono">
                                {finopsResponse.suggestion}
                            </code>
                        </div>
                    </div>

                    {/* Advantage */}
                    <div className="mt-4 pt-3 border-t border-emerald-500/20">
                        <div className="flex items-start gap-2 text-xs text-emerald-400">
                            <span>✅</span>
                            <span>Grounded in 1,350+ real Jira tickets from your organization</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

// Standalone comparison for demo purposes
export function CopilotVsFinOps() {
    return (
        <div className="p-6 bg-zinc-950 min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Title */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                        Why FinOps Auditor?
                    </h2>
                    <p className="text-zinc-500">
                        See the difference between generic AI and knowledge-grounded AI
                    </p>
                </div>

                {/* Query Context */}
                <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                    <div className="text-[10px] uppercase text-zinc-500 mb-2 font-bold">
                        Analyzing Query
                    </div>
                    <code className="text-sm text-amber-300 font-mono">
                        SELECT * FROM orders WHERE customer_id = 12345
                    </code>
                </div>

                {/* Comparison */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <ArrowRight className="w-5 h-5 text-zinc-600" />
                    <div className="flex-1 h-px bg-zinc-800" />
                </div>

                <ComparisonPanel />
            </div>
        </div>
    )
}
