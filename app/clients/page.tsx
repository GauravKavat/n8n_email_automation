"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table"
import { Plus, Edit2, Trash2, Mail, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Client } from "@/types/client"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ClientModal } from "./components/ClientModal"

export default function ClientManagementPage() {
  const [clients, setClients] = React.useState<Client[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editingClient, setEditingClient] = React.useState<Client | null>(null)
  
  const fetchClients = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/clients")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setClients(data)
    } catch (err) {
      toast.error("Failed to load clients.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleAddClient = () => {
    setEditingClient(null)
    setIsModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setIsModalOpen(true)
  }

  const handleDeleteClient = async (id: string) => {
    if (confirm("Are you sure you want to delete this client configuration?")) {
      try {
        const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to delete")
        toast.success("Client deleted successfully")
        fetchClients()
      } catch (e) {
        toast.error("Error deleting client")
      }
    }
  }

  const handleSaveClient = async (clientData: any, id?: string) => {
    setIsSaving(true)
    try {
      const url = id ? `/api/clients/${id}` : "/api/clients"
      const method = id ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to save client")
      }

      toast.success(id ? "Client updated successfully" : "Client added successfully")
      setIsModalOpen(false)
      fetchClients()
    } catch (error: any) {
      toast.error(error.message || "Failed to save client")
    } finally {
      setIsSaving(false)
    }
  }

  const columns = React.useMemo<ColumnDef<Client>[]>(
    () => [
      {
        accessorKey: "displayName",
        header: "Display Name",
        cell: ({ row }) => <div className="font-medium text-slate-900">{row.original.displayName}</div>,
      },
      {
        accessorKey: "excelClientName",
        header: "Excel Client Name",
        cell: ({ row }) => <div className="text-slate-500 font-mono text-xs">{row.original.excelClientName}</div>,
      },
      {
        accessorKey: "accountManager",
        header: "Account Manager",
        cell: ({ row }) => <div className="text-slate-600 text-sm">{row.original.accountManager || "-"}</div>,
      },
      {
        accessorKey: "deliveryChannels",
        header: "Delivery",
        cell: ({ row }) => {
          const channels = (row.original.deliveryChannels || "email").split(",").map(c => c.trim()).filter(Boolean);
          return (
            <div className="flex gap-2 flex-wrap">
              {channels.includes("email") && (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  EMAIL
                </span>
              )}
              {channels.includes("whatsapp") && (
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  WHATSAPP
                </span>
              )}
            </div>
          )
        }
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => {
          return row.original.isActive ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              Yes
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
              No
            </span>
          )
        },
      },
      {
        accessorKey: "sendReport",
        header: "Auto Send",
        cell: ({ row }) => {
          return row.original.sendReport ? (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
              Enabled
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
              Disabled
            </span>
          )
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toast.info("Send Test Email endpoint not implemented yet.")}
                title="Send Test Email"
              >
                <Mail className="h-4 w-4 text-emerald-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditClient(row.original)}
                title="Edit Client"
              >
                <Edit2 className="h-4 w-4 text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClient(row.original.id)}
                title="Delete Client"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: clients,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader 
        title="Client Management" 
        description="Manage the list of clients who receive automated reports."
      >
        <Button onClick={handleAddClient} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    Loading clients...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center text-slate-500">
                  No clients found. Click "Add Client" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClient}
        initialData={editingClient}
        isSaving={isSaving}
      />
    </div>
  )
}
