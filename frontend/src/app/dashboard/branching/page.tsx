"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Zap, Trash2, RefreshCw, Plus, GitBranch, AlertTriangle, CheckCircle2, X, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const API_BASE = "http://localhost:8000"

interface Branch {
    branch_database: string
    source_database: string
    table_count: number
    size_mb: number
}

interface SchemaDiff {
    tables_only_in_source: string[]
    tables_only_in_branch: string[]
    modified_tables: Array<{
        table: string
        source_ddl: string
        branch_ddl: string
    }>
}

export default function BranchingDashboard() {
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [newBranchName, setNewBranchName] = useState("")
    const [sourceDatabase, setSourceDatabase] = useState("shop_demo")
    const [diffLoading, setDiffLoading] = useState<string | null>(null)
    const [selectedDiff, setSelectedDiff] = useState<{ branch: string, diff: SchemaDiff } | null>(null)

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

    const compareBranch = async (branch: Branch) => {
        setDiffLoading(branch.branch_database)
        try {
            const res = await fetch(`${API_BASE}/branching/compare`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_database: branch.source_database,
                    branch_database: branch.branch_database
                })
            })
            if (res.ok) {
                const data = await res.json()
                setSelectedDiff({ branch: branch.branch_database, diff: data.diff })
            }
        } catch (err) {
            console.error("Failed to compare branch:", err)
        } finally {
            setDiffLoading(null)
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
        <div className="container mx-auto p-8 space-y-8 max-w-6xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                            <GitBranch className="w-8 h-8 text-cyan-500" />
                        </div>
                        Database Branching
                    </h1>
                    <p className="text-muted-foreground mt-3 text-lg max-w-2xl">
                        Instant, copy-on-write database clones. Test schema migrations, index optimizations, and disruptive DDLs without impacting production.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={fetchBranches} className="gap-2 h-11 px-6 border-cyan-500/20 hover:bg-cyan-500/5 transition-all">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Status
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create New Branch */}
                <Card className="lg:col-span-1 border-cyan-500/20 bg-card/40 backdrop-blur-sm h-fit sticky top-8">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Plus className="w-5 h-5 text-cyan-500" />
                            Provision New Branch
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Source Environment</label>
                            <Input
                                value={sourceDatabase}
                                readOnly
                                className="bg-muted/50 font-mono text-xs cursor-default"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Branch Identifier</label>
                            <Input
                                placeholder="e.g. migrate_to_orders_v2"
                                value={newBranchName}
                                onChange={(e) => setNewBranchName(e.target.value)}
                                className="h-11 border-cyan-500/20 focus-visible:ring-cyan-500/30"
                            />
                        </div>
                        <Button
                            onClick={createBranch}
                            disabled={!newBranchName.trim() || creating}
                            className="w-full h-11 gap-2 bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                        >
                            {creating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Provisioning...
                                </>
                            ) : (
                                <>
                                    <GitBranch className="w-4 h-4" />
                                    Create Clone Branch
                                </>
                            )}
                        </Button>
                        <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-4">
                            <p className="text-[11px] text-yellow-500/80 leading-relaxed">
                                <strong>Safety Mode:</strong> Branching uses MariaDB's underlying snapshot mechanisms to ensure zero-impact cloning of large datasets.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Branches List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            Active Branches
                            <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500 border-none">
                                {branches.length}
                            </Badge>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => (
                                <div key={i} className="h-40 rounded-xl bg-muted/20 animate-pulse border border-border/50" />
                            ))}
                        </div>
                    ) : branches.length === 0 ? (
                        <Card className="border-dashed border-2 border-muted/50 bg-transparent">
                            <CardContent className="p-20 text-center">
                                <div className="w-20 h-20 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-6">
                                    <GitBranch className="w-10 h-10 text-muted-foreground/30" />
                                </div>
                                <h3 className="text-xl font-medium text-muted-foreground">No branches found</h3>
                                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                                    Create your first isolated environment to test changes safely.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6">
                            {branches.map((branch, i) => (
                                <Card key={branch.branch_database || i} className="group overflow-hidden border-cyan-500/20 hover:border-cyan-500/40 bg-card/60 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-cyan-500/5">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 opacity-20" />
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-500/70">Database Instance</span>
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] uppercase font-bold">InSync</Badge>
                                                </div>
                                                <CardTitle className="text-2xl font-mono tracking-tight text-foreground/90">
                                                    {branch.branch_database}
                                                </CardTitle>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => compareBranch(branch)}
                                                    disabled={diffLoading === branch.branch_database}
                                                    className="h-9 px-4 border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-500"
                                                >
                                                    {diffLoading === branch.branch_database ? (
                                                        <RefreshCw className="w-3 h-3 animate-spin mr-2" />
                                                    ) : null}
                                                    Schema Diff
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteBranch(branch.branch_database)}
                                                    className="h-9 w-9 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-8 py-4 px-1">
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Metadata</p>
                                                <p className="text-lg font-semibold">{branch.table_count ?? 0} Tables</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Storage Size</p>
                                                <p className="text-lg font-semibold">{(branch.size_mb ?? 0).toFixed(1)} MB</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Uptime</p>
                                                <p className="text-lg font-semibold">Live</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                                    <span className="text-xs text-muted-foreground font-medium">Source: <span className="text-foreground">{branch.source_database}</span></span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">cloned via COW</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Schema Diff Modal */}
            <AnimatePresence>
                {selectedDiff && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-4xl max-h-[90vh] bg-card border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                        <GitBranch className="w-6 h-6 text-cyan-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold tracking-tight">Schema Difference</h2>
                                        <p className="text-xs text-muted-foreground uppercase tracking-widest">Comparing {selectedDiff.branch} vs shop_demo</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedDiff(null)}
                                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Summary Badge */}
                                <div className="flex gap-4">
                                    <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/5 text-cyan-500 px-3 py-1">
                                        {selectedDiff.diff.modified_tables.length} Modified Tables
                                    </Badge>
                                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/5 text-amber-500 px-3 py-1">
                                        {selectedDiff.diff.tables_only_in_source.length} Removed Tables
                                    </Badge>
                                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-emerald-500 px-3 py-1">
                                        {selectedDiff.diff.tables_only_in_branch.length} New Tables
                                    </Badge>
                                </div>

                                {/* Table Diffs */}
                                <div className="space-y-4">
                                    {selectedDiff.diff.modified_tables.length === 0 &&
                                        selectedDiff.diff.tables_only_in_source.length === 0 &&
                                        selectedDiff.diff.tables_only_in_branch.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                                            <CheckCircle2 className="w-12 h-12 text-emerald-500/30" />
                                            <p className="text-lg">No schema differences detected.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {selectedDiff.diff.modified_tables.map((tableDiff, idx) => (
                                                <div key={idx} className="rounded-xl border border-border bg-muted/10 overflow-hidden">
                                                    <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                                            <span className="font-mono text-sm font-bold">{tableDiff.table}</span>
                                                        </div>
                                                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">Modified</Badge>
                                                    </div>
                                                    <div className="grid grid-cols-2 divide-x divide-border">
                                                        <div className="p-4 space-y-2">
                                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Source (shop_demo)</p>
                                                            <pre className="text-[10px] font-mono p-3 rounded bg-black/30 text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                                {tableDiff.source_ddl}
                                                            </pre>
                                                        </div>
                                                        <div className="p-4 space-y-2">
                                                            <p className="text-[10px] uppercase font-bold text-cyan-500 tracking-widest">Branch ({selectedDiff.branch})</p>
                                                            <pre className="text-[10px] font-mono p-3 rounded bg-cyan-950/20 text-cyan-100 max-h-40 overflow-y-auto whitespace-pre-wrap border border-cyan-500/20">
                                                                {tableDiff.branch_ddl}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {selectedDiff.diff.tables_only_in_branch.map((table, idx) => (
                                                <div key={idx} className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                                            <Plus className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-mono text-sm font-bold text-foreground">{table}</p>
                                                            <p className="text-[10px] text-emerald-500/70 uppercase font-bold tracking-widest">New Table in Branch</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {selectedDiff.diff.tables_only_in_source.map((table, idx) => (
                                                <div key={idx} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                                            <Trash2 className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-mono text-sm font-bold text-foreground">{table}</p>
                                                            <p className="text-[10px] text-red-500/70 uppercase font-bold tracking-widest">Dropped Table in Branch</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedDiff(null)}
                                    className="border-cyan-500/20 hover:bg-muted"
                                >
                                    Close Analysis
                                </Button>
                                <Button
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
                                    onClick={() => setSelectedDiff(null)}
                                >
                                    Schedule Merge
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
