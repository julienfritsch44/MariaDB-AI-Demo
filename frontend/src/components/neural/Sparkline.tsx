"use client"

import React from "react"

interface SparklineProps {
    data: number[]
    color?: string
    height?: number
    className?: string
}

export function Sparkline({ data, color = "rgb(0, 169, 206)", height = 48, className = "" }: SparklineProps) {
    if (!data || data.length < 2) {
        return <div className={`w-full ${className}`} style={{ height }} />
    }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const width = 200
    const padding = 4
    const step = (width - padding * 2) / (data.length - 1)

    const points = data.map((value, index) => {
        const x = padding + index * step
        const y = height - padding - ((value - min) / range) * (height - padding * 2)
        return `${x},${y}`
    }).join(' ')

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className={`w-full ${className}`}
            style={{ height }}
            preserveAspectRatio="none"
        >
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
            {/* Optional: Fill area under the line */}
            <polygon
                points={`0,${height} ${points} ${width},${height}`}
                fill={color}
                opacity="0.1"
            />
        </svg>
    )
}
