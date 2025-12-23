import { useState, useEffect } from "react"
import { CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ReasoningLoaderProps {
    steps?: string[]
    className?: string
}

const DEFAULT_STEPS = [
    "Parsing SQL structure and syntax...",
    "Analyzing execution plan costs...",
    "Correlating with 1,400+ Jira tickets...",
    "Identifyng missing indexes...",
    "Generating optimization strategy...",
    "Finalizing impact assessment..."
]

export function ReasoningLoader({ steps = DEFAULT_STEPS, className }: ReasoningLoaderProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)

    useEffect(() => {
        if (currentStepIndex >= steps.length - 1) return

        // Randomize timing for a more natural "thinking" feel
        const timeout = setTimeout(() => {
            setCurrentStepIndex(prev => prev + 1)
        }, Math.random() * 800 + 400) // 400ms to 1200ms

        return () => clearTimeout(timeout)
    }, [currentStepIndex, steps.length])

    return (
        <div className={cn("flex flex-col items-center justify-center p-8 max-w-md mx-auto w-full", className)}>

            {/* Main Pulse Animation */}
            <div className="relative mb-8">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                    <Sparkles className="w-8 h-8 text-emerald-500 animate-pulse" />
                </div>
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-20" />
            </div>

            {/* steps container */}
            <div className="w-full space-y-3">
                {steps.map((step, index) => {
                    const status = index < currentStepIndex ? "completed" : index === currentStepIndex ? "current" : "pending"

                    // Don't show pending steps yet to keep mystery, or show them dimmed?
                    // Let's show them dimmed for "roadmap" effect.

                    return (
                        <div key={index} className="flex items-center gap-3">
                            {/* Status Icon */}
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                {status === "completed" && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="text-emerald-500"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                    </motion.div>
                                )}
                                {status === "current" && (
                                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                )}
                                {status === "pending" && (
                                    <div className="w-2 h-2 rounded-full bg-zinc-800" />
                                )}
                            </div>

                            {/* Text */}
                            <span className={cn(
                                "text-sm transition-colors duration-300 font-mono",
                                status === "completed" && "text-zinc-500",
                                status === "current" && "text-emerald-400 font-medium",
                                status === "pending" && "text-zinc-700"
                            )}>
                                {step}
                            </span>
                        </div>
                    )
                })}
            </div>

            <p className="mt-8 text-xs text-zinc-600 animate-pulse">
                Powered by MariaDB Cortex AI
            </p>
        </div>
    )
}
