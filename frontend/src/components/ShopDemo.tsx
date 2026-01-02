import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    ShoppingCart,
    Users,
    Activity,
    Play,
    Square,
    AlertCircle,
    Package,
    CheckCircle,
    XCircle,
    Loader2
} from "lucide-react"

import { AnimatedNumber } from "@/components/ui/animated-number"
import { trackedFetch } from "@/lib/usePerformance"

const API_BASE = "http://localhost:8000"

export function ShopDemo() {
    const [isSimulating, setIsSimulating] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [logs, setLogs] = useState<string[]>([])
    const [stats, setStats] = useState({
        revenue: 124590,
        orders: 1402,
        activeUsers: 342
    })

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString()
        setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 19)])
    }

    // Actual API call to start/stop simulation
    const toggleSimulation = async () => {
        setIsLoading(true)
        setStatusMessage(null)

        const endpoint = isSimulating ? "/simulation/stop" : "/simulation/start"
        addLog(`Calling ${endpoint}...`)

        try {
            const response = await trackedFetch(`${API_BASE}${endpoint}`, { method: "POST" })
            const data = await response.json()

            addLog(`Response: ${JSON.stringify(data)}`)

            if (data.status === "started") {
                setIsSimulating(true)
                setStatusMessage(`Simulation started (PID: ${data.pid})`)
            } else if (data.status === "stopped" || data.status === "not_running") {
                setIsSimulating(false)
                setStatusMessage("Simulation stopped")
            } else if (data.status === "already_running") {
                setIsSimulating(true)
                setStatusMessage(`Already running (PID: ${data.pid})`)
            } else {
                setStatusMessage(`Unknown status: ${data.status}`)
            }
        } catch (err: any) {
            addLog(`ERROR: ${err.message}`)
            setStatusMessage(`Failed: ${err.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    // Fake live updates when simulating
    useEffect(() => {
        if (!isSimulating) return

        const interval = setInterval(() => {
            setStats(prev => ({
                revenue: prev.revenue + Math.random() * 100,
                orders: prev.orders + 1,
                activeUsers: Math.max(10, prev.activeUsers + Math.floor(Math.random() * 10) - 5)
            }))
        }, 800)

        return () => clearInterval(interval)
    }, [isSimulating])

    return (
        <div className="h-full flex flex-col bg-card text-foreground overflow-hidden font-sans">
            {/* Shop Header */}
            <header className="h-14 border-b border-border bg-muted px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-foreground tracking-tight">ShopAdmin</h1>
                        <p className="text-[10px] text-muted-foreground">eCommerce Control Center</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {statusMessage && (
                        <span className="text-xs text-muted-foreground">{statusMessage}</span>
                    )}
                    <Badge
                        variant="outline"
                        className={isSimulating
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-muted/50 border-border text-muted-foreground"
                        }
                    >
                        {isSimulating ? (
                            <><span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />LIVE</>
                        ) : (
                            "STANDBY"
                        )}
                    </Badge>
                </div>
            </header>

            {/* Dashboard Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto space-y-6">

                    {/* Control Banner */}
                    <div className="bg-gradient-to-r from-indigo-900/80 to-indigo-800/60 border border-indigo-700/50 rounded-xl p-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">Traffic Simulation</h2>
                            <p className="text-indigo-200/80 text-sm max-w-md">
                                Generate realistic database traffic including slow queries for the FinOps Auditor to analyze.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    addLog("Testing database connection...")
                                    try {
                                        const res = await trackedFetch(`${API_BASE}/simulation/test`, { method: "POST" })
                                        const data = await res.json()
                                        addLog(`Test result: ${JSON.stringify(data)}`)
                                        if (data.ready) {
                                            setStatusMessage("Database ready!")
                                        } else {
                                            setStatusMessage("Database not ready - run setup first")
                                        }
                                    } catch (e: any) {
                                        addLog(`Test failed: ${e.message}`)
                                    }
                                }}
                                className="h-12 px-4 text-sm border-border text-foreground hover:bg-muted/50"
                            >
                                Test Database
                            </Button>
                            <Button
                                size="lg"
                                onClick={toggleSimulation}
                                disabled={isLoading}
                                className={`h-12 px-6 text-sm font-bold transition-all ${isSimulating
                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                    : "bg-primary hover:bg-emerald-600 text-white"
                                    }`}
                            >
                                {isLoading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Working...</>
                                ) : isSimulating ? (
                                    <><Square className="w-4 h-4 mr-2" />Stop Simulation</>
                                ) : (
                                    <><Play className="w-4 h-4 mr-2" />Start Simulation</>
                                )}
                            </Button>
                        </div>
                    </div>


                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-muted border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                                    Total Revenue
                                    <span className="text-primary text-xs font-bold">+12.5%</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground">
                                    $<AnimatedNumber value={stats.revenue} formatFn={n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                                    Live Orders
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground">
                                    <AnimatedNumber value={stats.orders} />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                                    Active Visitors
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground">
                                    <AnimatedNumber value={stats.activeUsers} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Debug Logs & Alerts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Debug Log */}
                        <Card className="bg-muted border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-foreground">Debug Log</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-card border border-border rounded-md p-3 h-40 overflow-y-auto font-mono text-xs">
                                    {logs.length === 0 ? (
                                        <span className="text-muted-foreground">No logs yet. Click Start Simulation.</span>
                                    ) : (
                                        logs.map((log, i) => (
                                            <div key={i} className={`${log.includes("ERROR") ? "text-red-400" : "text-muted-foreground"}`}>
                                                {log}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* System Alerts */}
                        <Card className="bg-muted border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-foreground">System Alerts</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex gap-3 text-amber-300 text-xs">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-semibold block">Slow Query Detected</span>
                                        <span className="text-amber-400/70">Reporting module is causing high CPU load.</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50/50 border border-border rounded-lg flex gap-3 text-muted-foreground text-xs">
                                    <Package className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-semibold block text-foreground">Low Stock Warning</span>
                                        <span>Item 'Gaming Mouse X1' is below threshold (5 left).</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    )
}
