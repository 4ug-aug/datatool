import { Button } from "@/components/ui/button";
import {
  useExecuteQuery,
  useExplainQuery,
  useSaveEditorContent,
} from "@/hooks/queries/useQueries";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { Code2, Loader2, Play, Search } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

export function RightSidebar() {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Refs for keyboard shortcuts to access latest state
  const handleRunRef = useRef<(() => void) | null>(null);
  const handleExplainRef = useRef<(() => void) | null>(null);
  const hasConnectionRef = useRef<boolean>(false);

  // Store state
  const sql = useQueryStore((s) => s.sql);
  const setSql = useQueryStore((s) => s.setSql);
  const isExecuting = useQueryStore((s) => s.isExecuting);
  const isExplaining = useQueryStore((s) => s.isExplaining);
  const error = useQueryStore((s) => s.error);
  const isConnected = useConnectionStore((s) => s.isConnected);
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  
  // Use activeConnectionId as fallback if isConnected is not synced
  const hasConnection = isConnected || !!activeConnectionId;

  // Mutations
  const executeMutation = useExecuteQuery();
  const explainMutation = useExplainQuery();
  const saveContentMutation = useSaveEditorContent();

  // Sync refs with current state
  useEffect(() => {
    hasConnectionRef.current = hasConnection;
  }, [hasConnection]);

  // Auto-save editor content with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sql) {
        saveContentMutation.mutate(sql);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [sql]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add keyboard shortcuts - use refs to always access latest handlers
    editor.addCommand(
      // Cmd/Ctrl + Enter to run query
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        if (handleRunRef.current) {
          handleRunRef.current();
        }
      }
    );

    // Add both Cmd+E and Cmd+Shift+E for Analyze
    editor.addCommand(
      // Cmd/Ctrl + E to explain
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE,
      () => {
        if (handleExplainRef.current) {
          handleExplainRef.current();
        }
      }
    );

    editor.addCommand(
      // Cmd/Ctrl + Shift + E to explain (alternative)
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE,
      () => {
        if (handleExplainRef.current) {
          handleExplainRef.current();
        }
      }
    );
  };

  const getSelectedOrAllSql = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return sql;

    const selection = editor.getSelection();
    if (selection && !selection.isEmpty()) {
      return editor.getModel()?.getValueInRange(selection) || sql;
    }
    return sql;
  }, [sql]);

  const handleRun = useCallback(() => {
    if (!hasConnectionRef.current) {
      toast.error("Not connected to any database");
      return;
    }

    const queryToRun = getSelectedOrAllSql();
    if (!queryToRun.trim()) {
      toast.error("Please enter a SQL query");
      return;
    }

    executeMutation.mutate(queryToRun);
  }, [getSelectedOrAllSql, executeMutation]);

  const handleExplain = useCallback(() => {
    if (!hasConnectionRef.current) {
      toast.error("Not connected to any database");
      return;
    }

    const queryToRun = getSelectedOrAllSql();
    if (!queryToRun.trim()) {
      toast.error("Please enter a SQL query");
      return;
    }

    explainMutation.mutate(queryToRun);
  }, [getSelectedOrAllSql, explainMutation]);

  // Sync handler refs with latest handlers
  useEffect(() => {
    handleRunRef.current = handleRun;
    handleExplainRef.current = handleExplain;
  }, [handleRun, handleExplain]);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Code2 className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-sidebar-foreground">
            SQL Editor
          </h2>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={sql}
          onChange={(value) => setSql(value || "")}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12 },
            renderLineHighlight: "all",
            cursorBlinking: "smooth",
            smoothScrolling: true,
          }}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="border-t border-destructive/50 bg-destructive/10 px-4 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-sidebar-border p-3">
        <Button
          onClick={handleRun}
          disabled={!hasConnection || isExecuting}
          className="flex-1"
          size="sm"
        >
          {isExecuting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Play className="mr-2 size-4" />
          )}
          Run
        </Button>
        <Button
          onClick={handleExplain}
          disabled={!hasConnection || isExplaining}
          variant="secondary"
          className="flex-1"
          size="sm"
        >
          {isExplaining ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Search className="mr-2 size-4" />
          )}
          Analyze
        </Button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="border-t border-sidebar-border px-4 py-2 text-center">
        <p className="text-[10px] text-muted-foreground">
          <kbd className="rounded bg-muted px-1">⌘ Enter</kbd> Run •{" "}
          <kbd className="rounded bg-muted px-1">⌘ E</kbd> Analyze
        </p>
      </div>
    </div>
  );
}

