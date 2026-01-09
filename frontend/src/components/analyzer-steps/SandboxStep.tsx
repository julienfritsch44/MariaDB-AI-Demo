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
    isTesting?: boolean
    onToggleExpand: () => void
    onGetOptimized: () => void
    onRetryWithFix?: (fixedSql: string) => void
}

export function SandboxStep({
    isVisible,
    isExpanded,
    sandboxResult,
    healingResult,
    isRewriting,
    isTesting,
    onToggleExpand,
    onGetOptimized,
    onRetryWithFix
}: SandboxStepProps) {
    if (!isVisible || !sandboxResult) return null

    // Extract Smart Suggestion if present
    const suggestionMatch = sandboxResult.error?.match(/Did you mean '(.*?)'/);
    const suggestedTable = suggestionMatch ? suggestionMatch[1] : null;
    const originalTable = suggestedTable?.replace('shop_', '');

    const handleApplyFix = () => {
        if (onRetryWithFix && suggestedTable && originalTable) {
            // Very simple replacement for demo purposes
            const fixedSql = sandboxResult.sql?.replace(new RegExp(originalTable, 'g'), suggestedTable)
                || ""; // Note: we need to pass the SQL back or have it in the result
            onRetryWithFix(fixedSql);
        }
    };

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
                        {isTesting && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
                    </CardTitle>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </CardHeader>
            {isExpanded && (
                <CardContent className="space-y-4">
                    <div className={`p-3 rounded-md border ${sandboxResult.success ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                        <p className="text-sm font-semibold">{sandboxResult.message}</p>
                        {sandboxResult.error && (
                            <div className="space-y-2">
                                <p className="text-xs text-red-400 mt-1 font-mono bg-black/40 p-2 rounded border border-red-500/20">
                                    {sandboxResult.error}
                                </p>

                                {suggestedTable && onRetryWithFix && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-xs gap-2 border-primary/50 text-primary hover:bg-primary/10"
                                        onClick={handleApplyFix}
                                        disabled={isTesting}
                                    >
                                        <Wand2 className="w-3 h-3" />
                                        Apply Smart Fix: Use '{suggestedTable}' & Retry
                                    </Button>
                                )}
                            </div>
                        )}
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
