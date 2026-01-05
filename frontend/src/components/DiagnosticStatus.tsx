"use client"

import { useState, useEffect } from "react"
import { DiagnosticCheck } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Activity,
    CheckCircle2,
    AlertTriangle,
    WifiOff,
    Settings,
    RefreshCcw,
    Clock,
    ShieldCheck,
    Cpu,
    Database,
    Zap,
    ExternalLink,
    AlertCircle
} from "lucide-react"
import { trackedFetch } from "@/lib/usePerformance"

export function DiagnosticStatus() {
    const [diagnostics, setDiagnostics] = useState<DiagnosticCheck[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [lastRun, setLastRun] = useState<Date | null>(null)

    const runDiagnostic = async () => {
        setIsLoading(true)
        try {
            const res = await trackedFetch("http://localhost:8000/health/diagnostic")
            const data = await res.json()
            if (Array.isArray(data)) {
                setDiagnostics(data)
                setLastRun(new Date())
            } else {
                console.error("Diagnostic response is not an array:", data)
                setDiagnostics([{
                    service: "API Interface",
                    status: "error",
                    error: "Invalid response format from backend"
                }])
            }
        } catch (err) {
            console.error("Diagnostic failed", err)
            setDiagnostics([{
                service: "Backend Connection",
                status: "offline",
                error: "Connection failed (Check if backend is running)"
            }])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        runDiagnostic()
    }, [])

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "online": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            case "offline": return <WifiOff className="w-3.5 h-3.5 text-red-500" />
            case "error":
            case "timeout_or_error": return <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            case "config_missing": return <Settings className="w-3.5 h-3.5 text-yellow-500" />
            case "empty": return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
            default: return <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
        }
    }

    const getStatusText = (status: string) => {
        if (status === "config_missing") return "CONFIG MISSING"
        if (status === "timeout_or_error") return "TIMEOUT"
        return status.toUpperCase()
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "online": return "bg-green-500/10 text-green-500 border-green-500/20"
            case "offline":
            case "error":
            case "timeout_or_error": return "bg-red-500/10 text-red-500 border-red-500/20"
            default: return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
        }
    }

    const [logs, setLogs] = useState<string[]>([])
    const [showLogs, setShowLogs] = useState(false)
    const [isLoadingLogs, setIsLoadingLogs] = useState(false)

    const fetchLogs = async () => {
        setIsLoadingLogs(true)
        try {
            const res = await trackedFetch("http://localhost:8000/logs?lines=100")
            const data = await res.json()
            setLogs(data.logs || [])
        } catch (err) {
            console.error("Failed to fetch logs", err)
        } finally {
            setIsLoadingLogs(false)
        }
    }

    const toggleLogs = () => {
        if (!showLogs) {
            fetchLogs()
        }
        setShowLogs(!showLogs)
    }

    return (
        <Card className="border-border bg-card/50 flex flex-col h-full max-h-screen">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 border-b border-border shrink-0">
                <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    SYSTEM DIAGNOSTIC
                </CardTitle>
                <div className="flex items-center gap-3">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 border-border hover:bg-muted/50 text-muted-foreground"
                        onClick={toggleLogs}
                    >
                        {showLogs ? 'Hide Logs' : 'View Logs'}
                    </Button>
                    {lastRun && (
                        <span className="text-[10px] text-muted-foreground">
                            {lastRun.toLocaleTimeString()}
                        </span>
                    )}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={runDiagnostic}
                        disabled={isLoading}
                    >
                        <RefreshCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                <div className="divide-y divide-zinc-900 overflow-y-auto shrink-0 max-h-[50vh]">
                    {diagnostics.length === 0 && isLoading ? (
                        <div className="p-8 text-center">
                            <RefreshCcw className="w-6 h-6 animate-spin text-foreground mx-auto mb-2" />
                            <p className="text-[11px] text-muted-foreground">Deep testing in progress...</p>
                        </div>
                    ) : (
                        diagnostics.map((check, idx) => (
                            <div key={idx} className="p-3 flex items-center justify-between hover:bg-background/5 transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                        {check.service.includes("MariaDB") && <Database className="w-3.5 h-3.5 text-muted-foreground" />}
                                        {check.service.includes("Embeddings") && <Cpu className="w-3.5 h-3.5 text-muted-foreground" />}
                                        {check.service.includes("Jira") && <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />}
                                        {check.service.includes("SkyAI") && <Zap className="w-3.5 h-3.5 text-muted-foreground" />}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-medium text-foreground">{check.service}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="outline" className={`px-1.5 py-0 text-[9px] font-bold h-3.5 border ${getStatusColor(check.status)}`}>
                                                {getStatusText(check.status)}
                                            </Badge>
                                            {check.latency_ms && (
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {check.latency_ms}ms
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right max-w-[200px]">
                                    {check.hint ? (
                                        <p className="text-[10px] text-yellow-400 font-medium" title={check.hint}>
                                            {check.hint}
                                        </p>
                                    ) : check.error ? (
                                        <p className="text-[10px] text-red-400 font-mono truncate max-w-[150px]" title={check.error}>
                                            {check.error}
                                        </p>
                                    ) : check.document_count !== undefined ? (
                                        <p className="text-[10px] text-primary font-mono">
                                            {check.document_count} tickets
                                        </p>
                                    ) : check.http_status ? (
                                        <p className="text-[10px] text-muted-foreground font-mono">
                                            HTTP {check.http_status}
                                        </p>
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4 text-primary/50" />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Logs Terminal */}
                {showLogs && (
                    <div className="border-t border-border flex flex-col flex-1 min-h-0 bg-[#0c0c0c]">
                        <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">Server Logs (Tail 100)</span>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                                onClick={fetchLogs}
                                disabled={isLoadingLogs}
                            >
                                <RefreshCcw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-x-auto overflow-y-auto p-3 font-mono text-[10px] text-white whitespace-pre">
                            {logs.length > 0 ? (
                                logs.map((line, i) => (
                                    <div key={i} className="hover:text-foreground">{line}</div>
                                ))
                            ) : (
                                <span className="text-muted-foreground italic">No logs available or empty.</span>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
