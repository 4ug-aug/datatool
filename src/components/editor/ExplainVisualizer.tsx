import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  Cpu,
  Database,
  AlertTriangle,
  Rows3,
  HardDrive,
} from "lucide-react";
import type { ExplainResult } from "@/types";
import { cn } from "@/lib/utils";

interface ExplainVisualizerProps {
  result: ExplainResult;
}

interface PlanNode {
  "Node Type": string;
  "Relation Name"?: string;
  "Alias"?: string;
  "Startup Cost": number;
  "Total Cost": number;
  "Plan Rows": number;
  "Plan Width": number;
  "Actual Startup Time"?: number;
  "Actual Total Time"?: number;
  "Actual Rows"?: number;
  "Actual Loops"?: number;
  "Shared Hit Blocks"?: number;
  "Shared Read Blocks"?: number;
  "Filter"?: string;
  "Index Cond"?: string;
  "Index Name"?: string;
  "Join Type"?: string;
  "Sort Key"?: string[];
  "Sort Method"?: string;
  "Plans"?: PlanNode[];
  [key: string]: unknown;
}

function formatTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "N/A";
  if (ms < 1) return `${(ms * 1000).toFixed(2)} µs`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "N/A";
  return num.toLocaleString();
}

function getNodeColor(nodeType: string): string {
  const slowNodes = ["Seq Scan", "Sort", "Hash Join", "Nested Loop"];
  const fastNodes = ["Index Scan", "Index Only Scan", "Bitmap Index Scan"];

  if (slowNodes.some((n) => nodeType.includes(n))) {
    return "bg-amber-500/20 border-amber-500/50 text-amber-200";
  }
  if (fastNodes.some((n) => nodeType.includes(n))) {
    return "bg-green-500/20 border-green-500/50 text-green-200";
  }
  return "bg-blue-500/20 border-blue-500/50 text-blue-200";
}

function PlanNodeCard({
  node,
  depth = 0,
  maxCost,
}: {
  node: PlanNode;
  depth?: number;
  maxCost: number;
}) {
  const costPercentage = maxCost > 0 ? (node["Total Cost"] / maxCost) * 100 : 0;
  const isExpensive = costPercentage > 50;

  return (
    <div className={cn("relative", depth > 0 && "ml-6 mt-2")}>
      {depth > 0 && (
        <div className="absolute -left-4 top-0 h-full w-4 border-l border-b border-border rounded-bl-lg" />
      )}

      <div
        className={cn(
          "rounded-lg border p-3",
          getNodeColor(node["Node Type"])
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">
              {node["Node Type"]}
            </span>
            {node["Relation Name"] && (
              <Badge variant="outline" className="text-xs">
                {node["Relation Name"]}
                {node["Alias"] && node["Alias"] !== node["Relation Name"]
                  ? ` (${node["Alias"]})`
                  : ""}
              </Badge>
            )}
            {node["Index Name"] && (
              <Badge variant="secondary" className="text-xs">
                {node["Index Name"]}
              </Badge>
            )}
          </div>
          {isExpensive && (
            <AlertTriangle className="size-4 text-amber-400" />
          )}
        </div>

        {/* Cost bar */}
        <div className="mt-2">
          <div className="h-1.5 w-full rounded-full bg-background/50">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isExpensive ? "bg-amber-400" : "bg-primary"
              )}
              style={{ width: `${Math.min(costPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3" />
            <span>Time:</span>
            <span className="font-mono text-foreground">
              {formatTime(node["Actual Total Time"])}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Rows3 className="size-3" />
            <span>Rows:</span>
            <span className="font-mono text-foreground">
              {formatNumber(node["Actual Rows"])}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Cpu className="size-3" />
            <span>Cost:</span>
            <span className="font-mono text-foreground">
              {node["Total Cost"].toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <HardDrive className="size-3" />
            <span>Blocks:</span>
            <span className="font-mono text-foreground">
              {formatNumber(
                (node["Shared Hit Blocks"] || 0) +
                  (node["Shared Read Blocks"] || 0)
              )}
            </span>
          </div>
        </div>

        {/* Filters and conditions */}
        {(node["Filter"] || node["Index Cond"]) && (
          <div className="mt-2 rounded bg-background/30 p-2 font-mono text-xs">
            {node["Filter"] && (
              <div className="text-muted-foreground">
                <span className="text-foreground">Filter:</span> {node["Filter"]}
              </div>
            )}
            {node["Index Cond"] && (
              <div className="text-muted-foreground">
                <span className="text-foreground">Index Cond:</span>{" "}
                {node["Index Cond"]}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Child nodes */}
      {node.Plans?.map((child, i) => (
        <PlanNodeCard key={i} node={child} depth={depth + 1} maxCost={maxCost} />
      ))}
    </div>
  );
}

export function ExplainVisualizer({ result }: ExplainVisualizerProps) {
  const planData = useMemo(() => {
    if (!result.plan || !Array.isArray(result.plan)) return null;
    const rootPlan = result.plan[0] as { Plan?: PlanNode };
    return rootPlan?.Plan || null;
  }, [result.plan]);

  const maxCost = useMemo(() => {
    if (!planData) return 0;
    return planData["Total Cost"] || 0;
  }, [planData]);

  if (!planData) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <Database className="mx-auto size-12 text-muted-foreground/50" />
          <p className="mt-2 text-muted-foreground">
            No execution plan available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Summary header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Query Execution Plan</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Planning:</span>
            <span className="font-mono font-medium">
              {formatTime(result.planning_time)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Cpu className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Execution:</span>
            <span className="font-mono font-medium">
              {formatTime(result.execution_time)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Database className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total Cost:</span>
            <span className="font-mono font-medium">
              {result.total_cost?.toFixed(2) || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Plan visualization */}
      <ScrollArea className="flex-1 p-4">
        <PlanNodeCard node={planData} maxCost={maxCost} />
      </ScrollArea>
    </div>
  );
}

