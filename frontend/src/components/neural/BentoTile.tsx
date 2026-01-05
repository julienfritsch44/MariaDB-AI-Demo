"use client"

import React from "react"
import { LucideIcon } from "lucide-react"

interface BentoTileProps {
    title: string
    subtitle?: string
    icon?: LucideIcon
    children: React.ReactNode
    className?: string
    priority?: "low" | "medium" | "high"
}

export function BentoTile({
    title,
    subtitle,
    icon: Icon,
    children,
    className = "",
    priority = "medium"
}: BentoTileProps) {
    const priorityColors = {
        low: "border-white/5",
        medium: "border-white/10",
        high: "border-primary/30 shadow-[0_0_20px_rgba(0,169,206,0.1)]"
    }

    return (
        <div className={`glass-card p-6 flex flex-col space-y-4 group relative overflow-hidden ${priorityColors[priority]} ${className}`}>
            {/* Ambient background glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="flex items-center justify-between z-10">
                <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-[10px] text-muted-foreground/60 font-mono italic">
                            {subtitle}
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className="w-8 h-8 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-4 h-4 text-primary" />
                    </div>
                )}
            </div>

            <div className="flex-1 z-10">
                {children}
            </div>

            {/* Decorative corner accent */}
            <div className="absolute bottom-0 right-0 w-8 h-8 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute bottom-[-10px] right-[-10px] w-20 h-20 border border-primary/40 rotate-45" />
            </div>
        </div>
    )
}
