"use client"

import { useEffect, useState } from "react"
import { QueryAnalysis, SlowQuery, Suggestion, Message, PredictResponse, IndexSimulationResponse, RewriteResponse, HistoryItem, DashboardTab } from "@/types"
import { SlowQueryTable } from "@/components/SlowQueryTable"
import { QueryDetail } from "@/components/QueryDetail"
import { QueryPredictorInput, PredictorResultPanel } from "@/components/QueryPredictor"
import { IndexSimulatorInput, IndexSimulatorResultPanel } from "@/components/IndexSimulator"
import { QueryRewriterInput, RewriterResultPanel } from "@/components/QueryRewriter"
import { SmartSandbox } from "@/components/SmartSandbox"
import { UnifiedQueryAnalyzerClean } from "@/components/UnifiedQueryAnalyzer"
import { ShopDemo } from "@/components/ShopDemo"
import PlanStabilityDashboard from "@/app/dashboard/plan-stability/page"
import BranchingDashboard from "@/app/dashboard/branching/page"
import { Activity, List, ShoppingCart, Wand2, ArrowRight, HeartPulse, Zap, ShieldAlert, Brain, Shield, Workflow, GitBranch, TrendingUp, Send, Moon, Sun, MessageSquare } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { DiagnosticStatus } from "@/components/DiagnosticStatus"
import { MCPProof } from "@/components/MCPProof"
import { PerformanceMonitor } from "@/components/ui/PerformanceMonitor"
import { apiFetch } from "@/lib/api-client"
import { Splash } from "@/components/Splash"
import { UnifiedCopilot } from "@/components/UnifiedCopilot"

import { NeuralDashboard } from "@/components/neural/NeuralDashboard"
import { SidebarContent } from "@/components/dashboard/SidebarContent"
import { CopilotSidebar } from "@/components/dashboard/CopilotSidebar"
import { MainContent } from "@/components/dashboard/MainContent"

export default function Dashboard() {
  const { theme, setTheme } = useTheme()
  const [isStarted, setIsStarted] = useState(false)

  const [analysis, setAnalysis] = useState<QueryAnalysis | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [selectedQuery, setSelectedQuery] = useState<SlowQuery | null>(null)
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)
  const [activeTab, setActiveTab] = useState<DashboardTab>("neural")
  const [unifiedHistory, setUnifiedHistory] = useState<HistoryItem[]>([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null)
  const [isCopilotOpen, setIsCopilotOpen] = useState(true)
  const [showPowerTools, setShowPowerTools] = useState(false)
  const [isImmersiveMode, setIsImmersiveMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Predictor state
  const [predictorResult, setPredictorResult] = useState<PredictResponse | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)

  // Index Simulator state
  const [simulatorResult, setSimulatorResult] = useState<IndexSimulationResponse | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  // Query Rewriter state
  const [rewriterResult, setRewriterResult] = useState<RewriteResponse | null>(null)
  const [isRewriting, setIsRewriting] = useState(false)

  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I'm your MariaDB Copilot. Ask me anything about this query or database performance."
    }
  ])
  const [chatInput, setChatInput] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(false)

  // Fetch initial analysis
  useEffect(() => {
    if (isStarted) {
      apiFetch<QueryAnalysis>("/analyze?limit=10")
        .then(data => setAnalysis(data))
        .catch(err => console.error("Failed to fetch analysis", err))
    }
  }, [isStarted])

  const handleAnalyze = async (id: number) => {
    const query = analysis?.top_queries.find(q => q.id === id) || null
    setSelectedQuery(query)
    setIsLoadingSuggestion(true)
    setSelectedSuggestion(null)
    setChatMessages([{
      id: "welcome",
      role: "assistant",
      text: "Hello! I'm your MariaDB Copilot. Ask me anything about this query or database performance."
    }])

    try {
      console.log("[Frontend] Fetching suggestion for query:", id)
      const data = await apiFetch<Suggestion>(`/suggest/${id}`)
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

    let contextStr = ""
    if (activeTab === "queries" && selectedQuery) {
      contextStr = `SQL: ${selectedQuery.sql_text}\nExecution Time: ${selectedQuery.query_time}s\nRows Sent: ${selectedQuery.rows_sent}\nRows Examined: ${selectedQuery.rows_examined}`
      if (selectedSuggestion) {
        contextStr += `\nPREVIOUS ANALYSIS: ${selectedSuggestion.query_explanation}\nInsights: ${selectedSuggestion.actionable_insights}`
      }
    } else if (activeTab === "predictor" && predictorResult) {
      contextStr = `CONTEXT: SQL Risk Prediction\nRisk Level: ${predictorResult.risk_level}\nReason: ${predictorResult.reason}`
    } else if (activeTab === "simulator" && simulatorResult) {
      contextStr = `CONTEXT: Index Simulation\nRecommendation: ${simulatorResult.recommendation}\nImprovement: ${simulatorResult.improvement_percent}%`
    } else if (activeTab === "rewriter" && rewriterResult) {
      contextStr = `CONTEXT: Self-Healing SQL\nOriginal: ${rewriterResult.original_sql}\nRewritten: ${rewriterResult.rewritten_sql}`
    }

    try {
      const data = await apiFetch<{ answer: string }>("/copilot/chat", {
        method: "POST",
        body: JSON.stringify({ prompt: text, context: contextStr })
      })
      const answer = data.answer || JSON.stringify(data)
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: answer }])
    } catch (error) {
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: "Error communicating with Copilot." }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const togglePresentation = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
        setIsImmersiveMode(true)
      }).catch(err => console.error(err))
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false)
          setIsImmersiveMode(false)
        })
      }
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        togglePresentation()
      }
    }
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)
      if (isCurrentlyFullscreen) setIsImmersiveMode(true)
      else setIsImmersiveMode(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handleChatClear = () => {
    setChatMessages([{
      id: "welcome",
      role: "assistant",
      text: "Hello! I'm your MariaDB Copilot. Ask me anything about this query or database performance."
    }])
  }

  if (!isStarted) return <Splash onConnect={() => setIsStarted(true)} />

  return (
    <div className="min-h-screen bg-background">
      <PerformanceMonitor />
      {isImmersiveMode ? (
        <NeuralDashboard
          analysis={analysis}
          onBack={() => {
            setIsImmersiveMode(false)
            if (document.fullscreenElement) document.exitFullscreen()
          }}
          isPresentationMode={isFullscreen}
          onTogglePresentation={togglePresentation}
        />
      ) : (
        <main className="h-screen bg-background text-foreground overflow-hidden flex font-sans selection:bg-primary/20">
          {/* Navigation */}
          <nav className="w-16 border-r border-border bg-card flex flex-col items-center py-4 gap-4 shrink-0 z-50 shadow-sm">
            <div className="p-2 mb-4">
              <Zap className="w-6 h-6 text-primary fill-primary" />
            </div>

            {[
              { id: "neural", label: "Neural Core", icon: Brain },
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
                  className={`relative p-3 rounded-lg transition-all group ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                >
                  <Icon className="w-6 h-6" />
                  {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />}
                </button>
              )
            })}

            <div className="relative group">
              <button
                onClick={() => setShowPowerTools(!showPowerTools)}
                title="Power User Tools"
                className={`relative p-3 rounded-lg transition-all ${showPowerTools ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                <Zap className="w-6 h-6" />
                {showPowerTools && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />
                )}
              </button>

              {showPowerTools && (
                <div className="absolute left-full ml-2 bottom-0 bg-card dark:bg-popover border border-border rounded-lg shadow-xl p-2 space-y-1 min-w-[180px] z-[200]">
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
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${activeTab === tool.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
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
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
                className="p-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  setActiveTab("diagnostic")
                  handleChatClear()
                }}
                title="System Health"
                className={`relative p-3 rounded-lg transition-all group ${activeTab === "diagnostic" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                <HeartPulse className="w-6 h-6" />
                {activeTab === "diagnostic" && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />
                )}
              </button>

              <div className="relative group">
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center bg-card cursor-help shadow-sm group-hover:border-primary/50 transition-colors">
                  <Activity className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="absolute left-full ml-3 px-3 py-2 bg-card border border-border text-foreground rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-all transform translate-x-[-10px] group-hover:translate-x-0 shadow-xl border-l-2 border-l-primary">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">MCP Engine: Active</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">
                      Model Context Protocol bridging AI <br />
                      with local MariaDB system tools.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsCopilotOpen(!isCopilotOpen)}
                title={isCopilotOpen ? "Hide Copilot" : "Show Copilot"}
                className={`p-3 rounded-lg transition-all group relative ${isCopilotOpen ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                <MessageSquare className="w-6 h-6" />
              </button>
            </div>
          </nav>

          {/* Extracted Sidebar */}
          {activeTab !== "neural" && (
            <SidebarContent
              activeTab={activeTab}
              analysis={analysis}
              selectedQuery={selectedQuery}
              handleAnalyze={handleAnalyze}
              unifiedHistory={unifiedHistory}
              setUnifiedHistory={setUnifiedHistory}
              setSelectedHistoryItem={setSelectedHistoryItem}
            />
          )}

          {/* Extracted Main Content */}
          <MainContent
            activeTab={activeTab}
            analysis={analysis}
            selectedQuery={selectedQuery}
            selectedSuggestion={selectedSuggestion}
            isLoadingSuggestion={isLoadingSuggestion}
            isFullscreen={isFullscreen}
            togglePresentation={togglePresentation}
            setActiveTab={setActiveTab}
            predictorResult={predictorResult}
            setPredictorResult={setPredictorResult}
            isPredicting={isPredicting}
            setIsPredicting={setIsPredicting}
            simulatorResult={simulatorResult}
            setSimulatorResult={setSimulatorResult}
            isSimulating={isSimulating}
            setIsSimulating={setIsSimulating}
            rewriterResult={rewriterResult}
            setRewriterResult={setRewriterResult}
            isRewriting={isRewriting}
            setIsRewriting={setIsRewriting}
            unifiedHistory={unifiedHistory}
            setUnifiedHistory={setUnifiedHistory}
            selectedHistoryItem={selectedHistoryItem}
            setSelectedHistoryItem={setSelectedHistoryItem}
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            isChatLoading={isChatLoading}
            handleChatSend={handleChatSend}
            handleChatClear={handleChatClear}
          />

          {/* Extracted Copilot Sidebar */}
          {isCopilotOpen && (
            <CopilotSidebar
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isChatLoading={isChatLoading}
              handleChatSend={handleChatSend}
            />
          )}
        </main>
      )}
    </div>
  )
}
