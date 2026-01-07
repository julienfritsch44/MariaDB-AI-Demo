import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Shield,
    Loader2,
    Wand2,
    AlertTriangle,
    Database,
    Clock,
    ChevronDown,
    ChevronUp
} from "lucide-react"
import type { SandboxResponse, RewriteResponse } from "./types"

interface SandboxStepProps {
    isVisible: boolean
    isExpanded: boolean
    sandboxResult: SandboxResponse | null
    healingResult: RewriteResponse | null
    isRewriting: boolean
    onToggleExpand: () => void
    onGetOptimized: () => void
}

export function SandboxStep({
    isVisible,
    isExpanded,
    sandboxResult,
    healingResult,
    isRewriting,
    onToggleExpand,
    onGetOptimized
}: SandboxStepProps) {
    if (!isVisible || !sandboxResult) return null

    return (
        <Card id="card-sandbox" className={`border-2 ${sandboxResult.success ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <CardHeader className="pb-3">
                <button
                    onClick={onToggleExpand}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Shield className="w-4 h-4 text-blue-500" />
                        Sandbox Test Results (Original Query)
                        {!isExpanded && (
                            <Badge variant="outline" className="text-xs ml-2">Collapsed</Badge>
                        )}
                    </CardTitle>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </CardHeader>
            {isExpanded && (
                <CardContent className="space-y-4">
                    <div className={`p-3 rounded-md border ${sandboxResult.success ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                        <p className="text-sm">{sandboxResult.message}</p>
                    </div>

                    {sandboxResult.warning && (
                        <div className="p-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-yellow-400">{sandboxResult.warning}</p>
                        </div>
                    )}

                    {sandboxResult.success && sandboxResult.result && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Database className="w-3 h-3" />
                                    Rows Affected
                                </div>
                                <div className="text-sm font-semibold">{sandboxResult.result.rows_affected}</div>
                            </div>
                            <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Execution Time
                                </div>
                                <div className="text-sm font-semibold">{sandboxResult.result.execution_time_ms}ms</div>
                            </div>
                        </div>
                    )}

                    {!healingResult && (
                        <Button
                            onClick={onGetOptimized}
                            disabled={isRewriting}
                            size="sm"
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
                    )}
                </CardContent>
            )}
        </Card>
    )
}
