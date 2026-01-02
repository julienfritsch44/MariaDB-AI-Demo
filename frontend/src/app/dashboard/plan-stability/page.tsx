"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, Trash2, RefreshCw, AlertTriangle } from "lucide-react"

const API_BASE = "http://localhost:8000"

interface Baseline {
    fingerprint: string
    query_preview: string
    best_execution_time_ms: number
    best_cost: number
    last_validated: string
}

export default function PlanStabilityDashboard() {
    const [baselines, setBaselines] = useState<Baseline[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchBaselines()
    }, [])

    const fetchBaselines = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/plan/baseline/list?limit=50`)
            if (res.ok) {
                const data = await res.json()
                setBaselines(data.baselines || [])
            }
        } catch (err) {
            console.error("Failed to fetch baselines:", err)
        } finally {
            setLoading(false)
        }
    }

    const deleteBaseline = async (fingerprint: string) => {
        try {
            const res = await fetch(`${API_BASE}/plan/baseline/${fingerprint}`, {
                method: "DELETE"
            })
            if (res.ok) {
                fetchBaselines()
            }
        } catch (err) {
            console.error("Failed to delete baseline:", err)
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Activity className="w-8 h-8 text-indigo-500" />
                        Plan Stability Baselines
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage query execution plan baselines to prevent performance regressions
                    </p>
                </div>
                <Button onClick={fetchBaselines} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
            </div>

            {loading ? (
                <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                        Loading baselines...
                    </CardContent>
                </Card>
            ) : baselines.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No baselines found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Run queries through the Unified Analyzer to create baselines
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {baselines.map((baseline) => (
                        <Card key={baseline.fingerprint} className="border-indigo-500/30">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-sm font-mono">
                                            {baseline.query_preview}
                                        </CardTitle>
                                        <div className="flex items-center gap-4 mt-2">
                                            <Badge variant="outline" className="text-xs">
                                                {baseline.best_execution_time_ms}ms
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                Cost: ${baseline.best_cost.toFixed(2)}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                Last validated: {new Date(baseline.last_validated).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteBaseline(baseline.fingerprint)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
