import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, TrendingDown, DollarSign, Zap, Rocket, X } from "lucide-react"
import type { SandboxResponse, CostEstimate } from "./types"

interface DeploymentSuccessModalProps {
    isOpen: boolean
    sandboxResult: SandboxResponse | null
    optimizedSandboxResult: SandboxResponse | null
    costEstimate: CostEstimate | null
    optimizedCostEstimate: CostEstimate | null
    onClose: () => void
}

export function DeploymentSuccessModal({
    isOpen,
    sandboxResult,
    optimizedSandboxResult,
    costEstimate,
    optimizedCostEstimate,
    onClose
}: DeploymentSuccessModalProps) {
    if (!sandboxResult?.result || !optimizedSandboxResult?.result || !costEstimate || !optimizedCostEstimate) {
        return null
    }

    const performanceImprovement = Math.round(
        ((sandboxResult.result.execution_time_ms - optimizedSandboxResult.result.execution_time_ms) /
            sandboxResult.result.execution_time_ms) * 100
    )

    const monthlySavings = costEstimate.monthly_cost - optimizedCostEstimate.monthly_cost
    const annualSavings = monthlySavings * 12
    const costReduction = Math.round((monthlySavings / costEstimate.monthly_cost) * 100)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] border-2 border-emerald-500/30">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-3 text-2xl">
                            <div className="p-3 rounded-full bg-emerald-500/20 border-2 border-emerald-500">
                                <Rocket className="w-8 h-8 text-emerald-500" />
                            </div>
                            <span className="text-emerald-500">Deployment Successful!</span>
                        </DialogTitle>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Success Message */}
                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center gap-2 text-emerald-500 font-semibold mb-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Query optimization deployed to production</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Your optimized query is now live and serving production traffic.
                        </p>
                    </div>

                    {/* Performance Improvement */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Zap className="w-4 h-4 text-primary" />
                            <span>Performance Improvement</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                                <div className="text-xs text-muted-foreground mb-1">Before</div>
                                <div className="text-2xl font-bold text-red-400">
                                    {sandboxResult.result.execution_time_ms}ms
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                <div className="text-xs text-muted-foreground mb-1">After</div>
                                <div className="text-2xl font-bold text-emerald-400">
                                    {optimizedSandboxResult.result.execution_time_ms}ms
                                </div>
                            </div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30">
                            <div className="flex items-center justify-center gap-2">
                                <TrendingDown className="w-5 h-5 text-primary" />
                                <span className="text-3xl font-bold text-primary">{performanceImprovement}%</span>
                                <span className="text-sm text-muted-foreground">faster</span>
                            </div>
                        </div>
                    </div>

                    {/* Cost Savings */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            <span>Cost Savings</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                                <div className="text-xs text-muted-foreground mb-1">Previous Cost</div>
                                <div className="text-xl font-bold text-red-400">
                                    ${costEstimate.monthly_cost.toFixed(2)}/mo
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                <div className="text-xs text-muted-foreground mb-1">New Cost</div>
                                <div className="text-xl font-bold text-emerald-400">
                                    ${optimizedCostEstimate.monthly_cost.toFixed(2)}/mo
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
                            <div className="text-center space-y-2">
                                <div className="text-sm text-muted-foreground">Total Savings</div>
                                <div className="text-3xl font-bold text-emerald-400">
                                    ${monthlySavings.toFixed(2)}/month
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    ({costReduction}% reduction) • ${annualSavings.toFixed(2)}/year
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-500">✓</div>
                            <div className="text-xs text-muted-foreground mt-1">Deployed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-500">✓</div>
                            <div className="text-xs text-muted-foreground mt-1">Tested</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-500">✓</div>
                            <div className="text-xs text-muted-foreground mt-1">Validated</div>
                        </div>
                    </div>

                    {/* Close Button */}
                    <Button
                        onClick={onClose}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        size="lg"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
