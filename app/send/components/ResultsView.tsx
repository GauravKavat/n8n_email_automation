"use client"

import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type ReportResult = {
  clientName: string
  status: "success" | "failed"
  to?: string
  cc?: string
  generatedFile?: string
  reason?: string
}

interface ResultsViewProps {
  results: ReportResult[]
  onReset: () => void
}

export function ResultsView({ results, onReset }: ResultsViewProps) {
  const successful = results.filter((r) => r.status === "success")
  const failed = results.filter((r) => r.status === "failed")

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Clients Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{results.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{successful.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{failed.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((result, i) => (
            <Card key={i} className={`border-l-4 ${result.status === "success" ? "border-l-emerald-500" : "border-l-red-500"}`}>
              <CardContent className="p-6 flex items-start gap-4">
                <div className="mt-1">
                  {result.status === "success" ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900">{result.clientName}</h4>
                    <span className={`text-sm font-medium ${result.status === "success" ? "text-emerald-600" : "text-red-600"}`}>
                      {result.status === "success" ? "Success" : "Failed"}
                    </span>
                  </div>
                  
                  {result.status === "success" ? (
                    <div className="text-sm text-slate-500 space-y-1 pt-2">
                      {result.to && <p><span className="font-medium text-slate-700">To:</span> {result.to}</p>}
                      {result.cc && <p><span className="font-medium text-slate-700">CC:</span> {result.cc}</p>}
                      {result.generatedFile && <p><span className="font-medium text-slate-700">Generated File:</span> {result.generatedFile}</p>}
                    </div>
                  ) : (
                    <div className="text-sm text-red-600 pt-2">
                      <p><span className="font-medium">Reason:</span> {result.reason}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-6">
        <Button onClick={onReset} size="lg" className="w-full sm:w-auto">
          Process Another File
        </Button>
      </div>
    </div>
  )
}
