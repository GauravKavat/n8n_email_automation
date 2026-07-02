"use client"

import * as React from "react"
import { AlertCircle, UploadCloud, FileSpreadsheet, X, Loader2 } from "lucide-react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useReportUpload } from "@/hooks/useReportUpload"
import { loadClientStore, matchClientConfig } from "@/lib/client-config"

import { DownloadProgressModal } from "./components/DownloadProgressModal"
import { ReportColumnSelector } from "./components/ReportColumnSelector"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Info } from "lucide-react"

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const CLIENT_COLUMN = "Client orgnization"

type ValidationSummary = {
  blockingCount: number
  warningCount: number
  readyCount: number
  details: {
    unknownClients: string[]
    duplicateAliases: string[]
    duplicateCanonicalNames: string[]
    missingRecipients: string[]
    invalidEmails: string[]
    missingClientColumn: boolean
    emptyMis: boolean
    zeroShipmentClients: string[]
    inactiveClients: string[]
    unusedAliases: string[]
    unusedClients: string[]
    duplicateEmails: string[]
    unknownWorkbookColumns: string[]
  }
}

function normalizeEmailList(value: string[]) {
  return Array.from(new Set(value.map((entry) => entry.trim().toLowerCase()).filter(Boolean)))
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function buildValidationSummary(args: {
  headers: string[]
  selectedColumns: string[]
  grouped: Record<string, Record<string, unknown>[]>
  clients: ReturnType<typeof loadClientStore>["clients"]
}): ValidationSummary {
  const { headers, selectedColumns, grouped, clients } = args
  const clientNames = Object.keys(grouped)
  const allRows = Object.values(grouped).flat()
  const missingClientColumn = headers.length > 0 && !headers.includes(CLIENT_COLUMN)
  const emptyMis = allRows.length === 0
  const unknownClients: string[] = []
  const duplicateAliases: string[] = []
  const duplicateCanonicalNames: string[] = []
  const missingRecipients: string[] = []
  const invalidEmails: string[] = []
  const zeroShipmentClients: string[] = []
  const inactiveClients: string[] = []
  const unusedAliases: string[] = []
  const unusedClients: string[] = []
  const duplicateEmails: string[] = []
  const matchedClients = new Set<string>()
  const canonicalNames = new Map<string, string>()
  const aliasOwners = new Map<string, string>()

  for (const client of clients) {
    const canonical = client.excelClientName.trim().toUpperCase()
    if (canonicalNames.has(canonical) && canonicalNames.get(canonical) !== client.id) {
      duplicateCanonicalNames.push(client.excelClientName)
    } else {
      canonicalNames.set(canonical, client.id)
    }

    const seen = new Set<string>()
    for (const alias of client.aliases ?? []) {
      const normalized = alias.trim().toUpperCase()
      if (!normalized) continue
      if (normalized === canonical) {
        duplicateAliases.push(alias)
        continue
      }
      if (seen.has(normalized)) {
        duplicateAliases.push(alias)
        continue
      }
      seen.add(normalized)
      const owner = aliasOwners.get(normalized)
      if (owner && owner !== client.id) {
        duplicateAliases.push(alias)
      } else {
        aliasOwners.set(normalized, client.id)
      }
    }
  }

  for (const clientName of clientNames) {
    const matched = matchClientConfig(clientName, clients)
    if (!matched) {
      unknownClients.push(clientName)
      continue
    }

    matchedClients.add(matched.id)
    if (!matched.isActive) {
      inactiveClients.push(clientName)
    }

    const rows = grouped[clientName]
    if (rows.length === 0) {
      zeroShipmentClients.push(clientName)
    }

    const emailFields = [
      ...matched.to,
      ...matched.cc,
    ]
    const normalizedEmails = normalizeEmailList(emailFields)
    if (matched.to.length === 0) {
      missingRecipients.push(clientName)
    }
    if (normalizedEmails.length !== emailFields.map((entry) => entry.trim().toLowerCase()).filter(Boolean).length) {
      duplicateEmails.push(clientName)
    }
    const invalid = emailFields.filter(Boolean).filter((entry) => !isValidEmail(entry.trim()))
    if (invalid.length > 0) {
      invalidEmails.push(clientName)
    }

    for (const alias of matched.aliases) {
      if (alias.trim() && !clientNames.includes(alias)) {
        unusedAliases.push(alias)
      }
    }
  }

  for (const client of clients) {
    if (!matchedClients.has(client.id)) {
      unusedClients.push(client.displayName || client.excelClientName)
    }
  }

  const unknownWorkbookColumns = headers.filter(
    (header) => header !== CLIENT_COLUMN && !selectedColumns.includes(header),
  )

  const blockingCount =
    (unknownClients.length > 0 ? 1 : 0) +
    (duplicateAliases.length > 0 ? 1 : 0) +
    (duplicateCanonicalNames.length > 0 ? 1 : 0) +
    (missingRecipients.length > 0 ? 1 : 0) +
    (invalidEmails.length > 0 ? 1 : 0) +
    (selectedColumns.length === 0 ? 1 : 0) +
    (missingClientColumn ? 1 : 0) +
    (emptyMis ? 1 : 0)

  const warningCount =
    zeroShipmentClients.length +
    inactiveClients.length +
    unusedAliases.length +
    unusedClients.length +
    duplicateEmails.length +
    unknownWorkbookColumns.length

  const readyCount = Math.max(0, clientNames.length - unknownClients.length)

  return {
    blockingCount,
    warningCount,
    readyCount,
    details: {
      unknownClients,
      duplicateAliases,
      duplicateCanonicalNames,
      missingRecipients,
      invalidEmails,
      missingClientColumn,
      emptyMis,
      zeroShipmentClients,
      inactiveClients,
      unusedAliases,
      unusedClients,
      duplicateEmails,
      unknownWorkbookColumns,
    },
  }
}

export default function SendReportsPage() {
  const [file, setFile] = React.useState<File | null>(null)
  const [previewMode, setPreviewMode] = React.useState(true)
  const [headers, setHeaders] = React.useState<string[]>([])
  const [columnOrder, setColumnOrder] = React.useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>([])
  const [headersLoading, setHeadersLoading] = React.useState(false)
  const [headersError, setHeadersError] = React.useState<string | null>(null)
  const [groupedRows, setGroupedRows] = React.useState<Record<string, Record<string, unknown>[]>>({})
  const [summaryOpen, setSummaryOpen] = React.useState(true)
  const headerRequestRef = React.useRef<AbortController | null>(null)
  
  const { 
    uploadReport, 
    loading, 
    error, 
    success,
    isProgressModalOpen,
    progress,
    results,
    handleCancel,
    handleRetry,
    closeProgressModal,
    triggerDownload
  } = useReportUpload()

  const extractHeaders = React.useCallback(async (uploadedFile: File) => {
    headerRequestRef.current?.abort()
    const controller = new AbortController()
    headerRequestRef.current = controller

    setHeadersLoading(true)
    setHeadersError(null)
    setHeaders([])
    setColumnOrder([])
    setSelectedColumns([])
    setGroupedRows({})

    try {
      const formData = new FormData()
      formData.append("file", uploadedFile)
      const response = await fetch("/api/reports/headers", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Failed to read workbook headers")
      }
      if (!Array.isArray(payload.headers) || payload.headers.length === 0) {
        throw new Error("No non-empty columns were found in the header row")
      }

      const extractedHeaders = payload.headers as string[]
      setHeaders(extractedHeaders)
      setColumnOrder(extractedHeaders)
      setSelectedColumns(extractedHeaders)

      const extractRes = await fetch("/api/reports/extract", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })
      const extractPayload = await extractRes.json()
      if (!extractRes.ok) {
        throw new Error(extractPayload.error || "Failed to read workbook rows")
      }

      const nextGrouped = (extractPayload.grouped || {}) as Record<string, Record<string, unknown>[]>
      setGroupedRows(nextGrouped)
    } catch (error) {
      if (controller.signal.aborted) return
      const message =
        error instanceof Error ? error.message : "Failed to read workbook headers"
      setHeadersError(message)
      toast.error(message)
    } finally {
      if (!controller.signal.aborted) {
        setHeadersLoading(false)
      }
    }
  }, [])

  React.useEffect(() => {
    return () => headerRequestRef.current?.abort()
  }, [])

  const onDrop = React.useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      toast.error("Invalid file. Please upload a .xlsx file under 25MB.");
      return;
    }

    const uploadedFile = acceptedFiles[0]
    if (uploadedFile) {
      if (!uploadedFile.name.endsWith('.xlsx')) {
        toast.error("Please upload a valid .xlsx Excel file");
        return;
      }
      if (uploadedFile.size > MAX_FILE_SIZE) {
        toast.error("File is too large. Maximum size is 25MB.");
        return;
      }
      setFile(uploadedFile);
      void extractHeaders(uploadedFile)
    }
  }, [extractHeaders])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    multiple: false
  })

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    headerRequestRef.current?.abort()
    setFile(null)
    setHeaders([])
    setColumnOrder([])
    setSelectedColumns([])
    setGroupedRows({})
    setHeadersError(null)
    setHeadersLoading(false)
  }

  const handleGenerateAndSend = async () => {
    if (!file) {
      toast.error("Please upload a file first")
      return
    }
    if (headersLoading || headersError) {
      toast.error("Wait for the report columns to load before generating reports")
      return
    }
    if (selectedColumns.length === 0) {
      toast.error("Select at least one report column")
      return
    }
    if (validation?.blockingCount) {
      toast.error("Resolve validation errors before generating reports")
      return
    }

    const orderedSelection = columnOrder.filter((column) =>
      selectedColumns.includes(column),
    )
    await uploadReport(file, previewMode, orderedSelection, orderedSelection);
  }

  const handleReset = () => {
    setFile(null);
    setHeaders([])
    setColumnOrder([])
    setSelectedColumns([])
    setGroupedRows({})
    setHeadersError(null)
  }

  const validation = (() => {
    if (!headers.length) return null
    const store = loadClientStore()
    return buildValidationSummary({
      headers,
      selectedColumns,
      grouped: groupedRows,
      clients: store.clients,
    })
  })()

  if (success || error) {
    return (
      <div className="mx-auto max-w-4xl text-center py-20">
        <PageHeader 
          title="Upload Complete" 
          description=""
        />
        <Card className="max-w-md mx-auto mt-8">
          <CardContent className="p-8">
            {success ? (
              <div className="text-emerald-600 text-2xl font-bold">Success</div>
            ) : (
              <div className="text-red-600 text-2xl font-bold">Upload Failed</div>
            )}
            {error && <p className="mt-2 text-slate-600">{error}</p>}
            
            <Button onClick={handleReset} className="mt-8">
              Process Another File
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader 
        title="Send Reports" 
        description="Upload your latest shipment Excel file to distribute reports to clients."
      />
      
      <div className="mt-8 space-y-8">
        <Card className={cn(
          "border-2 border-dashed transition-colors",
          isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400",
          loading && "opacity-50 pointer-events-none"
        )}>
          <CardContent className="p-0">
            <div 
              {...getRootProps()} 
              className="flex flex-col items-center justify-center py-20 cursor-pointer text-center px-6"
            >
              <input {...getInputProps()} />
              
              {!file ? (
                <>
                  <div className="rounded-full bg-blue-100 p-4 mb-4">
                    <UploadCloud className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {isDragActive ? "Drop the Excel file here" : "Drag & drop your Excel file here"}
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    or click to browse from your computer
                  </p>
                  <p className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    Accepted format: .xlsx (Max 25MB)
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center animate-in zoom-in duration-200">
                  <div className="rounded-lg bg-emerald-100 p-4 mb-4 shadow-sm border border-emerald-200">
                    <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{file.name}</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRemoveFile}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove File
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {file && (
          headersLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-10 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Reading the header row...
              </CardContent>
            </Card>
          ) : headersError ? (
            <Card className="border-red-200">
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="font-semibold text-slate-900">Could not read report columns</p>
                  <p className="mt-1 text-sm text-slate-500">{headersError}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void extractHeaders(file)}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : headers.length > 0 ? (
            <>
              <ValidationSummaryCard summary={validation} open={summaryOpen} onToggle={() => setSummaryOpen((current) => !current)} />
              <ReportColumnSelector
                headers={headers}
                columnOrder={columnOrder}
                selectedColumns={selectedColumns}
                onColumnOrderChange={setColumnOrder}
                onSelectedColumnsChange={setSelectedColumns}
              />
            </>
          ) : null
        )}

        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="flex items-center space-x-2 bg-slate-50 px-4 py-3 rounded-lg border">
            <Switch 
              id="preview-mode" 
              checked={previewMode}
              onCheckedChange={setPreviewMode}
            />
            <Label htmlFor="preview-mode" className="font-medium cursor-pointer">
              Preview Mode (Download reports locally instead of sending via n8n)
            </Label>
          </div>

          <Button 
            size="lg" 
            className="w-full sm:w-auto min-w-[250px] h-14 text-lg shadow-md"
            disabled={
              !file ||
              loading ||
              headersLoading ||
              Boolean(headersError) ||
              selectedColumns.length === 0 ||
              Boolean(validation?.blockingCount)
            }
            onClick={handleGenerateAndSend}
          >
            {loading && !isProgressModalOpen ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              previewMode ? "Generate & Download" : "Generate & Send Reports"
            )}
          </Button>
        </div>
      </div>

      <DownloadProgressModal 
        isOpen={isProgressModalOpen}
        progress={progress}
        results={results}
        onCancel={handleCancel}
        onRetry={handleRetry}
        onClose={closeProgressModal}
        onDownload={triggerDownload}
      />
    </div>
  )
}

function ValidationSummaryCard({
  summary,
  open,
  onToggle,
}: {
  summary: ValidationSummary | null
  open: boolean
  onToggle: () => void
}) {
  if (!summary) return null

  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-4 p-6">
        <button type="button" className="flex w-full items-center justify-between" onClick={onToggle}>
          <div className="text-left">
            <div className="text-lg font-semibold">Validation Summary</div>
            <div className="text-sm text-slate-500">
              {summary.blockingCount > 0 ? "Fix blocking issues before generating reports." : "No blocking errors found."}
            </div>
          </div>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Ready" value={summary.readyCount} icon={CheckCircle2} tone="emerald" />
          <Stat label="Warnings" value={summary.warningCount} icon={Info} tone="amber" />
          <Stat label="Blocking" value={summary.blockingCount} icon={AlertTriangle} tone="red" />
        </div>

        {open && (
          <div className="space-y-3 text-sm">
            {summary.details.unknownClients.length > 0 && (
              <Detail title="Unknown Clients" items={summary.details.unknownClients} />
            )}
            {summary.details.duplicateAliases.length > 0 && (
              <Detail title="Duplicate Alias Found" items={summary.details.duplicateAliases} />
            )}
            {summary.details.duplicateCanonicalNames.length > 0 && (
              <Detail title="Duplicate Canonical Client" items={summary.details.duplicateCanonicalNames} />
            )}
            {summary.details.missingRecipients.length > 0 && (
              <Detail title="Missing Recipient" items={summary.details.missingRecipients} />
            )}
            {summary.details.invalidEmails.length > 0 && (
              <Detail title="Invalid Email" items={summary.details.invalidEmails} />
            )}
            {summary.details.missingClientColumn && <Notice title="Required Client Column Missing" />}
            {summary.details.emptyMis && <Notice title="Empty MIS" />}
            {summary.details.zeroShipmentClients.length > 0 && (
              <Detail title="Clients with zero shipments" items={summary.details.zeroShipmentClients} />
            )}
            {summary.details.inactiveClients.length > 0 && (
              <Detail title="Inactive Clients" items={summary.details.inactiveClients} />
            )}
            {summary.details.unusedAliases.length > 0 && (
              <Detail title="Unused aliases" items={summary.details.unusedAliases} />
            )}
            {summary.details.unusedClients.length > 0 && (
              <Detail title="Unused clients" items={summary.details.unusedClients} />
            )}
            {summary.details.duplicateEmails.length > 0 && (
              <Detail title="Duplicate emails inside TO/CC" items={summary.details.duplicateEmails} />
            )}
            {summary.details.unknownWorkbookColumns.length > 0 && (
              <Detail title="Unknown workbook columns" items={summary.details.unknownWorkbookColumns} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  tone: "emerald" | "amber" | "red"
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  }
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  )
}

function Detail({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-slate-600">{items.join(", ")}</div>
    </div>
  )
}

function Notice({ title }: { title: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3 font-medium">
      {title}
    </div>
  )
}
