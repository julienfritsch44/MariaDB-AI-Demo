"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Shield,
    Wand2,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Database,
    Zap,
    ArrowRight,
    TrendingDown,
    Clock,
    Activity,
    ChevronRight,
    Sparkles,
    DollarSign,
    Lock,
    Cpu,
    ChevronDown,
    ChevronUp,
    Lightbulb,
    Maximize2,
    Minimize2,
    Rocket
} from "lucide-react"
import { trackedFetch } from "@/lib/usePerformance"

const API_BASE = "http://localhost:8000"

interface PredictResponse {
    risk_level: string
    risk_score: number
    reason: string
    similar_issues: Array<{
        id: string
        title: string
        similarity: number
    }>
    suggested_fix?: string
}

interface SandboxResponse {
    success: boolean
    mode: string
    message: string
    result?: {
        columns: string[]
        rows: any[][]
        rows_affected: number
        execution_time_ms: number
    }
    error?: string
    query_type?: string
    warning?: string
}

interface RewriteResponse {
    original_sql: string
    rewritten_sql: string
    improvements: string[]
    estimated_speedup: string
    confidence: number
    explanation: string
}

interface CostEstimate {
    sql: string
    cloud_provider: string
    io_cost_per_execution: number
    cpu_cost_per_execution: number
    total_cost_per_execution: number
    daily_cost: number
    monthly_cost: number
    annual_cost: number
    estimated_io_requests: number
    execution_frequency: number
    cost_breakdown: {
        io_percentage: number
        cpu_percentage: number
    }
}

interface WaitEventDetail {
    event_name: string
    count: number
    total_wait_ms: number
    avg_wait_ms: number
    percentage: number
}

interface WaitEventsResponse {
    success: boolean
    mode: string
    summary: {
        total_wait_events: number
        total_lock_waits: number
        total_threads: number
        threads_waiting_locks: number
        total_wait_time_ms: number
    }
    top_wait_events: WaitEventDetail[]
    lock_waits: any[]
    recommendations: string[]
}

interface ResourceGroupAssignment {
    sql: string
    risk_score: number
    recommended_group: string
    cpu_limit: string
    thread_priority: number
    reason: string
}

interface ResourceGroupResponse {
    success: boolean
    mode: string
    assignment: ResourceGroupAssignment
    available_groups: any[]
    recommendations: string[]
}

type WorkflowStep = "input" | "risk" | "sandbox" | "healing" | "comparison"

const riskStyles = {
    LOW: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-500",
        icon: CheckCircle2
    },
    MEDIUM: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-500",
        icon: AlertTriangle
    },
    HIGH: {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        text: "text-red-500",
        icon: XCircle
    }
}

export interface AnalysisHistoryItem {
    id: string
    sql: string
    risk_score: number
    risk_level: string
    timestamp: Date
}

interface UnifiedQueryAnalyzerCleanProps {
    analysisHistory: AnalysisHistoryItem[]
    setAnalysisHistory: React.Dispatch<React.SetStateAction<AnalysisHistoryItem[]>>
    onLoadFromHistory?: (item: AnalysisHistoryItem) => void
    selectedHistoryItem?: AnalysisHistoryItem | null
}

export function UnifiedQueryAnalyzerClean({ analysisHistory, setAnalysisHistory, onLoadFromHistory, selectedHistoryItem }: UnifiedQueryAnalyzerCleanProps) {
    const [sql, setSql] = useState("")
    const [step, setStep] = useState<WorkflowStep>("input")

    useEffect(() => {
        const handleLoadSampleQuery = (event: CustomEvent) => {
            setSql(event.detail);
            setTimeout(() => handleAnalyze(), 100);
        };

        window.addEventListener('loadSampleQuery', handleLoadSampleQuery as EventListener);
        return () => window.removeEventListener('loadSampleQuery', handleLoadSampleQuery as EventListener);
    }, []);

    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [isRewriting, setIsRewriting] = useState(false)
    const [isDeploying, setIsDeploying] = useState(false)
    const [isDeployed, setIsDeployed] = useState(false)

    const [riskResult, setRiskResult] = useState<PredictResponse | null>(null)
    const [sandboxResult, setSandboxResult] = useState<SandboxResponse | null>(null)
    const [healingResult, setHealingResult] = useState<RewriteResponse | null>(null)
    const [optimizedSandboxResult, setOptimizedSandboxResult] = useState<SandboxResponse | null>(null)
    const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
    const [optimizedCostEstimate, setOptimizedCostEstimate] = useState<CostEstimate | null>(null)
    const [waitEvents, setWaitEvents] = useState<WaitEventsResponse | null>(null)
    const [resourceGroup, setResourceGroup] = useState<ResourceGroupResponse | null>(null)

    // Main cards expansion state (workflow accordion)
    const [cardsExpanded, setCardsExpanded] = useState({
        input: true,
        risk: false,
        sandbox: false,
        healing: false,
        comparison: false
    })

    const fetchCostEstimate = async (query: string, isOptimized: boolean = false, metrics?: { query_time?: number, rows_examined?: number }) => {
        try {
            const res = await trackedFetch(`${API_BASE}/cost/estimate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sql: query,
                    execution_frequency_per_day: 100,
                    cloud_provider: "mariadb_skysql",
                    query_time: metrics?.query_time,
                    rows_examined: metrics?.rows_examined
                })
            })

            if (!res.ok) return

            const data: CostEstimate = await res.json()
            if (isOptimized) {
                setOptimizedCostEstimate(data)
            } else {
                setCostEstimate(data)
            }
        } catch (err) {
            console.error("Cost estimation failed:", err)
        }
    }

    const fetchWaitEvents = async () => {
        try {
            const res = await trackedFetch(`${API_BASE}/wait-events/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analyze_current: true })
            })

            if (!res.ok) return

            const data: WaitEventsResponse = await res.json()
            setWaitEvents(data)

            // Auto-expand Wait Events si des locks sont détectés
            if (data.summary.total_lock_waits > 0) {
                setSectionsExpanded((prev: any) => ({ ...prev, waitEvents: true }))
            }
        } catch (err) {
            console.error("Wait events analysis failed:", err)
        }
    }

    const assignResourceGroup = async (query: string, riskScore: number) => {
        try {
            const res = await trackedFetch(`${API_BASE}/resource-groups/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sql: query,
                    risk_score: riskScore,
                    auto_assign: true
                })
            })

            if (!res.ok) return

            const data: ResourceGroupResponse = await res.json()
            setResourceGroup(data)
        } catch (err) {
            console.error("Resource group assignment failed:", err)
        }
    }

    // Accordion states for Step 2 (with localStorage persistence)
    const [sectionsExpanded, setSectionsExpanded] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('unifiedAnalyzerSections')
            if (saved) {
                try {
                    return JSON.parse(saved)
                } catch {
                    // Si erreur de parsing, utiliser valeurs par défaut
                }
            }
        }
        return {
            cost: true,
            waitEvents: false,
            resourceGroup: false,
            similarIssues: false
        }
    })

    // Save preferences to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('unifiedAnalyzerSections', JSON.stringify(sectionsExpanded))
        }
    }, [sectionsExpanded])

    const toggleSection = (section: keyof typeof sectionsExpanded) => {
        // Auto-collapse autres sections et scroll vers celle qui s'ouvre
        setSectionsExpanded((prev: typeof sectionsExpanded) => {
            const newState = {
                cost: false,
                waitEvents: false,
                resourceGroup: false,
                similarIssues: false,
                [section]: !prev[section]
            }

            // Auto-scroll vers la section après un court délai
            if (!prev[section]) {
                setTimeout(() => {
                    const element = document.getElementById(`section-${String(section)}`)
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    }
                }, 100)
            }

            return newState
        })
    }

    const expandAll = () => {
        setSectionsExpanded({
            cost: true,
            waitEvents: true,
            resourceGroup: true,
            similarIssues: true
        })
    }

    const collapseAll = () => {
        setSectionsExpanded({
            cost: false,
            waitEvents: false,
            resourceGroup: false,
            similarIssues: false
        })
    }

    const handleAnalyze = async () => {
        if (!sql.trim()) return

        setIsAnalyzing(true)
        setStep("risk")
        setRiskResult(null)
        setSandboxResult(null)
        setHealingResult(null)
        setOptimizedSandboxResult(null)
        setCostEstimate(null)
        setOptimizedCostEstimate(null)
        setWaitEvents(null)
        setWaitEvents(null)
        setResourceGroup(null)
        setIsDeployed(false)

        // Collapse Input, expand Risk
        setCardsExpanded({
            input: false,
            risk: true,
            sandbox: false,
            healing: false,
            comparison: false
        })

        // Auto-scroll to Risk after a delay
        setTimeout(() => {
            const element = document.getElementById('card-risk')
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }, 100)

        try {
            const res = await trackedFetch(`${API_BASE}/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: sql.trim() })
            })

            if (!res.ok) throw new Error(`API Error: ${res.status}`)

            const data: PredictResponse = await res.json()
            setRiskResult(data)

            // Ajouter à l'historique
            const historyItem: AnalysisHistoryItem = {
                id: Date.now().toString(),
                sql: sql.trim(),
                risk_score: data.risk_score,
                risk_level: data.risk_level,
                timestamp: new Date()
            }
            setAnalysisHistory(prev => [historyItem, ...prev].slice(0, 10)) // Garder max 10

            // Calculer le coût estimé
            await fetchCostEstimate(sql.trim())

            // Analyser les wait events
            await fetchWaitEvents()

            // Assigner le resource group
            await assignResourceGroup(sql.trim(), data.risk_score)
        } catch (err) {
            console.error("Risk analysis failed:", err)
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleTestInSandbox = async (query: string) => {
        setIsTesting(true)
        setStep("sandbox")

        try {
            const res = await trackedFetch(`${API_BASE}/sandbox/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sql: query,
                    database: "shop_demo",
                    timeout_seconds: 5
                })
            })

            if (!res.ok) throw new Error(`API Error: ${res.status}`)

            const data: SandboxResponse = await res.json()
            setSandboxResult(data)

            // Mettre à jour l'estimation du coût avec les métriques réelles du bac à sable
            if (data.success && data.result) {
                await fetchCostEstimate(query, false, {
                    query_time: data.result.execution_time_ms / 1000,
                    rows_examined: data.result.rows_affected // Note: rowcount is used as proxy for examined in sandbox
                })
            }

            // Collapse Risk, expand Sandbox
            setCardsExpanded(prev => ({
                ...prev,
                risk: false,
                sandbox: true
            }))

            // Auto-scroll to sandbox
            setTimeout(() => {
                const element = document.getElementById('card-sandbox')
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }, 100)
        } catch (err) {
            setSandboxResult({
                success: false,
                mode: "sandbox",
                message: "Failed to test query",
                error: err instanceof Error ? err.message : "Unknown error"
            })
        } finally {
            setStep("sandbox")
            setIsTesting(false)
        }
    }

    const handleGetOptimized = async () => {
        setIsRewriting(true)
        setStep("healing")

        try {
            const res = await trackedFetch(`${API_BASE}/rewrite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: sql.trim() })
            })

            if (!res.ok) throw new Error(`API Error: ${res.status}`)

            const data: RewriteResponse = await res.json()
            setHealingResult(data)

            // Calculer le coût de la requête optimisée
            await fetchCostEstimate(data.rewritten_sql, true)

            // Collapse Sandbox, expand Healing
            setCardsExpanded(prev => ({
                ...prev,
                sandbox: false,
                healing: true
            }))

            // Auto-scroll to healing
            setTimeout(() => {
                const element = document.getElementById('card-healing')
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }, 100)
        } catch (err) {
            console.error("Rewrite failed:", err)
        } finally {
            setStep("healing")
            setIsRewriting(false)
        }
    }

    const handleTestOptimized = async () => {
        if (!healingResult) return

        setIsTesting(true)
        setStep("comparison")

        try {
            const res = await trackedFetch(`${API_BASE}/sandbox/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sql: healingResult.rewritten_sql,
                    database: "shop_demo",
                    timeout_seconds: 5
                })
            })

            if (!res.ok) throw new Error(`API Error: ${res.status}`)

            const data: SandboxResponse = await res.json()
            setOptimizedSandboxResult(data)

            // Mettre à jour l'estimation du coût optimisé avec les métriques réelles
            if (data.success && data.result) {
                await fetchCostEstimate(healingResult.rewritten_sql, true, {
                    query_time: data.result.execution_time_ms / 1000,
                    rows_examined: data.result.rows_affected
                })
            }

            // Collapse Healing, expand Comparison
            setCardsExpanded(prev => ({
                ...prev,
                healing: false,
                comparison: true
            }))

            // Auto-scroll to comparison
            setTimeout(() => {
                const element = document.getElementById('card-comparison')
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }, 100)
        } catch (err) {
            console.error("Optimized test failed:", err)
        } finally {
            setIsTesting(false)
        }
    }

    const loadDemoQuery = () => {
        setSql(
            "SELECT * FROM orders WHERE customer_id IN (\n" +
            "  SELECT id FROM customers WHERE status = 'active'\n" +
            ") AND total_amount > 1000"
        )
    }


    const loadFromHistory = (item: AnalysisHistoryItem) => {
        setSql(item.sql)
        reset()
        if (onLoadFromHistory) {
            onLoadFromHistory(item)
        }
    }

    // Charger automatiquement quand selectedHistoryItem change
    useEffect(() => {
        if (selectedHistoryItem) {
            setSql(selectedHistoryItem.sql)
            setStep("input")
            // Reset les résultats pour forcer une nouvelle analyse
            setRiskResult(null)
            setSandboxResult(null)
            setHealingResult(null)
            setOptimizedSandboxResult(null)
            setCostEstimate(null)
            setOptimizedCostEstimate(null)
            setWaitEvents(null)
            setResourceGroup(null)
        }
    }, [selectedHistoryItem])

    const clearHistory = () => {
        setAnalysisHistory([])
    }

    const reset = () => {
        setStep("input")
        setRiskResult(null)
        setSandboxResult(null)
        setHealingResult(null)
        setOptimizedSandboxResult(null)
        setCostEstimate(null)
        setOptimizedCostEstimate(null)
        setWaitEvents(null)
        setWaitEvents(null)
        setResourceGroup(null)
        setIsDeployed(false)
    }

    const handleDeploy = async () => {
        if (!healingResult) return

        setIsDeploying(true)
        try {
            const res = await trackedFetch(`${API_BASE}/deploy/production`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sql: healingResult.rewritten_sql,
                    database: "shop_demo",
                    environment: "production"
                })
            })

            const data = await res.json()

            if (data.success) {
                setIsDeployed(true)
            } else {
                console.error("Deployment failed:", data.message)
            }
        } catch (err) {
            console.error("Deployment error:", err)
        } finally {
            setIsDeploying(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card shrink-0">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold">Unified Query Analyzer</h1>
                            <p className="text-sm text-muted-foreground">Complete workflow: Risk → Sandbox → Healing → Comparison</p>
                        </div>
                        {step !== "input" && (
                            <Button variant="outline" onClick={reset} size="sm">
                                New Analysis
                            </Button>
                        )}
                    </div>
                    {/* Progress Bar */}
                    <div className="border-t border-border pt-4">
                        <div className="flex items-center gap-2 text-xs">
                            <div className={`flex items-center gap-1.5 ${step === "input" ? "text-primary" : "text-muted-foreground"}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === "input" ? "border-primary bg-primary/10" : "border-border bg-muted"}`}>
                                    1
                                </div>
                                <span className="font-medium">Input</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <div className={`flex items-center gap-1.5 ${step === "risk" ? "text-primary" : step === "input" ? "text-muted-foreground" : "text-foreground"}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === "risk" ? "border-primary bg-primary/10" : step === "input" ? "border-border bg-muted" : "border-emerald-500 bg-emerald-500/10"}`}>
                                    {step === "input" ? "2" : "✓"}
                                </div>
                                <span className="font-medium">Risk Analysis</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <div className={`flex items-center gap-1.5 ${step === "sandbox" ? "text-primary" : ["input", "risk"].includes(step) ? "text-muted-foreground" : "text-foreground"}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === "sandbox" ? "border-primary bg-primary/10" : ["input", "risk"].includes(step) ? "border-border bg-muted" : "border-emerald-500 bg-emerald-500/10"}`}>
                                    {["input", "risk"].includes(step) ? "3" : "✓"}
                                </div>
                                <span className="font-medium">Sandbox Test</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <div className={`flex items-center gap-1.5 ${step === "healing" ? "text-primary" : ["input", "risk", "sandbox"].includes(step) ? "text-muted-foreground" : "text-foreground"}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === "healing" ? "border-primary bg-primary/10" : ["input", "risk", "sandbox"].includes(step) ? "border-border bg-muted" : "border-emerald-500 bg-emerald-500/10"}`}>
                                    {["input", "risk", "sandbox"].includes(step) ? "4" : "✓"}
                                </div>
                                <span className="font-medium">Optimization</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <div className={`flex items-center gap-1.5 ${step === "comparison" ? "text-primary" : "text-muted-foreground"}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === "comparison" ? "border-primary bg-primary/10" : "border-border bg-muted"}`}>
                                    5
                                </div>
                                <span className="font-medium">Comparison</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="container mx-auto px-6 py-8 max-w-5xl">
                    <div className="space-y-6">
                        {/* Step 1: Query Input */}
                        <Card id="card-input" className="border-border/40 bg-muted/30 dark:bg-card">
                            <CardHeader className="pb-3">
                                <div className="w-full flex items-center justify-between">
                                    <button
                                        onClick={() => setCardsExpanded(prev => ({ ...prev, input: !prev.input }))}
                                        className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
                                    >
                                        <Database className="w-4 h-4 text-primary" />
                                        SQL Query Input
                                        {!cardsExpanded.input && sql && (
                                            <Badge variant="outline" className="text-xs ml-2">Collapsed</Badge>
                                        )}
                                        {cardsExpanded.input ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {cardsExpanded.input && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={loadDemoQuery}
                                                className="text-xs h-7"
                                            >
                                                <Database className="w-3 h-3 mr-1.5" />
                                                Load Demo
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            {cardsExpanded.input && (
                                <CardContent className="space-y-4">
                                    <textarea
                                        value={sql}
                                        onChange={(e) => setSql(e.target.value)}
                                        placeholder="Paste your SQL query here..."
                                        className="w-full h-32 p-3 rounded-md border border-border bg-background dark:bg-muted/20 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />

                                    <div className="flex items-center gap-3">
                                        <Button
                                            onClick={handleAnalyze}
                                            disabled={!sql.trim() || isAnalyzing}
                                            className="gap-2"
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4" />
                                                    Analyze Query
                                                </>
                                            )}
                                        </Button>

                                        {step !== "input" && (
                                            <Button variant="outline" onClick={reset} size="sm">
                                                Reset
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                        {/* Step 2: Risk Analysis */}
                        {riskResult && (
                            <Card id="card-risk" className={`border-2 ${riskStyles[riskResult.risk_level as keyof typeof riskStyles]?.border || "border-border"} ${riskStyles[riskResult.risk_level as keyof typeof riskStyles]?.bg || "bg-muted/30 dark:bg-card"}`}>
                                <CardHeader className="pb-3">
                                    <button
                                        onClick={() => setCardsExpanded(prev => ({ ...prev, risk: !prev.risk }))}
                                        className="w-full mb-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                                {(() => {
                                                    const RiskIcon = riskStyles[riskResult.risk_level as keyof typeof riskStyles]?.icon || AlertTriangle
                                                    return <RiskIcon className={`w-4 h-4 ${riskStyles[riskResult.risk_level as keyof typeof riskStyles]?.text}`} />
                                                })()}
                                                Risk Analysis Results
                                                {!cardsExpanded.risk && (
                                                    <Badge variant="outline" className="text-xs ml-2">Collapsed</Badge>
                                                )}
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={riskStyles[riskResult.risk_level as keyof typeof riskStyles]?.text}>
                                                    {riskResult.risk_level} RISK ({riskResult.risk_score}/100)
                                                </Badge>
                                                {cardsExpanded.risk ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </div>
                                        </div>
                                    </button>
                                    {cardsExpanded.risk && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={expandAll}
                                                className="text-xs h-7 gap-1.5"
                                            >
                                                <Maximize2 className="w-3 h-3" />
                                                Expand All
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={collapseAll}
                                                className="text-xs h-7 gap-1.5"
                                            >
                                                <Minimize2 className="w-3 h-3" />
                                                Collapse All
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>
                                {cardsExpanded.risk && (
                                    <CardContent className="space-y-4">
                                        <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                            <p className="text-sm">{riskResult.reason}</p>
                                        </div>

                                        {/* Skeleton Loaders */}
                                        {isAnalyzing && (
                                            <div className="space-y-3">
                                                <div className="h-24 rounded-md bg-muted/50 animate-pulse" />
                                                <div className="h-32 rounded-md bg-muted/50 animate-pulse" />
                                                <div className="h-28 rounded-md bg-muted/50 animate-pulse" />
                                            </div>
                                        )}

                                        {/* Recommended Next Steps */}
                                        {!isAnalyzing && (riskResult || costEstimate || waitEvents) && (
                                            <div className="p-3 bg-primary/10 border border-primary/30 rounded-md">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Lightbulb className="w-4 h-4 text-primary" />
                                                    <span className="font-semibold text-sm">Recommended Next Steps</span>
                                                </div>
                                                <ul className="text-xs space-y-1 text-muted-foreground">
                                                    {riskResult && riskResult.risk_score > 80 && (
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-red-400">⚠️</span>
                                                            <span>High risk detected - Test in Sandbox before production deployment</span>
                                                        </li>
                                                    )}
                                                    {costEstimate && costEstimate.monthly_cost > 100 && (
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-amber-400">💰</span>
                                                            <span>High cost impact (${costEstimate.monthly_cost.toFixed(0)}/month) - Get optimized version to reduce expenses</span>
                                                        </li>
                                                    )}
                                                    {waitEvents && waitEvents.summary.total_lock_waits > 0 && (
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-blue-400">🔒</span>
                                                            <span>Active locks detected - Review blocking queries immediately</span>
                                                        </li>
                                                    )}
                                                    {riskResult && riskResult.risk_score < 50 && (
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-emerald-400">✅</span>
                                                            <span>Low risk query - Safe to proceed with sandbox testing</span>
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Cost Estimate - Collapsible */}
                                        {!isAnalyzing && costEstimate && (
                                            <div id="section-cost" className="border border-amber-500/30 rounded-md overflow-hidden">
                                                <button
                                                    onClick={() => toggleSection('cost')}
                                                    className="w-full p-3 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className="w-4 h-4 text-amber-500" />
                                                        <span className="text-sm font-semibold text-amber-500">Cost Estimate</span>
                                                        <Badge variant="outline" className="text-xs">{costEstimate.cloud_provider}</Badge>
                                                    </div>
                                                    {sectionsExpanded.cost ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                                {sectionsExpanded.cost && (
                                                    <div className="p-4 bg-amber-500/5">
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <div className="text-xs text-muted-foreground">Monthly</div>
                                                                <div className="text-lg font-bold text-amber-500">${costEstimate.monthly_cost.toFixed(2)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-muted-foreground">Annual</div>
                                                                <div className="text-lg font-bold text-amber-500">${costEstimate.annual_cost.toFixed(2)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-muted-foreground">I/O Requests</div>
                                                                <div className="text-lg font-bold">{costEstimate.estimated_io_requests.toLocaleString()}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Wait Events - Collapsible (Auto-expand if locks) */}
                                        {!isAnalyzing && waitEvents && waitEvents.top_wait_events.length > 0 && (
                                            <div id="section-waitEvents" className="border border-blue-500/30 rounded-md overflow-hidden">
                                                <button
                                                    onClick={() => toggleSection('waitEvents')}
                                                    className="w-full p-3 bg-blue-500/10 hover:bg-blue-500/20 transition-colors flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Lock className="w-4 h-4 text-blue-500" />
                                                        <span className="text-sm font-semibold text-blue-500">Wait Events Analysis</span>
                                                        <Badge variant="outline" className="text-xs">{waitEvents.mode}</Badge>
                                                        {waitEvents.summary.total_lock_waits > 0 && (
                                                            <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                                                                {waitEvents.summary.total_lock_waits} locks
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {sectionsExpanded.waitEvents ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                                {sectionsExpanded.waitEvents && (
                                                    <div className="p-4 bg-blue-500/5">
                                                        <div className="space-y-2">
                                                            {waitEvents.top_wait_events.slice(0, 3).map((event, i) => (
                                                                <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-background/30">
                                                                    <span className="font-mono text-xs truncate flex-1">{event.event_name.split('/').pop()}</span>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-muted-foreground">{event.count.toLocaleString()} events</span>
                                                                        <span className="font-bold text-blue-400">{event.percentage}%</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {waitEvents.summary.total_lock_waits > 0 && (
                                                            <div className="mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
                                                                ⚠️ {waitEvents.summary.total_lock_waits} active lock wait(s) detected
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Resource Groups - Collapsible */}
                                        {!isAnalyzing && resourceGroup && (
                                            <div id="section-resourceGroup" className="border border-purple-500/30 rounded-md overflow-hidden">
                                                <button
                                                    onClick={() => toggleSection('resourceGroup')}
                                                    className="w-full p-3 bg-purple-500/10 hover:bg-purple-500/20 transition-colors flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Cpu className="w-4 h-4 text-purple-500" />
                                                        <span className="text-sm font-semibold text-purple-500">Resource Group Assignment</span>
                                                        <Badge variant="outline" className="text-xs">{resourceGroup.mode}</Badge>
                                                    </div>
                                                    {sectionsExpanded.resourceGroup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                                {sectionsExpanded.resourceGroup && (
                                                    <div className="p-4 bg-purple-500/5">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="text-muted-foreground">Recommended Group:</span>
                                                                <span className="font-bold text-purple-400">{resourceGroup.assignment.recommended_group}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-muted-foreground">CPU Limit:</span>
                                                                <span className="font-mono">{resourceGroup.assignment.cpu_limit}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-muted-foreground">Thread Priority:</span>
                                                                <span className="font-mono">{resourceGroup.assignment.thread_priority}</span>
                                                            </div>
                                                            <div className="mt-2 p-2 rounded-md bg-background/30 text-xs text-muted-foreground">
                                                                {resourceGroup.assignment.reason}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Similar Issues - Collapsible */}
                                        {!isAnalyzing && riskResult.similar_issues && riskResult.similar_issues.length > 0 && (
                                            <div id="section-similarIssues" className="border border-border/40 rounded-md overflow-hidden">
                                                <button
                                                    onClick={() => toggleSection('similarIssues')}
                                                    className="w-full p-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Database className="w-4 h-4 text-primary" />
                                                        <span className="text-sm font-semibold">Similar Issues from History</span>
                                                        <Badge variant="outline" className="text-xs">{riskResult.similar_issues.length} found</Badge>
                                                    </div>
                                                    {sectionsExpanded.similarIssues ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                                {sectionsExpanded.similarIssues && (
                                                    <div className="p-4 bg-muted/10 space-y-2">
                                                        {riskResult.similar_issues.slice(0, 2).map((issue, i) => (
                                                            <div key={i} className="p-2 rounded-md bg-background/30 border border-border/30 text-xs">
                                                                <span className="font-mono text-primary">{issue.id}</span>
                                                                <span className="text-muted-foreground"> - {issue.title}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                onClick={() => handleTestInSandbox(sql)}
                                                disabled={isTesting || isAnalyzing || !costEstimate}
                                                size="sm"
                                                className="gap-2"
                                            >
                                                {isTesting ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Testing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Shield className="w-3 h-3" />
                                                        Test in Sandbox
                                                    </>
                                                )}
                                            </Button>

                                            <Button
                                                onClick={handleGetOptimized}
                                                disabled={isRewriting || isAnalyzing || !costEstimate}
                                                size="sm"
                                                variant="outline"
                                                className="gap-2"
                                            >
                                                {isRewriting ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Optimizing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wand2 className="w-3 h-3" />
                                                        Get Optimized Version
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        )}

                        {/* Step 3: Sandbox Results */}
                        {sandboxResult && (
                            <Card id="card-sandbox" className={`border-2 ${sandboxResult.success ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                <CardHeader className="pb-3">
                                    <button
                                        onClick={() => setCardsExpanded(prev => ({ ...prev, sandbox: !prev.sandbox }))}
                                        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                                    >
                                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                            <Shield className="w-4 h-4 text-blue-500" />
                                            Sandbox Test Results (Original Query)
                                            {!cardsExpanded.sandbox && (
                                                <Badge variant="outline" className="text-xs ml-2">Collapsed</Badge>
                                            )}
                                        </CardTitle>
                                        {cardsExpanded.sandbox ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </CardHeader>
                                {cardsExpanded.sandbox && (
                                    <CardContent className="space-y-4">
                                        <div className={`p-3 rounded-md border ${sandboxResult.success ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                                            <p className="text-sm">{sandboxResult.message}</p>
                                        </div>

                                        {sandboxResult.warning && (
                                            <div className="p-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-yellow-400">{sandboxResult.warning}</p>
                                            </div>
                                        )}

                                        {sandboxResult.success && sandboxResult.result && (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                                    <div className="text-xs text-muted-foreground mb-1">Query Type</div>
                                                    <div className="text-sm font-semibold">{sandboxResult.query_type}</div>
                                                </div>
                                                <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                        <Activity className="w-3 h-3" />
                                                        Rows Affected
                                                    </div>
                                                    <div className="text-sm font-semibold">{sandboxResult.result.rows_affected}</div>
                                                </div>
                                                <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Execution Time
                                                    </div>
                                                    <div className="text-sm font-semibold">{sandboxResult.result.execution_time_ms}ms</div>
                                                </div>
                                            </div>
                                        )}

                                        {!healingResult && (
                                            <Button
                                                onClick={handleGetOptimized}
                                                disabled={isRewriting}
                                                size="sm"
                                                className="gap-2"
                                            >
                                                {isRewriting ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Optimizing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wand2 className="w-3 h-3" />
                                                        Get Optimized Version
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        )}

                        {/* Step 4: Self-Healing Results */}
                        {healingResult && (
                            <Card id="card-healing" className="border-2 border-purple-500/30 bg-purple-500/5">
                                <CardHeader className="pb-3">
                                    <button
                                        onClick={() => setCardsExpanded(prev => ({ ...prev, healing: !prev.healing }))}
                                        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                                    >
                                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                            <Wand2 className="w-4 h-4 text-purple-500" />
                                            Optimized Query
                                            {!cardsExpanded.healing && (
                                                <Badge variant="outline" className="text-xs ml-2">Collapsed</Badge>
                                            )}
                                        </CardTitle>
                                        {cardsExpanded.healing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </CardHeader>
                                {cardsExpanded.healing && (
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="text-xs font-semibold text-muted-foreground">Original:</div>
                                            <div className="p-3 rounded-md bg-background/50 border border-border/40 font-mono text-xs">
                                                {healingResult.original_sql}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <ArrowRight className="w-4 h-4 text-primary" />
                                            <Badge variant="outline" className="gap-1">
                                                <TrendingDown className="w-3 h-3" />
                                                {healingResult.estimated_speedup}
                                            </Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-xs font-semibold text-muted-foreground">Optimized:</div>
                                            <div className="p-3 rounded-md bg-purple-500/10 border border-purple-500/30 font-mono text-xs">
                                                {healingResult.rewritten_sql}
                                            </div>
                                        </div>

                                        {healingResult.improvements && healingResult.improvements.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold text-muted-foreground">Improvements:</div>
                                                <ul className="space-y-1">
                                                    {healingResult.improvements.map((imp, i) => (
                                                        <li key={i} className="text-xs flex items-start gap-2">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                            <span>{imp}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleTestOptimized}
                                            disabled={isTesting || isRewriting || !healingResult}
                                            size="sm"
                                            className="gap-2"
                                        >
                                            {isTesting ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Testing...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield className="w-3 h-3" />
                                                    Test Optimized Query
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                )}
                            </Card>
                        )}

                        {/* Step 5: Comparison */}
                        {optimizedSandboxResult && sandboxResult && (
                            <Card id="card-comparison" className="border-2 border-primary/30 bg-primary/5">
                                <CardHeader className="pb-3">
                                    <button
                                        onClick={() => setCardsExpanded(prev => ({ ...prev, comparison: !prev.comparison }))}
                                        className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                                    >
                                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                            <Zap className="w-4 h-4 text-primary" />
                                            Performance Comparison
                                            {!cardsExpanded.comparison && (
                                                <Badge variant="outline" className="text-xs ml-2">Collapsed</Badge>
                                            )}
                                        </CardTitle>
                                        {cardsExpanded.comparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </CardHeader>
                                {cardsExpanded.comparison && (
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold text-muted-foreground">Original Query</div>
                                                <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                                    <div className="text-xs text-muted-foreground">Execution Time</div>
                                                    <div className="text-2xl font-bold">{sandboxResult.result?.execution_time_ms}ms</div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold text-muted-foreground">Optimized Query</div>
                                                <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                                                    <div className="text-xs text-muted-foreground">Execution Time</div>
                                                    <div className="text-2xl font-bold text-black">{optimizedSandboxResult.result?.execution_time_ms}ms</div>
                                                </div>
                                            </div>
                                        </div>

                                        {sandboxResult.result && optimizedSandboxResult.result && (
                                            <div className="p-4 rounded-md bg-primary/10 border border-primary/30 text-center">
                                                <div className="text-xs text-muted-foreground mb-1">Performance Improvement</div>
                                                <div className="text-3xl font-bold text-primary">
                                                    {Math.round(((sandboxResult.result.execution_time_ms - optimizedSandboxResult.result.execution_time_ms) / sandboxResult.result.execution_time_ms) * 100)}%
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">faster</div>
                                            </div>
                                        )}

                                        {costEstimate && optimizedCostEstimate && (
                                            <div className="p-4 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <DollarSign className="w-5 h-5 text-emerald-500" />
                                                    <span className="text-sm font-semibold text-emerald-500">Cost Savings</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 mb-3">
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Original Cost</div>
                                                        <div className="text-xl font-bold text-red-400">${costEstimate.monthly_cost.toFixed(2)}/mo</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Optimized Cost</div>
                                                        <div className="text-xl font-bold text-black">${optimizedCostEstimate.monthly_cost.toFixed(2)}/mo</div>
                                                    </div>
                                                </div>
                                                <div className="text-center p-3 rounded-md bg-emerald-500/20 border border-emerald-500/40">
                                                    <div className="text-xs text-muted-foreground mb-1">Monthly Savings</div>
                                                    <div className="text-2xl font-bold text-emerald-400">
                                                        ${(costEstimate.monthly_cost - optimizedCostEstimate.monthly_cost).toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-black mt-1">
                                                        ({Math.round(((costEstimate.monthly_cost - optimizedCostEstimate.monthly_cost) / costEstimate.monthly_cost) * 100)}% reduction)
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-2">
                                                        Annual savings: ${((costEstimate.monthly_cost - optimizedCostEstimate.monthly_cost) * 12).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Deployment Section */}
                                        <div className="p-4 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                                            <div className="flex items-center gap-2 mb-3">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                <span className="text-sm font-semibold text-emerald-500">Ready to Deploy</span>
                                            </div>
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                    <span>Tested safely in sandbox environment</span>
                                                </div>
                                                {sandboxResult.result && optimizedSandboxResult.result && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                        <span>Performance improved by {Math.round(((sandboxResult.result.execution_time_ms - optimizedSandboxResult.result.execution_time_ms) / sandboxResult.result.execution_time_ms) * 100)}%</span>
                                                    </div>
                                                )}
                                                {costEstimate && optimizedCostEstimate && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                        <span>Cost reduced by ${(costEstimate.monthly_cost - optimizedCostEstimate.monthly_cost).toFixed(2)}/month</span>
                                                    </div>
                                                )}
                                                {resourceGroup && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                        <span>Resource group assigned: {resourceGroup.assignment.recommended_group}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {isDeployed ? (
                                                <div className="w-full p-3 bg-emerald-500 text-white rounded-md flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300">
                                                    <Rocket className="w-5 h-5" />
                                                    <span className="font-bold">Query is live in production!</span>
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={handleDeploy}
                                                    disabled={isDeploying}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 transition-all duration-300 transform active:scale-95"
                                                    size="lg"
                                                >
                                                    {isDeploying ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Deploying to Production...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Rocket className="w-5 h-5" />
                                                            Deploy to Production
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
