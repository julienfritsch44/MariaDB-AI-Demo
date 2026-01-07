import { ChevronRight } from "lucide-react"
import type { WorkflowStep } from "./types"

interface ProgressBarProps {
    currentStep: WorkflowStep
}

const steps = [
    { id: "input" as const, label: "Input", number: 1 },
    { id: "risk" as const, label: "Risk Analysis", number: 2 },
    { id: "sandbox" as const, label: "Sandbox Test", number: 3 },
    { id: "healing" as const, label: "Optimization", number: 4 },
    { id: "comparison" as const, label: "Comparison", number: 5 }
]

export function ProgressBar({ currentStep }: ProgressBarProps) {
    const currentIndex = steps.findIndex(s => s.id === currentStep)

    return (
        <div className="border-b border-border bg-card shrink-0">
            <div className="container mx-auto px-6">
                <div className="border-t border-border pt-4 pb-4">
                    <div className="flex items-center gap-2 text-xs">
                        {steps.map((step, index) => {
                            const isActive = step.id === currentStep
                            const isCompleted = index < currentIndex
                            const isPending = index > currentIndex

                            return (
                                <div key={step.id} className="flex items-center gap-2">
                                    <div className={`flex items-center gap-1.5 ${isActive ? "text-primary" :
                                            isPending ? "text-muted-foreground" :
                                                "text-foreground"
                                        }`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isActive ? "border-primary bg-primary/10" :
                                                isPending ? "border-border bg-muted" :
                                                    "border-emerald-500 bg-emerald-500/10"
                                            }`}>
                                            {isPending ? step.number : "✓"}
                                        </div>
                                        <span className="font-medium">{step.label}</span>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
