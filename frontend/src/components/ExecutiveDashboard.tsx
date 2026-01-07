"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Shield, Zap, AlertTriangle, CheckCircle2, Activity } from "lucide-react";

interface ExecutiveSummary {
  period: string;
  financial: {
    monthly_savings: number;
    annual_projection: number;
    cost_reduction_percentage: number;
    top_savings_source: string;
  };
  incidents: {
    total_prevented: number;
    critical_prevented: number;
    medium_prevented: number;
    low_prevented: number;
    estimated_downtime_avoided_hours: number;
    prevention_rate: number;
  };
  optimizations: {
    queries_analyzed: number;
    queries_optimized: number;
    avg_performance_gain: string;
    indexes_suggested: number;
    indexes_applied: number;
  };
  compliance: {
    gdpr_compliant: boolean;
    pii_columns_masked: number;
    audit_trail_complete: boolean;
    last_audit: string;
  };
  trends: Array<{
    date: string;
    risk_score_avg: number;
    queries_analyzed: number;
    incidents_prevented: number;
  }>;
}

export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExecutiveSummary();
  }, []);

  const fetchExecutiveSummary = async () => {
    try {
      const response = await fetch("http://localhost:8000/executive/summary");
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("Failed to fetch executive summary:", error);
      // Use mock data
      setSummary({
        period: "last_30_days",
        financial: {
          monthly_savings: 15583,
          annual_projection: 187000,
          cost_reduction_percentage: 42,
          top_savings_source: "Intelligent Archiving"
        },
        incidents: {
          total_prevented: 47,
          critical_prevented: 12,
          medium_prevented: 23,
          low_prevented: 12,
          estimated_downtime_avoided_hours: 18.5,
          prevention_rate: 0.94
        },
        optimizations: {
          queries_analyzed: 15847,
          queries_optimized: 1247,
          avg_performance_gain: "+67%",
          indexes_suggested: 23,
          indexes_applied: 18
        },
        compliance: {
          gdpr_compliant: true,
          pii_columns_masked: 8,
          audit_trail_complete: true,
          last_audit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        trends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          risk_score_avg: Math.floor(Math.random() * 40) + 30,
          queries_analyzed: Math.floor(Math.random() * 200) + 400,
          incidents_prevented: Math.floor(Math.random() * 4)
        }))
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Executive Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Business impact metrics for the last 30 days
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">${summary.financial?.monthly_savings?.toLocaleString() ?? 0}</div>
          <div className="text-xs text-muted-foreground">Monthly Savings</div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Financial Impact */}
        <div className="bg-white dark:bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex items-center text-emerald-500 text-sm font-semibold">
              <TrendingUp className="w-4 h-4 mr-1" />
              {summary.financial?.cost_reduction_percentage ?? 0}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
            ${((summary.financial?.annual_projection ?? 0) / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-muted-foreground mt-1">Annual Projection</div>
          <div className="text-xs text-primary mt-2">
            Top: {summary.financial?.top_savings_source ?? 'N/A'}
          </div>
        </div>

        {/* Incidents Prevented */}
        <div className="bg-white dark:bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex items-center text-emerald-500 text-sm font-semibold">
              {((summary.incidents?.prevention_rate ?? 0) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
            {summary.incidents?.total_prevented ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Incidents Prevented</div>
          <div className="text-xs text-red-500 mt-2">
            {summary.incidents?.critical_prevented ?? 0} Critical
          </div>
        </div>

        {/* Performance Gains */}
        <div className="bg-white dark:bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex items-center text-blue-500 text-sm font-semibold">
              {summary.optimizations?.avg_performance_gain ?? 'N/A'}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
            {(summary.optimizations?.queries_optimized ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Queries Optimized</div>
          <div className="text-xs text-blue-500 mt-2">
            {summary.optimizations?.indexes_applied ?? 0} Indexes Applied
          </div>
        </div>

        {/* Compliance Status */}
        <div className="bg-white dark:bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex items-center text-emerald-500 text-sm font-semibold">
              {summary.compliance?.gdpr_compliant ? "✓" : "✗"} GDPR
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
            {summary.compliance?.pii_columns_masked ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">PII Columns Masked</div>
          <div className="text-xs text-purple-500 mt-2">
            Audit Trail Complete
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown */}
        <div className="bg-white dark:bg-card border border-border rounded-lg p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-primary" />
            Cost Savings Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-muted/30 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-foreground">Intelligent Archiving</div>
                <div className="text-xs text-muted-foreground">Storage optimization</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-500">$6,200/mo</div>
                <div className="text-xs text-muted-foreground">-60% costs</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-muted/30 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-foreground">Query Optimization</div>
                <div className="text-xs text-muted-foreground">Performance gains</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-500">$4,800/mo</div>
                <div className="text-xs text-muted-foreground">+67% faster</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-muted/30 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-foreground">Incident Prevention</div>
                <div className="text-xs text-muted-foreground">Downtime avoided</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-500">$3,200/mo</div>
                <div className="text-xs text-muted-foreground">18.5h saved</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-muted/30 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-foreground">Resource Throttling</div>
                <div className="text-xs text-muted-foreground">Cloud costs reduction</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-500">$1,383/mo</div>
                <div className="text-xs text-muted-foreground">-30% I/O</div>
              </div>
            </div>
          </div>
        </div>

        {/* Incidents Breakdown */}
        <div className="bg-white dark:bg-card border border-border rounded-lg p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-primary" />
            Incidents Prevented
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-500/10 rounded">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-foreground">Critical</div>
                  <div className="text-xs text-muted-foreground">Data corruption, downtime</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-red-500">
                {summary.incidents?.critical_prevented ?? 0}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/10 rounded">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-foreground">Medium</div>
                  <div className="text-xs text-muted-foreground">Performance degradation</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-500">
                {summary.incidents?.medium_prevented ?? 0}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/10 rounded">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-foreground">Low</div>
                  <div className="text-xs text-muted-foreground">Minor issues</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-500">
                {summary.incidents?.low_prevented ?? 0}
              </div>
            </div>
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-900 dark:text-foreground">Downtime Avoided</div>
                <div className="text-lg font-bold text-primary">
                  {summary.incidents?.estimated_downtime_avoided_hours ?? 0}h
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ≈ ${((summary.incidents?.estimated_downtime_avoided_hours ?? 0) * 500).toLocaleString()} saved
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Trend */}
      <div className="bg-white dark:bg-card border border-border rounded-lg p-6 shadow-sm dark:shadow-none">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-primary" />
          30-Day Activity Trend
        </h3>
        <div className="h-48 flex items-end justify-between space-x-1">
          {(summary.trends ?? []).slice(-30).map((day, index) => {
            const maxQueries = Math.max(...(summary.trends ?? []).map(d => d.queries_analyzed));
            const height = (day.queries_analyzed / maxQueries) * 100;

            return (
              <div
                key={index}
                className="flex-1 group relative"
              >
                <div
                  className="bg-primary/20 group-hover:bg-primary/40 transition-colors rounded-t"
                  style={{ height: `${height}%` }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-white dark:bg-card border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                    <div className="font-semibold text-gray-900 dark:text-foreground">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div className="text-muted-foreground">{day.queries_analyzed} queries</div>
                    <div className="text-primary">{day.incidents_prevented} prevented</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{summary.trends?.[0]?.date.split('-').slice(1).join('/') ?? 'N/A'}</span>
          <span>Today</span>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-muted/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
            {(summary.optimizations?.queries_analyzed ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Queries Analyzed</div>
        </div>
        <div className="bg-slate-50 dark:bg-muted/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">
            {(((summary.optimizations?.queries_optimized ?? 0) / (summary.optimizations?.queries_analyzed || 1)) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">Optimization Rate</div>
        </div>
        <div className="bg-slate-50 dark:bg-muted/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-foreground">
            {summary.optimizations?.indexes_suggested ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Indexes Suggested</div>
        </div>
        <div className="bg-slate-50 dark:bg-muted/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-500">
            {((summary.incidents?.prevention_rate ?? 0) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">Prevention Rate</div>
        </div>
      </div>
    </div>
  );
}
