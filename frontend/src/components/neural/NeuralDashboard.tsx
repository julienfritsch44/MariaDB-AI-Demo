"use client"

import React, { useEffect, useState } from "react"
import { NeuralCore } from "./NeuralCore"
import { BentoTile } from "./BentoTile"
import { TrendingUp, Activity, ShieldAlert, Zap, DollarSign, Brain, List, Sun, Moon, X, Check, Archive, Database, Server, ArrowRight } from "lucide-react"
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

export function NeuralDashboard({ onBack, analysis }: NeuralDashboardProps) {
    const [metricsHistory, setMetricsHistory] = useState<MetricsHistory | null>(null)
    const [showFinanceDetails, setShowFinanceDetails] = useState(false)
    const { theme, setTheme } = useTheme()

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

    useEffect(() => {
        // Fetch historical metrics for sparklines
        fetch('http://127.0.0.1:8000/metrics/history')
            .then(res => res.json())
            .then(data => setMetricsHistory(data))
            .catch(err => console.error('Failed to fetch metrics history:', err))
    }, [])

    return (
        <div className="flex-1 overflow-y-auto neural-grid min-h-screen p-6 bg-background text-foreground transition-colors duration-300 relative">
            {/* Header Overlay */}
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-primary/10 border border-primary/20' : 'bg-white border border-slate-200 shadow-sm'}`}>
                            <Brain className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-6xl font-black uppercase tracking-tighter italic">
                            Neural <span className="text-primary thin">Core</span>
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono uppercase tracking-widest pl-20">
                        Autonomous Database Intelligence v4.0 • {theme === 'dark' ? 'Dark' : 'Light'} Mode
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className={`p-3 rounded-full transition-all hover:scale-105 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'}`}
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>


                    <button
                        onClick={onBack}
                        className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-white hover:bg-slate-100 border border-slate-200 shadow-sm text-slate-900'}`}
                    >
                        Exit Immersive View
                    </button>
                </div>
            </div>

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
                                <div className="text-6xl font-black text-amber-500 tracking-tighter group-hover:scale-110 transition-transform origin-left">$14,250</div>
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
                                <span className="text-xs font-mono text-muted-foreground">84/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 w-[84%]" />
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed italic border-l border-white/10 pl-3">
                                Detected 3 potential deadlocks in production branch within last 15 minutes.
                            </p>
                        </div>
                    </BentoTile>
                </div>

                {/* Center Col - The Neural Core */}
                <div className="col-span-12 lg:col-span-6 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-[150px]" />
                    <NeuralCore />
                </div>

                {/* Right Col */}
                <div className="col-span-12 lg:col-span-3 space-y-4">
                    <BentoTile
                        title="Neural Score"
                        subtitle="GLOBAL PERFORMANCE"
                        icon={Activity}
                        priority="high"
                        sparklineData={metricsHistory?.neural_score}
                        sparklineColor="rgb(0, 169, 206)"
                    >
                        <div className="py-4">
                            <div className="text-8xl font-black text-primary tracking-tighter">98.2</div>
                            <p className="text-xs text-muted-foreground mt-3 uppercase tracking-tight">Optimal Efficiency Baseline</p>
                        </div>
                    </BentoTile>

                    <BentoTile
                        title="RAG Memory"
                        subtitle="KB SEEDS"
                        icon={Zap}
                        sparklineData={metricsHistory?.rag_memory}
                        sparklineColor="rgb(59, 130, 246)"
                    >
                        <div className="flex items-center gap-4 py-4">
                            <div className="text-5xl font-bold tracking-tighter">1,350</div>
                            <div className="flex-1">
                                <div className="text-[8px] text-muted-foreground uppercase mb-1">Jira Semantic Links</div>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="flex-1 h-3 bg-primary/20 rounded-sm animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </BentoTile>
                </div>

                {/* Row 2: Bottom Wide Tiles */}
                <div className="col-span-12 lg:col-span-8">
                    <BentoTile title="Query Stream" subtitle="LIVE TRAFFIC ANALYSIS" icon={List} className="h-full">
                        <div className="space-y-3 pt-2">
                            {analysis?.top_queries?.slice(0, 3).map((q: any) => (
                                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group/item">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="text-[10px] font-mono text-primary truncate mb-1">{q.sql_text}</div>
                                        <div className="flex gap-3 text-[8px] text-muted-foreground font-bold uppercase">
                                            <span>Time: {q.query_time}s</span>
                                            <span>Rows: {q.rows_sent}</span>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-bold group-hover/item:border-primary transition-colors">
                                        {q.id}
                                    </div>
                                </div>
                            ))}
                            {(!analysis || !analysis.top_queries) && (
                                <div className="text-center py-12 text-muted-foreground italic text-xs">
                                    Syncing with MariaDB stream...
                                </div>
                            )}
                        </div>
                    </BentoTile>
                </div>

                <div className="col-span-12 lg:col-span-4">
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
                            className={`relative w-full max-w-2xl rounded-2xl border p-6 shadow-2xl ${theme === 'dark' ? 'bg-[#0A0A12] border-white/10' : 'bg-white border-slate-200'}`}
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
                                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="text-sm text-muted-foreground mb-1">Monthly Savings</div>
                                    <div className="text-3xl font-black text-emerald-500">$14,250</div>
                                    <div className="text-xs text-emerald-500/80 font-mono mt-1">+12.5% projected</div>
                                </div>
                                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
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
                                    <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border transition-colors group ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
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
        </div>
    )
}
