import { create } from "zustand";
import type { ConnectionInfo, SelectedTable, TableInfo } from "@/types";

interface ConnectionState {
  // Connections list
  connections: ConnectionInfo[];
  setConnections: (connections: ConnectionInfo[]) => void;

  // Active connection
  activeConnectionId: string | null;
  setActiveConnectionId: (id: string | null) => void;

  // Connection status
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  // Tables for active connection
  tables: TableInfo[];
  setTables: (tables: TableInfo[]) => void;

  // Selected table
  selectedTable: SelectedTable | null;
  setSelectedTable: (table: SelectedTable | null) => void;

  // Selected schema filter
  selectedSchema: string | null;
  setSelectedSchema: (schema: string | null) => void;

  // Connection modal state
  isConnectionModalOpen: boolean;
  editingConnection: ConnectionInfo | null;
  openConnectionModal: (connection?: ConnectionInfo) => void;
  closeConnectionModal: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  // Connections list
  connections: [],
  setConnections: (connections) => set({ connections }),

  // Active connection
  activeConnectionId: null,
  setActiveConnectionId: (id) => set({ activeConnectionId: id }),

  // Connection status
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),

  // Tables
  tables: [],
  setTables: (tables) => set({ tables }),

  // Selected table
  selectedTable: null,
  setSelectedTable: (table) => set({ selectedTable: table }),

  // Selected schema filter
  selectedSchema: null,
  setSelectedSchema: (schema) => set({ selectedSchema: schema }),

  // Connection modal
  isConnectionModalOpen: false,
  editingConnection: null,
  openConnectionModal: (connection) =>
    set({
      isConnectionModalOpen: true,
      editingConnection: connection || null,
    }),
  closeConnectionModal: () =>
    set({
      isConnectionModalOpen: false,
      editingConnection: null,
    }),
}));

