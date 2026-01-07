"use client"

import React, { useEffect, useState } from "react"
import { Brain } from "lucide-react"

interface NeuralCoreProps {
    isAlert?: boolean;
}

export function NeuralCore({ isAlert = false }: NeuralCoreProps) {
    const [rotation, setRotation] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            // Rotate faster in alert mode
            const speed = isAlert ? 1.5 : 0.5;
            setRotation(prev => (prev + speed) % 360)
        }, 50)
        return () => clearInterval(interval)
    }, [isAlert])

    const coreColor = isAlert ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0, 169, 206, 0.8)';
    const glowColor = isAlert ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 169, 206, 0.4)';

    return (
        <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
            {/* Background radial gradient glow needs to use CSS var for color */}
            <div
                className="absolute inset-0 opacity-70 transition-colors duration-1000"
                style={{
                    background: `radial-gradient(circle at center, ${isAlert ? 'rgba(239, 68, 68, 0.15)' : 'var(--neural-glow)'} 0%, transparent 70%)`
                }}
            />

            {/* Animated SVG Neural Core */}
            <div className={`relative z-10 w-[500px] h-[500px] transition-all duration-1000 ${isAlert ? 'grayscale-0 brightness-150' : 'grayscale-[0.5] brightness-125'}`}>
                <svg viewBox="0 0 200 200" className="w-full h-full filter" style={{ filter: `drop-shadow(0 0 30px ${glowColor})` }}>
                    <defs>
                        <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={isAlert ? '#ef4444' : 'var(--color-primary)'} />
                            <stop offset="100%" stopColor={isAlert ? '#991b1b' : 'var(--color-accent)'} />
                        </linearGradient>
                    </defs>

                    {/* Central Sphere */}
                    <circle cx="100" cy="100" r="40" fill="url(#coreGradient)" className={`${isAlert ? 'animate-[pulse_1s_infinite]' : 'animate-pulse'} opacity-20`} />
                    <circle cx="100" cy="100" r="30" fill="url(#coreGradient)" className="opacity-40" />

                    {/* Orbiting particles */}
                    <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}>
                        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                            <g key={i} transform={`rotate(${angle})`}>
                                <circle cx="170" cy="100" r="2" fill={isAlert ? '#ef4444' : 'var(--color-primary)'} />
                                <path d="M 100 100 L 170 100" stroke={isAlert ? '#ef4444' : 'var(--color-primary)'} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                            </g>
                        ))}
                    </g>

                    {/* Another set of orbiting lines */}
                    <g style={{ transform: `rotate(${-rotation * 0.7}deg)`, transformOrigin: 'center' }}>
                        <circle cx="100" cy="100" r="80" stroke="var(--color-primary)" strokeWidth="0.5" fill="none" opacity="0.1" />
                        {[30, 90, 150, 210, 270, 330].map((angle, i) => (
                            <g key={i} transform={`rotate(${angle})`}>
                                <circle cx="180" cy="100" r="1.5" fill="var(--color-accent)" />
                            </g>
                        ))}
                    </g>
                </svg>

                {/* Brain Icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 flex items-center justify-center animate-pulse shadow-xl dark:shadow-none">
                        <Brain className="w-12 h-12 text-primary dark:text-white drop-shadow-[0_0_10px_rgba(0,169,206,0.5)] dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                    </div>
                </div>
            </div>

            {/* Real-time pulse ripples */}
            <div className="absolute w-80 h-80 border border-primary/20 rounded-full animate-ping opacity-10" />
            <div className="absolute w-[40rem] h-[40rem] border border-primary/10 rounded-full animate-ping opacity-5 [animation-delay:1s]" />
        </div>
    )
}
