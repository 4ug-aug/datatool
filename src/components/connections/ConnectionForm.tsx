import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useConnectionStore } from "@/stores/connectionStore";
import {
  useCreateConnection,
  useUpdateConnection,
  useTestConnection,
} from "@/hooks/queries/useConnections";
import { toast } from "sonner";

const connectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1).max(65535),
  database: z.string().min(1, "Database name is required"),
  user: z.string().min(1, "Username is required"),
  password: z.string().optional(),
});

type ConnectionFormValues = z.infer<typeof connectionSchema>;

export function ConnectionForm() {
  const isOpen = useConnectionStore((s) => s.isConnectionModalOpen);
  const editingConnection = useConnectionStore((s) => s.editingConnection);
  const closeModal = useConnectionStore((s) => s.closeConnectionModal);

  const createMutation = useCreateConnection();
  const updateMutation = useUpdateConnection();
  const testMutation = useTestConnection();

  const isEditing = !!editingConnection;

  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      name: "",
      host: "localhost",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: "",
    },
  });

  useEffect(() => {
    if (editingConnection) {
      form.reset({
        name: editingConnection.name,
        host: editingConnection.host,
        port: editingConnection.port,
        database: editingConnection.database,
        user: editingConnection.user,
        password: "",
      });
    } else {
      form.reset({
        name: "",
        host: "localhost",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: "",
      });
    }
  }, [editingConnection, form]);

  const onSubmit = async (values: ConnectionFormValues) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editingConnection.id,
          ...values,
          password: values.password || undefined,
        });
        toast.success("Connection updated successfully");
      } else {
        if (!values.password) {
          form.setError("password", {
            message: "Password is required for new connections",
          });
          return;
        }
        await createMutation.mutateAsync({
          ...values,
          password: values.password,
        });
        toast.success("Connection created successfully");
      }
      closeModal();
    } catch {
      toast.error(
        isEditing ? "Failed to update connection" : "Failed to create connection"
      );
    }
  };

  const handleTest = async () => {
    if (!editingConnection) {
      toast.error("Save the connection first to test it");
      return;
    }

    try {
      const success = await testMutation.mutateAsync(editingConnection.id);
      if (success) {
        toast.success("Connection successful!");
      } else {
        toast.error("Connection failed");
      }
    } catch {
      toast.error("Connection test failed");
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Connection" : "New Connection"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your PostgreSQL connection details."
              : "Add a new PostgreSQL connection."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Database" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Host</FormLabel>
                    <FormControl>
                      <Input placeholder="localhost" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5432"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 5432)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="database"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Database</FormLabel>
                  <FormControl>
                    <Input placeholder="postgres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="postgres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Password{" "}
                    {isEditing && (
                      <span className="text-muted-foreground">
                        (leave empty to keep current)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Test Connection
                </Button>
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
