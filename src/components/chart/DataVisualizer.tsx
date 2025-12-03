import { useMemo, useEffect } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, AreaChart as AreaChartIcon, AlertCircle, X } from "lucide-react";
import { useQueryStore, type ChartType } from "@/stores/queryStore";
import type { ColumnMeta } from "@/types";
import {
  detectNumericColumns,
  detectXAxisColumns,
  transformDataForChart,
  autoDetectChartConfig,
  getChartColors,
  isDatetimeType,
} from "@/lib/chartUtils";

interface DataVisualizerProps {
  columns: ColumnMeta[];
  rows: unknown[][];
}

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: typeof BarChart3 }[] = [
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: LineChartIcon },
  { value: "area", label: "Area", icon: AreaChartIcon },
  { value: "pie", label: "Pie", icon: PieChartIcon },
];

export function DataVisualizer({ columns, rows }: DataVisualizerProps) {
  const chartConfig = useQueryStore((s) => s.chartConfig);
  const setChartConfig = useQueryStore((s) => s.setChartConfig);

  // Detect available columns
  const numericColumns = useMemo(() => detectNumericColumns(columns), [columns]);
  const xAxisColumns = useMemo(() => detectXAxisColumns(columns), [columns]);

  // Auto-detect configuration when columns change
  useEffect(() => {
    if (!chartConfig.xAxisColumn || !chartConfig.yAxisColumns.length) {
      const autoConfig = autoDetectChartConfig(columns);
      if (autoConfig.xAxisColumn || autoConfig.yAxisColumns?.length) {
        setChartConfig(autoConfig);
      }
    }
  }, [columns, chartConfig.xAxisColumn, chartConfig.yAxisColumns.length, setChartConfig]);

  // Transform data for recharts
  const chartData = useMemo(
    () => transformDataForChart(columns, rows, chartConfig),
    [columns, rows, chartConfig]
  );

  // Generate chart config for shadcn
  const rechartsConfig = useMemo(() => {
    const colors = getChartColors(chartConfig.yAxisColumns.length);
    const config: ChartConfig = {};

    chartConfig.yAxisColumns.forEach((col, i) => {
      config[col] = {
        label: col,
        color: colors[i],
      };
    });

    return config;
  }, [chartConfig.yAxisColumns]);

  // Check if we can visualize
  const canVisualize = numericColumns.length > 0 && xAxisColumns.length > 0;
  const hasValidConfig =
    chartConfig.xAxisColumn && chartConfig.yAxisColumns.length > 0;

  // Toggle Y-axis column selection
  const toggleYAxisColumn = (columnName: string) => {
    const current = chartConfig.yAxisColumns;
    if (current.includes(columnName)) {
      setChartConfig({
        yAxisColumns: current.filter((c) => c !== columnName),
      });
    } else {
      setChartConfig({
        yAxisColumns: [...current, columnName],
      });
    }
  };

  // No chartable data
  if (!canVisualize) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="size-16 text-muted-foreground/30" />
        <div className="max-w-md text-center">
          <h3 className="text-lg font-medium text-foreground">
            Cannot Visualize Data
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Chart visualization requires at least one numeric column for values
            and one text/datetime column for labels.
          </p>
          <div className="mt-4 space-y-2 text-left text-xs text-muted-foreground">
            <p>
              <strong>Numeric columns found:</strong>{" "}
              {numericColumns.length > 0
                ? numericColumns.map((c) => c.name).join(", ")
                : "None"}
            </p>
            <p>
              <strong>Label columns found:</strong>{" "}
              {xAxisColumns.length > 0
                ? xAxisColumns.map((c) => c.name).join(", ")
                : "None"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Config Panel */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border bg-muted/30 px-4 py-3">
        {/* Chart Type */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <Select
            value={chartConfig.chartType}
            onValueChange={(value: ChartType) =>
              setChartConfig({ chartType: value })
            }
          >
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHART_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="size-3.5" />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* X-Axis */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">X-Axis</span>
          <Select
            value={chartConfig.xAxisColumn || ""}
            onValueChange={(value) => setChartConfig({ xAxisColumn: value })}
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {xAxisColumns.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  <div className="flex items-center gap-2">
                    <span>{col.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {isDatetimeType(col.data_type) ? "datetime" : "text"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Y-Axis (multi-select via badges) */}
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Y-Axis</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {numericColumns.map((col) => {
              const isSelected = chartConfig.yAxisColumns.includes(col.name);
              return (
                <Badge
                  key={col.name}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer select-none gap-1 text-xs"
                  onClick={() => toggleYAxisColumn(col.name)}
                >
                  {col.name}
                  {isSelected && (
                    <X className="size-3 opacity-60 hover:opacity-100" />
                  )}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Data info */}
        <div className="text-xs text-muted-foreground">
          {rows.length.toLocaleString()} data points
        </div>
      </div>

      {/* Chart Area */}
      <ScrollArea className="flex-1 p-4">
        {!hasValidConfig ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Select an X-axis column and at least one Y-axis column to visualize
            </p>
          </div>
        ) : chartConfig.chartType === "pie" ? (
          <PieChartView data={chartData} config={rechartsConfig} yColumns={chartConfig.yAxisColumns} />
        ) : (
          <CartesianChartView
            data={chartData}
            config={rechartsConfig}
            chartType={chartConfig.chartType}
            yColumns={chartConfig.yAxisColumns}
          />
        )}
      </ScrollArea>
    </div>
  );
}

interface CartesianChartViewProps {
  data: ReturnType<typeof transformDataForChart>;
  config: ChartConfig;
  chartType: ChartType;
  yColumns: string[];
}

function CartesianChartView({ data, config, chartType, yColumns }: CartesianChartViewProps) {
  const colors = getChartColors(yColumns.length);

  const renderChart = () => {
    const commonProps = {
      accessibilityLayer: true,
      data,
      margin: { left: 12, right: 12 },
    };

    const xAxisProps = {
      dataKey: "xAxis",
      tickLine: false,
      axisLine: false,
      tickMargin: 8,
      tickFormatter: (value: string) =>
        value.length > 12 ? `${value.slice(0, 12)}...` : value,
    };

    const yAxisProps = {
      tickLine: false,
      axisLine: false,
      tickMargin: 8,
      tickFormatter: (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toString();
      },
    };

    switch (chartType) {
      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {yColumns.map((col, i) => (
              <Line
                key={col}
                dataKey={col}
                type="monotone"
                stroke={colors[i]}
                strokeWidth={2}
                dot={data.length <= 50}
              />
            ))}
          </LineChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {yColumns.map((col, i) => (
              <Area
                key={col}
                dataKey={col}
                type="monotone"
                fill={colors[i]}
                fillOpacity={0.3}
                stroke={colors[i]}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      case "bar":
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {yColumns.map((col, i) => (
              <Bar key={col} dataKey={col} fill={colors[i]} radius={4} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <ChartContainer config={config} className="min-h-[400px] w-full">
      {renderChart()}
    </ChartContainer>
  );
}

interface PieChartViewProps {
  data: ReturnType<typeof transformDataForChart>;
  config: ChartConfig;
  yColumns: string[];
}

function PieChartView({ data, config, yColumns }: PieChartViewProps) {
  // For pie chart, we use the first Y column and group by X axis
  const yColumn = yColumns[0];
  if (!yColumn) return null;

  // Transform data for pie chart format
  const pieData = data.map((d, i) => ({
    name: d.xAxis,
    value: d[yColumn] as number,
    fill: getChartColors(data.length)[i % 5],
  }));

  const pieConfig: ChartConfig = {};
  pieData.forEach((d, i) => {
    pieConfig[String(d.name)] = {
      label: String(d.name),
      color: getChartColors(data.length)[i % 5],
    };
  });

  return (
    <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[400px]">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={150}
        />
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}

