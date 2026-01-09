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
import { DeploymentSuccessModal } from "./analyzer-steps/DeploymentSuccessModal"
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
    const [sql, setSql] = useState("")
    const [step, setStep] = useState<WorkflowStep>("input")
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [isRewriting, setIsRewriting] = useState(false)
    const [isDeploying, setIsDeploying] = useState(false)
    const [isDeployed, setIsDeployed] = useState(false)
    const [deploymentType, setDeploymentType] = useState<"ddl" | "pr">("pr")
    const [deployStep, setDeployStep] = useState("")

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
    const [proposedBranchName, setProposedBranchName] = useState("")
    const [branchDatabase, setBranchDatabase] = useState<string | null>(null)
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

        try {
            const res = await trackedFetch(`${API_BASE}/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: sql.trim() }) // Match PredictRequest schema (sql)
            })

            if (res.ok) {
                const riskData: PredictResponse = await res.json()
                setRiskResult(riskData)

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
            const res = await trackedFetch(`${API_BASE}/sandbox/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: query })
            })
            if (!res.ok) throw new Error(`API Error: ${res.status}`)
            const data: SandboxResponse = await res.json()
            setSandboxResult(data)

            // Mettre à jour l'estimation du coût avec les métriques réelles du bac à sable
            if (data.success && data.result) {
                await fetchCostEstimate(query, false, {
                    query_time: data.result.execution_time_ms / 1000,
                    rows_examined: data.result.rows_affected
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
            setIsRewriting(false)
        }
    }

    const handleTestOptimized = async () => {
        if (!healingResult) return

        setIsTesting(true)
        setOptimizedSandboxResult(null) // Reset while testing
        setStep("comparison")

        try {
            const res = await trackedFetch(`${API_BASE}/sandbox/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sql: healingResult.rewritten_sql,
                    database: "shop_demo",
                    timeout_seconds: 20
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

            // Keep Healing expanded to prevent jump, expand Comparison below
            setCardsExpanded(prev => ({
                ...prev,
                healing: true,
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
            "SELECT * FROM (\n" +
            "    SELECT \n" +
            "        c.name as customer_name,\n" +
            "        p.name as product_name,\n" +
            "        p.category,\n" +
            "        COUNT(DISTINCT o.id) as order_count,\n" +
            "        SUM(oi.quantity) as total_quantity,\n" +
            "        SUM(oi.quantity * oi.unit_price) as revenue\n" +
            "    FROM shop_order_items oi\n" +
            "    JOIN shop_orders o ON oi.order_id = o.id\n" +
            "    JOIN shop_customers c ON o.customer_id = c.id\n" +
            "    JOIN shop_products p ON oi.product_id = p.id\n" +
            "    WHERE o.status IN ('delivered', 'shipped')\n" +
            "    GROUP BY c.name, p.name, p.category\n" +
            "    HAVING revenue > 100\n" +
            "    ORDER BY revenue DESC\n" +
            "    LIMIT 50\n" +
            ") AS analysis\n" +
            "UNION ALL\n" +
            "SELECT 'DELAY', '', '', 0, 0, SLEEP(9)"
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

    const detectDeploymentType = (sql: string): "ddl" | "pr" => {
        const ddlKeywords = ["CREATE", "ALTER", "DROP", "TRUNCATE", "RENAME", "INDEX"]
        const firstWord = sql.trim().split(/\s+/)[0].toUpperCase()
        return ddlKeywords.includes(firstWord) ? "ddl" : "pr"
    }



    const handleDeploy = async () => {
        if (!healingResult) return

        setIsDeploying(true)
        const type = detectDeploymentType(healingResult.rewritten_sql)
        setDeploymentType(type)

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
                setIsBranchModalOpen(false) // Close branch modal if open
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
        try {
            const res = await trackedFetch(`${API_BASE}/branching/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    branch_name: proposedBranchName,
                    source_database: "shop_demo",
                    copy_data: true
                })
            })

            const data = await res.json()
            if (!res.ok || data.success === false) {
                throw new Error(data.message || "Failed to create branch")
            }

            setIsCreatingBranch(false)
            setIsBranchModalOpen(false)
            setBranchCreated(true)
            setBranchDatabase(data.branch.branch_database)

            // Open Branch Validation card
            setCardsExpanded(prev => ({ ...prev, branchValidation: true }))

            // Auto-trigger the test for a smoother flow
            const element = document.getElementById('card-branch-validation')
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            // Automatically run the test on the new branch
            handleTestBranch(data.branch.branch_database);
        } catch (err) {
            console.error("Branch creation failed:", err)
            setIsCreatingBranch(false)
        }
    }

    const handleTestBranch = async (dbName?: string) => {
        const targetDb = dbName || branchDatabase;
        if (!targetDb) return;

        setIsTestingBranch(true)

        try {
            const res = await trackedFetch(`${API_BASE}/sandbox/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sql: healingResult?.rewritten_sql || sql,
                    database: targetDb,
                    timeout_seconds: 30
                })
            })

            if (!res.ok) throw new Error("Branch performance test failed")

            const data: SandboxResponse = await res.json()

            if (data.success && data.result) {
                const originalLatency = sandboxResult?.result?.execution_time_ms || 1;
                const improvement = ((originalLatency - data.result.execution_time_ms) / originalLatency) * 100;

                setBranchTestResult({
                    latency: Math.round(data.result.execution_time_ms),
                    throughput: Math.round(1000 / (data.result.execution_time_ms / 1000 || 1)),
                    status: "PASSED",
                    comparison: improvement > 0
                        ? `-${Math.round(improvement)}% latency vs Prod`
                        : `+${Math.round(Math.abs(improvement))}% latency vs Prod`
                })
            } else {
                setBranchTestResult({
                    status: "FAILED",
                    error: data.error || "Query execution failed on branch"
                })
            }
        } catch (err) {
            console.error("Branch test failed:", err)
            setBranchTestResult({
                status: "ERROR",
                error: err instanceof Error ? err.message : "Unknown error"
            })
        } finally {
            setIsTestingBranch(false)
        }
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
                            analysis={analysis}
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
                            isTesting={isTesting}
                            onToggleExpand={() => setCardsExpanded(prev => ({ ...prev, sandbox: !prev.sandbox }))}
                            onGetOptimized={handleGetOptimized}
                            onRetryWithFix={(fixedSql) => {
                                setSql(fixedSql);
                                handleTestInSandbox(fixedSql);
                            }}
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
                            onOpenBranchModal={() => {
                                setProposedBranchName(`fix-mdev-${Math.floor(Math.random() * 10000)}`);
                                setIsBranchModalOpen(true);
                            }}
                            onDeploy={handleDeploy}
                            deployStep={deployStep}
                        />


                        {/* Step 6: Branch Validation */}
                        <BranchValidationStep
                            isVisible={cardsExpanded.branchValidation}
                            branchName={branchDatabase}
                            branchTestResult={branchTestResult}
                            isTestingBranch={isTestingBranch}
                            isDeploying={isDeploying}
                            isDeployed={isDeployed}
                            onTestBranch={() => handleTestBranch()}
                            onDeploy={handleDeploy}
                            deployStep={deployStep}
                        />

                    </div>
                </div>
            </div >


            {/* Branch Creation Modal */}
            <BranchCreationModal
                isOpen={isBranchModalOpen}
                isCreating={isCreatingBranch}
                branchName={proposedBranchName}
                rewrittenSql={healingResult?.rewritten_sql}
                onClose={() => setIsBranchModalOpen(false)}
                onCreate={handleCreateBranch}
            />

            {/* Deployment Success Modal */}
            <DeploymentSuccessModal
                isOpen={isDeployed}
                deploymentType={deploymentType}
                sandboxResult={sandboxResult}
                optimizedSandboxResult={optimizedSandboxResult}
                costEstimate={costEstimate}
                optimizedCostEstimate={optimizedCostEstimate}
                onClose={() => setIsDeployed(false)}
            />
        </div >
    )
}

