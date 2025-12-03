import type { ColumnMeta } from "@/types";
import type { ChartConfig } from "@/stores/queryStore";

// PostgreSQL numeric types
const NUMERIC_TYPES = [
  "int2",
  "int4",
  "int8",
  "smallint",
  "integer",
  "bigint",
  "decimal",
  "numeric",
  "real",
  "double precision",
  "float4",
  "float8",
  "money",
];

// PostgreSQL datetime types
const DATETIME_TYPES = [
  "timestamp",
  "timestamptz",
  "timestamp with time zone",
  "timestamp without time zone",
  "date",
  "time",
  "timetz",
  "time with time zone",
  "time without time zone",
];

// PostgreSQL string/categorical types
const CATEGORICAL_TYPES = [
  "text",
  "varchar",
  "character varying",
  "char",
  "character",
  "name",
  "uuid",
];

/**
 * Check if a column type is numeric
 */
export function isNumericType(dataType: string): boolean {
  const normalized = dataType.toLowerCase();
  return NUMERIC_TYPES.some((t) => normalized.includes(t));
}

/**
 * Check if a column type is datetime
 */
export function isDatetimeType(dataType: string): boolean {
  const normalized = dataType.toLowerCase();
  return DATETIME_TYPES.some((t) => normalized.includes(t));
}

/**
 * Check if a column type is categorical/string
 */
export function isCategoricalType(dataType: string): boolean {
  const normalized = dataType.toLowerCase();
  return CATEGORICAL_TYPES.some((t) => normalized.includes(t));
}

/**
 * Detect numeric columns suitable for Y-axis values
 */
export function detectNumericColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter((col) => isNumericType(col.data_type));
}

/**
 * Detect datetime columns suitable for X-axis (timeseries)
 */
export function detectDatetimeColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter((col) => isDatetimeType(col.data_type));
}

/**
 * Detect categorical/string columns suitable for X-axis labels
 */
export function detectCategoryColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter(
    (col) => isCategoricalType(col.data_type) || isDatetimeType(col.data_type)
  );
}

/**
 * Get all columns suitable for X-axis (categorical + datetime)
 */
export function detectXAxisColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter(
    (col) => isCategoricalType(col.data_type) || isDatetimeType(col.data_type)
  );
}

/**
 * Format a datetime value for display on X-axis
 */
export function formatDatetimeValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  const date = new Date(String(value));
  if (isNaN(date.getTime())) return String(value);

  // Check if it's just a date (no time component meaningful)
  const hasTime =
    date.getHours() !== 0 ||
    date.getMinutes() !== 0 ||
    date.getSeconds() !== 0;

  if (hasTime) {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

/**
 * Parse a value to a number, returning null if not possible
 */
function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? null : parsed;
}

export interface ChartDataPoint {
  [key: string]: string | number | null;
}

/**
 * Transform query result data into recharts-compatible format
 */
export function transformDataForChart(
  columns: ColumnMeta[],
  rows: unknown[][],
  config: ChartConfig
): ChartDataPoint[] {
  if (!config.xAxisColumn || config.yAxisColumns.length === 0) {
    return [];
  }

  const xAxisIndex = columns.findIndex((c) => c.name === config.xAxisColumn);
  const yAxisIndices = config.yAxisColumns.map((name) =>
    columns.findIndex((c) => c.name === name)
  );

  if (xAxisIndex === -1 || yAxisIndices.some((i) => i === -1)) {
    return [];
  }

  const xAxisColumn = columns[xAxisIndex];
  const isDatetime = isDatetimeType(xAxisColumn.data_type);

  // Transform and optionally sort data
  let data: { row: unknown[]; sortKey: number | string }[] = rows.map((row) => {
    const xValue = row[xAxisIndex];
    let sortKey: number | string;

    if (isDatetime && xValue !== null) {
      const date = new Date(String(xValue));
      sortKey = isNaN(date.getTime()) ? String(xValue) : date.getTime();
    } else {
      sortKey = String(xValue ?? "");
    }

    return { row, sortKey };
  });

  // Sort chronologically if datetime
  if (isDatetime) {
    data.sort((a, b) => {
      if (typeof a.sortKey === "number" && typeof b.sortKey === "number") {
        return a.sortKey - b.sortKey;
      }
      return String(a.sortKey).localeCompare(String(b.sortKey));
    });
  }

  return data.map(({ row }) => {
    const xValue = row[xAxisIndex];
    const point: ChartDataPoint = {
      xAxis: isDatetime ? formatDatetimeValue(xValue) : String(xValue ?? ""),
      xAxisRaw: isDatetime ? new Date(String(xValue)).getTime() : null,
    };

    for (const yCol of config.yAxisColumns) {
      const yIndex = columns.findIndex((c) => c.name === yCol);
      if (yIndex !== -1) {
        point[yCol] = parseNumericValue(row[yIndex]);
      }
    }

    return point;
  });
}

/**
 * Generate chart colors for multiple Y-axis columns
 */
export function getChartColors(count: number): string[] {
  const colors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  // Cycle through colors if more columns than available colors
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

/**
 * Auto-detect the best chart configuration based on column types
 */
export function autoDetectChartConfig(
  columns: ColumnMeta[]
): Partial<ChartConfig> {
  const numericCols = detectNumericColumns(columns);
  const datetimeCols = detectDatetimeColumns(columns);
  const categoryCols = detectCategoryColumns(columns);

  const config: Partial<ChartConfig> = {};

  // Prefer datetime for X-axis (timeseries), otherwise use first categorical
  if (datetimeCols.length > 0) {
    config.xAxisColumn = datetimeCols[0].name;
    config.chartType = "line"; // Line chart is best for timeseries
  } else if (categoryCols.length > 0) {
    config.xAxisColumn = categoryCols[0].name;
    config.chartType = "bar";
  }

  // Use first numeric column for Y-axis
  if (numericCols.length > 0) {
    config.yAxisColumns = [numericCols[0].name];
  }

  return config;
}

