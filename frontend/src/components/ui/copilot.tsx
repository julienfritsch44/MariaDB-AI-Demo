import { useRef, useEffect } from "react"
import { Send, Bot, User, Sparkles, Trash2, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { SectionHeader } from "@/components/ui/section-header"
import { Message } from "@/types"

interface CopilotChatProps {
    messages: Message[]
    isLoading: boolean
    onClear?: () => void
    className?: string
}

export function CopilotChat({ messages, isLoading, onClear, className }: CopilotChatProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll
    useEffect(() => {
        // Only scroll if we are near bottom or it's a new message
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
        }
    }, [messages, isLoading])

    return (
        <div className={cn("space-y-4 mt-8 pt-8 border-t border-border", className)}>
            <div className="flex items-center justify-between">
                <SectionHeader icon={Bot} title="Ask Copilot" className="text-sm tracking-widest text-muted-foreground" />
                {onClear && messages.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                        className="h-6 text-xs text-muted-foreground hover:text-red-400 px-2 hover:bg-red-500/5"
                    >
                        <Trash2 className="w-3 h-3 mr-1" /> Clear
                    </Button>
                )}
            </div>

            <div className="space-y-4 min-h-[100px]">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 py-8 opacity-50">
                        <Sparkles className="w-6 h-6" />
                        <p className="text-xs">Ask anything about this query...</p>
                    </div>
                ) : (
                    messages.map(m => (
                        <div key={m.id} className={cn(
                            "flex gap-3 text-sm max-w-[95%]",
                            m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}>
                            <div className={cn(
                                "w-6 h-6 rounded-sm flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
                                m.role === "user" ? "bg-emerald-600 text-white" : "bg-muted/50 text-muted-foreground border border-border"
                            )}>
                                {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                            </div>
                            <div className={cn(
                                "p-2.5 rounded-lg shadow-sm leading-relaxed text-xs",
                                m.role === "user" ? "bg-emerald-600 text-white rounded-tr-none" : "bg-muted border border-border rounded-tl-none text-foreground"
                            )}>
                                <div className="markdown-content">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 ml-1" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 ml-1" {...props} />,
                                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                            code: ({ node, className, children, ...props }: { node?: any, className?: string, children?: React.ReactNode }) => {
                                                const match = /language-(\w+)/.exec(className || '')
                                                return !match ? (
                                                    <code className="bg-black/20 px-1 py-0.5 rounded font-mono" {...props}>
                                                        {children}
                                                    </code>
                                                ) : (
                                                    <div className="my-2 bg-black/30 rounded-md p-2 overflow-x-auto">
                                                        <code className="font-mono" {...props}>
                                                            {children}
                                                        </code>
                                                    </div>
                                                )
                                            },
                                        }}
                                    >
                                        {m.text}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex gap-3 mr-auto max-w-[90%]">
                        <div className="w-6 h-6 rounded-sm bg-muted/50 text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="bg-muted p-2.5 rounded-lg rounded-tl-none border border-border text-xs text-muted-foreground animate-pulse flex items-center gap-2">
                            <Sparkles className="w-3 h-3 animate-spin" />
                            Thinking...
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>
        </div>
    )
}

interface CopilotInputProps {
    value: string
    onChange: (value: string) => void
    onSend: () => void
    isLoading: boolean
    className?: string
    placeholder?: string
}

export function CopilotInput({ value, onChange, onSend, isLoading, className, placeholder = "Type your question..." }: CopilotInputProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSend()
    }

    return (
        <div className={cn("p-4 bg-card border-t border-border", className)}>
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-muted border-border focus-visible:ring-primary/50 text-foreground placeholder:text-muted-foreground pl-4 pr-10"
                    disabled={isLoading}
                />
                {/* Mic icon placeholder for future */}
                <Mic className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer hover:text-muted-foreground" />

                <Button
                    type="submit"
                    size="icon"
                    disabled={!value.trim() || isLoading}
                    className={cn(
                        "transition-all duration-300",
                        value.trim() ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20 shadow-lg" : "bg-muted/50 text-muted-foreground"
                    )}
                >
                    <Send className="w-4 h-4" />
                </Button>
            </form>
            <div className="text-[10px] text-center text-foreground mt-2">
                MariaDB Copilot can make mistakes. Verify important SQL commands.
            </div>
        </div>
    )
}
