"use client"

import * as React from "react"
import { UploadCloud, FileSpreadsheet, X, Loader2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useReportUpload } from "@/hooks/useReportUpload"

import { DownloadProgressModal } from "./components/DownloadProgressModal"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export default function SendReportsPage() {
  const [file, setFile] = React.useState<File | null>(null)
  const [previewMode, setPreviewMode] = React.useState(true)
  
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

  const onDrop = React.useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
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
    }
  }, [])

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
    setFile(null)
  }

  const handleGenerateAndSend = async () => {
    if (!file) {
      toast.error("Please upload a file first")
      return
    }

    await uploadReport(file, previewMode);
  }

  const handleReset = () => {
    setFile(null);
  }

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
            disabled={!file || loading}
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
