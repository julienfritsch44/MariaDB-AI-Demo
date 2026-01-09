"use client"

import { SlowQueryTable } from "@/components/SlowQueryTable"
import { DiagnosticStatus } from "@/components/DiagnosticStatus"
import { Brain, List, Workflow, Activity, Trash2, ShoppingCart } from "lucide-react"

import { SlowQuery, QueryAnalysis, HistoryItem } from "@/types"

interface SidebarContentProps {
    activeTab: string
    analysis: QueryAnalysis | null
    selectedQuery: SlowQuery | null
    handleAnalyze: (id: number) => void
    unifiedHistory: HistoryItem[]
    setUnifiedHistory: (history: HistoryItem[]) => void
    setSelectedHistoryItem: (item: HistoryItem) => void
}

export function SidebarContent({
    activeTab,
    analysis,
    selectedQuery,
    handleAnalyze,
    unifiedHistory,
    setUnifiedHistory,
    setSelectedHistoryItem
}: SidebarContentProps) {
    return (
        <div className="w-[380px] border-r border-border flex flex-col bg-muted shrink-0 overflow-hidden">
            {/* Header of Sidebar */}
            <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-card/50 dark:bg-muted/20">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {activeTab === "shop" ? "DEMO APP" :
                        activeTab === "queries" ? "QUERY LOGS" :
                            activeTab === "unified" ? "UNIFIED ANALYZER" :
                                activeTab === "predictor" ? "RISK ANALYSIS" :
                                    activeTab === "simulator" ? "INDEX LAB" :
                                        activeTab === "sandbox" ? "SMART SANDBOX" :
                                            activeTab === "planstability" ? "PLAN STABILITY" :
                                                activeTab === "branching" ? "DB BRANCHING" :
                                                    activeTab === "diagnostic" ? "DIAGNOSTICS" :
                                                        activeTab === "mcp" ? "AI COPILOT" : "SELF-HEALING"}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60">v11.4.2</span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {activeTab === "shop" ? (
                    <div className="p-8 text-center text-zinc-500 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
                            <ShoppingCart className="w-6 h-6 text-zinc-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-zinc-300">Application Dashboard</h3>
                            <p className="text-xs mt-2 leading-relaxed">
                                Interact with the application in the right panel to generate real-time database traffic and slow query logs.
                            </p>
                        </div>
                    </div>
                ) : ["predictor", "rewriter", "sandbox", "simulator"].includes(activeTab) ? (
                    <div className="p-0">
                        <div className="p-4 border-b border-border bg-card/30">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <List className="w-3 h-3" />
                                Select Query to Analyze
                            </div>
                        </div>
                        {analysis ? (
                            <SlowQueryTable
                                queries={analysis.top_queries}
                                onAnalyze={handleAnalyze}
                                activeQueryId={selectedQuery?.id}
                            />
                        ) : (
                            <div className="p-8 text-center text-xs text-muted-foreground">Loading queries...</div>
                        )}
                    </div>
                ) : activeTab === "unified" ? (
                    <div className="p-4 space-y-4">
                        <div className="text-xs font-semibold text-muted-foreground mb-3">Analysis History</div>
                        {unifiedHistory.length === 0 ? (
                            <div className="text-xs text-muted-foreground/60 text-center py-8">
                                No queries analyzed yet
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {unifiedHistory.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedHistoryItem(item)}
                                        className="w-full p-3 rounded-md bg-muted/50 hover:bg-muted border border-border/40 hover:border-primary/50 transition-all text-left group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-bold ${item.risk_level === 'HIGH' ? 'text-red-400' :
                                                item.risk_level === 'MEDIUM' ? 'text-amber-400' :
                                                    'text-emerald-400'
                                                }`}>
                                                {item.risk_level} ({item.risk_score})
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(item.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="text-xs font-mono text-foreground/80 truncate group-hover:text-primary transition-colors">
                                            {item.sql}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {unifiedHistory.length > 0 && (
                            <button
                                onClick={() => setUnifiedHistory([])}
                                className="w-full mt-4 p-2 text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-md hover:bg-muted/50 transition-colors"
                            >
                                Clear History
                            </button>
                        )}
                    </div>
                ) : activeTab === "diagnostic" ? (
                    <div className="p-4 space-y-4">
                        <DiagnosticStatus />
                    </div>
                ) : analysis ? (
                    <div className="p-2">
                        <SlowQueryTable
                            queries={analysis.top_queries}
                            onAnalyze={handleAnalyze}
                            activeQueryId={selectedQuery?.id}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs">Connecting...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Footer Metrics */}
            <div className="p-4 border-t border-border bg-card/50 space-y-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-tighter">
                    <span className="text-muted-foreground">Global Score</span>
                    <span className="text-primary font-bold">{analysis?.global_score ?? 0}</span>
                </div>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${analysis?.global_score ?? 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span>SkySQL Active</span>
                    </div>
                    <span>{analysis?.total_queries ?? 0} Samples</span>
                </div>

                {/* NEURAL CORE COUNTER */}
                <div className="pt-2 mt-2 border-t border-border/50">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                                <Brain className="w-3 h-3 text-primary animate-pulse" />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Neural Core</span>
                        </div>
                        <span className="text-[10px] font-mono text-primary font-bold">
                            {analysis?.kb_count ? analysis.kb_count.toLocaleString() : "1,350"} Incidents
                        </span>
                    </div>
                    <p className="text-[8px] text-muted-foreground/60 mt-1 leading-tight italic">
                        Proactive RAG grounded in MariaDB Jira history.
                    </p>
                </div>
            </div>
        </div>
    )
}
