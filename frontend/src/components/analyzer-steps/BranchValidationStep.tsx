import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GitBranch, Loader2, Activity, CheckCircle2, Rocket } from "lucide-react"

interface BranchValidationStepProps {
    isVisible: boolean
    branchTestResult: any
    isTestingBranch: boolean
    isDeploying: boolean
    isDeployed: boolean
    onTestBranch: () => void
    onDeploy: () => void
    deployStep?: string
}

export function BranchValidationStep({
    isVisible,
    branchTestResult,
    isTestingBranch,
    isDeploying,
    isDeployed,
    onTestBranch,
    onDeploy,
    deployStep
}: BranchValidationStepProps) {
    if (!isVisible) return null

    return (
        <Card id="card-branch-validation" className="border-2 border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <GitBranch className="w-4 h-4 text-purple-500" />
                        Validation Environment: <span className="font-mono text-xs bg-purple-500/10 px-1 rounded">fix-mdev-10663-validator</span>
                    </CardTitle>
                    <Badge variant="outline" className="border-purple-500/50 text-purple-500">Active</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 rounded-md bg-background/50 border border-border/40">
                    <div className="text-sm text-center text-muted-foreground mb-4">
                        The fix has been applied to this branch. Run a performance test to validate before promotion.
                    </div>

                    {!branchTestResult ? (
                        <Button
                            onClick={onTestBranch}
                            disabled={isTestingBranch}
                            className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isTestingBranch ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Running Performance Test...
                                </>
                            ) : (
                                <>
                                    <Activity className="w-4 h-4" />
                                    Run Performance Test
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="space-y-4 animate-in fade-in zoom-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-center">
                                    <div className="text-xs text-muted-foreground">Latency</div>
                                    <div className="text-xl font-bold text-emerald-500">{branchTestResult.latency}ms</div>
                                </div>
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-center">
                                    <div className="text-xs text-muted-foreground">Throughput</div>
                                    <div className="text-xl font-bold text-emerald-500">{branchTestResult.throughput} qps</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-4 h-4" />
                                Validation Passed: {branchTestResult.comparison}
                            </div>

                            <div className="pt-2 border-t border-border/20">
                                <Button
                                    onClick={onDeploy}
                                    disabled={isDeploying || isDeployed}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-900/20"
                                    size="lg"
                                >
                                    {isDeploying ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {deployStep || "Promoting to Production..."}
                                        </>
                                    ) : isDeployed ? (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            Promoted Successfully
                                        </>
                                    ) : (
                                        <>
                                            <Rocket className="w-5 h-5" />
                                            Promote to Production
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
