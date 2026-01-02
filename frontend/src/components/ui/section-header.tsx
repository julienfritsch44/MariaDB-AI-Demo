import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
    icon?: LucideIcon
    title: string | React.ReactNode
    className?: string
    variant?: "default" | "emerald" | "danger" | "warning"
}

export function SectionHeader({
    icon: Icon,
    title,
    className,
    variant = "default"
}: SectionHeaderProps) {
    const colorStyles = {
        default: "text-muted-foreground",
        emerald: "text-primary",
        danger: "text-red-400",
        warning: "text-amber-400"
    }

    return (
        <h4 className={cn(
            "text-[10px] font-bold uppercase tracking-wider flex items-center gap-2",
            colorStyles[variant],
            className
        )}>
            {Icon && <Icon className="w-3 h-3" />}
            {title}
        </h4>
    )
}
