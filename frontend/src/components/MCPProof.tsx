"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Terminal, CheckCircle2, Search, Database, Wand2 } from "lucide-react"

export function MCPProof() {
    const [logs, setLogs] = useState<any[]>([])

    const fetchHistory = async () => {
        try {
            const res = await fetch("http://localhost:8000/mcp/history")
            const data = await res.json()
            if (Array.isArray(data)) {
                setLogs(data)
            }
        } catch (err) {
            console.error("Failed to fetch MCP history", err)
        }
    }

    useEffect(() => {
        fetchHistory()
        const interval = setInterval(fetchHistory, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full">
            <div className="bg-zinc-800/50 px-4 py-2 flex items-center justify-between border-b border-zinc-700">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest">MCP Active Tool Session</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-emerald-500">LISTENING</span>
                </div>
            </div>

            <div className="flex-1 p-4 font-mono text-[10px] space-y-3 overflow-y-auto scrollbar-thin">
                <AnimatePresence>
                    {logs.length > 0 ? logs.map((log, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex flex-col gap-1 border-l-2 border-emerald-500/20 pl-3 py-1"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-zinc-600">[{log.time}]</span>
                                    <span className="text-purple-400 font-bold">tool_call:</span>
                                    <span className="text-zinc-100">{log.tool}</span>
                                </div>
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            </div>
                            <div className="flex items-center gap-2 text-zinc-500 italic">
                                <span>└─</span>
                                <span>{log.detail}</span>
                            </div>
                        </motion.div>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 opacity-50">
                            <Search className="w-8 h-8" />
                            <p>Listening for external tool calls...</p>
                            <p className="text-[8px] uppercase tracking-tighter">Claude Desktop / HTTP Interface</p>
                        </div>
                    )}
                </AnimatePresence>

                {logs.length > 0 && logs.length < 20 && (
                    <div className="flex items-center gap-2 text-zinc-600 animate-pulse pl-5">
                        <span className="w-1 h-3 bg-zinc-700 animate-bounce" />
                        <span>Waiting for next tool invocation...</span>
                    </div>
                )}
            </div>

            <div className="bg-zinc-950/80 px-4 py-2 border-t border-zinc-800">
                <p className="text-[8px] text-zinc-500 leading-tight">
                    This panel demonstrates the **Model Context Protocol** in action. Any AI Agent (Claude, Windsurf) can use these tools to interact with your MariaDB database natively.
                </p>
            </div>
        </div>
    )
}
