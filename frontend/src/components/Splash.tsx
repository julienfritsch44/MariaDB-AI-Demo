"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Database, Server, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MariaDBLogo } from "@/components/MariaDBLogo"

interface SplashProps {
    onConnect: () => void
}

export function Splash({ onConnect }: SplashProps) {
    const [step, setStep] = useState(0)

    // Animation sequence
    useEffect(() => {
        const timer = setTimeout(() => {
            setStep(1) // Show Title
        }, 1000)

        const timer2 = setTimeout(() => {
            setStep(2) // Show Features
        }, 2500)

        return () => {
            clearTimeout(timer)
            clearTimeout(timer2)
        }
    }, [])

    const features = [
        {
            icon: Database,
            title: "Vector-Powered Memory",
            desc: "Remembers every incident. Never solves the same problem twice.",
            color: "text-emerald-400",
            delay: 0
        },
        {
            icon: Sparkles,
            title: "AI Co-Pilot",
            desc: "Diagnoses slow queries automatically using collective intelligence.",
            color: "text-purple-400",
            delay: 0.2
        },
        {
            icon: ShieldCheck,
            title: "Self-Healing Infrastructure",
            desc: "Proactive index creation and query rewriting.",
            color: "text-blue-400",
            delay: 0.4
        }
    ]

    return (
        <div className="h-screen w-full bg-[#02040a] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-emerald-500/30">

            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="z-10 max-w-4xl w-full px-6 flex flex-col items-center text-center">

                {/* LOGO */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="mb-8 relative"
                >
                    <div className="w-24 h-24 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-2xl p-4">
                        {/* Official Sea Lion Logo */}
                        <img src="/mariadb-logo.png" alt="MariaDB" className="w-full h-full object-contain" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-[#02040a]">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </motion.div>

                {/* MARIADB TITLE */}
                <AnimatePresence>
                    {step >= 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-4"
                        >
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                                MariaDB <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Local Pilot</span>
                            </h1>
                            <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-light">
                                The <span className="text-zinc-200 font-medium">DBA's Dream</span>. A local query manager with Infinite Memory.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* FEATURES GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
                    <AnimatePresence>
                        {step >= 2 && features.map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: f.delay }}
                                className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm text-left hover:bg-white/10 transition-colors"
                            >
                                <div className={`mb-4 ${f.color}`}>
                                    <f.icon className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* CONNECT BUTTON */}
                <AnimatePresence>
                    {step >= 2 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 1 }}
                            className="mt-16"
                        >
                            <Button
                                size="lg"
                                onClick={onConnect}
                                className="bg-zinc-100 text-zinc-950 hover:bg-white hover:scale-105 transition-all duration-300 text-lg px-8 py-6 rounded-full font-semibold shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                            >
                                Connect to Neural Core
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                            <p className="mt-4 text-xs text-zinc-600 font-mono">
                                v2.0 • Powered by MariaDB Vector • MCP Enabled
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    )
}
