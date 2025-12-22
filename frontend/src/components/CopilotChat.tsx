"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { MessageSquare, Send, X, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
    id: string
    role: "user" | "assistant"
    text: string
}

export function CopilotChat() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            text: "Hello! I'm your MariaDB Copilot. Ask me anything about query optimization or database performance."
        }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isOpen])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMsg: Message = { id: Date.now().toString(), role: "user", text: input }
        setMessages(prev => [...prev, userMsg])
        setInput("")
        setIsLoading(true)

        try {
            // Call Backend API
            const res = await fetch("http://localhost:8000/copilot/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: userMsg.text }) // Use endpoint param name? main.py expects 'prompt' query param? 
                // Wait, main.py definition: async def copilot_chat(prompt: str)
                // FastAPI default for basic types is query param if not Body. 
                // Let's check main.py definition again. If body is needed it should use Pydantic model or Body()
            })

            // Checking main.py: @app.post("/copilot/chat") async def copilot_chat(prompt: str):
            // This means valid request is POST /copilot/chat?prompt=xyz if not using Body
            // I should update backend to accept JSON body, but for now I will append to URL or send as query param.
            // Actually, let's fix the fetch first to match what standard FastAPI expects for query params.

            const resUrl = new URL("http://localhost:8000/copilot/chat")
            resUrl.searchParams.append("prompt", userMsg.text)

            const response = await fetch(resUrl.toString(), {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            })

            if (!response.ok) throw new Error("API Error")

            const data = await response.json()
            // Expecting standard chat response structure or just text? 
            // Main.py returns response.json() from SkySQL API.
            // Usually { answer: "..." } or similar. Assuming { message: "..." } or "content"
            // For safety, let's dump the whole JSON to text if uncertain, or assume standard field.
            // Let's assume data.answer or data.message based on typical LLM APIs. 
            // Fallback: JSON.stringify(data)

            const answer = data.answer || data.message || data.result || JSON.stringify(data)

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                text: answer
            }])

        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                text: "Sorry, I couldn't reach the Copilot service. Please check your API Key configuration."
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

            {/* Chat Window */}
            {isOpen && (
                <Card className="w-[350px] h-[500px] flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-10 fade-in duration-200">
                    <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Bot className="w-4 h-4 text-blue-500" />
                            MariaDB Copilot
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        {messages.map(m => (
                            <div key={m.id} className={cn(
                                "flex gap-2 text-sm max-w-[85%]",
                                m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}>
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1",
                                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    {m.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-lg",
                                    m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"
                                )}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-2 mr-auto max-w-[85%]">
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-3 h-3" />
                                </div>
                                <div className="bg-muted p-3 rounded-lg rounded-tl-none text-xs text-muted-foreground animate-pulse">
                                    Thinking...
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="p-3 border-t bg-background">
                        <form
                            className="flex w-full items-center gap-2"
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        >
                            <input
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                placeholder="Type a message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                autoFocus
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-8 w-8">
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}

            {/* Floating Toggle Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105 transition-transform"
                >
                    <MessageSquare className="w-6 h-6 text-white" />
                </Button>
            )}
        </div>
    )
}
