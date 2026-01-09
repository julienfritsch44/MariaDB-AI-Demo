"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Shield,
    Play,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Database,
    Lock,
    Unlock,
    Clock,
    Activity
} from "lucide-react"
import { SqlCode } from "@/components/ui/sql-code"
import { trackedFetch } from "@/lib/usePerformance"

const API_BASE = "http://localhost:8000"

import { SandboxResponse } from "./analyzer-steps/types"

export function SmartSandbox({ initialQuery }: { initialQuery?: string }) {
    const [sql, setSql] = useState(initialQuery || "")
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<SandboxResponse | null>(null)

    useEffect(() => {
        if (initialQuery && initialQuery !== sql) {
            setSql(initialQuery)
            handleTest(initialQuery)
        }
    }, [initialQuery])


    const handleTest = async (queryToTest?: string) => {
        const finalSql = queryToTest || sql
        if (!finalSql.trim()) return

        setIsLoading(true)
        setResult(null)

        try {
            const res = await trackedFetch(`${API_BASE}/sandbox/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sql: finalSql.trim(),
                    database: "shop_demo",
                    timeout_seconds: 5
                })
            })

            if (!res.ok) throw new Error(`API Error: ${res.status}`)

            const data: SandboxResponse = await res.json()
            setResult(data)
        } catch (err) {
            setResult({
                success: false,
                mode: "sandbox",
                message: "Failed to test query",
                error: err instanceof Error ? err.message : "Unknown error"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadDemoQuery = () => {
        setSql(
            "UPDATE orders SET status = 'cancelled' WHERE customer_id = 123"
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-blue-500" />
                        Smart Sandboxing
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Test queries safely without persisting changes
                    </p>
                </div>
                <Badge variant="outline" className="gap-1.5">
                    <Lock className="w-3 h-3" />
                    Safe Mode
                </Badge>
            </div>

            {/* Input Card */}
            <Card className="border-border/40 bg-muted/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Database className="w-4 h-4 text-blue-500" />
                            Query to Test
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadDemoQuery}
                            className="text-xs h-7"
                        >
                            Load Demo Query
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <textarea
                        value={sql}
                        onChange={(e) => setSql(e.target.value)}
                        placeholder="Enter SQL query to test safely..."
                        className="w-full h-32 p-3 rounded-md border border-border bg-background/50 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => handleTest()}
                            disabled={!sql.trim() || isLoading}
                            className="gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-4 h-4" />
                                    Test in Sandbox
                                </>
                            )}
                        </Button>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Lock className="w-3 h-3" />
                            All changes will be rolled back
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <Card className={`border-2 ${result.success
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                    }`}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                {result.success ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        Sandbox Test Results
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                        Test Failed
                                    </>
                                )}
                            </CardTitle>
                            <Badge variant="outline" className="gap-1.5">
                                <Shield className="w-3 h-3" />
                                {result.mode.toUpperCase()}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Message */}
                        <div className={`p-3 rounded-md border ${result.success ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                            <p className="text-sm">
                                {result.message}
                            </p>
                        </div>

                        {/* Warning for non-SELECT queries */}
                        {result.warning && (
                            <div className="p-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-yellow-400">
                                    {result.warning}
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {result.error && (
                            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30">
                                <p className="text-sm text-red-400 font-mono">{result.error}</p>
                            </div>
                        )}

                        {/* Results Table */}
                        {result.success && result.result && (
                            <div className="space-y-3">
                                {/* Metrics */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                        <div className="text-xs text-muted-foreground mb-1">Query Type</div>
                                        <div className="text-sm font-semibold">{result.query_type}</div>
                                    </div>
                                    <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                            <Activity className="w-3 h-3" />
                                            Rows Affected
                                        </div>
                                        <div className="text-sm font-semibold">{result.result.rows_affected}</div>
                                    </div>
                                    <div className="p-3 rounded-md bg-background/50 border border-border/40">
                                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Execution Time
                                        </div>
                                        <div className="text-sm font-semibold">{result.result.execution_time_ms}ms</div>
                                    </div>
                                </div>

                                {/* Data Table (for SELECT queries) */}
                                {result.result.rows.length > 0 && result.query_type === "SELECT" && (
                                    <div className="rounded-md border border-border/40 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/50">
                                                    <tr>
                                                        {result.result.columns.map((col, i) => (
                                                            <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.result.rows.slice(0, 10).map((row, i) => (
                                                        <tr key={i} className="border-t border-border/40">
                                                            {row.map((cell, j) => (
                                                                <td key={j} className="px-3 py-2 font-mono text-xs">
                                                                    {cell === null ? (
                                                                        <span className="text-muted-foreground italic">null</span>
                                                                    ) : (
                                                                        String(cell)
                                                                    )}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {result.result.rows.length > 10 && (
                                            <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground text-center border-t border-border/40">
                                                Showing 10 of {result.result.rows.length} rows
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Safety Info */}
                        <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/30">
                            <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-400">
                                <strong>Safe Mode Active:</strong> This query was executed inside a transaction
                                and automatically rolled back. No changes were persisted to the database.
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Info Card */}
            <Card className="border-border/40 bg-muted/20">
                <CardContent className="pt-6">
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-500" />
                            How Smart Sandboxing Works
                        </h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>Executes queries inside a <strong>transaction</strong> with automatic rollback</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>Shows you exactly what <strong>would happen</strong> without persisting changes</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>Perfect for testing <strong>UPDATE/DELETE</strong> queries before running them for real</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>Blocks dangerous operations like <strong>DROP</strong> and <strong>TRUNCATE</strong></span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>5-second timeout protection prevents runaway queries</span>
                            </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
