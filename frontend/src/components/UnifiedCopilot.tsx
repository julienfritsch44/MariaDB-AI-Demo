"use client"

import { useState } from "react"
import { Brain, Database, Send, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Message } from "@/types"

interface UnifiedCopilotProps {
  chatMessages: Message[]
  chatInput: string
  setChatInput: (value: string) => void
  isChatLoading: boolean
  onChatSend: (text?: string) => void
  onChatClear: () => void
}

export function UnifiedCopilot({
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  onChatSend,
  onChatClear
}: UnifiedCopilotProps) {
  const [selectedAgent, setSelectedAgent] = useState("dba-copilot")
  const [selectedDatasource, setSelectedDatasource] = useState("demo-db")

  const agents = [
    { id: "dba-copilot", name: "DBA Copilot", icon: Brain },
    { id: "query-optimizer", name: "Query Optimizer", icon: Sparkles }
  ]

  const datasources = [
    { id: "demo-db", name: "Demo DB", status: "connected" },
    { id: "knowledge-base", name: "Knowledge Base (1,350 tickets)", status: "ready" }
  ]

  const quickActions = [
    "Analyze slowest query",
    "Check index usage",
    "Explain last error",
    "Suggest optimizations"
  ]

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* LEFT PANEL: Selectors */}
      <div className="w-64 border-r border-border bg-muted/30 p-4 space-y-6 flex-shrink-0">
        {/* Agent Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Agent
          </label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        {/* Datasource Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Datasource
          </label>
          <select
            value={selectedDatasource}
            onChange={(e) => setSelectedDatasource(e.target.value)}
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {datasources.map(ds => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>{datasources.find(d => d.id === selectedDatasource)?.status}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </label>
          <div className="space-y-1">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => onChatSend(action)}
                disabled={isChatLoading}
                className="w-full text-left px-3 py-2 text-xs bg-card hover:bg-muted border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Model Info */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Model</span>
            <span className="font-mono text-primary font-semibold">GPT-4.1 mini</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Chat Area */}
      <div className="flex-1 flex flex-col bg-card">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-muted text-foreground border border-border"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    <Brain className="w-3 h-3" />
                    <span>AI Copilot</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}

          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-muted border border-border rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-muted/30 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onChatSend()
                }
              }}
              placeholder="Ask a question or use one of the examples above"
              disabled={isChatLoading}
              className="flex-1 px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <Button
              onClick={() => onChatSend()}
              disabled={isChatLoading || !chatInput.trim()}
              className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
