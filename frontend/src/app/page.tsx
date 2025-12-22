"use client"

import { useEffect, useState } from "react"
import { QueryAnalysis, SlowQuery, Suggestion } from "@/types"
import { SlowQueryTable } from "@/components/SlowQueryTable"
import { AnalysisModal } from "@/components/AnalysisModal"
import { CopilotChat } from "@/components/CopilotChat"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Database, Server } from "lucide-react"

export default function Dashboard() {
  const [analysis, setAnalysis] = useState<QueryAnalysis | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [selectedQuery, setSelectedQuery] = useState<SlowQuery | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)

  // Fetch initial analysis
  useEffect(() => {
    fetch("http://localhost:8000/analyze?limit=10")
      .then(res => res.json())
      .then(data => setAnalysis(data))
      .catch(err => console.error("Failed to fetch analysis", err))
  }, [])

  const handleAnalyze = async (id: number) => {
    const query = analysis?.top_queries.find(q => q.id === id) || null
    setSelectedQuery(query)
    setIsModalOpen(true)
    setIsLoadingSuggestion(true)
    setSelectedSuggestion(null)

    try {
      const res = await fetch(`http://localhost:8000/suggest/${id}`)
      const data = await res.json()
      setSelectedSuggestion(data)
    } catch (error) {
      console.error("Failed to get suggestion", error)
    } finally {
      setIsLoadingSuggestion(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-primary to-indigo-400 bg-clip-text text-transparent">
            FinOps Auditor
          </h1>
          <p className="text-muted-foreground/80 font-medium">
            AI-powered Slow Query Analysis & Optimization for MariaDB
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Global Health Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis?.global_score ?? 0}/100</div>
              <p className="text-xs text-muted-foreground">
                Based on impact analysis
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Slow Queries</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis?.total_queries ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                Detected in last 24h
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Knowledge Base</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis?.kb_count ?? 0} Docs</div>
              <p className="text-xs text-muted-foreground">
                Jira & Documentation Vectors
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
          <CardHeader className="px-6">
            <CardTitle className="text-xl font-semibold">Top Impacting Queries</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {analysis ? (
              <SlowQueryTable
                queries={analysis.top_queries}
                onAnalyze={handleAnalyze}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="animate-pulse">Loading Analysis...</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <AnalysisModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          suggestion={selectedSuggestion}
          query={selectedQuery}
          isLoading={isLoadingSuggestion}
        />

        <CopilotChat />
      </div>
    </main>
  )
}
