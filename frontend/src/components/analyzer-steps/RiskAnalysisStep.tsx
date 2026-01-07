import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Shield,
    Loader2,
    Wand2,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    DollarSign,
    Lock,
    Cpu,
    Database,
    ChevronDown,
    ChevronUp,
    Maximize2,
    Minimize2
} from "lucide-react"
import type { PredictResponse, CostEstimate, WaitEventsResponse, ResourceGroupResponse } from "./types"

interface RiskAnalysisStepProps {
    isVisible: boolean
    isExpanded: boolean
    isAnalyzing: boolean
    riskResult: PredictResponse | null
    costEstimate: CostEstimate | null
    waitEvents: WaitEventsResponse | null
    resourceGroup: ResourceGroupResponse | null
    sectionsExpanded: {
        cost: boolean
        waitEvents: boolean
        resourceGroup: boolean
        similarIssues: boolean
    }
    isTesting: boolean
    isRewriting: boolean
    onToggleExpand: () => void
    onToggleSection: (section: 'cost' | 'waitEvents' | 'resourceGroup' | 'similarIssues') => void
    onExpandAll: () => void
    onCollapseAll: () => void
    onTestInSandbox: () => void
    onGetOptimized: () => void
}

const riskStyles = {
    LOW: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-500",
        Icon: CheckCircle2
    },
    MEDIUM: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        text: "text-amber-500",
        Icon: AlertTriangle
    },
    HIGH: {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        text: "text-red-500",
        Icon: XCircle
    }
} as const

export function RiskAnalysisStep({
    isVisible,
    isExpanded,
    isAnalyzing,
    riskResult,
    costEstimate,
    waitEvents,
    resourceGroup,
    sectionsExpanded,
    isTesting,
    isRewriting,
    onToggleExpand,
    onToggleSection,
    onExpandAll,
    onCollapseAll,
    onTestInSandbox,
    onGetOptimized
}: RiskAnalysisStepProps) {
    if (!isVisible || !riskResult) return null

    const style = riskStyles[riskResult.risk_level as keyof typeof riskStyles] || riskStyles.MEDIUM
    const RiskIcon = style.Icon

    return (
        <Card id="card-risk" className={`border-2 ${style.border} ${style.bg}`}>
            <CardHeader className="pb-3">
                <button
                    onClick={onToggleExpand}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <RiskIcon className={`w-4 h-4 ${style.text}`} />
                        Risk Analysis
                        {!isExpanded && (
                            <Badge variant="outline" className="text-xs ml-2">Collapsed</Badge>
                        )}
                    </CardTitle>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </CardHeader>
            {isExpanded && (
                <CardContent className="space-y-4">
                    <div className={`p-4 rounded-md border ${style.border} ${style.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">Risk Score</span>
                            <Badge className={`${style.bg} ${style.text} border ${style.border}`}>
                                {riskResult.risk_score}/100
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{riskResult.reason}</p>
                    </div>

                    {/* Expand/Collapse All */}
                    <div className="flex gap-2">
                        <Button onClick={onExpandAll} size="sm" variant="ghost" className="gap-1 text-xs">
                            <Maximize2 className="w-3 h-3" />
                            Expand All
                        </Button>
                        <Button onClick={onCollapseAll} size="sm" variant="ghost" className="gap-1 text-xs">
                            <Minimize2 className="w-3 h-3" />
                            Collapse All
                        </Button>
                    </div>

                    {/* Cost Estimate - Collapsible */}
                    {!isAnalyzing && costEstimate && (
                        <div id="section-cost" className="border border-emerald-500/30 rounded-md overflow-hidden">
                            <button
                                onClick={() => onToggleSection('cost')}
                                className="w-full p-3 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-semibold text-emerald-500">FinOps Cost Estimate</span>
                                    <Badge variant="outline" className="text-xs">{costEstimate.cloud_provider}</Badge>
                                </div>
                                {sectionsExpanded.cost ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {sectionsExpanded.cost && (
                                <div className="p-4 bg-emerald-500/5 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-2 rounded-md bg-background/30">
                                            <div className="text-xs text-muted-foreground">Daily Cost</div>
                                            <div className="text-lg font-bold">${costEstimate.daily_cost.toFixed(2)}</div>
                                        </div>
                                        <div className="p-2 rounded-md bg-background/30">
                                            <div className="text-xs text-muted-foreground">Monthly Cost</div>
                                            <div className="text-lg font-bold text-red-400">${costEstimate.monthly_cost.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        <div>Annual: ${costEstimate.annual_cost.toFixed(2)}</div>
                                        <div className="mt-1">I/O: {costEstimate.cost_breakdown.io_percentage}% | CPU: {costEstimate.cost_breakdown.cpu_percentage}%</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Wait Events - Collapsible */}
                    {!isAnalyzing && waitEvents && (
                        <div id="section-waitEvents" className="border border-amber-500/30 rounded-md overflow-hidden">
                            <button
                                onClick={() => onToggleSection('waitEvents')}
                                className="w-full p-3 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-semibold text-amber-500">Wait Events</span>
                                    <Badge variant="outline" className="text-xs">{waitEvents.mode}</Badge>
                                </div>
                                {sectionsExpanded.waitEvents ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {sectionsExpanded.waitEvents && (
                                <div className="p-4 bg-amber-500/5 space-y-2">
                                    <div className="text-xs text-muted-foreground">
                                        Total Lock Waits: <span className="font-bold text-amber-400">{waitEvents.summary.total_lock_waits}</span>
                                    </div>
                                    {waitEvents.top_wait_events.slice(0, 2).map((evt, i) => (
                                        <div key={i} className="p-2 rounded-md bg-background/30 text-xs">
                                            <span className="font-mono">{evt.event_name}</span>
                                            <span className="text-muted-foreground"> - {evt.total_wait_ms}ms ({evt.percentage}%)</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Resource Group - Collapsible */}
                    {!isAnalyzing && resourceGroup && (
                        <div id="section-resourceGroup" className="border border-purple-500/30 rounded-md overflow-hidden">
                            <button
                                onClick={() => onToggleSection('resourceGroup')}
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
                                onClick={() => onToggleSection('similarIssues')}
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
                            onClick={onTestInSandbox}
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
                            onClick={onGetOptimized}
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
    )
}
