import { useState, useEffect } from "react"
import { CheckCircle2, Loader2, Sparkles, Database, Ticket, Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ReasoningLoaderProps {
    steps?: string[]
    className?: string
    showRAGAnimation?: boolean
    totalTickets?: number
    colorVariant?: "emerald" | "amber" | "yellow"
}

const colorStyles = {
    emerald: {
        bg: "bg-primary/10",
        border: "border-primary/20",
        text: "text-primary",
        textLight: "text-primary",
        gradient: "from-emerald-500 to-teal-400",
        pulse: "bg-primary/20"
    },
    amber: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        text: "text-amber-500",
        textLight: "text-amber-400",
        gradient: "from-amber-500 to-orange-400",
        pulse: "bg-amber-500/20"
    },
    yellow: {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
        text: "text-yellow-500",
        textLight: "text-yellow-400",
        gradient: "from-yellow-500 to-amber-400",
        pulse: "bg-yellow-500/20"
    }
}

const DEFAULT_STEPS = [
    "Parsing SQL structure and syntax...",
    "Analyzing execution plan costs...",
    "Searching knowledge base...",
    "Identifying optimization patterns...",
    "Generating recommendations...",
    "Finalizing analysis..."
]

// Realistic MDEV tickets for animation
const SAMPLE_TICKETS = [
    { id: "MDEV-30820", title: "Optimizer chooses full scan over index" },
    { id: "MDEV-28456", title: "Slow query with OR on indexed columns" },
    { id: "MDEV-31567", title: "Missing index causes deadlock" },
    { id: "MDEV-27890", title: "Subquery optimization failure" },
    { id: "MDEV-25678", title: "JOIN cost estimate incorrect" },
    { id: "MDEV-32145", title: "Index merge not used for BETWEEN" },
    { id: "MDEV-29012", title: "GROUP BY filesort on large tables" },
    { id: "MDEV-33456", title: "EXPLAIN wrong rows estimate" },
    { id: "MDEV-26789", title: "Covering index not recognized" },
    { id: "MDEV-34567", title: "Wrong index for ORDER BY" },
]

export function ReasoningLoader({
    steps = DEFAULT_STEPS,
    className,
    showRAGAnimation = true,
    totalTickets = 1350,
    colorVariant = "emerald"
}: ReasoningLoaderProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [currentTicketIndex, setCurrentTicketIndex] = useState(0)
    const [scannedCount, setScannedCount] = useState(0)

    const colors = colorStyles[colorVariant]

    // Step progression
    useEffect(() => {
        if (currentStepIndex >= steps.length - 1) return

        const timeout = setTimeout(() => {
            setCurrentStepIndex(prev => prev + 1)
        }, Math.random() * 300 + 200)

        return () => clearTimeout(timeout)
    }, [currentStepIndex, steps.length])

    // Ticket scrolling animation (only during step 2 - "Searching knowledge base")
    useEffect(() => {
        if (currentStepIndex !== 2) return

        const interval = setInterval(() => {
            setCurrentTicketIndex(prev => (prev + 1) % SAMPLE_TICKETS.length)
            setScannedCount(prev => Math.min(prev + Math.floor(Math.random() * 80) + 40, totalTickets))
        }, 80)

        return () => clearInterval(interval)
    }, [currentStepIndex, totalTickets])

    const isRAGPhase = currentStepIndex === 2 && showRAGAnimation

    return (
        <div className={cn("flex flex-col items-center justify-center p-8 max-w-lg mx-auto w-full", className)}>

            {/* Main Pulse Animation */}
            <div className="relative mb-6">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center border", colors.bg, colors.border)}>
                    {isRAGPhase ? (
                        <Database className={cn("w-8 h-8 animate-pulse", colors.text)} />
                    ) : (
                        <Sparkles className={cn("w-8 h-8 animate-pulse", colors.text)} />
                    )}
                </div>
                <div className={cn("absolute inset-0 rounded-full animate-ping opacity-20", colors.pulse)} />
            </div>

            {/* RAG Search Animation - Only show during knowledge base search step */}
            <AnimatePresence>
                {isRAGPhase && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full mb-6 overflow-hidden"
                    >
                        <div className={cn("bg-muted/80 border rounded-lg p-4", colors.border)}>
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-3">
                                <Search className={cn("w-4 h-4 animate-pulse", colors.textLight)} />
                                <span className={cn("text-xs font-semibold uppercase tracking-wider", colors.textLight)}>
                                    Searching {totalTickets.toLocaleString()} Jira Tickets
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1 bg-muted/50 rounded-full overflow-hidden mb-3">
                                <motion.div
                                    className={cn("h-full bg-gradient-to-r", colors.gradient)}
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${(scannedCount / totalTickets) * 100}%` }}
                                    transition={{ duration: 0.05 }}
                                />
                            </div>

                            {/* Scrolling Tickets */}
                            <div className="h-20 overflow-hidden relative rounded bg-card/50">
                                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-transparent to-zinc-950/80 z-10 pointer-events-none" />
                                <motion.div
                                    animate={{ y: -currentTicketIndex * 20 }}
                                    transition={{ duration: 0.05, ease: "linear" }}
                                    className="pt-6"
                                >
                                    {[...SAMPLE_TICKETS, ...SAMPLE_TICKETS, ...SAMPLE_TICKETS].map((ticket, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "flex items-center gap-2 px-2 h-5 text-xs transition-all",
                                                idx === currentTicketIndex + SAMPLE_TICKETS.length
                                                    ? cn(colors.textLight, "scale-105")
                                                    : "text-muted-foreground scale-100"
                                            )}
                                        >
                                            <Ticket className="w-3 h-3 shrink-0" />
                                            <span className="font-mono font-bold">{ticket.id}</span>
                                            <span className="truncate opacity-70">{ticket.title}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            </div>

                            {/* Counter */}
                            <div className="mt-2 text-right">
                                <span className="text-[10px] font-mono text-muted-foreground">
                                    Scanned: <span className={colors.textLight}>{scannedCount.toLocaleString()}</span> / {totalTickets.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Steps Container */}
            <div className="w-full space-y-2">
                {steps.map((step, index) => {
                    const status = index < currentStepIndex ? "completed" : index === currentStepIndex ? "current" : "pending"

                    return (
                        <div key={index} className="flex items-center gap-3">
                            {/* Status Icon */}
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                {status === "completed" && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className={colors.text}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </motion.div>
                                )}
                                {status === "current" && (
                                    <Loader2 className={cn("w-4 h-4 animate-spin", colors.textLight)} />
                                )}
                                {status === "pending" && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-muted/70" />
                                )}
                            </div>

                            {/* Text */}
                            <span className={cn(
                                "text-sm transition-colors duration-300",
                                status === "completed" && "text-muted-foreground",
                                status === "current" && cn(colors.textLight, "font-medium"),
                                status === "pending" && "text-foreground"
                            )}>
                                {step}
                            </span>
                        </div>
                    )
                })}
            </div>

            <p className="mt-6 text-[10px] text-muted-foreground animate-pulse">
                Powered by MariaDB Vector + SkyAI Copilot
            </p>
        </div>
    )
}

