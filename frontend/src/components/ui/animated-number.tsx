"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AnimatedNumberProps {
    value: number
    duration?: number
    formatFn?: (n: number) => string
    className?: string
}

export function AnimatedNumber({
    value,
    duration = 1000,
    formatFn = (n: number) => n.toLocaleString(),
    className
}: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(0)
    const previousValue = useRef(0)

    useEffect(() => {
        const startValue = previousValue.current
        const endValue = value
        const startTime = performance.now()

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3)

            const current = startValue + (endValue - startValue) * eased
            setDisplayValue(current)

            if (progress < 1) {
                requestAnimationFrame(animate)
            } else {
                setDisplayValue(endValue)
                previousValue.current = endValue
            }
        }

        requestAnimationFrame(animate)
    }, [value, duration])

    return <span className={className}>{formatFn(displayValue)}</span>
}
