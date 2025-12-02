import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  executeQuery,
  explainQuery,
  saveQuery,
  listSavedQueries,
  deleteSavedQuery,
  saveEditorContent,
  getEditorContent,
} from "@/lib/tauri";
import { useQueryStore } from "@/stores/queryStore";
import { useConnectionStore } from "@/stores/connectionStore";

export const queryKeys = {
  saved: ["savedQueries"] as const,
  editorContent: ["editorContent"] as const,
};

export function useExecuteQuery() {
  const setQueryResult = useQueryStore((s) => s.setQueryResult);
  const setIsExecuting = useQueryStore((s) => s.setIsExecuting);
  const setError = useQueryStore((s) => s.setError);

  return useMutation({
    mutationFn: async (sql: string) => {
      setIsExecuting(true);
      setError(null);
      try {
        const result = await executeQuery(sql);
        setQueryResult(result);
        return result;
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        setError(error);
        throw e;
      } finally {
        setIsExecuting(false);
      }
    },
  });
}

export function useExplainQuery() {
  const setExplainResult = useQueryStore((s) => s.setExplainResult);
  const setIsExplaining = useQueryStore((s) => s.setIsExplaining);
  const setError = useQueryStore((s) => s.setError);

  return useMutation({
    mutationFn: async (sql: string) => {
      setIsExplaining(true);
      setError(null);
      try {
        const result = await explainQuery(sql);
        setExplainResult(result);
        return result;
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        setError(error);
        throw e;
      } finally {
        setIsExplaining(false);
      }
    },
  });
}

export function useSavedQueries() {
  return useQuery({
    queryKey: queryKeys.saved,
    queryFn: listSavedQueries,
  });
}

export function useSaveQuery() {
  const queryClient = useQueryClient();
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);

  return useMutation({
    mutationFn: ({ name, sql }: { name: string; sql: string }) =>
      saveQuery(activeConnectionId, name, sql),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.saved });
    },
  });
}

export function useDeleteSavedQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSavedQuery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.saved });
    },
  });
}

export function useEditorContent() {
  const setSql = useQueryStore((s) => s.setSql);

  return useQuery({
    queryKey: queryKeys.editorContent,
    queryFn: async () => {
      const content = await getEditorContent();
      if (content) {
        setSql(content);
      }
      return content;
    },
  });
}

export function useSaveEditorContent() {
  return useMutation({
    mutationFn: (content: string) => saveEditorContent(content),
  });
}

