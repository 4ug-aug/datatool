import { ConnectionForm } from "@/components/connections/ConnectionForm";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { MainContent } from "@/components/layout/MainContent";
import { RightSidebar } from "@/components/layout/RightSidebar";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/sonner";
import {
    useActiveConnection,
    useConnections,
    useConnectToDatabase,
} from "@/hooks/queries/useConnections";
import { useEditorContent } from "@/hooks/queries/useQueries";
import { getLastConnectionId } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import { useEffect } from "react";

function App() {
  const isRightSidebarOpen = useQueryStore((s) => s.isRightSidebarOpen);
  const isLeftSidebarOpen = useQueryStore((s) => s.isLeftSidebarOpen);
  const isConnected = useConnectionStore((s) => s.isConnected);

  // Initialize data on mount
  useConnections();
  useActiveConnection();
  useEditorContent();

  const connectMutation = useConnectToDatabase();

  // Try to reconnect to last used connection on mount
  useEffect(() => {
    const reconnect = async () => {
      if (!isConnected) {
        const lastId = await getLastConnectionId();
        if (lastId) {
          connectMutation.mutate(lastId);
        }
      }
    };
    reconnect();
  }, []);

  return (
    <div className="dark h-screen w-screen overflow-hidden bg-background text-foreground">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Sidebar */}
        {isLeftSidebarOpen && (
          <>
            <ResizablePanel
              defaultSize={20}
              minSize={15}
              maxSize={35}
              className="min-w-[200px]"
            >
              <LeftSidebar />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Main Content */}
        <ResizablePanel defaultSize={isRightSidebarOpen ? 55 : 80} minSize={30}>
          <MainContent />
        </ResizablePanel>

        {/* Right Sidebar */}
        {isRightSidebarOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={25}
              minSize={20}
              maxSize={45}
              className="min-w-[300px]"
            >
              <RightSidebar />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Modals */}
      <ConnectionForm />

      {/* Toast notifications */}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
