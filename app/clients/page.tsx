"use client"

import * as React from "react"
import { Download, Filter, Loader2, Plus, Search, Trash2, Upload, Copy, PencilLine, CheckCircle2, XCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  APP_VERSION,
  CLIENT_CONFIG_STORAGE_KEY,
  createClientConfig,
  createEmptyStore,
  exportClientStore,
  isClientConfigStore,
  loadClientStore,
  normalizeEmailList,
  normalizeStore,
  saveClientStore,
  type ClientConfig,
  type ClientConfigStore,
} from "@/lib/client-config"

type SortMode = "name" | "updated"

function toTextList(value: string[]) {
  return value.join("\n")
}

function fromTextList(value: string) {
  return normalizeEmailList(value)
}

function buildStats(store: ClientConfigStore) {
  const total = store.clients.length
  const active = store.clients.filter((client) => client.isActive).length
  return { total, active, inactive: total - active }
}

export default function ClientConfigurationPage() {
  const initialState = React.useMemo(() => {
    if (typeof window === "undefined") {
      return { store: createEmptyStore(), corrupted: false }
    }

    try {
      return { store: loadClientStore(), corrupted: false }
    } catch (error) {
      console.warn("Failed to load client config", error)
      return { store: createEmptyStore(), corrupted: true }
    }
  }, [])

  const [store, setStore] = React.useState<ClientConfigStore>(initialState.store)
  const [loaded] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterActive, setFilterActive] = React.useState<"all" | "active" | "inactive">("all")
  const [sortMode, setSortMode] = React.useState<SortMode>("name")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [corrupted, setCorrupted] = React.useState(initialState.corrupted)
  const [importError, setImportError] = React.useState<string | null>(null)
  const [exportBusy, setExportBusy] = React.useState(false)

  const selectedClient = store.clients.find((client) => client.id === selectedId) ?? null

  const [draft, setDraft] = React.useState<ClientConfig>(createClientConfig())

  React.useEffect(() => {
    if (!loaded || corrupted) return
    try {
      saveClientStore(store)
    } catch (error) {
      console.error(error)
      toast.error("Unable to save client configuration in this browser.")
    }
  }, [store, loaded, corrupted])

  const filteredClients = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...store.clients]
      .filter((client) => {
        if (filterActive === "active" && !client.isActive) return false
        if (filterActive === "inactive" && client.isActive) return false
        if (!query) return true
        const haystack = [
          client.excelClientName,
          client.displayName,
          client.sender,
          client.aliases.join(" "),
          client.to.join(" "),
          client.cc.join(" "),
          client.subject,
          client.body,
        ].join(" ")
        return haystack.toLowerCase().includes(query)
      })
      .sort((a, b) => {
        if (sortMode === "updated") return a.id.localeCompare(b.id)
        return a.displayName.localeCompare(b.displayName)
      })
  }, [store.clients, search, filterActive, sortMode])

  const stats = React.useMemo(() => buildStats(store), [store])

  const beginNewClient = () => {
    const next = createClientConfig()
    setDraft(next)
    setSelectedId(next.id)
  }

  const selectClient = (client: ClientConfig) => {
    setSelectedId(client.id)
    setDraft(client)
  }

  const saveDraft = () => {
    const canonicalKey = draft.excelClientName.trim().toUpperCase()
    const cleanedAliases = draft.aliases.map((alias) => alias.trim()).filter(Boolean)
    const duplicateAlias = cleanedAliases.find(
      (alias, index) =>
        cleanedAliases.findIndex(
          (candidate) => candidate.toUpperCase() === alias.toUpperCase(),
        ) !== index,
    )
    if (duplicateAlias) {
      toast.error("Duplicate aliases are not allowed.")
      return
    }
    if (cleanedAliases.some((alias) => alias.toUpperCase() === canonicalKey)) {
      toast.error("Canonical client name cannot be used as an alias.")
      return
    }

    const nextClient = createClientConfig({
      ...draft,
      aliases: cleanedAliases,
    })

    if (!nextClient.excelClientName.trim()) {
      toast.error("Excel client name is required.")
      return
    }

    setStore((current) => {
      const existingIndex = current.clients.findIndex((client) => client.id === nextClient.id)
      const clients =
        existingIndex >= 0
          ? current.clients.map((client) => (client.id === nextClient.id ? nextClient : client))
          : [...current.clients, nextClient]
      return normalizeStore({ ...current, clients, updatedAt: new Date().toISOString() })
    })

    setSelectedId(nextClient.id)
    toast.success("Client configuration saved.")
  }

  const deleteClient = (id: string) => {
    const client = store.clients.find((entry) => entry.id === id)
    if (!client) return
    if (!window.confirm(`Delete ${client.displayName}?`)) return
    setStore((current) => normalizeStore({
      ...current,
      clients: current.clients.filter((entry) => entry.id !== id),
      updatedAt: new Date().toISOString(),
    }))
    setSelectedId((current) => (current === id ? null : current))
    toast.success("Client deleted.")
  }

  const duplicateClient = (client: ClientConfig) => {
    const copy = createClientConfig({
      ...client,
      id: undefined,
      excelClientName: `${client.excelClientName} Copy`,
      displayName: `${client.displayName} Copy`,
      aliases: [...client.aliases],
    })
    setStore((current) => normalizeStore({
      ...current,
      clients: [...current.clients, copy],
      updatedAt: new Date().toISOString(),
    }))
    setSelectedId(copy.id)
    setDraft(copy)
    toast.success("Client duplicated.")
  }

  const exportConfiguration = () => {
    try {
      setExportBusy(true)
      const payload = exportClientStore(store)
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `client-configuration-${payload.exportedAt.slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportBusy(false)
    }
  }

  const importConfiguration = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!isClientConfigStore(parsed)) {
        throw new Error("Invalid configuration schema.")
      }
      const migrated = normalizeStore(parsed)
      setStore(migrated)
      setSelectedId(migrated.clients[0]?.id ?? null)
      setCorrupted(false)
      setImportError(null)
      toast.success("Client configuration imported.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import configuration"
      setImportError(message)
      toast.error(message)
    }
  }

  const resetStorage = () => {
    if (!window.confirm("Reset the browser client configuration?")) return
    const empty = createEmptyStore()
    setStore(empty)
    setSelectedId(null)
    setDraft(createClientConfig())
    setCorrupted(false)
    setImportError(null)
    window.localStorage.removeItem(CLIENT_CONFIG_STORAGE_KEY)
    toast.success("Client configuration reset.")
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-6xl py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-slate-600">Loading browser configuration...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader
        title="Client Management"
        description="Browser-only client configuration. Nothing is stored on the server."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">Total Clients</div>
            <div className="mt-2 text-3xl font-semibold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">Active Clients</div>
            <div className="mt-2 text-3xl font-semibold text-emerald-700">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">Inactive Clients</div>
            <div className="mt-2 text-3xl font-semibold text-slate-700">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Upload className="h-4 w-4" />
            Import Configuration
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importConfiguration(file)
                event.currentTarget.value = ""
              }}
            />
          </label>
          <Button type="button" variant="outline" onClick={exportConfiguration} disabled={exportBusy}>
            <Download className="mr-2 h-4 w-4" />
            Export Configuration
          </Button>
          <Button type="button" variant="outline" onClick={resetStorage}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <div className="ml-auto text-xs text-slate-500">
            Storage key: {CLIENT_CONFIG_STORAGE_KEY} · version {APP_VERSION}
          </div>
        </CardContent>
      </Card>

      {corrupted && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="font-medium text-amber-900">Browser storage was corrupted.</div>
              <div className="text-sm text-amber-800">Reset it to start with a clean empty configuration.</div>
            </div>
            <Button type="button" variant="outline" onClick={resetStorage}>
              Reset Storage
            </Button>
          </CardContent>
        </Card>
      )}

      {importError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="font-medium text-red-900">Import failed</div>
              <div className="text-sm text-red-700">{importError}</div>
            </div>
            <Button type="button" variant="outline" onClick={() => setImportError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Clients</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={beginNewClient}>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
              <div className="relative flex-1 min-w-48">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search clients"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={filterActive === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterActive("all")}>
                <Filter className="mr-2 h-4 w-4" />
                All
              </Button>
              <Button type="button" variant={filterActive === "active" ? "default" : "outline"} size="sm" onClick={() => setFilterActive("active")}>
                Active
              </Button>
              <Button type="button" variant={filterActive === "inactive" ? "default" : "outline"} size="sm" onClick={() => setFilterActive("inactive")}>
                Inactive
              </Button>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="updated">Sort by Updated</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredClients.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
                No clients found.
              </div>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => selectClient(client)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedId === client.id ? "border-blue-300 bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{client.displayName}</div>
                      <div className="text-sm text-slate-500">{client.excelClientName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {client.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedClient ? "Edit Client" : "New Client"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Excel Client Name</Label>
                <Input value={draft.excelClientName} onChange={(event) => setDraft((current) => ({ ...current, excelClientName: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Aliases</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft((current) => ({ ...current, aliases: [...current.aliases, ""] }))}
                >
                  + Add Alias
                </Button>
              </div>
              <div className="space-y-2">
                {draft.aliases.length === 0 ? (
                  <div className="rounded-md border border-dashed px-3 py-4 text-sm text-slate-500">
                    No aliases yet.
                  </div>
                ) : (
                  draft.aliases.map((alias, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={alias}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            aliases: current.aliases.map((entry, aliasIndex) =>
                              aliasIndex === index ? event.target.value : entry,
                            ),
                          }))
                        }
                        placeholder="Alias"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            aliases: current.aliases.filter((_, aliasIndex) => aliasIndex !== index),
                          }))
                        }
                        aria-label="Delete alias"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sender</Label>
              <Input value={draft.sender} onChange={(event) => setDraft((current) => ({ ...current, sender: event.target.value }))} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>To</Label>
                <Textarea value={toTextList(draft.to)} onChange={(event) => setDraft((current) => ({ ...current, to: fromTextList(event.target.value) }))} className="min-h-28" />
              </div>
              <div className="space-y-2">
                <Label>CC</Label>
                <Textarea value={toTextList(draft.cc)} onChange={(event) => setDraft((current) => ({ ...current, cc: fromTextList(event.target.value) }))} className="min-h-28" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} className="min-h-32" />
            </div>

            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Active
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={saveDraft}>
                <PencilLine className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => duplicateClient(draft)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const next = createClientConfig()
                  setDraft(next)
                  setSelectedId(null)
                }}
              >
                New
              </Button>
              {selectedClient && (
                <Button type="button" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => deleteClient(selectedClient.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
