"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface CopyButtonProps {
    text: string
    label?: string
    className?: string
    variant?: "ghost" | "outline"
    iconOnly?: boolean
}

export function CopyButton({
    text,
    label = "Copy",
    className,
    variant = "ghost",
    iconOnly = false
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success("Copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Button
            variant={variant}
            size="sm"
            onClick={handleCopy}
            className={cn(
                "h-6 text-[10px]",
                variant === "ghost" ? "text-zinc-500 hover:text-zinc-300" : "",
                copied ? "text-emerald-500" : "",
                className
            )}
        >
            {copied ? (
                <Check className={cn("w-3 h-3", !iconOnly && "mr-1.5")} />
            ) : (
                <Copy className={cn("w-3 h-3", !iconOnly && "mr-1.5")} />
            )}
            {!iconOnly && (copied ? "Copied!" : label)}
        </Button>
    )
}
