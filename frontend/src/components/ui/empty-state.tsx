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
            "h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center",
            className
        )}>
            <div className="p-3 rounded-full bg-muted border border-border mb-4">
                <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {description && (
                <p className="text-xs mt-1 text-muted-foreground max-w-xs mx-auto">
                    {description}
                </p>
            )}
        </div>
    )
}
