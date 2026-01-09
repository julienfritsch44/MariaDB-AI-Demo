"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Zap, GitBranch, Activity, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SplashProps {
    onConnect: () => void
}

export function Splash({ onConnect }: SplashProps) {
    const [step, setStep] = useState(0)
    const [countFeatures, setCountFeatures] = useState(0)

    // Animation sequence
    useEffect(() => {
        const timer1 = setTimeout(() => setStep(1), 800)
        const timer2 = setTimeout(() => setStep(2), 1800)
        const timer3 = setTimeout(() => setStep(3), 2800)

        return () => {
            clearTimeout(timer1)
            clearTimeout(timer2)
            clearTimeout(timer3)
        }
    }, [])

    // Counter animations
    useEffect(() => {
        if (step >= 2) {
            const interval = setInterval(() => {
                setCountFeatures(prev => {
                    if (prev >= 20) {
                        clearInterval(interval)
                        return 20
                    }
                    return prev + 1
                })
            }, 50)
            return () => clearInterval(interval)
        }
    }, [step])


    const competitors = [
        { name: "AWS RDS", features: 6, width: "30%" },
        { name: "Azure SQL", features: 7, width: "35%" },
        { name: "Google Cloud", features: 6, width: "30%" },
        { name: "MariaDB Local Pilot", features: 20, width: "100%" }
    ]

    const exclusiveFeatures = [
        { icon: GitBranch, name: "Instant Branching", desc: "Virtual clones in 2.1s" },
        { icon: Activity, name: "Risk Predictor", desc: "85/100 Predictive impact" },
        { icon: Brain, name: "Neural Core Rewrite", desc: "Jira-aware SQL optimization" }
    ]

    const [isBackendReady, setIsBackendReady] = useState(false)
    const [retryCount, setRetryCount] = useState(0)

    // Backend Health Check
    useEffect(() => {
        let isMounted = true
        const checkHealth = async () => {
            try {
                const res = await fetch('http://127.0.0.1:8000/health')
                if (res.ok) {
                    const data = await res.json()
                    if (data.status === 'healthy' && isMounted) {
                        setIsBackendReady(true)
                        return true
                    }
                }
            } catch (e) {
                console.log("Waiting for backend...", e)
            }
            return false
        }

        const pollBackend = async () => {
            const isReady = await checkHealth()
            if (!isReady && isMounted) {
                setRetryCount(c => c + 1)
                setTimeout(pollBackend, 1000)
            }
        }

        pollBackend()

        return () => { isMounted = false }
    }, [])

    return (
        <div className="h-screen w-full bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-primary/20">

            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
            </div>

            <div className="z-10 max-w-5xl w-full px-6 flex flex-col items-center text-center">

                {/* LOGO & TITLE */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-4"
                >
                    <div className="flex items-center justify-center gap-3">
                        <Zap className="w-8 h-8 text-primary animate-pulse" />
                        <h1 className="text-5xl md:text-6xl font-black tracking-tight">
                            <span className="text-foreground">MariaDB </span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-primary">Local Pilot</span>
                        </h1>
                        <Zap className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                </motion.div>

                {/* HERO STATEMENT */}
                <AnimatePresence>
                    {step >= 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="mb-6"
                        >
                            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                                The Only DBA Tool That Does It All
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                <span className="text-primary font-bold">{countFeatures}</span> features •
                                <span className="text-purple-400 font-bold"> 3</span> unique engines •
                                <span className="text-blue-400 font-bold"> 1</span> interface
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* COMPETITIVE COMPARISON */}
                <AnimatePresence>
                    {step >= 2 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="w-full max-w-2xl mb-6"
                        >
                            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5">
                                <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Feature Comparison</h3>
                                <div className="space-y-3">
                                    {competitors.map((comp, idx) => (
                                        <motion.div
                                            key={comp.name}
                                            initial={{ width: 0 }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xs font-medium ${comp.name === "MariaDB Local Pilot" ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                                    {comp.name}
                                                </span>
                                                <span className={`text-xs font-bold ${comp.name === "MariaDB Local Pilot" ? "text-primary" : "text-muted-foreground"}`}>
                                                    {comp.features}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: comp.width }}
                                                    transition={{ duration: 1, delay: 0.3 + idx * 0.1 }}
                                                    className={`h-full rounded-full ${comp.name === "MariaDB Local Pilot"
                                                        ? "bg-gradient-to-r from-primary to-purple-500"
                                                        : "bg-muted-foreground/30"
                                                        }`}
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* EXCLUSIVE FEATURES */}
                <AnimatePresence>
                    {step >= 3 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="w-full max-w-3xl mb-6"
                        >
                            <h3 className="text-lg font-bold mb-4 text-foreground">
                                3 Features That Don't Exist <span className="text-primary">Anywhere Else</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {exclusiveFeatures.map((feature, idx) => (
                                    <motion.div
                                        key={feature.name}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.4, delay: idx * 0.15 }}
                                        className="bg-card/50 backdrop-blur-sm rounded-lg border border-primary/20 p-4 hover:border-primary/50 transition-all"
                                    >
                                        <feature.icon className="w-6 h-6 text-primary mb-2" />
                                        <h4 className="text-xs font-bold text-foreground mb-1">{feature.name}</h4>
                                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* CTA */}
                <AnimatePresence>
                    {step >= 3 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="flex flex-col items-center gap-3"
                        >
                            {isBackendReady ? (
                                <Button
                                    size="lg"
                                    onClick={onConnect}
                                    className="bg-primary text-white hover:bg-primary/90 hover:scale-105 transition-all duration-300 text-lg px-10 py-6 rounded-xl font-bold shadow-2xl shadow-primary/20"
                                >
                                    Connect to MariaDB
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="flex items-center gap-2 px-6 py-4 bg-muted/50 rounded-xl border border-primary/20 text-muted-foreground animate-pulse">
                                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="font-mono text-sm">Booting Neural Core... ({retryCount}s)</span>
                                    </div>
                                </div>
                            )}

                            {!isBackendReady && retryCount > 15 && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-xs text-amber-500 animate-pulse mt-2"
                                >
                                    This is taking longer than usual... Please check console logs.
                                </motion.p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    )
}
