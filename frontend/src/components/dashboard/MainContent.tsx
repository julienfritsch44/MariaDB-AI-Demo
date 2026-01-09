import { ArrowRight, Activity } from "lucide-react"
import { NeuralDashboard } from "@/components/neural/NeuralDashboard"
import { ShopDemo } from "@/components/ShopDemo"
import { UnifiedCopilot } from "@/components/UnifiedCopilot"
import { QueryPredictorInput, PredictorResultPanel } from "@/components/QueryPredictor"
import { IndexSimulatorInput, IndexSimulatorResultPanel } from "@/components/IndexSimulator"
import { QueryRewriterInput, RewriterResultPanel } from "@/components/QueryRewriter"
import { SmartSandbox } from "@/components/SmartSandbox"
import { UnifiedQueryAnalyzerClean } from "@/components/UnifiedQueryAnalyzer"
import PlanStabilityDashboard from "@/app/dashboard/plan-stability/page"
import BranchingDashboard from "@/app/dashboard/branching/page"
import { MCPProof } from "@/components/MCPProof"
import { QueryDetail } from "@/components/QueryDetail"
import {
    QueryAnalysisDetailed,
    SlowQuery,
    Suggestion,
    PredictResponse,
    IndexSimulationResponse,
    RewriteResponse,
    HistoryItem,
    ChatMessage,
    Message,
    DashboardTab
} from "@/types"

interface MainContentProps {
    activeTab: string
    analysis: QueryAnalysisDetailed | null
    selectedQuery: SlowQuery | null
    selectedSuggestion: Suggestion | null
    isLoadingSuggestion: boolean
    isFullscreen: boolean
    togglePresentation: () => void
    setActiveTab: (tab: DashboardTab) => void
    predictorResult: PredictResponse | null
    setPredictorResult: (res: PredictResponse | null) => void
    isPredicting: boolean
    setIsPredicting: (loading: boolean) => void
    simulatorResult: IndexSimulationResponse | null
    setSimulatorResult: (res: IndexSimulationResponse | null) => void
    isSimulating: boolean
    setIsSimulating: (loading: boolean) => void
    rewriterResult: RewriteResponse | null
    setRewriterResult: (res: RewriteResponse | null) => void
    isRewriting: boolean
    setIsRewriting: (loading: boolean) => void
    unifiedHistory: HistoryItem[]
    setUnifiedHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>
    selectedHistoryItem: HistoryItem | null
    setSelectedHistoryItem: (i: HistoryItem | null) => void
    chatMessages: Message[]
    chatInput: string
    setChatInput: (i: string) => void
    isChatLoading: boolean
    handleChatSend: () => void
    handleChatClear: () => void
}

export function MainContent({
    activeTab,
    analysis,
    selectedQuery,
    selectedSuggestion,
    isLoadingSuggestion,
    isFullscreen,
    togglePresentation,
    setActiveTab,
    predictorResult,
    setPredictorResult,
    isPredicting,
    setIsPredicting,
    simulatorResult,
    setSimulatorResult,
    isSimulating,
    setIsSimulating,
    rewriterResult,
    setRewriterResult,
    isRewriting,
    setIsRewriting,
    unifiedHistory,
    setUnifiedHistory,
    selectedHistoryItem,
    setSelectedHistoryItem,
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading,
    handleChatSend,
    handleChatClear
}: MainContentProps) {
    return (
        <div className="flex-1 bg-card relative overflow-hidden flex">
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab Indicator */}
                <div className="h-12 border-b border-border bg-muted/30 flex items-center px-6 justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                        <span>MariaDB Local Pilot</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-foreground">{activeTab}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {activeTab === "neural" ? (
                        <div className="flex-1 overflow-y-auto">
                            <NeuralDashboard
                                analysis={analysis}
                                onBack={() => setActiveTab("queries")}
                                onNavigate={(tab) => setActiveTab(tab)}
                                isPresentationMode={isFullscreen}
                                onTogglePresentation={togglePresentation}
                            />
                        </div>
                    ) : activeTab === "shop" ? (
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
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-border bg-card/50">
                                <QueryPredictorInput
                                    initialQuery={selectedQuery?.sql_text}
                                    onPredict={setPredictorResult}
                                    isLoading={isPredicting}
                                    setIsLoading={setIsPredicting}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <PredictorResultPanel
                                    result={predictorResult}
                                    isLoading={isPredicting}
                                />
                            </div>
                        </div>
                    ) : activeTab === "simulator" ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-border bg-card/50">
                                <IndexSimulatorInput
                                    initialQuery={selectedQuery?.sql_text}
                                    onSimulate={setSimulatorResult}
                                    isLoading={isSimulating}
                                    setIsLoading={setIsSimulating}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <IndexSimulatorResultPanel
                                    result={simulatorResult}
                                    isLoading={isSimulating}
                                />
                            </div>
                        </div>
                    ) : activeTab === "rewriter" ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-border bg-card/50">
                                <QueryRewriterInput
                                    initialQuery={selectedQuery?.sql_text}
                                    onRewrite={setRewriterResult}
                                    isLoading={isRewriting}
                                    setIsLoading={setIsRewriting}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <RewriterResultPanel
                                    result={rewriterResult}
                                    isLoading={isRewriting}
                                />
                            </div>
                        </div>
                    ) : activeTab === "sandbox" ? (
                        <div className="flex-1 overflow-y-auto p-6">
                            <SmartSandbox initialQuery={selectedQuery?.sql_text} />
                        </div>
                    ) : activeTab === "unified" ? (
                        <UnifiedQueryAnalyzerClean
                            analysisHistory={unifiedHistory}
                            setAnalysisHistory={setUnifiedHistory}
                            selectedHistoryItem={selectedHistoryItem}
                            analysis={analysis}
                            onLoadFromHistory={(item) => setSelectedHistoryItem(item)}
                        />
                    ) : activeTab === "planstability" ? (
                        <div className="flex-1 overflow-y-auto">
                            <PlanStabilityDashboard />
                        </div>
                    ) : activeTab === "branching" ? (
                        <div className="flex-1 overflow-y-auto">
                            <BranchingDashboard />
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
            </div>
        </div>
    )
}
