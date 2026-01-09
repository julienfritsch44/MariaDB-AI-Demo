import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Zap,
    ChevronDown,
    ChevronUp,
    DollarSign,
    CheckCircle2,
    Rocket,
    Loader2,
    GitBranch
} from "lucide-react"
import type { SandboxResponse, CostEstimate, ResourceGroupResponse } from "./types"

interface ComparisonStepProps {
    isVisible: boolean
    isExpanded: boolean
    sandboxResult: SandboxResponse | null
    optimizedSandboxResult: SandboxResponse | null
    costEstimate: CostEstimate | null
    optimizedCostEstimate: CostEstimate | null
    resourceGroup: ResourceGroupResponse | null
    isDeployed: boolean
    isDeploying: boolean
    onToggleExpand: () => void
    onOpenBranchModal: () => void
    onDeploy: () => void
    deployStep?: string
}

export function ComparisonStep({
    isVisible,
    isExpanded,
    sandboxResult,
    optimizedSandboxResult,
    costEstimate,
    optimizedCostEstimate,
    resourceGroup,
    isDeployed,
    isDeploying,
    onToggleExpand,
    onOpenBranchModal,
    onDeploy,
    deployStep
}: ComparisonStepProps) {
    if (!isVisible || !optimizedSandboxResult || !sandboxResult) return null

    return (
        <Card id="card-comparison" className="border-2 border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
                <button
                    onClick={onToggleExpand}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Zap className="w-4 h-4 text-primary" />
                        Performance Comparison
                        {!isExpanded && (
                            <Badge variant="outline" className="text-xs ml-2">Collapsed</Badge>
                        )}
                    </CardTitle>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </CardHeader>
            {isExpanded && (
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">Original Query</div>
                            <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                <div className="text-xs text-muted-foreground">Execution Time</div>
                                <div className="text-2xl font-bold">
                                    {sandboxResult.result?.execution_time_ms !== undefined ? `${sandboxResult.result.execution_time_ms}ms` : 'N/A'}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">Optimized Query</div>
                            <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                                <div className="text-xs text-muted-foreground">Execution Time</div>
                                <div className="text-2xl font-bold text-emerald-400">
                                    {optimizedSandboxResult.success
                                        ? (optimizedSandboxResult.result?.execution_time_ms !== undefined ? `${optimizedSandboxResult.result.execution_time_ms}ms` : '...')
                                        : 'Error'}
                                </div>
                                {!optimizedSandboxResult.success && optimizedSandboxResult.error && (
                                    <div className="text-[10px] text-red-400 mt-1 leading-tight break-words max-w-[200px] bg-red-500/10 p-1 rounded border border-red-500/20">
                                        {optimizedSandboxResult.error}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {(sandboxResult.result?.execution_time_ms !== undefined && optimizedSandboxResult.result?.execution_time_ms !== undefined) && (
                        <div className="p-4 rounded-md bg-primary/10 border border-primary/30 text-center">
                            <div className="text-xs text-muted-foreground mb-1">Performance Improvement</div>
                            <div className="text-3xl font-bold text-primary">
                                {Math.round(((sandboxResult.result.execution_time_ms - optimizedSandboxResult.result.execution_time_ms) / sandboxResult.result.execution_time_ms) * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">faster</div>
                        </div>
                    )}

                    {costEstimate && optimizedCostEstimate && (() => {
                        const savings = costEstimate.monthly_cost - optimizedCostEstimate.monthly_cost;
                        const isCostIncrease = savings < 0;
                        const savingsPercent = Math.round((savings / costEstimate.monthly_cost) * 100);

                        return (
                            <div className={`p-4 rounded-md border ${isCostIncrease ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <DollarSign className={`w-5 h-5 ${isCostIncrease ? 'text-red-500' : 'text-emerald-500'}`} />
                                    <span className={`text-sm font-semibold ${isCostIncrease ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {isCostIncrease ? 'Cost Impact' : 'Cost Savings'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <div className="text-xs text-muted-foreground">Original Cost</div>
                                        <div className="text-xl font-bold text-muted-foreground">${costEstimate.monthly_cost.toFixed(2)}/mo</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Optimized Cost</div>
                                        <div className="text-xl font-bold text-foreground">${optimizedCostEstimate.monthly_cost.toFixed(2)}/mo</div>
                                    </div>
                                </div>
                                <div className={`text-center p-3 rounded-md border ${isCostIncrease ? 'bg-red-500/20 border-red-500/40' : 'bg-emerald-500/20 border-emerald-500/40'}`}>
                                    <div className="text-xs text-muted-foreground mb-1">Monthly {isCostIncrease ? 'Increase' : 'Savings'}</div>
                                    <div className={`text-2xl font-bold ${isCostIncrease ? 'text-red-400' : 'text-emerald-400'}`}>
                                        ${Math.abs(savings).toFixed(2)}
                                    </div>
                                    <div className={`text-xs mt-1 ${isCostIncrease ? 'text-red-400' : 'text-emerald-400'}`}>
                                        ({Math.abs(savingsPercent)}% {isCostIncrease ? 'increase' : 'reduction'})
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Annual {isCostIncrease ? 'impact' : 'savings'}: ${Math.abs(savings * 12).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

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
                            <div className="flex gap-3">
                                <Button
                                    onClick={onOpenBranchModal}
                                    variant="outline"
                                    className="flex-1 gap-2 border-primary/20 hover:bg-primary/5"
                                >
                                    <GitBranch className="w-4 h-4" />
                                    Create Validation Branch
                                </Button>

                                <Button
                                    onClick={onDeploy}
                                    disabled={isDeploying}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 transition-all duration-300 transform active:scale-95"
                                    size="lg"
                                >
                                    {isDeploying ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {deployStep || "Deploying to Production..."}
                                        </>
                                    ) : (
                                        <>
                                            <Rocket className="w-5 h-5" />
                                            Deploy to Production
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
