"use client"

import { Brain, Send } from "lucide-react"
import { Message } from "@/types"

interface CopilotSidebarProps {
    chatMessages: Message[]
    chatInput: string
    setChatInput: (input: string) => void
    isChatLoading: boolean
    handleChatSend: () => void
}

export function CopilotSidebar({
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading,
    handleChatSend
}: CopilotSidebarProps) {
    return (
        <div className="w-[400px] border-l border-border flex flex-col bg-muted/30 shrink-0">
            <div className="h-12 border-b border-border bg-card/50 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Copilot</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === "user"
                                ? "bg-primary text-white text-sm"
                                : "bg-card text-foreground border border-border text-sm"
                                }`}
                        >
                            {msg.role === "assistant" && (
                                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-muted-foreground">
                                    <Brain className="w-3 h-3" />
                                    <span>AI Copilot</span>
                                </div>
                            )}
                            <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isChatLoading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="border-t border-border bg-card/50 p-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleChatSend()
                            }
                        }}
                        placeholder="Ask the AI Copilot..."
                        disabled={isChatLoading}
                        className="flex-1 px-3 py-2 bg-card border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                    <button
                        onClick={() => handleChatSend()}
                        disabled={isChatLoading || !chatInput.trim()}
                        className="px-3 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
