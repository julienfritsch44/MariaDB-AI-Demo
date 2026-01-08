"use client"

import React, { useEffect, useState } from "react"
import { NeuralCore } from "./NeuralCore"
import { BentoTile } from "./BentoTile"
import { DetailModal } from "./DetailModal"
import { TrendingUp, Activity, ShieldAlert, Zap, DollarSign, Brain, Sun, Moon, X, Check, Archive, Database, Server, ArrowRight, AlertTriangle, Target, BookOpen } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { motion, AnimatePresence } from "framer-motion"
import { DEMO_DEPLOYED_KEY } from "@/lib/constants"

interface NeuralDashboardProps {
    onBack: () => void
    analysis: any
    onNavigate?: (tab: "shop" | "predictor" | "simulator" | "rewriter" | "sandbox" | "unified" | "queries" | "diagnostic" | "mcp" | "planstability" | "branching" | "neural") => void
    isPresentationMode?: boolean
    onTogglePresentation?: () => void
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

export function NeuralDashboard({ onBack, analysis, onNavigate, isPresentationMode = false, onTogglePresentation }: NeuralDashboardProps) {
    const [metricsHistory, setMetricsHistory] = useState<MetricsHistory | null>(null)
    const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null)
    const [showFinanceDetails, setShowFinanceDetails] = useState(false)
    const [showRiskDetails, setShowRiskDetails] = useState(false)
    const [showNeuralDetails, setShowNeuralDetails] = useState(false)
    const [showRAGDetails, setShowRAGDetails] = useState(false)
    const [showInsightDetails, setShowInsightDetails] = useState(false)
    const [isOptimized, setIsOptimized] = useState(false) // State to avoid hydration mismatch
    const { theme, setTheme } = useTheme()

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

    // Unified effect for metrics combined
    useEffect(() => {
        // Fetch historical metrics for sparklines
        fetch('http://127.0.0.1:8000/metrics/history')
            .then(res => res.json())
            .then(data => setMetricsHistory(data))
            .catch(err => console.error('Failed to fetch metrics history:', err))

        // Fetch live metrics for dashboard
        const fetchLiveMetrics = () => {
            fetch('http://127.0.0.1:8000/metrics/neural-dashboard')
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    console.log('Neural metrics received:', data);

                    // DEMO MODE OVERRIDE after deployment
                    const isFlagInStorage = localStorage.getItem(DEMO_DEPLOYED_KEY) === 'true';
                    console.log('[Dashboard] FetchLiveMetrics - Flag in storage:', isFlagInStorage);

                    if (typeof window !== 'undefined' && isFlagInStorage) {
                        console.log('[Dashboard] APPLYING GREEN OVERRIDES');
                        setLiveMetrics({
                            ...data,
                            financial_impact: 1250,
                            risk_score: 8,
                            neural_score: 99.8,
                            status: 'live'
                        });
                    } else {
                        setLiveMetrics(data);
                    }
                })
                .catch(err => console.error('Failed to fetch live metrics:', err))
        }

        fetchLiveMetrics()
        const interval = setInterval(fetchLiveMetrics, 5000)

        return () => clearInterval(interval)
    }, [])

    // State sync for optimization flag
    useEffect(() => {
        const checkOptimization = () => {
            const raw = localStorage.getItem(DEMO_DEPLOYED_KEY);
            const optimized = raw === 'true';
            console.log('[Dashboard] Sync Effect - Raw storage:', raw, 'isOptimized:', optimized);
            setIsOptimized(optimized);
        };

        checkOptimization();
        // Check every second to be very reactive during the demo
        const interval = setInterval(checkOptimization, 1000);
        return () => clearInterval(interval);
    }, [])


    return (
        <div className={`flex-1 min-h-screen overflow-y-auto neural-grid p-6 bg-background text-foreground transition-all duration-700 relative ${isPresentationMode ? 'scale-[1.05] origin-top' : ''}`}>

            {/* Dashboard Header */}
            <div className="flex items-center justify-between mb-8 z-10 relative max-w-[1800px] mx-auto">
                <div>
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={`w-2 h-2 rounded-full ${isOptimized ? 'bg-emerald-500' : (liveMetrics?.status === 'live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500')}`}
                        />
                        <span className={`text-[8px] font-bold tracking-[0.1em] uppercase ${isOptimized ? 'text-emerald-500' : (liveMetrics?.status === 'live' ? 'text-emerald-500' : 'text-amber-500')}`}>
                            {isOptimized ? 'Live System Feed: Optimized State' : (liveMetrics?.status === 'live' ? 'Live System Feed Established' : 'Fallback Mode: Connection Lost')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Demo Control Buttons */}
                    <div className="flex items-center bg-card border border-border rounded-full px-2 py-1 gap-2">
                        <span className="text-[7px] font-black uppercase tracking-tighter text-muted-foreground ml-1">Demo Ctrl</span>
                        <button
                            onClick={() => {
                                localStorage.setItem(DEMO_DEPLOYED_KEY, 'true');
                                window.location.reload();
                            }}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${isOptimized ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted hover:bg-emerald-500/20 hover:text-emerald-500 border border-transparent'}`}
                            title="Force Green State"
                        >
                            Green
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem(DEMO_DEPLOYED_KEY);
                                window.location.reload();
                            }}
                            className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-muted hover:bg-red-500/20 hover:text-red-500 border border-transparent transition-all"
                            title="Reset to Initial State"
                        >
                            Reset
                        </button>
                    </div>
                    <button
                        onClick={onTogglePresentation}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all group"
                        title="Presentation Mode (F11)"
                    >
                        <Target className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">
                            {isPresentationMode ? 'Exit Presentation' : 'Presentation Mode'}
                        </span>
                    </button>

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-card border border-border hover:bg-muted transition-colors"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    <button
                        onClick={onBack}
                        className="p-2 rounded-full bg-card border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Back to Analyzer"
                    >
                        <X className="w-4 h-4 font-bold" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-4 max-w-[1800px] mx-auto z-10 relative">
                {/* Row 1: Left Stats - Center Visual - Right Stats */}

                {/* Left Col */}
                <div className="col-span-12 lg:col-span-3 space-y-4">
                    <div onClick={() => setShowFinanceDetails(true)} className="cursor-pointer group relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none" />
                        <BentoTile
                            title="Financial Impact"
                            subtitle="LEAKAGE ANALYSIS"
                            icon={DollarSign}
                            priority="high"
                            sparklineData={metricsHistory?.financial_impact}
                            sparklineColor={isOptimized ? "rgb(16, 185, 129)" : "rgb(245, 158, 11)"}
                            className={isOptimized ? 'alert-emerald' : ((liveMetrics?.financial_impact || 0) > 10000 ? 'alert-amber' : '')}
                        >
                            <div className="py-4">
                                <div className={`text-6xl font-black tracking-tighter group-hover:scale-110 transition-transform origin-left ${isOptimized ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    ${liveMetrics?.financial_impact?.toLocaleString() || '14,250'}
                                </div>
                                <div className="flex items-center gap-2 mt-3 text-xs font-mono">
                                    <TrendingUp className="w-4 h-4 text-red-500" />
                                    <span className="text-red-500">+12% vs last month</span>
                                </div>
                                <div className="mt-4 pt-3 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 h-0 group-hover:h-auto overflow-hidden">
                                    <p className="text-[9px] leading-relaxed text-muted-foreground">
                                        <span className="text-amber-500 font-bold uppercase block mb-1">FinOps Analysis:</span>
                                        Calculated by scanning <span className="text-foreground">Audit Logs</span> for unaccessed tables and estimating savings through <span className="text-foreground">MariaDB S3 Tiering</span>.
                                    </p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-[8px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">VERIFIED DATA</span>
                                        <div className="flex items-center gap-1 text-[10px] text-primary font-bold">
                                            <span>Full Report</span>
                                            <ArrowRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </BentoTile>
                    </div>

                    <div onClick={() => setShowRiskDetails(true)} className="cursor-pointer group relative">
                        <div className="absolute inset-0 bg-red-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none" />
                        <BentoTile
                            title="Risk Assessment"
                            subtitle="AUTO-PREDICT"
                            icon={ShieldAlert}
                            sparklineData={metricsHistory?.risk_score}
                            sparklineColor={isOptimized ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                            className={isOptimized ? 'alert-emerald' : ((liveMetrics?.risk_score || 0) > 70 ? 'alert-red' : '')}
                        >
                            <div className="space-y-5 py-4">
                                <div className="flex justify-between items-end">
                                    <span className={`text-2xl font-bold italic ${isOptimized ? 'text-emerald-500' : ''}`}>
                                        {isOptimized ? 'OPTIMAL' : 'HIGH'}
                                    </span>
                                    <span className={`text-xs font-mono ${isOptimized ? 'text-emerald-500/60' : 'text-muted-foreground'}`}>
                                        {liveMetrics?.risk_score?.toFixed(0) || (isOptimized ? '8' : '84')}/100
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${isOptimized ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${liveMetrics?.risk_score || (isOptimized ? 8 : 84)}%` }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic border-l border-white/10 pl-3">
                                    {isOptimized
                                        ? "1.4TB of cold data (700+ days) successfully archived to S3 storage tier."
                                        : "Detected 1.4TB of cold partitions (700 days unaccessed) on premium SSD storage."
                                    }
                                </p>
                                <div className="mt-4 pt-3 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 h-0 group-hover:h-auto overflow-hidden">
                                    <p className="text-[9px] leading-relaxed text-muted-foreground">
                                        <span className="text-red-500 font-bold uppercase block mb-1">Neural Prediction:</span>
                                        Real-time analysis of <span className="text-foreground">transaction wait-states</span> and lock contention patterns using heuristics.
                                    </p>
                                </div>
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
                    <div className={`absolute inset-0 rounded-full blur-[150px] transition-colors duration-1000 pointer-events-none ${isOptimized ? 'bg-emerald-500/10' : ((liveMetrics?.risk_score || 0) > 70 ? 'bg-red-500/20' : 'bg-primary/10')}`} />
                    <NeuralCore isAlert={!isOptimized && (liveMetrics?.risk_score || 0) > 70} isSuccess={isOptimized} />
                </div>

                {/* Right Col */}
                <div className="col-span-12 lg:col-span-3 space-y-4">
                    <div onClick={() => setShowNeuralDetails(true)} className="cursor-pointer group relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none" />
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
                        <div className="absolute inset-0 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none" />
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

                <div className="col-span-12">
                    <div onClick={() => setShowInsightDetails(true)} className="cursor-pointer group relative">
                        <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none" />
                        <BentoTile priority="high" title="Neural Insights" subtitle="AUTONOMOUS REASONING" icon={Brain}>
                            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mt-2">
                                <h4 className="text-[10px] font-bold text-primary uppercase mb-2">Predictive Action:</h4>
                                <p className="text-xs text-foreground/90 leading-relaxed italic">
                                    {isOptimized
                                        ? "Storage optimization complete. 1.4TB moved to S3. Monthly SSD leakage reduced by $13,000."
                                        : "I've identified 1.4TB of cold partitions (700+ days) on premium storage. Moving this to MariaDB S3 Tiering will reduce leakage by $6,200/mo."
                                    }
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowInsightDetails(true); }}
                                    className="mt-4 w-full py-2 bg-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-primary/80 transition-all"
                                >
                                    Execute Optimization
                                </button>
                            </div>
                        </BentoTile>
                    </div>
                </div>
            </div>

            {/* Redundant presentation mode bottom label removed as it is in the header */}

            {/* Footer Branding */}
            {!isPresentationMode && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    className="mt-20 text-center select-none"
                >
                    <div className="text-[8px] font-black uppercase tracking-[1em] mb-4">MariaDB Intelligence Layer</div>
                    <div className={`h-[1px] w-40 mx-auto ${theme === 'dark' ? 'bg-gradient-to-r from-transparent via-white to-transparent' : 'bg-gradient-to-r from-transparent via-slate-900 to-transparent'}`} />
                </motion.div>
            )}

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
                                    <div className="text-3xl font-black text-emerald-500">${isOptimized ? '13,000' : '0'}</div>
                                    <div className="text-xs text-emerald-500/80 font-mono mt-1">+{isOptimized ? '91%' : '0%'} projected</div>
                                </div>
                                <div className="p-4 rounded-xl border bg-muted/50 border-border">
                                    <div className="text-sm text-muted-foreground mb-1">Annual Projection</div>
                                    <div className="text-3xl font-black text-foreground">${isOptimized ? '156,000' : '0'}</div>
                                    <div className="text-xs text-muted-foreground font-mono mt-1">Based on storage tier ROI</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { icon: Archive, label: "Intelligent Archiving", desc: "Auto-move cold data to S3", gain: "$6,200/mo", percent: "-60% storage" },
                                    { icon: Database, label: "Query Optimization", desc: "AI-driven index pruning", gain: "$4,800/mo", percent: "+67% speed" },
                                    { icon: ShieldAlert, label: "Incident Avoidance", desc: "Predictive deadlock prevention", gain: "$3,250/mo", percent: "18.5h saved" },
                                    { icon: Server, label: "Resource Right-sizing", desc: "CPU/RAM allocation audit", gain: "Pending", percent: "Analysis..." }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 border-border hover:border-primary/30 transition-colors group relative">
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
                                        {/* Verification Tooltip Mockup */}
                                        <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-popover border border-border text-[8px] rounded opacity-0 group-hover:opacity-100 pointer-events-none z-20 shadow-xl whitespace-nowrap">
                                            Verified via `mariadb-audit-log` analysis
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <p className="text-[10px] text-emerald-500 italic leading-tight">
                                    "Intelligent Archiving" estimates are based on 1.4TB of cold partitions (700+ days) identified in the `shop_demo.orders` table.
                                </p>
                            </div>

                            <div className="mt-6 pt-6 border-t border-dashed border-white/10 flex justify-between items-center gap-3">
                                <div className="text-[10px] text-muted-foreground italic">
                                    Last audited: 12 mins ago
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setShowFinanceDetails(false);
                                            if (onNavigate) {
                                                onNavigate('unified');
                                            } else {
                                                onBack();
                                            }
                                        }}
                                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-emerald-500 transition-all flex items-center gap-2"
                                    >
                                        Analyze Slow Queries
                                        <ArrowRight className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => setShowFinanceDetails(false)}
                                        className="px-4 py-2 bg-muted text-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted/80 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
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

                    <button
                        onClick={() => {
                            setShowRiskDetails(false);
                            if (onNavigate) {
                                onNavigate('unified');
                            } else {
                                onBack();
                            }
                        }}
                        className="w-full mt-4 py-3 bg-red-500 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2 group"
                    >
                        <span>Analyze Slow Queries</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
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
                            { source: "MariaDB Jira Issues", count: "8,420", coverage: 85, color: "text-red-500", url: "https://jira.mariadb.org", isSimulated: false },
                            { source: "Official Documentation", count: "3,127", coverage: 95, color: "text-blue-500", url: "https://mariadb.com/kb", isSimulated: true },
                            { source: "Community Forums", count: "1,300", coverage: 72, color: "text-amber-500", url: "https://mariadb.com/community", isSimulated: true }
                        ].map((item, idx) => (
                            <a
                                key={idx}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-3 rounded-lg border bg-muted/50 border-border hover:border-primary/50 transition-all hover:translate-x-1 group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="text-sm font-bold group-hover:text-primary transition-colors flex items-center gap-2">
                                            {item.source}
                                            {item.isSimulated && (
                                                <span className="text-[7px] font-black bg-amber-500/10 text-amber-500/80 px-1 py-0.5 rounded border border-amber-500/20">DEMO</span>
                                            )}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground font-mono">{item.count} embeddings</div>
                                    </div>
                                    <div className={`text-lg font-black ${item.color}`}>{item.coverage}%</div>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.color.replace('text-', 'bg-')}`} style={{ width: `${item.coverage}%` }} />
                                </div>
                            </a>
                        ))}
                    </div>

                    <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                        <div className="text-sm font-bold text-primary mb-2">📊 Last Sync: 3 hours ago</div>
                        <p className="text-xs text-muted-foreground">Next scheduled update in 45 minutes. Auto-refresh enabled.</p>
                    </div>
                </div>
            </DetailModal>

            {/* NEURAL INSIGHTS DETAILS MODAL */}
            <DetailModal
                isOpen={showInsightDetails}
                onClose={() => setShowInsightDetails(false)}
                title="Autonomous Reasoning"
                subtitle="PREDICTIVE OPTIMIZATION ENGINE"
                icon={Brain}
                iconColor="text-primary"
            >
                <div className="space-y-6">
                    <div className="p-4 rounded-xl border bg-primary/5 border-primary/20">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Target className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <div className="text-sm font-bold tracking-tight">Predicted Optimization</div>
                                <div className="text-[10px] text-muted-foreground uppercase">Target: orders table</div>
                            </div>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed mb-4">
                            Analysis of recent slow queries indicates a 94% probability that adding a composite index on <code className="bg-muted px-1 rounded font-mono">(customer_id, status)</code> will resolve current performance leakage.
                        </p>
                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/50">
                            <div>
                                <div className="text-[10px] text-muted-foreground uppercase">Est. Speedup</div>
                                <div className="text-xl font-black text-emerald-500">14.2x</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                                <div className="text-xl font-black text-primary">98%</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold">Reasoning Foundation</h3>
                        <div className="space-y-2">
                            {[
                                { label: "Historical Pattern Match", value: "High", desc: "Similar to MDEV-12832 resolved in 2024" },
                                { label: "Workload Selectivity", value: "92%", desc: "High cardinality detected on customer_id" },
                                { label: "Execution Plan Analysis", value: "Active", desc: "Full table scan detected in 82% of samples" }
                            ].map((item, idx) => (
                                <div key={idx} className="p-3 rounded-lg border bg-muted/50 border-border">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold">{item.label}</span>
                                        <span className="text-xs font-mono text-primary">{item.value}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground italic">{item.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        className="w-full py-3 bg-primary text-black font-bold uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                        onClick={() => setShowInsightDetails(false)}
                    >
                        Validate Action Plan
                    </button>
                </div>
            </DetailModal>
        </div>
    )
}
