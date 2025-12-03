import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useConnections,
    useConnectToDatabase,
    useDeleteConnection,
    useDisconnectDatabase,
} from "@/hooks/queries/useConnections";
import { useTables } from "@/hooks/queries/useTables";
import { cn } from "@/lib/utils";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import type { TableInfo } from "@/types";
import {
    ChevronDown,
    ChevronRight,
    Database,
    Loader2,
    MoreVertical,
    Pencil,
    Plug,
    Plus,
    Search,
    Table2,
    Trash2,
    Unplug,
    View,
} from "lucide-react";
import { useMemo, useState } from "react";

export function LeftSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(
    new Set(["public"])
  );

  // Store state
  const connections = useConnectionStore((s) => s.connections);
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);
  const isConnected = useConnectionStore((s) => s.isConnected);
  const selectedTable = useConnectionStore((s) => s.selectedTable);
  const setSelectedTable = useConnectionStore((s) => s.setSelectedTable);
  const openConnectionModal = useConnectionStore((s) => s.openConnectionModal);
  const prepareForTableView = useQueryStore((s) => s.prepareForTableView);

  // Queries
  const { isLoading: isLoadingConnections } = useConnections();
  const { data: tables, isLoading: isLoadingTables } = useTables();
  const connectMutation = useConnectToDatabase();
  const disconnectMutation = useDisconnectDatabase();
  const deleteMutation = useDeleteConnection();

  const activeConnection = connections.find(
    (c) => c.id === activeConnectionId
  );

  // Group tables by schema
  const tablesBySchema = useMemo(() => {
    if (!tables) return new Map<string, TableInfo[]>();

    const filtered = tables.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.schema.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = new Map<string, TableInfo[]>();
    filtered.forEach((table) => {
      const existing = grouped.get(table.schema) || [];
      existing.push(table);
      grouped.set(table.schema, existing);
    });

    return grouped;
  }, [tables, searchQuery]);

  const toggleSchema = (schema: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schema)) {
      newExpanded.delete(schema);
    } else {
      newExpanded.add(schema);
    }
    setExpandedSchemas(newExpanded);
  };

  const handleTableSelect = (table: TableInfo) => {
    // Set the selected table first, then prepare the view state
    // This ensures the query fetches data for the new table
    setSelectedTable({ schema: table.schema, name: table.name });
    prepareForTableView();
  };

  const handleConnect = (connectionId: string) => {
    connectMutation.mutate(connectionId);
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const handleDeleteConnection = (connectionId: string) => {
    if (activeConnectionId === connectionId) {
      disconnectMutation.mutate();
    }
    deleteMutation.mutate(connectionId);
  };

  const getTableIcon = (tableType: string) => {
    if (tableType === "VIEW") {
      return <View className="size-4 text-blue-400" />;
    }
    return <Table2 className="size-4 text-muted-foreground" />;
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <h2 className="text-sm font-semibold text-sidebar-foreground">
          Table Editor
        </h2>
      </div>

      {/* Connection Selector */}
      <div className="border-b border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <Select
            value={activeConnectionId || ""}
            onValueChange={(value) => handleConnect(value)}
          >
            <SelectTrigger className="flex-1 bg-sidebar-accent">
              <SelectValue placeholder="Select connection..." />
            </SelectTrigger>
            <SelectContent>
              {connections.map((conn) => (
                <SelectItem key={conn.id} value={conn.id}>
                  <div className="flex items-center gap-2">
                    <Database className="size-4" />
                    <span>{conn.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => openConnectionModal()}
            title="Add connection"
          >
            <Plus className="size-4" />
          </Button>

          {isConnected && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              title="Disconnect"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Unplug className="size-4" />
              )}
            </Button>
          )}
        </div>

        {activeConnection && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isConnected ? (
                <Plug className="size-3 text-green-500" />
              ) : (
                <Unplug className="size-3 text-red-500" />
              )}
              <span>
                {activeConnection.host}:{activeConnection.port}/
                {activeConnection.database}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6">
                  <MoreVertical className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => openConnectionModal(activeConnection)}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteConnection(activeConnection.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Search */}
      {isConnected && (
        <div className="border-b border-sidebar-border p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-sidebar-accent pl-9"
            />
          </div>
        </div>
      )}

      {/* Tables List */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-100px)]">
        {isLoadingConnections || isLoadingTables ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Database className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Select a connection to view tables
            </p>
          </div>
        ) : tablesBySchema.size === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Table2 className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No tables found</p>
          </div>
        ) : (
          <div className="py-2">
            {Array.from(tablesBySchema.entries()).map(
              ([schema, schemaTables]) => (
                <Collapsible
                  key={schema}
                  open={expandedSchemas.has(schema)}
                  onOpenChange={() => toggleSchema(schema)}
                >
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent">
                      {expandedSchemas.has(schema) ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                      <span>{schema}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {schemaTables.length}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {schemaTables.map((table) => (
                      <button
                        key={`${table.schema}.${table.name}`}
                        onClick={() => handleTableSelect(table)}
                        className={cn(
                          "flex w-full items-center gap-2 py-1.5 pl-9 pr-3 text-sm hover:bg-sidebar-accent",
                          selectedTable?.schema === table.schema &&
                            selectedTable?.name === table.name &&
                            "bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                      >
                        {getTableIcon(table.table_type)}
                        <span className="truncate">{table.name}</span>
                        {table.table_type === "VIEW" && (
                          <Badge
                            variant="outline"
                            className="ml-auto text-[10px] px-1 py-0"
                          >
                            view
                          </Badge>
                        )}
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

