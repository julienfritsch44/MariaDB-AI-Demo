"use client"

import { useEffect, useState } from "react"
import { QueryAnalysis, SlowQuery, Suggestion, Message, PredictResponse, IndexSimulationResponse } from "@/types"
import { SlowQueryTable } from "@/components/SlowQueryTable"
import { QueryDetail } from "@/components/QueryDetail"
import { QueryPredictorInput, PredictorResultPanel } from "@/components/QueryPredictor"
import { IndexSimulatorInput, IndexSimulatorResultPanel } from "@/components/IndexSimulator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShopDemo } from "@/components/ShopDemo"
import { Activity, Database, Server, Zap, ShieldAlert, List, ShoppingCart } from "lucide-react"

export default function Dashboard() {
  const [analysis, setAnalysis] = useState<QueryAnalysis | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [selectedQuery, setSelectedQuery] = useState<SlowQuery | null>(null)
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)
  const [activeTab, setActiveTab] = useState<"shop" | "predictor" | "simulator" | "queries">("shop")

  // Predictor state (lifted from QueryPredictor component)
  const [predictorResult, setPredictorResult] = useState<PredictResponse | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)

  // Index Simulator state
  const [simulatorResult, setSimulatorResult] = useState<IndexSimulationResponse | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

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
    fetch("http://localhost:8000/analyze?limit=10")
      .then(res => res.json())
      .then(data => setAnalysis(data))
      .catch(err => console.error("Failed to fetch analysis", err))
  }, [])

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
      const res = await fetch(`http://localhost:8000/suggest/${id}`)
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
    }

    try {
      const response = await fetch("http://localhost:8000/copilot/chat", {
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


  return (
    <main className="h-screen bg-zinc-950 text-zinc-100 overflow-hidden flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-zinc-800">
              <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
              FinOps Auditor
            </h1>
            <span className="text-[10px] font-mono text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded-full">
              BETA
            </span>
          </div>
        </div>

        {/* Global KPI Mini-Bar */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-zinc-400">Health: <span className="text-zinc-200 font-mono">{analysis?.global_score ?? 0}</span></span>
          </div>
          <div className="w-px h-3 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">Queries: <span className="text-zinc-200 font-mono">{analysis?.total_queries ?? 0}</span></span>
          </div>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL: Navigation & Input (400px fixed) */}
        <div className="w-[400px] border-r border-zinc-800 flex flex-col bg-zinc-925 shrink-0">
          {/* Minimalist Tab Navigation */}
          <div className="flex border-b border-zinc-800">
            {[
              { id: "shop", label: "Shop Demo", icon: ShoppingCart },
              { id: "queries", label: "Slow Queries", icon: List },
              { id: "predictor", label: "Risk Predictor", icon: ShieldAlert },
              { id: "simulator", label: "Index Simulator", icon: Zap }
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any)
                    // Optional: Clear chat on tab switch to avoid context confusion
                    if (activeTab !== tab.id) {
                      handleChatClear()
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 text-xs font-medium transition-colors ${isActive
                    ? "text-zinc-100 border-b-2 border-emerald-500 bg-zinc-900"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : ""}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
            {/* Show content based on activeTab */}
            {activeTab === "shop" ? (
              <div className="p-8 text-center text-zinc-500 space-y-4">
                <div className="mx-auto w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-zinc-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-300">Live Application Demo</h3>
                  <p className="text-xs mt-1">
                    Switch to the right panel to interact with the ShopAdmin dashboard and generate traffic.
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
                  <span className="text-xs">Loading data...</span>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Connected: SkySQL</span>
            </div>
            <span>v11.4.2-MariaDB</span>
          </div>
        </div>

        {/* RIGHT PANEL: Detail (Flex) */}
        <div className="flex-1 bg-zinc-950 relative overflow-hidden flex flex-col">
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
  )
}
