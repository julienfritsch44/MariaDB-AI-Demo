"use client"

import { useEffect, useState } from "react"
import { QueryAnalysis, SlowQuery, Suggestion, Message, PredictResponse, IndexSimulationResponse } from "@/types"
import { SlowQueryTable } from "@/components/SlowQueryTable"
import { QueryDetail } from "@/components/QueryDetail"
import { QueryPredictorInput, PredictorResultPanel } from "@/components/QueryPredictor"
import { IndexSimulatorInput, IndexSimulatorResultPanel } from "@/components/IndexSimulator"
import { QueryRewriterInput, RewriterResultPanel } from "@/components/QueryRewriter"
import { ShopDemo } from "@/components/ShopDemo"
import { Activity, List, ShoppingCart, Wand2, ArrowRight, HeartPulse, Zap, ShieldAlert, Brain } from "lucide-react"
import { DiagnosticStatus } from "@/components/DiagnosticStatus"
import { MCPProof } from "@/components/MCPProof"
import { PerformanceMonitor } from "@/components/ui/PerformanceMonitor"
import { trackedFetch } from "@/lib/usePerformance"
import { Splash } from "@/components/Splash"

export default function Dashboard() {
  const [isStarted, setIsStarted] = useState(false)

  const [analysis, setAnalysis] = useState<QueryAnalysis | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [selectedQuery, setSelectedQuery] = useState<SlowQuery | null>(null)
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)
  const [activeTab, setActiveTab] = useState<"shop" | "predictor" | "simulator" | "rewriter" | "queries" | "diagnostic">("shop")

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
      trackedFetch("http://localhost:8000/analyze?limit=10")
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
      const res = await trackedFetch(`http://localhost:8000/suggest/${id}`)
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
      const response = await trackedFetch("http://localhost:8000/copilot/chat", {
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
    <>
      <PerformanceMonitor />
      <main className="h-screen bg-zinc-950 text-zinc-100 overflow-hidden flex font-sans selection:bg-emerald-500/30">
        {/* 1. LEFT NARROW NAV (VS Code Style) */}
        <nav className="w-16 border-r border-zinc-800 bg-zinc-950 flex flex-col items-center py-4 gap-4 shrink-0 z-50">
          <div className="p-2 mb-4">
            <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400" />
          </div>

          {[
            { id: "shop", label: "Shop Demo", icon: ShoppingCart },
            { id: "queries", label: "Slow Queries", icon: List },
            { id: "predictor", label: "Risk Predictor", icon: ShieldAlert },
            { id: "simulator", label: "Index Simulator", icon: Zap },
            { id: "rewriter", label: "Self-Healing", icon: Wand2 },
            { id: "mcp", label: "MCP Proof", icon: Brain }
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
                className={`relative p-3 rounded-xl transition-all group ${isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                  }`}
              >
                <Icon className="w-6 h-6" />
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-emerald-500 rounded-r-full" />
                )}
                {/* Tooltip (optional, showing on hover) */}
                <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-zinc-100 text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity lowercase italic tracking-wider">
                  {tab.label}
                </div>
              </button>
            )
          })}

          <div className="mt-auto flex flex-col items-center gap-4">
            {/* Diagnostic Icon moved to bottom */}
            <button
              onClick={() => {
                setActiveTab("diagnostic")
                handleChatClear()
              }}
              title="System Health"
              className={`relative p-3 rounded-xl transition-all group ${activeTab === "diagnostic"
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
            >
              <HeartPulse className="w-6 h-6" />
              {activeTab === "diagnostic" && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-emerald-500 rounded-r-full" />
              )}
              <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-zinc-100 text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity lowercase italic tracking-wider">
                System Health
              </div>
            </button>

            <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-900 group cursor-help" title="MCP API Active">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            </div>
          </div>
        </nav>

        {/* 2. SIDEBAR CONTENT (400px fixed) */}
        <div className="w-[380px] border-r border-zinc-800 flex flex-col bg-zinc-925 shrink-0 overflow-hidden">
          {/* Header of Sidebar */}
          <div className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-950/50">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {activeTab === "shop" ? "DEMO APP" :
                activeTab === "queries" ? "QUERY LOGS" :
                  activeTab === "predictor" ? "RISK ANALYSIS" :
                    activeTab === "simulator" ? "INDEX LAB" :
                      activeTab === "diagnostic" ? "DIAGNOSTICS" : "SELF-HEALING"}
            </span>
            <span className="text-[10px] font-mono text-zinc-600">v11.4.2</span>
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
              <div className="flex items-center justify-center py-20 text-zinc-600">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Connecting...</span>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer Metrics */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 space-y-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-tighter">
              <span className="text-zinc-500">Global Score</span>
              <span className="text-emerald-400 font-bold">{analysis?.global_score ?? 0}</span>
            </div>
            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${analysis?.global_score ?? 0}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>SkySQL Active</span>
              </div>
              <span>{analysis?.total_queries ?? 0} Samples</span>
            </div>

            {/* NEURAL CORE COUNTER */}
            <div className="pt-2 mt-2 border-t border-zinc-800/50">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center">
                    <Brain className="w-3 h-3 text-purple-400 animate-pulse" />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-tight">Neural Core</span>
                </div>
                <span className="text-[10px] font-mono text-purple-400 font-bold">
                  {analysis?.kb_count ? analysis.kb_count.toLocaleString() : "1,350"} Incidents
                </span>
              </div>
              <p className="text-[8px] text-zinc-600 mt-1 leading-tight italic">
                Proactive RAG grounded in MariaDB Jira history.
              </p>
            </div>
          </div>
        </div>

        {/* 3. MAIN PANEL */}
        <div className="flex-1 bg-zinc-950 relative overflow-hidden flex flex-col">
          {/* Tab-like indicator / breadcrumb for context */}
          <div className="h-12 border-b border-zinc-800 bg-zinc-950/20 flex items-center px-6">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-widest">
              <span>Auditor</span>
              <ArrowRight className="w-3 h-3" />
              <span className="text-zinc-100">{activeTab}</span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative flex flex-col">
            {activeTab === "shop" ? (
              <ShopDemo />
            ) : activeTab === "predictor" ? (
              <PredictorResultPanel
                result={predictorResult}
                isLoading={isPredicting}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatLoading={isChatLoading}
                onChatSend={handleChatSend}
                onChatClear={handleChatClear}
              />
            ) : activeTab === "simulator" ? (
              <IndexSimulatorResultPanel
                result={simulatorResult}
                isLoading={isSimulating}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatLoading={isChatLoading}
                onChatSend={handleChatSend}
                onChatClear={handleChatClear}
              />
            ) : activeTab === "rewriter" ? (
              <RewriterResultPanel
                result={rewriterResult}
                isLoading={isRewriting}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatLoading={isChatLoading}
                onChatSend={handleChatSend}
                onChatClear={handleChatClear}
              />
            ) : activeTab === "diagnostic" ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-zinc-500 gap-4">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-widest">Live Infrastructure Status</h3>
                  <p className="mt-2 text-sm">Deep diagnostic of the MariaDB / RAG infrastructure running on the backend.</p>
                  <div className="mt-8 grid grid-cols-2 gap-4 text-left">
                    <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Backend</p>
                      <p className="text-xs text-zinc-300">FastAPI / Python 3.13</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">LLM Engine</p>
                      <p className="text-xs text-zinc-300">MariaDB SkyAI Copilot</p>
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
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatLoading={isChatLoading}
                onChatSend={handleChatSend}
                onChatClear={handleChatClear}
              />
            )}
          </div>
        </div>
      </main>
    </>
  )
}
