"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Zap, Trash2, RefreshCw, Plus, GitBranch } from "lucide-react"

const API_BASE = "http://localhost:8000"

interface Branch {
    branch_database: string
    source_database: string
    table_count: number
    size_mb: number
}

export default function BranchingDashboard() {
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [newBranchName, setNewBranchName] = useState("")
    const [sourceDatabase, setSourceDatabase] = useState("shop_demo")

    useEffect(() => {
        fetchBranches()
    }, [])

    const fetchBranches = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/branching/list?source_database=${sourceDatabase}`)
            if (res.ok) {
                const data = await res.json()
                setBranches(data.branches || [])
            }
        } catch (err) {
            console.error("Failed to fetch branches:", err)
        } finally {
            setLoading(false)
        }
    }

    const createBranch = async () => {
        if (!newBranchName.trim()) return
        
        setCreating(true)
        try {
            const res = await fetch(`${API_BASE}/branching/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_database: sourceDatabase,
                    branch_name: newBranchName,
                    description: `Test branch created from dashboard`,
                    copy_data: false
                })
            })
            if (res.ok) {
                setNewBranchName("")
                fetchBranches()
            }
        } catch (err) {
            console.error("Failed to create branch:", err)
        } finally {
            setCreating(false)
        }
    }

    const deleteBranch = async (branchDatabase: string) => {
        try {
            const res = await fetch(`${API_BASE}/branching/${branchDatabase}`, {
                method: "DELETE"
            })
            if (res.ok) {
                fetchBranches()
            }
        } catch (err) {
            console.error("Failed to delete branch:", err)
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Zap className="w-8 h-8 text-cyan-500" />
                        Database Branching
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Create instant database clones for safe DDL testing
                    </p>
                </div>
                <Button onClick={fetchBranches} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
            </div>

            {/* Create New Branch */}
            <Card className="border-cyan-500/30">
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create New Branch
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3">
                        <Input
                            placeholder="Branch name (e.g., test_migration)"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            className="flex-1"
                        />
                        <Button
                            onClick={createBranch}
                            disabled={!newBranchName.trim() || creating}
                            className="gap-2"
                        >
                            {creating ? "Creating..." : "Create Branch"}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Branch will be created from: <span className="font-mono">{sourceDatabase}</span>
                    </p>
                </CardContent>
            </Card>

            {/* Branches List */}
            {loading ? (
                <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                        Loading branches...
                    </CardContent>
                </Card>
            ) : branches.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No branches found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Create a branch above to get started
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {branches.map((branch) => (
                        <Card key={branch.branch_database} className="border-cyan-500/30">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-sm font-mono">
                                            {branch.branch_database}
                                        </CardTitle>
                                        <div className="flex items-center gap-4 mt-2">
                                            <Badge variant="outline" className="text-xs">
                                                {branch.table_count} tables
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {branch.size_mb.toFixed(1)} MB
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                Source: {branch.source_database}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteBranch(branch.branch_database)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
