import { cn } from "@/lib/utils"
import { SqlCode } from "@/components/ui/sql-code"

interface CodeContainerProps {
    code: string
    className?: string
    lang?: "sql" | "json" | "text"
}

export function CodeContainer({ code, className, lang = "sql" }: CodeContainerProps) {
    return (
        <div className={cn(
            "bg-zinc-950 border border-zinc-800 rounded-md shadow-sm overflow-hidden",
            className
        )}>
            <div className="p-3 overflow-x-auto">
                {lang === "sql" ? (
                    <SqlCode code={code} />
                ) : (
                    <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {code}
                    </pre>
                )}
            </div>
        </div>
    )
}
