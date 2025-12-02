use crate::db::postgres::PostgresState;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExplainResult {
    pub plan: JsonValue,
    pub planning_time: Option<f64>,
    pub execution_time: Option<f64>,
    pub total_cost: Option<f64>,
}

/// Runs EXPLAIN ANALYZE on a query and returns the execution plan
#[tauri::command]
pub async fn explain_query(
    sql: String,
    postgres: State<'_, PostgresState>,
) -> Result<ExplainResult, String> {
    let plan = postgres
        .explain_query(&sql)
        .await
        .map_err(|e| e.to_string())?;

    // Extract timing information from the plan
    let planning_time = plan
        .get(0)
        .and_then(|p| p.get("Planning Time"))
        .and_then(|v| v.as_f64());

    let execution_time = plan
        .get(0)
        .and_then(|p| p.get("Execution Time"))
        .and_then(|v| v.as_f64());

    let total_cost = plan
        .get(0)
        .and_then(|p| p.get("Plan"))
        .and_then(|p| p.get("Total Cost"))
        .and_then(|v| v.as_f64());

    Ok(ExplainResult {
        plan,
        planning_time,
        execution_time,
        total_cost,
    })
}

/// Runs EXPLAIN without ANALYZE (doesn't actually execute the query)
#[tauri::command]
pub async fn explain_query_no_analyze(
    sql: String,
    postgres: State<'_, PostgresState>,
) -> Result<JsonValue, String> {
    let pool = postgres
        .execute_query(&format!("EXPLAIN (FORMAT JSON, VERBOSE) {}", sql))
        .await
        .map_err(|e| e.to_string())?;

    // The result is returned as a single row with a JSON column
    if let Some(row) = pool.rows.first() {
        if let Some(plan) = row.first() {
            return Ok(plan.clone());
        }
    }

    Err("Failed to parse EXPLAIN output".to_string())
}

