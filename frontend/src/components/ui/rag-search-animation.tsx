import { useState, useEffect } from "react"
import { Database, Ticket, CheckCircle2, Search, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface RAGSearchAnimationProps {
    isSearching: boolean
    foundTickets?: { id: string; title: string; similarity: number }[]
    totalTickets?: number
    className?: string
}

// Realistic MDEV ticket samples for animation
const SAMPLE_TICKETS = [
    { id: "MDEV-30820", title: "Optimizer: full table scan when index exists" },
    { id: "MDEV-28456", title: "Slow query with OR conditions on indexed columns" },
    { id: "MDEV-31567", title: "Missing index causes deadlock under load" },
    { id: "MDEV-27890", title: "Subquery optimization fails with derived tables" },
    { id: "MDEV-25678", title: "JOIN optimization incorrect cost estimate" },
    { id: "MDEV-32145", title: "Index merge not used for BETWEEN clause" },
    { id: "MDEV-29012", title: "GROUP BY with filesort on large tables" },
    { id: "MDEV-33456", title: "EXPLAIN shows wrong rows estimate" },
    { id: "MDEV-26789", title: "Covering index not recognized" },
    { id: "MDEV-34567", title: "Optimizer chooses wrong index for ORDER BY" },
]

export function RAGSearchAnimation({
    isSearching,
    foundTickets = [],
    totalTickets = 1350,
    className
}: RAGSearchAnimationProps) {
    const [currentTicketIndex, setCurrentTicketIndex] = useState(0)
    const [scannedCount, setScannedCount] = useState(0)
    const [phase, setPhase] = useState<"scanning" | "matching" | "complete">("scanning")

    useEffect(() => {
        if (!isSearching) {
            setPhase("scanning")
            setCurrentTicketIndex(0)
            setScannedCount(0)
            return
        }

        // Phase 1: Rapid scanning animation (800ms)
        const scanInterval = setInterval(() => {
            setCurrentTicketIndex(prev => (prev + 1) % SAMPLE_TICKETS.length)
            setScannedCount(prev => Math.min(prev + Math.floor(Math.random() * 50) + 20, totalTickets))
        }, 50)

        // Phase 2: Transition to matching
        const matchTimeout = setTimeout(() => {
            setPhase("matching")
            clearInterval(scanInterval)
        }, 800)

        // Phase 3: Complete
        const completeTimeout = setTimeout(() => {
            setPhase("complete")
        }, 1500)

        return () => {
            clearInterval(scanInterval)
            clearTimeout(matchTimeout)
            clearTimeout(completeTimeout)
        }
    }, [isSearching, totalTickets])

    if (!isSearching && foundTickets.length === 0) {
        return null
    }

    return (
        <div className={cn("bg-muted/50 border border-border rounded-lg p-4", className)}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                    <Database className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-foreground">Knowledge Base Search</h4>
                    <p className="text-xs text-muted-foreground">
                        Searching {totalTickets.toLocaleString()} Jira tickets...
                    </p>
                </div>
            </div>

            {/* Scanning Animation */}
            <AnimatePresence mode="wait">
                {phase === "scanning" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2"
                    >
                        {/* Progress Bar */}
                        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                initial={{ width: "0%" }}
                                animate={{ width: `${(scannedCount / totalTickets) * 100}%` }}
                                transition={{ duration: 0.1 }}
                            />
                        </div>

                        {/* Counter */}
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-mono">
                                Scanned: {scannedCount.toLocaleString()} / {totalTickets.toLocaleString()}
                            </span>
                            <Search className="w-3 h-3 text-primary animate-pulse" />
                        </div>

                        {/* Scrolling Tickets */}
                        <div className="h-24 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-transparent to-zinc-900/50 z-10 pointer-events-none" />
                            <motion.div
                                animate={{ y: -currentTicketIndex * 24 }}
                                transition={{ duration: 0.1 }}
                                className="space-y-1"
                            >
                                {[...SAMPLE_TICKETS, ...SAMPLE_TICKETS, ...SAMPLE_TICKETS].map((ticket, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-1 rounded text-xs transition-all",
                                            idx === currentTicketIndex + SAMPLE_TICKETS.length
                                                ? "bg-primary/20 border border-primary/30"
                                                : "opacity-40"
                                        )}
                                    >
                                        <Ticket className="w-3 h-3 text-muted-foreground shrink-0" />
                                        <span className="font-mono text-primary">{ticket.id}</span>
                                        <span className="text-muted-foreground truncate">{ticket.title}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {phase === "matching" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="py-4 text-center"
                    >
                        <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-pulse" />
                        <p className="text-sm text-foreground">Finding matching patterns...</p>
                        <p className="text-xs text-muted-foreground mt-1">Calculating semantic similarity</p>
                    </motion.div>
                )}

                {phase === "complete" && foundTickets.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                    >
                        <div className="flex items-center gap-2 text-primary mb-3">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                Found {foundTickets.length} relevant ticket{foundTickets.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {foundTickets.map((ticket, idx) => (
                            <motion.div
                                key={ticket.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center justify-between p-2 bg-muted/50/50 rounded border border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
                                onClick={() => window.open(`https://jira.mariadb.org/browse/${ticket.id}`, '_blank')}
                            >
                                <div className="flex items-center gap-2">
                                    <Ticket className="w-4 h-4 text-primary" />
                                    <span className="font-mono text-sm text-primary group-hover:text-emerald-300">
                                        {ticket.id}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {ticket.title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-16 h-1.5 bg-muted/70 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{ width: `${ticket.similarity * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {(ticket.similarity * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
