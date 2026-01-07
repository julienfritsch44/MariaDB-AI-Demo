"use client"

import { useState, useEffect, useCallback } from "react"
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
    Rocket,
    GitBranch
} from "lucide-react"
import { trackedFetch } from "@/lib/usePerformance"
import { InputStep } from "./analyzer-steps/InputStep"
import { RiskAnalysisStep } from "./analyzer-steps/RiskAnalysisStep"
import { SandboxStep } from "./analyzer-steps/SandboxStep"
import { HealingStep } from "./analyzer-steps/HealingStep"
import { ComparisonStep } from "./analyzer-steps/ComparisonStep"
import { BranchValidationStep } from "./analyzer-steps/BranchValidationStep"
import { BranchCreationModal } from "./analyzer-steps/BranchCreationModal"
import { AnalyzerHeader } from "./analyzer-steps/AnalyzerHeader"
import { ProgressBar } from "./analyzer-steps/ProgressBar"
import type {
    PredictResponse,
    SandboxResponse,
    RewriteResponse,
    CostEstimate,
    WaitEventsResponse,
    ResourceGroupResponse,
    WorkflowStep
} from "./analyzer-steps/types"

const API_BASE = "http://localhost:8000"

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
    analysis?: any
}

export function UnifiedQueryAnalyzerClean({ analysisHistory, setAnalysisHistory, onLoadFromHistory, selectedHistoryItem, analysis }: UnifiedQueryAnalyzerCleanProps) {
    // --- DEMO MODE TOGGLE ---
    const IS_DEMO_MODE = true
    // ------------------------

    const [sql, setSql] = useState("")
    const [step, setStep] = useState<WorkflowStep>("input")
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

    // Branch validation states
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false)
    const [isCreatingBranch, setIsCreatingBranch] = useState(false)
    const [branchCreated, setBranchCreated] = useState(false)
    const [branchTestResult, setBranchTestResult] = useState<any>(null)
    const [isTestingBranch, setIsTestingBranch] = useState(false)

    // Main cards expansion state (workflow accordion)
    const [cardsExpanded, setCardsExpanded] = useState({
        input: true,
        risk: false,
        sandbox: false,
        healing: false,
        comparison: false,
        branchValidation: false
    })

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

    const fetchCostEstimate = async (query: string, isOptimized: boolean = false, metrics?: { query_time?: number, rows_examined?: number }) => {
        // DEMO MODE OVERRIDE for dramatic effect
        if (IS_DEMO_MODE && !isOptimized) {
            setCostEstimate({
                sql: query,
                cloud_provider: "mariadb_skysql",
                io_cost_per_execution: 0.04,
                cpu_cost_per_execution: 0.01,
                total_cost_per_execution: 0.05,
                daily_cost: 15.22,
                monthly_cost: 456.78,
                annual_cost: 5481.36,
                estimated_io_requests: 154000000,
                execution_frequency: 100,
                cost_breakdown: {
                    io_percentage: 90, // Changed from 80 to 90
                    cpu_percentage: 10 // Changed from 20 to 10
                }
            })
            return
        }

        if (IS_DEMO_MODE && isOptimized) {
            setOptimizedCostEstimate({
                sql: query,
                cloud_provider: "mariadb_skysql",
                io_cost_per_execution: 0.001,
                cpu_cost_per_execution: 0.001,
                total_cost_per_execution: 0.002,
                daily_cost: 0.50,
                monthly_cost: 15.00,
                annual_cost: 180.00,
                estimated_io_requests: 500000,
                execution_frequency: 100,
                cost_breakdown: {
                    io_percentage: 50,
                    cpu_percentage: 50
                }
            })
            return
        }

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
        if (IS_DEMO_MODE) {
            setWaitEvents({
                success: true,
                mode: "mock",
                summary: {
                    total_wait_events: 105,
                    total_lock_waits: 1,
                    total_threads: 50,
                    threads_waiting_locks: 1,
                    total_wait_time_ms: 1200
                },
                top_wait_events: [
                    { event_name: "innodb_row_lock", count: 5, total_wait_ms: 800, avg_wait_ms: 160, percentage: 66 },
                    { event_name: "cpu", count: 100, total_wait_ms: 400, avg_wait_ms: 4, percentage: 33 }
                ],
                lock_waits: [{
                    "blocking_thread_id": 123,
                    "blocked_thread_id": 456,
                    "blocking_query": "UPDATE products SET stock = stock - 1 WHERE id = 1",
                    "blocked_query": "SELECT * FROM products WHERE id = 1 FOR UPDATE",
                    "wait_duration_ms": 500
                }],
                recommendations: ["Investigate long-running transactions.", "Optimize queries involved in lock contention."]
            })
            setSectionsExpanded((prev: any) => ({ ...prev, waitEvents: true }))
            return
        }

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
        if (IS_DEMO_MODE) {
            setResourceGroup({
                success: true,
                mode: "mock",
                assignment: {
                    sql: query,
                    risk_score: riskScore,
                    recommended_group: "low_priority_tasks",
                    cpu_limit: "10%", // ALIGNED WITH SCRIPT
                    thread_priority: 10,
                    reason: "Query identified as high risk (score 85) and assigned to a throttled resource group to prevent performance degradation."
                },
                available_groups: [
                    { name: "high_priority", cpu_limit: "100%", thread_priority: 1 },
                    { name: "medium_priority", cpu_limit: "50%", thread_priority: 5 },
                    { name: "low_priority_tasks", cpu_limit: "10%", thread_priority: 10 }
                ],
                recommendations: ["Review query for optimization.", "Consider adding indexes.", "Adjust resource group limits if necessary."]
            })
            return
        }

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

    const toggleSection = (section: keyof typeof sectionsExpanded) => {
        // Auto-collapse autres sections et scroll vers celle qui s'ouvre
        setSectionsExpanded((prev: any) => {
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

    const reset = useCallback(() => {
        setStep("input")
        setRiskResult(null)
        setSandboxResult(null)
        setHealingResult(null)
        setOptimizedSandboxResult(null)
        setCostEstimate(null)
        setOptimizedCostEstimate(null)
        setWaitEvents(null)
        setResourceGroup(null)
        setBranchCreated(false)
        setBranchTestResult(null)
        setIsDeployed(false)
        setCardsExpanded({
            input: true,
            risk: false,
            sandbox: false,
            healing: false,
            comparison: false,
            branchValidation: false
        })
    }, [])

    const handleAnalyze = useCallback(async () => {
        if (!sql.trim()) return

        setIsAnalyzing(true)
        setStep("risk")
        reset() // CLEAR EVERYTHING FIRST

        // Collapse Input, expand Risk
        setCardsExpanded({
            input: false,
            risk: true,
            sandbox: false,
            healing: false,
            comparison: false,
            branchValidation: false
        })

        // Auto-scroll to Risk after a delay
        setTimeout(() => {
            const element = document.getElementById('card-risk')
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }, 100)

        // DEMO OVERRIDE FOR RISK
        if (IS_DEMO_MODE) {
            await new Promise(r => setTimeout(r, 1500)); // Fake loader

            const demoRisk: PredictResponse = {
                risk_score: 85, // ALIGNED WITH SCRIPT
                risk_level: "HIGH",
                reason: "Detected potential table scan on large table 'orders' during peak hours. Missing index on customer_id.",
                similar_issues: [
                    { id: "MDEV-10663", title: "Subquery optimization in IN clause", similarity: 0.95 },
                    { id: "MDEV-21377", title: "Performance regression in semi-join buffer", similarity: 0.88 },
                    { id: "MDEV-37723", title: "Optimizer trace deadlock with large WHERE clause", similarity: 0.82 }
                ],
                suggested_fix: "Add index on (customer_id)"
            }
            setRiskResult(demoRisk)

            const historyItem: AnalysisHistoryItem = {
                id: Date.now().toString(),
                sql: sql.trim(),
                risk_score: 85,
                risk_level: "HIGH",
                timestamp: new Date()
            }
            setAnalysisHistory(prev => [historyItem, ...prev].slice(0, 10))

            await fetchCostEstimate(sql.trim())
            await fetchWaitEvents()
            await assignResourceGroup(sql.trim(), 85) // Pass 85 for demo
            setIsAnalyzing(false)
            return
        }

        try {
            const res = await trackedFetch(`${API_BASE}/predict-risk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query_text: sql.trim() })
            })

            if (res.ok) {
                const riskData: PredictResponse = await res.json()
                setRiskResult(riskData)

                // Demo Mode: Mock history item for visuals
                const historyItem: AnalysisHistoryItem = {
                    id: Date.now().toString(),
                    sql: sql.trim(),
                    risk_score: riskData.risk_score,
                    risk_level: riskData.risk_level,
                    timestamp: new Date()
                }
                setAnalysisHistory(prev => [historyItem, ...prev].slice(0, 10))

                await fetchCostEstimate(sql.trim())
                await fetchWaitEvents()
                await assignResourceGroup(sql.trim(), riskData.risk_score)
            } else {
                throw new Error(`API Error: ${res.status}`)
            }
        } catch (err) {
            console.error("Risk analysis failed:", err)
        } finally {
            setIsAnalyzing(false)
        }
    }, [sql, setAnalysisHistory, reset]) // Depend on sql, setAnalysisHistory, and reset

    const handleTestInSandbox = async (query: string) => {
        setIsTesting(true)
        setStep("sandbox")

        try {
            if (IS_DEMO_MODE) {
                // Simulate loading delay for realism
                await new Promise(r => setTimeout(r, 800));

                setSandboxResult({
                    success: true,
                    mode: "smart_sandbox",
                    message: "Transaction simulated and rolled back (0 rows affected actually)",
                    result: {
                        columns: ["id", "customer_id", "total"],
                        rows: [[1, 123, 99.99]],
                        rows_affected: 0,
                        execution_time_ms: 2800 // DEMO VALUE: SLOW
                    }
                })
            } else {
                const res = await trackedFetch(`${API_BASE}/sandbox/test`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sql: query })
                })
                if (!res.ok) throw new Error(`API Error: ${res.status}`)
                const data: SandboxResponse = await res.json()
                setSandboxResult(data)
            }

            // Mettre à jour l'estimation du coût avec les métriques réelles du bac à sable
            if (!IS_DEMO_MODE && sandboxResult?.success && sandboxResult?.result) {
                await fetchCostEstimate(query, false, {
                    query_time: sandboxResult.result.execution_time_ms / 1000,
                    rows_examined: sandboxResult.result.rows_affected // Note: rowcount is used as proxy for examined in sandbox
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
            setIsTesting(false)
        }
    }

    const handleGetOptimized = async () => {
        setIsRewriting(true)
        setStep("healing")

        try {
            if (IS_DEMO_MODE) {
                await new Promise(r => setTimeout(r, 1000));
                const demoRewrite: RewriteResponse = {
                    original_sql: sql,
                    rewritten_sql: "SELECT * FROM orders FORCE INDEX (idx_customer_id) WHERE customer_id IN (\n  SELECT id FROM customers WHERE status = 'active'\n) AND total_amount > 1000", /* Simple Force Index */
                    improvements: ["Added missing index", "Force Index usage"],
                    estimated_speedup: "95%",
                    confidence: 0.98,
                    explanation: "The query was scanning the full table. Adding an index reduces lookup time drastically.",
                    knowledge_source: {
                        id: "Jira MDEV-10663",
                        url: "https://jira.mariadb.org/browse/MDEV-10663",
                        similarity: 0.95,
                        description: "Fixed by MariaDB - 95% similarity match (Subquery Optimization)"
                    }
                }
                setHealingResult(demoRewrite)
                await fetchCostEstimate(demoRewrite.rewritten_sql, true)
            } else {
                const res = await trackedFetch(`${API_BASE}/rewrite-query`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ original_sql: sql.trim() })
                })

                if (!res.ok) throw new Error(`API Error: ${res.status}`)

                const data: RewriteResponse = await res.json()
                setHealingResult(data)

                // Calculer le coût de la requête optimisée
                await fetchCostEstimate(data.rewritten_sql, true)
            }

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
            setIsRewriting(false)
        }
    }

    const handleTestOptimized = async () => {
        if (!healingResult) return

        setIsTesting(true)
        setStep("comparison")

        try {
            if (IS_DEMO_MODE) {
                // Simulate loading delay
                await new Promise(r => setTimeout(r, 800));

                // If we skipped the first sandbox test, fill it now for comparison
                if (!sandboxResult) {
                    setSandboxResult({
                        success: true,
                        mode: "smart_sandbox",
                        message: "Original query baseline established",
                        result: {
                            columns: ["id", "customer_id", "total"],
                            rows: [],
                            rows_affected: 0,
                            execution_time_ms: 2800 // DEMO VALUE: SLOW
                        }
                    })
                }

                setOptimizedSandboxResult({
                    success: true,
                    mode: "smart_sandbox",
                    message: "Transaction simulated and rolled back (0 rows affected actually)",
                    result: {
                        columns: ["id", "customer_id", "total"],
                        rows: [[1, 123, 99.99]],
                        rows_affected: 0,
                        execution_time_ms: 150 // DEMO VALUE: FAST
                    }
                })
                // Also fetch optimized cost
                fetchCostEstimate(healingResult.rewritten_sql, true)
            } else {
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
            }

            // Keep Healing expanded to prevent jump, expand Comparison below
            setCardsExpanded(prev => ({
                ...prev,
                healing: true, // Keep this TRUE
                comparison: true
            }))

            // Auto-scroll to comparison smoothly
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
            reset() // Use reset helper
        }
    }, [selectedHistoryItem, reset])

    const clearHistory = () => {
        setAnalysisHistory([])
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

    const handleCreateBranch = async () => {
        setIsCreatingBranch(true)
        await new Promise(r => setTimeout(r, 2000)) // Simulate API call
        setIsCreatingBranch(false)
        setIsBranchModalOpen(false)
        setBranchCreated(true)

        // Open Branch Validation card and scroll to it
        setCardsExpanded(prev => ({ ...prev, branchValidation: true }))
        setTimeout(() => {
            const element = document.getElementById('card-branch-validation')
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }, 100)
    }

    const handleTestBranch = async () => {
        setIsTestingBranch(true)
        await new Promise(r => setTimeout(r, 1500)) // Simulate performance test
        setBranchTestResult({
            latency: 155,
            throughput: 1200,
            status: "PASSED",
            comparison: "-95% latency vs Prod"
        })
        setIsTestingBranch(false)
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <AnalyzerHeader step={step} onReset={reset} />

            {/* Progress Bar */}
            <ProgressBar currentStep={step} />

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="container mx-auto px-6 py-8 max-w-5xl">
                    <div className="space-y-6">
                        {/* Step 1: Query Input */}
                        <InputStep
                            isExpanded={cardsExpanded.input}
                            sql={sql}
                            isAnalyzing={isAnalyzing}
                            onToggleExpand={() => setCardsExpanded(prev => ({ ...prev, input: !prev.input }))}
                            onSqlChange={setSql}
                            onAnalyze={handleAnalyze}
                            onLoadDemo={loadDemoQuery}
                        />

                        {/* Step 2: Risk Analysis */}
                        <RiskAnalysisStep
                            isVisible={riskResult !== null}
                            isExpanded={cardsExpanded.risk}
                            isAnalyzing={isAnalyzing}
                            riskResult={riskResult}
                            costEstimate={costEstimate}
                            waitEvents={waitEvents}
                            resourceGroup={resourceGroup}
                            sectionsExpanded={sectionsExpanded}
                            isTesting={isTesting}
                            isRewriting={isRewriting}
                            onToggleExpand={() => setCardsExpanded(prev => ({ ...prev, risk: !prev.risk }))}
                            onToggleSection={toggleSection}
                            onExpandAll={expandAll}
                            onCollapseAll={collapseAll}
                            onTestInSandbox={() => handleTestInSandbox(sql)}
                            onGetOptimized={handleGetOptimized}
                        />

                        {/* Step 3: Sandbox Results */}
                        <SandboxStep
                            isVisible={sandboxResult !== null}
                            isExpanded={cardsExpanded.sandbox}
                            sandboxResult={sandboxResult}
                            healingResult={healingResult}
                            isRewriting={isRewriting}
                            onToggleExpand={() => setCardsExpanded(prev => ({ ...prev, sandbox: !prev.sandbox }))}
                            onGetOptimized={handleGetOptimized}
                        />

                        {/* Step 4: Self-Healing Results */}
                        <HealingStep
                            isVisible={healingResult !== null}
                            isExpanded={cardsExpanded.healing}
                            healingResult={healingResult}
                            isTesting={isTesting}
                            isRewriting={isRewriting}
                            onToggleExpand={() => setCardsExpanded(prev => ({ ...prev, healing: !prev.healing }))}
                            onTestOptimized={handleTestOptimized}
                        />

                        {/* Step 5: Comparison */}
                        <ComparisonStep
                            isVisible={optimizedSandboxResult !== null && sandboxResult !== null}
                            isExpanded={cardsExpanded.comparison}
                            sandboxResult={sandboxResult}
                            optimizedSandboxResult={optimizedSandboxResult}
                            costEstimate={costEstimate}
                            optimizedCostEstimate={optimizedCostEstimate}
                            resourceGroup={resourceGroup}
                            isDeployed={isDeployed}
                            isDeploying={isDeploying}
                            onToggleExpand={() => setCardsExpanded(prev => ({ ...prev, comparison: !prev.comparison }))}
                            onOpenBranchModal={() => setIsBranchModalOpen(true)}
                            onDeploy={handleDeploy}
                        />


                        {/* Step 6: Branch Validation */}
                        <BranchValidationStep
                            isVisible={cardsExpanded.branchValidation}
                            branchTestResult={branchTestResult}
                            isTestingBranch={isTestingBranch}
                            isDeploying={isDeploying}
                            isDeployed={isDeployed}
                            onTestBranch={handleTestBranch}
                            onDeploy={handleDeploy}
                        />

                    </div>
                </div>
            </div >

            {/* Branch Creation Modal */}
            {/* Branch Creation Modal */}
            <BranchCreationModal
                isOpen={isBranchModalOpen}
                isCreating={isCreatingBranch}
                rewrittenSql={healingResult?.rewritten_sql}
                onClose={() => setIsBranchModalOpen(false)}
                onCreate={handleCreateBranch}
            />
        </div >
    )
}
