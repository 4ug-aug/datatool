import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listConnections,
  createConnection,
  updateConnection,
  deleteConnection,
  testConnectionById,
  connectToDatabase,
  disconnectDatabase,
  getActiveConnection,
} from "@/lib/tauri";
import type { CreateConnectionInput, UpdateConnectionInput } from "@/types";
import { useConnectionStore } from "@/stores/connectionStore";

export const connectionKeys = {
  all: ["connections"] as const,
  active: ["connections", "active"] as const,
};

export function useConnections() {
  const setConnections = useConnectionStore((s) => s.setConnections);

  return useQuery({
    queryKey: connectionKeys.all,
    queryFn: async () => {
      const connections = await listConnections();
      setConnections(connections);
      return connections;
    },
  });
}

export function useActiveConnection() {
  const setActiveConnectionId = useConnectionStore(
    (s) => s.setActiveConnectionId
  );
  const setIsConnected = useConnectionStore((s) => s.setIsConnected);

  return useQuery({
    queryKey: connectionKeys.active,
    queryFn: async () => {
      const id = await getActiveConnection();
      setActiveConnectionId(id);
      setIsConnected(!!id);
      return id;
    },
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateConnectionInput) => createConnection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.all });
    },
  });
}

export function useUpdateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateConnectionInput) => updateConnection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.all });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.all });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (id: string) => testConnectionById(id),
  });
}

export function useConnectToDatabase() {
  const queryClient = useQueryClient();
  const setIsConnected = useConnectionStore((s) => s.setIsConnected);
  const setActiveConnectionId = useConnectionStore(
    (s) => s.setActiveConnectionId
  );

  return useMutation({
    mutationFn: (id: string) => connectToDatabase(id),
    onSuccess: (_, id) => {
      setActiveConnectionId(id);
      setIsConnected(true);
      queryClient.invalidateQueries({ queryKey: connectionKeys.active });
    },
  });
}

export function useDisconnectDatabase() {
  const queryClient = useQueryClient();
  const setIsConnected = useConnectionStore((s) => s.setIsConnected);
  const setActiveConnectionId = useConnectionStore(
    (s) => s.setActiveConnectionId
  );
  const setTables = useConnectionStore((s) => s.setTables);
  const setSelectedTable = useConnectionStore((s) => s.setSelectedTable);

  return useMutation({
    mutationFn: () => disconnectDatabase(),
    onSuccess: () => {
      setActiveConnectionId(null);
      setIsConnected(false);
      setTables([]);
      setSelectedTable(null);
      queryClient.invalidateQueries({ queryKey: connectionKeys.active });
    },
  });
}

