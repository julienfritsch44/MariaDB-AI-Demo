"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface PerformanceEntry {
    id: string
    endpoint: string
    method: string
    duration: number  // Frontend measured
    serverTime?: number  // From X-Response-Time-Ms header
    status: number
    timestamp: Date
    error?: string
}

export interface PerformanceStats {
    totalCalls: number
    avgDuration: number
    slowCalls: number
    fastestCall: number
    slowestCall: number
}

const MAX_ENTRIES = 50
const SLOW_THRESHOLD_MS = 500

// Global store for performance entries
let globalEntries: PerformanceEntry[] = []
let listeners: Set<() => void> = new Set()

function notifyListeners() {
    listeners.forEach(fn => fn())
}

export function addPerformanceEntry(entry: PerformanceEntry) {
    globalEntries = [entry, ...globalEntries].slice(0, MAX_ENTRIES)
    notifyListeners()
}

export function clearPerformanceHistory() {
    globalEntries = []
    notifyListeners()
}

export function getPerformanceStats(): PerformanceStats {
    const entries = globalEntries
    if (entries.length === 0) {
        return {
            totalCalls: 0,
            avgDuration: 0,
            slowCalls: 0,
            fastestCall: 0,
            slowestCall: 0
        }
    }

    const durations = entries.map(e => e.duration)
    return {
        totalCalls: entries.length,
        avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        slowCalls: durations.filter(d => d > SLOW_THRESHOLD_MS).length,
        fastestCall: Math.min(...durations),
        slowestCall: Math.max(...durations)
    }
}

/**
 * Hook to subscribe to performance data updates
 */
export function usePerformanceData() {
    const [entries, setEntries] = useState<PerformanceEntry[]>(globalEntries)
    const [stats, setStats] = useState<PerformanceStats>(getPerformanceStats())

    useEffect(() => {
        const update = () => {
            setEntries([...globalEntries])
            setStats(getPerformanceStats())
        }
        listeners.add(update)
        return () => { listeners.delete(update) }
    }, [])

    return { entries, stats, clearHistory: clearPerformanceHistory }
}

/**
 * Tracked fetch function that measures performance
 */
export async function trackedFetch(
    url: string,
    options?: RequestInit
): Promise<Response> {
    const start = performance.now()
    const method = options?.method || "GET"
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    let response: Response
    let error: string | undefined

    try {
        response = await fetch(url, options)
    } catch (err: any) {
        error = err.message
        const entry: PerformanceEntry = {
            id,
            endpoint: new URL(url, window.location.origin).pathname,
            method,
            duration: Math.round(performance.now() - start),
            status: 0,
            timestamp: new Date(),
            error
        }
        addPerformanceEntry(entry)
        throw err
    }

    const duration = Math.round(performance.now() - start)
    const serverTimeHeader = response.headers.get("X-Response-Time-Ms")
    const serverTime = serverTimeHeader ? parseFloat(serverTimeHeader) : undefined

    const entry: PerformanceEntry = {
        id,
        endpoint: new URL(url, window.location.origin).pathname,
        method,
        duration,
        serverTime,
        status: response.status,
        timestamp: new Date()
    }

    addPerformanceEntry(entry)

    return response
}

/**
 * Returns color class based on duration
 */
export function getDurationColor(ms: number): string {
    if (ms < 200) return "text-emerald-400"
    if (ms < 500) return "text-amber-400"
    return "text-red-400"
}

/**
 * Returns background color class based on duration
 */
export function getDurationBgColor(ms: number): string {
    if (ms < 200) return "bg-emerald-500/20"
    if (ms < 500) return "bg-amber-500/20"
    return "bg-red-500/20"
}
