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
                className="bg-muted/50 border border-border rounded-lg overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50/50 border-b border-border">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                        <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-foreground">Generic AI Copilot</h4>
                        <p className="text-[10px] text-muted-foreground">Standard LLM response</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {copilotResponse}
                    </p>

                    {/* Limitations */}
                    <div className="mt-4 pt-3 border-t border-border">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
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
                className="bg-muted/50 border border-primary/30 rounded-lg overflow-hidden relative"
            >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-900/20 border-b border-primary/20 relative">
                    <div className="p-1.5 bg-primary/20 rounded-lg">
                        <Database className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-emerald-300">FinOps Auditor</h4>
                        <p className="text-[10px] text-primary/70">Powered by your Jira knowledge base</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 bg-primary/20 text-primary rounded-full font-bold uppercase">
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
                            className="mb-4 p-3 bg-emerald-900/20 border border-primary/30 rounded-lg"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Ticket className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-primary uppercase">
                                        Historical Match Found!
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-12 h-1.5 bg-muted/70 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{ width: `${finopsResponse.jiraTicket.similarity * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-mono text-primary">
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
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    {finopsResponse.jiraTicket.title}
                                </div>
                            </div>

                            <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-primary/20">
                                💡 This exact issue was solved by your team in 2021
                            </p>
                        </motion.div>
                    )}

                    {/* Solution */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-semibold text-foreground uppercase">
                                Proven Solution
                            </span>
                        </div>
                        <div className="bg-card border border-border rounded p-3">
                            <code className="text-sm text-emerald-300 font-mono">
                                {finopsResponse.suggestion}
                            </code>
                        </div>
                    </div>

                    {/* Advantage */}
                    <div className="mt-4 pt-3 border-t border-primary/20">
                        <div className="flex items-start gap-2 text-xs text-primary">
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
        <div className="p-6 bg-card min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Title */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        Why FinOps Auditor?
                    </h2>
                    <p className="text-muted-foreground">
                        See the difference between generic AI and knowledge-grounded AI
                    </p>
                </div>

                {/* Query Context */}
                <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg">
                    <div className="text-[10px] uppercase text-muted-foreground mb-2 font-bold">
                        Analyzing Query
                    </div>
                    <code className="text-sm text-amber-300 font-mono">
                        SELECT * FROM orders WHERE customer_id = 12345
                    </code>
                </div>

                {/* Comparison */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-muted/50" />
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1 h-px bg-muted/50" />
                </div>

                <ComparisonPanel />
            </div>
        </div>
    )
}
