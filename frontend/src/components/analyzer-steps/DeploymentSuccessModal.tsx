import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    CheckCircle2,
    TrendingDown,
    DollarSign,
    Zap,
    Rocket,
    X,
    GitPullRequest,
    ExternalLink,
    ShieldCheck,
    Lock
} from "lucide-react"
import type { SandboxResponse, CostEstimate } from "./types"

interface DeploymentSuccessModalProps {
    isOpen: boolean
    deploymentType: "ddl" | "pr"
    sandboxResult: SandboxResponse | null
    optimizedSandboxResult: SandboxResponse | null
    costEstimate: CostEstimate | null
    optimizedCostEstimate: CostEstimate | null
    onClose: () => void
}

export function DeploymentSuccessModal({
    isOpen,
    deploymentType,
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
                            {deploymentType === "ddl" ? (
                                <>
                                    <div className="p-3 rounded-full bg-emerald-500/20 border-2 border-emerald-500">
                                        <Rocket className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <span className="text-emerald-500">Schema Deployed!</span>
                                </>
                            ) : (
                                <>
                                    <div className="p-3 rounded-full bg-blue-500/20 border-2 border-blue-500">
                                        <GitPullRequest className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <span className="text-blue-500">Pull Request Created!</span>
                                </>
                            )}
                        </DialogTitle>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <DialogDescription className="sr-only">
                        Detailed summary of the successful query optimization and deployment.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Success Message */}
                    <div className={`p-4 rounded-lg border ${deploymentType === "ddl" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-blue-500/10 border-blue-500/30"}`}>
                        <div className={`flex items-center justify-between mb-2`}>
                            <div className={`flex items-center gap-2 font-semibold ${deploymentType === "ddl" ? "text-emerald-500" : "text-blue-500"}`}>
                                {deploymentType === "ddl" ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span>Schema optimization applied to production</span>
                                    </>
                                ) : (
                                    <>
                                        <GitPullRequest className="w-5 h-5" />
                                        <span>Code optimization PR staged</span>
                                    </>
                                )}
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider animate-pulse border-amber-500/50 text-amber-500">
                                Demo Mode
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {deploymentType === "ddl"
                                ? "Your index optimization has been successfully executed on the production cluster."
                                : "The optimized SQL query has been prepared for your application code repository."}
                        </p>
                    </div>

                    {deploymentType === "pr" && (
                        <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-1">
                                <Lock className="w-3 h-3 text-muted-foreground/30" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30">Open</Badge>
                                    <span className="text-sm font-mono text-muted-foreground">#492 - Optimize Query Performance</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono italic">[Simulated]</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">JD</div>
                                <span className="text-muted-foreground">maria-bot opened this PR 2 seconds ago</span>
                            </div>
                            <Button variant="outline" size="sm" className="w-full gap-2 text-xs border-dashed">
                                <ExternalLink className="w-3 h-3" />
                                View on GitHub (Demo Preview)
                            </Button>
                        </div>
                    )}

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
                        className={`w-full text-white gap-2 ${deploymentType === "ddl" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
                        size="lg"
                    >
                        {deploymentType === "ddl" ? (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Finish Deployment
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-5 h-5" />
                                Return to Dashboard
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
