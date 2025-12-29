"use client"

import { useState } from "react"
import {
    usePerformanceData,
    getDurationColor,
    getDurationBgColor,
    PerformanceEntry
} from "@/lib/usePerformance"
import { Activity, X, Trash2, ChevronDown, ChevronUp, Gauge, Zap, Clock, AlertTriangle } from "lucide-react"

function formatTime(date: Date): string {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
}

export function PerformanceMonitor() {
    const [isOpen, setIsOpen] = useState(false)
    const [isExpanded, setIsExpanded] = useState(true)
    const { entries, stats, clearHistory } = usePerformanceData()

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 p-3 bg-zinc-900 border border-zinc-700 rounded-full shadow-lg hover:bg-zinc-800 transition-all group"
                title="Performance Monitor"
            >
                <Gauge className="w-5 h-5 text-emerald-400" />
                {stats.slowCalls > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {stats.slowCalls}
                    </span>
                )}
            </button>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-[400px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                        Performance Monitor
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                        ) : (
                            <ChevronUp className="w-4 h-4 text-zinc-400" />
                        )}
                    </button>
                    <button
                        onClick={clearHistory}
                        className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                        title="Clear history"
                    >
                        <Trash2 className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-zinc-850 border-b border-zinc-700">
                <StatCard
                    icon={<Activity className="w-3 h-3" />}
                    label="Calls"
                    value={stats.totalCalls.toString()}
                    color="text-zinc-300"
                />
                <StatCard
                    icon={<Clock className="w-3 h-3" />}
                    label="Avg"
                    value={formatDuration(stats.avgDuration)}
                    color={getDurationColor(stats.avgDuration)}
                />
                <StatCard
                    icon={<Zap className="w-3 h-3" />}
                    label="Fast"
                    value={stats.fastestCall ? formatDuration(stats.fastestCall) : "-"}
                    color="text-emerald-400"
                />
                <StatCard
                    icon={<AlertTriangle className="w-3 h-3" />}
                    label="Slow"
                    value={stats.slowCalls.toString()}
                    color={stats.slowCalls > 0 ? "text-red-400" : "text-zinc-500"}
                />
            </div>

            {/* Request List */}
            {isExpanded && (
                <div className="max-h-[300px] overflow-y-auto">
                    {entries.length === 0 ? (
                        <div className="p-6 text-center text-zinc-500 text-sm">
                            No API calls recorded yet.
                            <br />
                            <span className="text-xs">Interact with the app to see performance data.</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {entries.map((entry) => (
                                <RequestRow key={entry.id} entry={entry} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="px-3 py-2 bg-zinc-800 border-t border-zinc-700 flex items-center justify-center gap-4 text-[10px]">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-zinc-400">&lt;200ms</span>
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-zinc-400">200-500ms</span>
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-zinc-400">&gt;500ms</span>
                </span>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-zinc-500 text-[10px] uppercase mb-1">
                {icon}
                {label}
            </div>
            <div className={`text-sm font-bold ${color}`}>{value}</div>
        </div>
    )
}

function RequestRow({ entry }: { entry: PerformanceEntry }) {
    const isError = entry.status >= 400 || entry.error
    const statusColor = isError ? "text-red-400" : "text-emerald-400"

    return (
        <div className={`px-3 py-2 hover:bg-zinc-800/50 transition-colors ${getDurationBgColor(entry.duration)}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase w-8 shrink-0">
                        {entry.method}
                    </span>
                    <span className="text-xs text-zinc-300 truncate" title={entry.endpoint}>
                        {entry.endpoint}
                    </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-mono ${statusColor}`}>
                        {entry.error ? "ERR" : entry.status}
                    </span>
                    <span className={`text-xs font-bold font-mono ${getDurationColor(entry.duration)}`}>
                        {formatDuration(entry.duration)}
                    </span>
                    {entry.serverTime && (
                        <span className="text-[10px] text-zinc-500" title="Server processing time">
                            (srv: {Math.round(entry.serverTime)}ms)
                        </span>
                    )}
                </div>
            </div>
            <div className="text-[10px] text-zinc-600 mt-1">
                {formatTime(entry.timestamp)}
                {entry.error && <span className="ml-2 text-red-400">{entry.error}</span>}
            </div>
        </div>
    )
}
