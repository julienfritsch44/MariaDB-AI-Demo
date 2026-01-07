import { Button } from "@/components/ui/button"

interface AnalyzerHeaderProps {
    step: string
    onReset: () => void
}

export function AnalyzerHeader({ step, onReset }: AnalyzerHeaderProps) {
    return (
        <div className="border-b border-border bg-card shrink-0">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">Unified Query Analyzer</h1>
                        <p className="text-sm text-muted-foreground">Complete workflow: Risk → Sandbox → Healing → Comparison</p>
                    </div>
                    {step !== "input" && (
                        <Button variant="outline" onClick={onReset} size="sm">
                            New Analysis
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
