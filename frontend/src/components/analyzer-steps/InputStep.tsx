import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, ChevronDown, ChevronUp, Lightbulb, Activity, ArrowRight } from "lucide-react"
import { QueryAnalysis } from "@/types"

interface InputStepProps {
    isExpanded: boolean
    sql: string
    isAnalyzing: boolean
    analysis?: QueryAnalysis
    onToggleExpand: () => void
    onSqlChange: (value: string) => void
    onAnalyze: () => void
    onLoadDemo: () => void
}

export function InputStep({
    isExpanded,
    sql,
    isAnalyzing,
    analysis,
    onToggleExpand,
    onSqlChange,
    onAnalyze,
    onLoadDemo
}: InputStepProps) {
    return (
        <Card id="card-input" className="border-2 border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
                <button
                    onClick={onToggleExpand}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Query Input
                        {!isExpanded && (
                            <Badge variant="outline" className="text-xs ml-2">Collapsed</Badge>
                        )}
                    </CardTitle>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </CardHeader>
            {isExpanded && (
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">Enter your SQL query:</label>
                        <textarea
                            value={sql}
                            onChange={(e) => onSqlChange(e.target.value)}
                            placeholder="SELECT * FROM orders WHERE ..."
                            className="w-full h-32 p-3 rounded-md border border-border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* LIVE SLOW QUERIES SECTION */}
                    {analysis?.top_queries && analysis.top_queries.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                <span>Detected Slow Queries (Live)</span>
                                <Activity className="w-3 h-3 animate-pulse text-amber-500" />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {analysis.top_queries.slice(0, 3).map((query, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onSqlChange(query.sql_text)}
                                        className="flex items-center justify-between p-3 rounded border border-border bg-card hover:bg-muted/50 transition-colors text-left group"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-1.5 rounded bg-amber-500/10 text-amber-500 font-mono text-xs font-bold border border-amber-500/20">
                                                {Math.round(query.query_time * 1000)}ms
                                            </div>
                                            <code className="text-xs text-muted-foreground truncate font-mono max-w-[300px]">
                                                {query.sql_text.substring(0, 50)}...
                                            </code>
                                        </div>
                                        <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            onClick={onAnalyze}
                            disabled={!sql.trim() || isAnalyzing}
                            className="flex-1 gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Analyze Query
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={onLoadDemo}
                            variant="outline"
                            className="gap-2"
                        >
                            <Lightbulb className="w-4 h-4" />
                            Load Demo Query
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
