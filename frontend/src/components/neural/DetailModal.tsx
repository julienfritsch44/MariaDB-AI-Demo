"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, LucideIcon } from "lucide-react"

interface DetailModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    subtitle: string
    icon: LucideIcon
    iconColor?: string
    children: React.ReactNode
}

export function DetailModal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon: Icon,
    iconColor = "text-primary",
    children
}: DetailModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-3 rounded-xl bg-${iconColor.split('-')[1]}-500/10 ${iconColor}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                                    <p className="text-xs text-muted-foreground uppercase tracking-widest">{subtitle}</p>
                                </div>
                            </div>
                        </div>

                        {children}

                        <div className="mt-6 pt-6 border-t border-dashed border-border flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
