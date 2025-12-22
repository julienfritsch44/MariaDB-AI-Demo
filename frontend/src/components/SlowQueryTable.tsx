"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SlowQuery } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowRight, Database, Clock, Activity, Search } from "lucide-react"

interface SlowQueryTableProps {
    queries: SlowQuery[]
    onAnalyze: (id: number) => void
}

export function SlowQueryTable({ queries, onAnalyze }: SlowQueryTableProps) {
    return (
        <div className="space-y-4">
            {queries.map((query, index) => (
                <motion.div
                    key={query.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={query.impact_score > 80 ? "high_impact" : query.impact_score > 50 ? "warning" : "default"}
                                        >
                                            Score: {query.impact_score}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            ID: {query.id}
                                        </span>
                                        {query.db && (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Database className="w-3 h-3" />
                                                {query.db}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="font-mono text-sm bg-muted/50 p-3 rounded-md border border-border/50 text-foreground/90 line-clamp-2 group-hover:line-clamp-none transition-all">
                                        {query.sql_text}
                                    </div>

                                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4 text-blue-400" />
                                            {query.query_time.toFixed(4)}s
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Activity className="w-4 h-4 text-orange-400" />
                                            {query.rows_examined.toLocaleString()} rows examined
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <Button
                                        onClick={() => onAnalyze(query.id)}
                                        className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    >
                                        <Search className="w-4 h-4" />
                                        Analyze with AI
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    )
}
