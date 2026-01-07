"use client"

import React, { useEffect, useState } from "react"
import { NeuralCore } from "./NeuralCore"
import { BentoTile } from "./BentoTile"
import { DetailModal } from "./DetailModal"
import { TrendingUp, Activity, ShieldAlert, Zap, DollarSign, Brain, Sun, Moon, X, Check, Archive, Database, Server, ArrowRight, AlertTriangle, Target, BookOpen } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { motion, AnimatePresence } from "framer-motion"

interface NeuralDashboardProps {
    onBack: () => void
    analysis: any
}

interface MetricsHistory {
    financial_impact: number[]
    risk_score: number[]
    neural_score: number[]
    rag_memory: number[]
}

interface LiveMetrics {
    financial_impact: number
    risk_score: number
    neural_score: number
    rag_memory_count: number
    query_count: number
    high_risk_count: number
    avg_query_time: number
    status: string
}

export function NeuralDashboard({ onBack, analysis }: NeuralDashboardProps) {
    const [metricsHistory, setMetricsHistory] = useState<MetricsHistory | null>(null)
    const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null)
    const [showFinanceDetails, setShowFinanceDetails] = useState(false)
    const [showRiskDetails, setShowRiskDetails] = useState(false)
    const [showNeuralDetails, setShowNeuralDetails] = useState(false)
    const [showRAGDetails, setShowRAGDetails] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const { theme, setTheme } = useTheme()

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

    // Gestion du mode plein écran
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullscreen(true)
            }).catch(err => {
                console.error('Error attempting to enable fullscreen:', err)
            })
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => {
                    setIsFullscreen(false)
                })
            }
        }
    }

    useEffect(() => {
        // Fetch historical metrics for sparklines
        fetch('http://127.0.0.1:8000/metrics/history')
            .then(res => res.json())
            .then(data => setMetricsHistory(data))
            .catch(err => console.error('Failed to fetch metrics history:', err))

        // Fetch live metrics for dashboard
        const fetchLiveMetrics = () => {
            fetch('http://127.0.0.1:8000/metrics/neural-dashboard')
                .then(res => res.json())
                .then(data => setLiveMetrics(data))
                .catch(err => console.error('Failed to fetch live metrics:', err))
        }

        fetchLiveMetrics()
        const interval = setInterval(fetchLiveMetrics, 5000) // Update every 5 seconds

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        // Gestionnaire d'événement pour F11
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F11') {
                e.preventDefault()
                toggleFullscreen()
            }
        }

        // Gestionnaire pour détecter les changements de plein écran (ESC, etc.)
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        window.addEventListener('keydown', handleKeyDown)
        document.addEventListener('fullscreenchange', handleFullscreenChange)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
        }
    }, [])

    return (
        <div className="flex-1 overflow-y-auto neural-grid min-h-screen p-6 bg-background text-foreground transition-colors duration-300 relative">

            <div className="grid grid-cols-12 gap-4 max-w-[1800px] mx-auto z-10 relative">
                {/* Row 1: Left Stats - Center Visual - Right Stats */}

                {/* Left Col */}
                <div className="col-span-12 lg:col-span-3 space-y-4">
                    <div onClick={() => setShowFinanceDetails(true)} className="cursor-pointer group relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                        <BentoTile
                            title="Financial Impact"
                            subtitle="LEAKAGE ANALYSIS"
                            icon={DollarSign}
                            priority="high"
                            sparklineData={metricsHistory?.financial_impact}
                            sparklineColor="rgb(245, 158, 11)"
                        >
                            <div className="py-4">
                                <div className="text-6xl font-black text-amber-500 tracking-tighter group-hover:scale-110 transition-transform origin-left">
                                    ${liveMetrics?.financial_impact?.toLocaleString() || '14,250'}
                                </div>
                                <div className="flex items-center gap-2 mt-3 text-xs font-mono">
                                    <TrendingUp className="w-4 h-4 text-red-500" />
                                    <span className="text-red-500">+12% vs last month</span>
                                </div>
                                <div className="mt-2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <span>Click to view breakdown</span>
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </BentoTile>
                    </div>

                    <div onClick={() => setShowRiskDetails(true)} className="cursor-pointer group relative">
                        <div className="absolute inset-0 bg-red-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                        <BentoTile
                            title="Risk Assessment"
                            subtitle="AUTO-PREDICT"
                            icon={ShieldAlert}
                            sparklineData={metricsHistory?.risk_score}
                            sparklineColor="rgb(239, 68, 68)"
                        >
                            <div className="space-y-5 py-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-2xl font-bold italic">HIGH</span>
                                    <span className="text-xs font-mono text-muted-foreground">{liveMetrics?.risk_score?.toFixed(0) || '84'}/100</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${liveMetrics?.risk_score || 84}%` }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic border-l border-white/10 pl-3">
                                    Detected 3 potential deadlocks in production branch within last 15 minutes.
                                </p>
                                <div className="mt-2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <span>Click for detailed analysis</span>
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </BentoTile>
                    </div>
                </div>

                {/* Center Col - The Neural Core */}
                <div className="col-span-12 lg:col-span-6 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-[150px]" />
                    <NeuralCore />
                </div>

                {/* Right Col */}
                <div className="col-span-12 lg:col-span-3 space-y-4">
                    <div onClick={() => setShowNeuralDetails(true)} className="cursor-pointer group relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                        <BentoTile
                            title="Neural Score"
                            subtitle="GLOBAL PERFORMANCE"
                            icon={Activity}
                            priority="high"
                            sparklineData={metricsHistory?.neural_score}
                            sparklineColor="rgb(0, 169, 206)"
                        >
                            <div className="py-4">
                                <div className="text-8xl font-black text-primary tracking-tighter group-hover:scale-110 transition-transform origin-left">
                                    {liveMetrics?.neural_score?.toFixed(1) || '98.2'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-3 uppercase tracking-tight">Optimal Efficiency Baseline</p>
                                <div className="mt-2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <span>View performance metrics</span>
                                    <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </BentoTile>
                    </div>

                    <div onClick={() => setShowRAGDetails(true)} className="cursor-pointer group relative">
                        <div className="absolute inset-0 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                        <BentoTile
                            title="RAG Memory"
                            subtitle="KB SEEDS"
                            icon={Zap}
                            sparklineData={metricsHistory?.rag_memory}
                            sparklineColor="rgb(139, 92, 246)"
                        >
                            <div className="flex items-center gap-4 py-4">
                                <div className="text-5xl font-bold tracking-tighter group-hover:scale-110 transition-transform origin-left text-purple-500">
                                    {liveMetrics?.rag_memory_count?.toLocaleString() || '12,847'}
                                </div>
                                <div className="flex-1">
                                    <div className="text-[8px] text-muted-foreground uppercase mb-1">Jira Semantic Links</div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <div key={i} className="flex-1 h-3 bg-primary/20 rounded-sm animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <span>Explore knowledge base</span>
                                <ArrowRight className="w-3 h-3" />
                            </div>
                        </BentoTile>
                    </div>
                </div>

                {/* Row 2: Bottom Wide Tiles */}
                <div className="col-span-12">
                    <BentoTile title="Neural Insights" subtitle="AUTONOMOUS REASONING" icon={Brain} priority="high">
                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mt-2">
                            <h4 className="text-[10px] font-bold text-primary uppercase mb-2">Predictive Action:</h4>
                            <p className="text-xs text-foreground/90 leading-relaxed italic">
                                "I've identified an indexing opportunity on the 'orders' table. Implementing this could reduce total leakage by 14% based on similar historical patterns in the production branch."
                            </p>
                            <button className="mt-4 w-full py-2 bg-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-primary/80 transition-all">
                                Execute Optimization
                            </button>
                        </div>
                    </BentoTile>
                </div>
            </div>

            {/* Indicateur Mode Plein Écran */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isFullscreen ? 0 : 0.4, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="fixed bottom-6 right-6 z-40 pointer-events-none select-none"
            >
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border shadow-lg">
                    <kbd className="px-2 py-1 text-[10px] font-mono font-bold bg-muted text-foreground rounded border border-border">
                        F11
                    </kbd>
                    <span className="text-[10px] text-muted-foreground font-medium">
                        Mode Présentation
                    </span>
                </div>
            </motion.div>

            {/* Footer Branding */}
            <div className="mt-20 text-center opacity-30 select-none">
                <div className="text-[8px] font-black uppercase tracking-[1em] mb-4">MariaDB Intelligence Layer</div>
                <div className={`h-[1px] w-40 mx-auto ${theme === 'dark' ? 'bg-gradient-to-r from-transparent via-white to-transparent' : 'bg-gradient-to-r from-transparent via-slate-900 to-transparent'}`} />
            </div>

            {/* FINANCIAL DETAILS MODAL */}
            <AnimatePresence>
                {showFinanceDetails && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowFinanceDetails(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl"
                        >
                            <button
                                onClick={() => setShowFinanceDetails(false)}
                                className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold tracking-tight">Financial Breakdown</h2>
                                        <p className="text-xs text-muted-foreground uppercase tracking-widest">FinOps Optimization Report</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 rounded-xl border bg-muted/50 border-border">
                                    <div className="text-sm text-muted-foreground mb-1">Monthly Savings</div>
                                    <div className="text-3xl font-black text-emerald-500">${liveMetrics?.financial_impact?.toLocaleString() || '14,250'}</div>
                                    <div className="text-xs text-emerald-500/80 font-mono mt-1">+12.5% projected</div>
                                </div>
                                <div className="p-4 rounded-xl border bg-muted/50 border-border">
                                    <div className="text-sm text-muted-foreground mb-1">Annual Projection</div>
                                    <div className="text-3xl font-black text-foreground">$171,000</div>
                                    <div className="text-xs text-muted-foreground font-mono mt-1">Based on current trajectory</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { icon: Archive, label: "Intelligent Archiving", desc: "Cold storage optimization", gain: "$6,200/mo", percent: "-60% storage" },
                                    { icon: Database, label: "Query Optimization", desc: "Index & plan improvements", gain: "$4,800/mo", percent: "+67% speed" },
                                    { icon: ShieldAlert, label: "Incident Prevention", desc: "Downtime avoidance", gain: "$3,250/mo", percent: "18.5h saved" },
                                    { icon: Server, label: "Resource Throttling", desc: "CPU/RAM right-sizing", gain: "Pending", percent: "Analysis..." }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 border-border hover:border-primary/30 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold">{item.label}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono uppercase">{item.desc}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm font-bold ${item.gain === 'Pending' ? 'text-muted-foreground italic' : 'text-emerald-500'}`}>{item.gain}</div>
                                            <div className="text-[10px] text-muted-foreground">{item.percent}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-dashed border-white/10 flex justify-between items-center">
                                <div className="text-[10px] text-muted-foreground italic">
                                    Last audited: 12 mins ago
                                </div>
                                <button
                                    onClick={() => setShowFinanceDetails(false)}
                                    className="px-4 py-2 bg-primary text-black text-xs font-bold uppercase rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Close Report
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* RISK DETAILS MODAL */}
            <DetailModal
                isOpen={showRiskDetails}
                onClose={() => setShowRiskDetails(false)}
                title="Risk Assessment Details"
                subtitle="AUTO-PREDICT ANALYSIS"
                icon={ShieldAlert}
                iconColor="text-red-500"
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-xl border bg-red-500/5 border-red-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold">Current Risk Level</span>
                            <span className="text-2xl font-black text-red-500">
                                {liveMetrics?.risk_score && liveMetrics.risk_score > 70 ? 'HIGH' : liveMetrics?.risk_score && liveMetrics.risk_score > 40 ? 'MEDIUM' : 'LOW'} ({liveMetrics?.risk_score?.toFixed(0) || '84'}/100)
                            </span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${liveMetrics?.risk_score || 84}%` }} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-bold mb-3">Detected Issues</h3>
                        {[
                            { icon: AlertTriangle, title: "Potential Deadlock #1", severity: "CRITICAL", desc: "Query on `orders` table holding lock for 2.3s", time: "2 mins ago" },
                            { icon: AlertTriangle, title: "Potential Deadlock #2", severity: "HIGH", desc: "Concurrent UPDATE on `inventory` detected", time: "8 mins ago" },
                            { icon: AlertTriangle, title: "Potential Deadlock #3", severity: "MEDIUM", desc: "Long-running transaction on `customers`", time: "15 mins ago" }
                        ].map((issue, idx) => (
                            <div key={idx} className="p-3 rounded-lg border bg-muted/50 border-border">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                        <issue.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-bold">{issue.title}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${issue.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                                                issue.severity === 'HIGH' ? 'bg-orange-500 text-white' :
                                                    'bg-amber-500 text-white'
                                                }`}>{issue.severity}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{issue.desc}</p>
                                        <span className="text-[10px] text-muted-foreground italic">{issue.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DetailModal>

            {/* NEURAL SCORE DETAILS MODAL */}
            <DetailModal
                isOpen={showNeuralDetails}
                onClose={() => setShowNeuralDetails(false)}
                title="Neural Score Breakdown"
                subtitle="GLOBAL PERFORMANCE METRICS"
                icon={Activity}
                iconColor="text-primary"
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-xl border bg-primary/5 border-primary/20">
                        <div className="text-center">
                            <div className="text-6xl font-black text-primary mb-2">{liveMetrics?.neural_score?.toFixed(1) || '98.2'}</div>
                            <p className="text-xs text-muted-foreground uppercase">Optimal Efficiency Baseline</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Query Optimization", score: 99, icon: Target },
                            { label: "Resource Utilization", score: 97, icon: Zap },
                            { label: "Incident Prevention", score: 98, icon: ShieldAlert },
                            { label: "Knowledge Coverage", score: 99, icon: BookOpen }
                        ].map((metric, idx) => (
                            <div key={idx} className="p-3 rounded-lg border bg-muted/50 border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <metric.icon className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold">{metric.label}</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <span className="text-2xl font-black text-primary">{metric.score}</span>
                                    <span className="text-[10px] text-muted-foreground">/100</span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                                    <div className="h-full bg-primary" style={{ width: `${metric.score}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                        <div className="text-sm font-bold text-emerald-500 mb-2">✓ System Health: Excellent</div>
                        <p className="text-xs text-muted-foreground">All subsystems operating within optimal parameters. No action required.</p>
                    </div>
                </div>
            </DetailModal>

            {/* RAG MEMORY DETAILS MODAL */}
            <DetailModal
                isOpen={showRAGDetails}
                onClose={() => setShowRAGDetails(false)}
                title="RAG Knowledge Base"
                subtitle="SEMANTIC MEMORY ANALYSIS"
                icon={Brain}
                iconColor="text-purple-500"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl border bg-purple-500/5 border-purple-500/20">
                            <div className="text-sm text-muted-foreground mb-1">Total Embeddings</div>
                            <div className="text-3xl font-black text-purple-500">{liveMetrics?.rag_memory_count?.toLocaleString() || '12,847'}</div>
                            <div className="text-xs text-muted-foreground font-mono mt-1">Jira + Docs</div>
                        </div>
                        <div className="p-4 rounded-xl border bg-muted/50 border-border">
                            <div className="text-sm text-muted-foreground mb-1">Avg Similarity</div>
                            <div className="text-3xl font-black text-foreground">94.2%</div>
                            <div className="text-xs text-emerald-500 font-mono mt-1">+2.1% vs last week</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-bold mb-2">Knowledge Sources</h3>
                        {[
                            { source: "MariaDB Jira Issues", count: "8,420", coverage: 85, color: "text-red-500" },
                            { source: "Official Documentation", count: "3,127", coverage: 95, color: "text-blue-500" },
                            { source: "Community Forums", count: "1,300", coverage: 72, color: "text-amber-500" }
                        ].map((item, idx) => (
                            <div key={idx} className="p-3 rounded-lg border bg-muted/50 border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="text-sm font-bold">{item.source}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{item.count} embeddings</div>
                                    </div>
                                    <div className={`text-lg font-black ${item.color}`}>{item.coverage}%</div>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.color.replace('text-', 'bg-')}`} style={{ width: `${item.coverage}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                        <div className="text-sm font-bold text-primary mb-2">📊 Last Sync: 3 hours ago</div>
                        <p className="text-xs text-muted-foreground">Next scheduled update in 45 minutes. Auto-refresh enabled.</p>
                    </div>
                </div>
            </DetailModal>
        </div>
    )
}
