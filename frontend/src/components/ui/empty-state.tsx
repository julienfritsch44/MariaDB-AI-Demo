import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description?: string
    className?: string
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center",
            className
        )}>
            <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 mb-4">
                <Icon className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400">{title}</p>
            {description && (
                <p className="text-xs mt-1 text-zinc-600 max-w-xs mx-auto">
                    {description}
                </p>
            )}
        </div>
    )
}
