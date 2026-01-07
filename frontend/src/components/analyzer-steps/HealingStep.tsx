import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Wand2,
    Loader2,
    CheckCircle2,
    ArrowRight,
    TrendingDown,
    Shield,
    ChevronDown,
    ChevronUp
} from "lucide-react"
import type { RewriteResponse } from "./types"

interface HealingStepProps {
    isVisible: boolean
    isExpanded: boolean
    healingResult: RewriteResponse | null
    isTesting: boolean
    isRewriting: boolean
    onToggleExpand: () => void
    onTestOptimized: () => void
}

export function HealingStep({
    isVisible,
    isExpanded,
    healingResult,
    isTesting,
    isRewriting,
    onToggleExpand,
    onTestOptimized
}: HealingStepProps) {
    if (!isVisible || !healingResult) return null

    return (
        <Card id="card-healing" className="border-2 border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
                <button
                    onClick={onToggleExpand}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Wand2 className="w-4 h-4 text-purple-500" />
                        Optimized Query
                        {!isExpanded && (
                            <Badge variant="outline" className="text-xs ml-2">Collapsed</Badge>
                        )}
                    </CardTitle>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </CardHeader>
            {isExpanded && (
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Original:</div>
                        <div className="p-3 rounded-md bg-background/50 border border-border/40 font-mono text-xs">
                            {healingResult.original_sql}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-primary" />
                        <Badge variant="outline" className="gap-1">
                            <TrendingDown className="w-3 h-3" />
                            {healingResult.estimated_speedup}
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-semibold text-muted-foreground">Optimized:</div>
                            {healingResult.knowledge_source && (
                                <Badge
                                    variant="secondary"
                                    className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/30 cursor-pointer"
                                    title={healingResult.knowledge_source.description}
                                >
                                    {healingResult.knowledge_source.id}
                                </Badge>
                            )}
                        </div>
                        <div className="p-3 rounded-md bg-purple-500/10 border border-purple-500/30 font-mono text-xs">
                            {healingResult.rewritten_sql}
                        </div>
                    </div>

                    {healingResult.improvements && healingResult.improvements.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">Improvements:</div>
                            <ul className="space-y-1">
                                {healingResult.improvements.map((imp, i) => (
                                    <li key={i} className="text-xs flex items-start gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                        <span>{imp}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Button
                        onClick={onTestOptimized}
                        disabled={isTesting || isRewriting || !healingResult}
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
                                Test Optimized Query
                            </>
                        )}
                    </Button>
                </CardContent>
            )}
        </Card>
    )
}
