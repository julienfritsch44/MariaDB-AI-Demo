"use client"

import { useEffect, useState } from "react"
import { QueryAnalysis, SlowQuery, Suggestion, Message, PredictResponse, IndexSimulationResponse } from "@/types"
import { SlowQueryTable } from "@/components/SlowQueryTable"
import { QueryDetail } from "@/components/QueryDetail"
import { QueryPredictorInput, PredictorResultPanel } from "@/components/QueryPredictor"
import { IndexSimulatorInput, IndexSimulatorResultPanel } from "@/components/IndexSimulator"
import { QueryRewriterInput, RewriterResultPanel } from "@/components/QueryRewriter"
import { SmartSandbox } from "@/components/SmartSandbox"
import { UnifiedQueryAnalyzerClean } from "@/components/UnifiedQueryAnalyzerClean"
import { ShopDemo } from "@/components/ShopDemo"
import PlanStabilityDashboard from "@/app/dashboard/plan-stability/page"
import BranchingDashboard from "@/app/dashboard/branching/page"
import { Activity, List, ShoppingCart, Wand2, ArrowRight, HeartPulse, Zap, ShieldAlert, Brain, Shield, Workflow, GitBranch, TrendingUp, Send, Moon, Sun } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { DiagnosticStatus } from "@/components/DiagnosticStatus"
import { MCPProof } from "@/components/MCPProof"
import { PerformanceMonitor } from "@/components/ui/PerformanceMonitor"
import { trackedFetch } from "@/lib/usePerformance"
import { Splash } from "@/components/Splash"
import { UnifiedCopilot } from "@/components/UnifiedCopilot"

import { NeuralDashboard } from "@/components/neural/NeuralDashboard"

export default function Dashboard() {
  const { theme, setTheme } = useTheme()
  const [isStarted, setIsStarted] = useState(false)

  const [analysis, setAnalysis] = useState<QueryAnalysis | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [selectedQuery, setSelectedQuery] = useState<SlowQuery | null>(null)
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)
  const [activeTab, setActiveTab] = useState<"shop" | "predictor" | "simulator" | "rewriter" | "sandbox" | "unified" | "queries" | "diagnostic" | "mcp" | "planstability" | "branching" | "executive">("queries")
  const [unifiedHistory, setUnifiedHistory] = useState<any[]>([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null)
  const [isCopilotOpen, setIsCopilotOpen] = useState(true)
  const [showPowerTools, setShowPowerTools] = useState(false)
  const [isImmersiveMode, setIsImmersiveMode] = useState(false)

  // Predictor state (lifted from QueryPredictor component)
  const [predictorResult, setPredictorResult] = useState<PredictResponse | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)

  // Index Simulator state
  const [simulatorResult, setSimulatorResult] = useState<IndexSimulationResponse | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  // Query Rewriter state
  const [rewriterResult, setRewriterResult] = useState<any | null>(null)
  const [isRewriting, setIsRewriting] = useState(false)

  // -- Chat State --

  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I'm your MariaDB Copilot. Ask me anything about this query or database performance."
    }
  ])
  const [chatInput, setChatInput] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(false)
  // ----------------

  // Fetch initial analysis
  useEffect(() => {
    if (isStarted) {
      trackedFetch("http://127.0.0.1:8000/analyze?limit=10")
        .then(res => res.json())
        .then(data => setAnalysis(data))
        .catch(err => console.error("Failed to fetch analysis", err))
    }
  }, [isStarted])

  const handleAnalyze = async (id: number) => {
    const query = analysis?.top_queries.find(q => q.id === id) || null
    setSelectedQuery(query)
    setIsLoadingSuggestion(true)
    setSelectedSuggestion(null)

    // Reset chat on new query selection? Optional. 
    // Maybe keep history or clear it. Let's clear for context switch.
    setChatMessages([{
      id: "welcome",
      role: "assistant",
      text: "Hello! I'm your MariaDB Copilot. Ask me anything about this query or database performance."
    }])

    try {
      console.log("[Frontend] Fetching suggestion for query:", id)
      const res = await trackedFetch(`http://127.0.0.1:8000/suggest/${id}`)
      const data = await res.json()
      setSelectedSuggestion(data)
    } catch (error) {
      console.error("[Frontend] Failed to get suggestion", error)
    } finally {
      setIsLoadingSuggestion(false)
    }
  }

  const handleChatSend = async (text: string = chatInput) => {
    if (!text.trim() || isChatLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput("")
    setIsChatLoading(true)

    // Construct context based on ACTIVE TAB
    let contextStr = ""

    if (activeTab === "queries" && selectedQuery) {
      contextStr = `Current Query ID: ${selectedQuery.id}
SQL: ${selectedQuery.sql_text}
Execution Time: ${selectedQuery.query_time}s
Rows Sent: ${selectedQuery.rows_sent}
Rows Examined: ${selectedQuery.rows_examined}
`
      if (selectedSuggestion) {
        contextStr += `
PREVIOUS ANALYSIS:
Explanation: ${selectedSuggestion.query_explanation}
Performance Assessment: ${selectedSuggestion.performance_assessment}
Actionable Insights: ${selectedSuggestion.actionable_insights}
Risks: ${selectedSuggestion.risks?.join(", ")}
Sources/Knowledge Base: ${selectedSuggestion.sources?.join(", ")}
`
      }
    } else if (activeTab === "predictor" && predictorResult) {
      contextStr = `
CONTEXT: SQL Risk Prediction
Risk Level: ${predictorResult.risk_level}
Risk Score: ${predictorResult.risk_score}
Reason: ${predictorResult.reason}
Analysis: ${predictorResult.query_analysis}
Suggested Fix: ${predictorResult.suggested_fix}
`
    } else if (activeTab === "simulator" && simulatorResult) {
      contextStr = `
CONTEXT: Index Simulation
Recommendation: ${simulatorResult.recommendation}
Improvement: ${simulatorResult.improvement_percent}%
Current Plan Cost: ${simulatorResult.current_plan.estimated_time_ms}ms
With Index Cost: ${simulatorResult.with_index_plan.estimated_time_ms}ms
Created Index SQL: ${simulatorResult.create_index_sql}
`
    } else if (activeTab === "rewriter" && rewriterResult) {
      contextStr = `
CONTEXT: Self-Healing SQL / Query Rewriting
Original SQL: ${rewriterResult.original_sql}
Rewritten SQL: ${rewriterResult.rewritten_sql}
Improvements: ${rewriterResult.improvements?.join(", ")}
Speedup: ${rewriterResult.estimated_speedup}
Confidence: ${rewriterResult.confidence}
`
    }

    try {
      const response = await trackedFetch("http://127.0.0.1:8000/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          context: contextStr
        })
      })

      if (!response.ok) throw new Error("API Error")

      const data = await response.json()
      const answer = data.answer || data.message || data.result || JSON.stringify(data)

      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: answer
      }])

    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: "Sorry, I couldn't reach the Copilot service. Please check your API Key configuration."
      }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleChatClear = () => {
    setChatMessages([{
      id: "welcome",
      role: "assistant",
      text: "Hello! I'm your MariaDB Copilot. Ask me anything about this query or database performance."
    }])
  }

  // --- RENDER ---
  if (!isStarted) {
    return <Splash onConnect={() => setIsStarted(true)} />
  }

  return (
    <div>
      <PerformanceMonitor />
      {isImmersiveMode ? (
        <NeuralDashboard
          analysis={analysis}
          onBack={() => setIsImmersiveMode(false)}
        />
      ) : (
        <main className="h-screen bg-background text-foreground overflow-hidden flex font-sans selection:bg-primary/20">
          {/* 1. LEFT NARROW NAV (SkySQL Style) */}
          <nav className="w-16 border-r border-border bg-card flex flex-col items-center py-4 gap-4 shrink-0 z-50 shadow-sm">
            <div className="p-2 mb-4">
              <Zap className="w-6 h-6 text-primary fill-primary" />
            </div>

            {[
              { id: "queries", label: "Slow Queries", icon: List },
              { id: "unified", label: "Unified Analyzer", icon: Workflow }
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any)
                    if (activeTab !== tab.id) handleChatClear()
                  }}
                  title={tab.label}
                  className={`relative p-3 rounded-lg transition-all group ${isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                >
                  <Icon className="w-6 h-6" />
                  {isActive && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />
                  )}
                  {/* Tooltip */}
                  <div className="absolute left-full ml-3 px-2 py-1 bg-card border border-border text-foreground text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity shadow-md">
                    {tab.label}
                  </div>
                </button>
              )
            })}

            {/* Power User Tools Dropdown */}
            <div className="relative group">
              <button
                onClick={() => setShowPowerTools(!showPowerTools)}
                title="Power User Tools"
                className={`relative p-3 rounded-lg transition-all ${showPowerTools
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                <Zap className="w-6 h-6" />
                {showPowerTools && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />
                )}
                <div className="absolute left-full ml-3 px-2 py-1 bg-card border border-border text-foreground text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity shadow-md">
                  Power User Tools
                </div>
              </button>

              {showPowerTools && (
                <div className="absolute left-full ml-2 bottom-0 bg-card border border-border rounded-lg shadow-xl p-2 space-y-1 min-w-[180px] z-[200]">
                  {[
                    { id: "predictor", label: "Risk Predictor", icon: ShieldAlert },
                    { id: "rewriter", label: "Self-Healing", icon: Wand2 },
                    { id: "sandbox", label: "Smart Sandbox", icon: Shield },
                    { id: "planstability", label: "Plan Stability", icon: Activity },
                    { id: "branching", label: "DB Branching", icon: GitBranch }
                  ].map((tool) => {
                    const Icon = tool.icon
                    return (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setActiveTab(tool.id as any)
                          setShowPowerTools(false)
                          handleChatClear()
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${activeTab === tool.id
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tool.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-col items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
                className="p-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {/* Diagnostic Icon moved to bottom */}
              <button
                onClick={() => {
                  setActiveTab("diagnostic")
                  handleChatClear()
                }}
                title="System Health"
                className={`relative p-3 rounded-lg transition-all group ${activeTab === "diagnostic"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                <HeartPulse className="w-6 h-6" />
                {activeTab === "diagnostic" && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />
                )}
                <div className="absolute left-full ml-3 px-2 py-1 bg-card border border-border text-foreground text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity shadow-md">
                  System Health
                </div>
              </button>

              <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center bg-card group cursor-help shadow-sm" title="MCP API Active">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
              </div>

              {/* IMMERSIVE MODE TOGGLE */}
              <button
                onClick={() => setIsImmersiveMode(true)}
                title="Enter Immersive Neural View"
                className="p-3 rounded-xl bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 hover:border-primary transition-all hover:scale-110 mb-2 group relative shadow-[0_0_15px_rgba(0,169,206,0.1)]"
              >
                <Brain className="w-6 h-6 animate-pulse" />
                <div className="absolute left-full ml-4 px-3 py-2 bg-card border border-primary/30 text-primary text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-all transform translate-x-[-10px] group-hover:translate-x-0 shadow-xl uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Zap className="w-3 h-3 fill-primary" />
                    Neural Core Active
                  </span>
                </div>
              </button>
            </div>
          </nav>

          {/* 2. SIDEBAR CONTENT (400px fixed) - Hidden for executive tab */}
          {activeTab !== "executive" && (
            <div className="w-[380px] border-r border-border flex flex-col bg-muted shrink-0 overflow-hidden">
              {/* Header of Sidebar */}
              <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-card/50">
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
                ) : activeTab === "predictor" ? (
                  <div className="p-4">
                    <QueryPredictorInput
                      onPredict={setPredictorResult}
                      isLoading={isPredicting}
                      setIsLoading={setIsPredicting}
                    />
                  </div>
                ) : activeTab === "simulator" ? (
                  <div className="p-4">
                    <IndexSimulatorInput
                      onSimulate={setSimulatorResult}
                      isLoading={isSimulating}
                      setIsLoading={setIsSimulating}
                    />
                  </div>
                ) : activeTab === "rewriter" ? (
                  <div className="p-4">
                    <QueryRewriterInput
                      onRewrite={setRewriterResult}
                      isLoading={isRewriting}
                      setIsLoading={setIsRewriting}
                    />
                  </div>
                ) : activeTab === "sandbox" ? (
                  <div className="p-4 space-y-4">
                    <div className="text-xs text-muted-foreground">
                      Test queries safely without persisting changes
                    </div>
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
                ) : activeTab === "planstability" ? (
                  <div className="p-4 space-y-4">
                    <div className="text-xs text-muted-foreground">
                      Manage query plan baselines to prevent performance regressions
                    </div>
                  </div>
                ) : activeTab === "branching" ? (
                  <div className="p-4 space-y-4">
                    <div className="text-xs text-muted-foreground">
                      Create and manage database branches for safe testing
                    </div>
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
          )}

          {/* 3. MAIN PANEL + COPILOT */}
          <div className="flex-1 bg-card relative overflow-hidden flex">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab-like indicator / breadcrumb for context */}
              <div className="h-12 border-b border-border bg-muted/30 flex items-center px-6 justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  <span>MariaDB Local Pilot</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="text-foreground">{activeTab}</span>
                </div>
                <button
                  onClick={() => setIsCopilotOpen(!isCopilotOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-card hover:bg-muted border border-border rounded-md transition-colors"
                  title={isCopilotOpen ? "Hide AI Copilot" : "Show AI Copilot"}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>{isCopilotOpen ? "Hide" : "Show"} Copilot</span>
                </button>
              </div>

              <div className="flex-1 overflow-hidden relative flex flex-col">
                {activeTab === "shop" ? (
                  <ShopDemo />
                ) : activeTab === "mcp" ? (
                  <UnifiedCopilot
                    chatMessages={chatMessages}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    isChatLoading={isChatLoading}
                    onChatSend={handleChatSend}
                    onChatClear={handleChatClear}
                  />
                ) : activeTab === "predictor" ? (
                  <PredictorResultPanel
                    result={predictorResult}
                    isLoading={isPredicting}
                  />
                ) : activeTab === "simulator" ? (
                  <IndexSimulatorResultPanel
                    result={simulatorResult}
                    isLoading={isSimulating}
                  />
                ) : activeTab === "rewriter" ? (
                  <RewriterResultPanel
                    result={rewriterResult}
                    isLoading={isRewriting}
                  />
                ) : activeTab === "sandbox" ? (
                  <div className="flex-1 overflow-y-auto p-6">
                    <SmartSandbox />
                  </div>
                ) : activeTab === "unified" ? (
                  <UnifiedQueryAnalyzerClean
                    analysisHistory={unifiedHistory}
                    setAnalysisHistory={setUnifiedHistory}
                    selectedHistoryItem={selectedHistoryItem}
                    onLoadFromHistory={(item) => {
                      setSelectedHistoryItem(item)
                    }}
                  />
                ) : activeTab === "planstability" ? (
                  <div className="flex-1 overflow-y-auto">
                    <PlanStabilityDashboard />
                  </div>
                ) : activeTab === "branching" ? (
                  <div className="flex-1 overflow-y-auto">
                    <BranchingDashboard />
                  </div>
                ) : activeTab === "executive" ? (
                  <div className="flex-1 overflow-y-auto">
                    <ExecutiveDashboard />
                  </div>
                ) : activeTab === "diagnostic" ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border">
                      <Activity className="w-8 h-8 text-primary" />
                    </div>
                    <div className="max-w-md">
                      <h3 className="text-xl font-bold text-foreground uppercase tracking-widest">Live Infrastructure Status</h3>
                      <p className="mt-2 text-sm">Deep diagnostic of the MariaDB / RAG infrastructure running on the backend.</p>
                      <div className="mt-8 grid grid-cols-2 gap-4 text-left">
                        <div className="p-3 rounded-lg bg-muted/50 border border-border">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Backend</p>
                          <p className="text-xs text-foreground">FastAPI / Python 3.13</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 border border-border">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">LLM Engine</p>
                          <p className="text-xs text-foreground">MariaDB SkyAI Copilot</p>
                        </div>
                      </div>
                    </div>

                    {/* MCP PROOF TERMINAL */}
                    <div className="w-full max-w-2xl h-[300px] mt-8">
                      <MCPProof />
                    </div>
                  </div>
                ) : (
                  <QueryDetail
                    suggestion={selectedSuggestion}
                    query={selectedQuery}
                    isLoading={isLoadingSuggestion}
                  />
                )}
              </div>

              {/* Persistent Copilot Panel */}
              {isCopilotOpen && (
                <div className="w-[400px] border-l border-border flex flex-col bg-muted/30 shrink-0">
                  <div className="h-12 border-b border-border bg-card/50 flex items-center px-4 justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Copilot</span>
                    </div>
                    <button
                      onClick={() => setIsCopilotOpen(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Close Copilot"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === "user"
                            ? "bg-primary text-white text-sm"
                            : "bg-card text-foreground border border-border text-sm"
                            }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-muted-foreground">
                              <Brain className="w-3 h-3" />
                              <span>AI Copilot</span>
                            </div>
                          )}
                          <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border bg-card/50 p-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleChatSend()
                          }
                        }}
                        placeholder="Ask the AI Copilot..."
                        disabled={isChatLoading}
                        className="flex-1 px-3 py-2 bg-card border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      />
                      <button
                        onClick={() => handleChatSend()}
                        disabled={isChatLoading || !chatInput.trim()}
                        className="px-3 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
