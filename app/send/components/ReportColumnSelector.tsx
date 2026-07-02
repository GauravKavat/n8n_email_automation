"use client"

import * as React from "react"
import { ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PRESET_STORAGE_KEY = "mis-report-column-presets:v1"

interface ColumnPreset {
  name: string
  columns: string[]
}

interface ReportColumnSelectorProps {
  headers: string[]
  columnOrder: string[]
  selectedColumns: string[]
  onColumnOrderChange: (columns: string[]) => void
  onSelectedColumnsChange: (columns: string[]) => void
}

function readPresets(): ColumnPreset[] {
  const stored = window.localStorage.getItem(PRESET_STORAGE_KEY)
  if (!stored) return []

  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed)) throw new Error("Invalid preset data")

  return parsed.filter(
    (preset): preset is ColumnPreset =>
      typeof preset === "object" &&
      preset !== null &&
      typeof (preset as ColumnPreset).name === "string" &&
      Array.isArray((preset as ColumnPreset).columns) &&
      (preset as ColumnPreset).columns.every((column) => typeof column === "string"),
  )
}

export function ReportColumnSelector({
  headers,
  columnOrder,
  selectedColumns,
  onColumnOrderChange,
  onSelectedColumnsChange,
}: ReportColumnSelectorProps) {
  const [search, setSearch] = React.useState("")
  const [presets, setPresets] = React.useState<ColumnPreset[]>([])
  const [presetName, setPresetName] = React.useState("")
  const [selectedPresetName, setSelectedPresetName] = React.useState("")

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setPresets(readPresets())
      } catch {
        window.localStorage.removeItem(PRESET_STORAGE_KEY)
        toast.warning("Saved column presets were invalid and have been reset.")
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const selectedSet = React.useMemo(
    () => new Set(selectedColumns),
    [selectedColumns],
  )
  const selectedInOrder = React.useMemo(
    () => columnOrder.filter((column) => selectedSet.has(column)),
    [columnOrder, selectedSet],
  )
  const filteredColumns = React.useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    if (!normalizedSearch) return columnOrder
    return columnOrder.filter((column) =>
      column.toLocaleLowerCase().includes(normalizedSearch),
    )
  }, [columnOrder, search])

  const persistPresets = (nextPresets: ColumnPreset[]) => {
    try {
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(nextPresets))
      setPresets(nextPresets)
      return true
    } catch {
      toast.error("Unable to save column presets in this browser.")
      return false
    }
  }

  const toggleColumn = (column: string, checked: boolean) => {
    if (checked) {
      onSelectedColumnsChange(
        columnOrder.filter(
          (candidate) => selectedSet.has(candidate) || candidate === column,
        ),
      )
      return
    }

    onSelectedColumnsChange(
      selectedColumns.filter((candidate) => candidate !== column),
    )
  }

  const moveColumn = (column: string, direction: -1 | 1) => {
    const selectedIndex = selectedInOrder.indexOf(column)
    const targetColumn = selectedInOrder[selectedIndex + direction]
    if (!targetColumn) return

    const nextOrder = [...columnOrder]
    const currentPosition = nextOrder.indexOf(column)
    const targetPosition = nextOrder.indexOf(targetColumn)
    ;[nextOrder[currentPosition], nextOrder[targetPosition]] = [
      nextOrder[targetPosition],
      nextOrder[currentPosition],
    ]
    onColumnOrderChange(nextOrder)
    onSelectedColumnsChange(
      nextOrder.filter((candidate) => selectedSet.has(candidate)),
    )
  }

  const handleSave = () => {
    const name = presetName.trim()
    if (!name) {
      toast.error("Enter a preset name.")
      return
    }
    if (selectedInOrder.length === 0) {
      toast.error("Select at least one column before saving a preset.")
      return
    }
    if (presets.some((preset) => preset.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      toast.error("A preset with this name already exists. Use Overwrite.")
      return
    }

    const nextPresets = [...presets, { name, columns: selectedInOrder }]
    if (persistPresets(nextPresets)) {
      setSelectedPresetName(name)
      setPresetName(name)
      toast.success(`Preset "${name}" saved.`)
    }
  }

  const handleLoad = () => {
    const preset = presets.find((candidate) => candidate.name === selectedPresetName)
    if (!preset) return

    const availableSet = new Set(headers)
    const availablePresetColumns = Array.from(
      new Set(preset.columns.filter((column) => availableSet.has(column))),
    )
    const missingCount = preset.columns.length - availablePresetColumns.length
    const remainingColumns = columnOrder.filter(
      (column) => !availablePresetColumns.includes(column),
    )

    onColumnOrderChange([...availablePresetColumns, ...remainingColumns])
    onSelectedColumnsChange(availablePresetColumns)
    setPresetName(preset.name)

    if (missingCount > 0) {
      toast.warning(
        `${missingCount} preset column${missingCount === 1 ? " is" : "s are"} not present in this workbook and were skipped.`,
      )
    } else {
      toast.success(`Preset "${preset.name}" loaded.`)
    }
  }

  const handleOverwrite = () => {
    if (!selectedPresetName) return
    if (selectedInOrder.length === 0) {
      toast.error("Select at least one column before overwriting a preset.")
      return
    }

    const nextPresets = presets.map((preset) =>
      preset.name === selectedPresetName
        ? { ...preset, columns: selectedInOrder }
        : preset,
    )
    if (persistPresets(nextPresets)) {
      toast.success(`Preset "${selectedPresetName}" overwritten.`)
    }
  }

  const handleDelete = () => {
    if (!selectedPresetName) return
    if (!window.confirm(`Delete the "${selectedPresetName}" preset?`)) return

    const nextPresets = presets.filter(
      (preset) => preset.name !== selectedPresetName,
    )
    if (persistPresets(nextPresets)) {
      toast.success(`Preset "${selectedPresetName}" deleted.`)
      setSelectedPresetName("")
      setPresetName("")
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="text-xl">Report Columns</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Choose and arrange the columns included in every client report.
          </p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          {selectedColumns.length} of {headers.length} selected
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Input
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Preset name"
              aria-label="Preset name"
            />
            <select
              value={selectedPresetName}
              onChange={(event) => {
                setSelectedPresetName(event.target.value)
                setPresetName(event.target.value)
              }}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Saved column preset"
            >
              <option value="">Choose saved preset</option>
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleSave}>
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleLoad}
              disabled={!selectedPresetName}
            >
              Load
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleOverwrite}
              disabled={!selectedPresetName}
            >
              Overwrite
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDelete}
              disabled={!selectedPresetName}
              aria-label="Delete selected preset"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search columns"
              className="pl-9"
              aria-label="Search columns"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectedColumnsChange([...columnOrder])}
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectedColumnsChange([])}
            >
              Clear All
            </Button>
          </div>
        </div>

        <div className="max-h-[28rem] overflow-y-auto rounded-lg border">
          {filteredColumns.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No columns match your search.
            </p>
          ) : (
            <ul className="divide-y">
              {filteredColumns.map((column) => {
                const checked = selectedSet.has(column)
                const selectedIndex = selectedInOrder.indexOf(column)
                return (
                  <li
                    key={column}
                    className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-slate-50"
                  >
                    <Checkbox
                      id={`report-column-${column}`}
                      checked={checked}
                      onCheckedChange={(value) => toggleColumn(column, value === true)}
                    />
                    <Label
                      htmlFor={`report-column-${column}`}
                      className="min-w-0 flex-1 cursor-pointer break-words text-sm"
                    >
                      {column}
                    </Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!checked || selectedIndex <= 0}
                        onClick={() => moveColumn(column, -1)}
                        aria-label={`Move ${column} up`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={
                          !checked ||
                          selectedIndex === selectedInOrder.length - 1
                        }
                        onClick={() => moveColumn(column, 1)}
                        aria-label={`Move ${column} down`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
