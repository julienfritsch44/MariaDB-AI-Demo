"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SlowQuery } from "@/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Clock, Activity, Database, ArrowRight } from "lucide-react"

interface SlowQueryTableProps {
    queries: SlowQuery[]
    onAnalyze: (id: number) => void
    activeQueryId?: number
}

export function SlowQueryTable({ queries, onAnalyze, activeQueryId }: SlowQueryTableProps) {
    return (
        <div className="space-y-3">
            {queries.map((query, index) => {
                const isActive = activeQueryId === query.id;

                return (
                    <motion.div
                        key={query.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onAnalyze(query.id)}
                    >
                        <div className={cn(
                            "group cursor-pointer rounded-md border p-3 transition-all duration-200 relative",
                            isActive
                                ? "bg-primary/5 border-primary/20"
                                : "bg-card border-border hover:bg-muted hover:border-primary/30"
                        )}>
                            {/* Active Indicator Strip */}
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-l-md" />
                            )}

                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] font-mono font-medium h-5 px-1.5 rounded-sm border",
                                            query.impact_score > 80 ? "border-destructive/50 text-destructive bg-destructive/10" :
                                                query.impact_score > 50 ? "border-amber-500/50 text-amber-600 bg-amber-500/10" :
                                                    "border-border text-muted-foreground bg-muted"
                                        )}
                                    >
                                        {query.impact_score}
                                    </Badge>
                                    <span className="text-[10px] font-mono text-muted-foreground">#{query.id}</span>
                                </div>
                                {query.db && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Database className="w-3 h-3" /> {query.db}
                                    </span>
                                )}
                            </div>

                            <div className="font-mono text-xs text-foreground line-clamp-2 mb-3 leading-relaxed">
                                {query.sql_text}
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-3">
                                    <span className={cn("flex items-center gap-1", isActive ? "text-primary" : "")}>
                                        <Clock className="w-3 h-3" /> {query.query_time.toFixed(2)}s
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Activity className="w-3 h-3" /> {(query.rows_examined / 1000).toFixed(1)}k rows
                                    </span>
                                    {query.estimated_cost_usd !== undefined && (
                                        <span className="flex items-center gap-1 text-primary font-mono">
                                            $ {query.estimated_cost_usd.toFixed(3)}
                                        </span>
                                    )}
                                </div>
                                <ArrowRight className={cn(
                                    "w-3 h-3 transition-transform opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 text-muted-foreground",
                                    isActive && "opacity-100 text-primary translate-x-0"
                                )} />
                            </div>
                        </div>
                    </motion.div>
                )
            })}
        </div>
    )
}
