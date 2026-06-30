"use client"

import { Loader2 } from "lucide-react"

interface ProcessingOverlayProps {
  status: string
}

export function ProcessingOverlay({ status }: ProcessingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center p-8 rounded-2xl bg-white shadow-xl border border-slate-100 min-w-[300px]">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute h-full w-full rounded-full border-4 border-blue-100"></div>
          <div className="absolute h-full w-full rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          <Loader2 className="h-8 w-8 text-blue-600 animate-pulse" />
        </div>
        <h3 className="mt-6 text-2xl font-semibold text-slate-800">Processing</h3>
        <p className="mt-2 text-slate-500 animate-pulse">{status}</p>
      </div>
    </div>
  )
}
