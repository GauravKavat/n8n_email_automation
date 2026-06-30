"use client"

import * as React from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Client } from "@/types/client"
import { Loader2 } from "lucide-react"

export default function DebugPage() {
  const [clients, setClients] = React.useState<Client[]>([])
  const [clientMap, setClientMap] = React.useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchPayload = async () => {
      try {
        const clientsRes = await fetch("/api/clients?active=true&sendReport=true")
        const activeClients: Client[] = await clientsRes.json()
        setClients(activeClients)

        const map: Record<string, any> = {}
        activeClients.forEach((c) => {
          const to = c.toEmails.split("\n").map(e => e.trim()).filter(e => e)
          const cc = c.ccEmails.split("\n").map(e => e.trim()).filter(e => e)
          const bcc = c.bccEmails.split("\n").map(e => e.trim()).filter(e => e)
          
          map[c.excelClientName] = {
            displayName: c.displayName,
            companyName: c.companyName,
            to,
            cc,
            bcc,
            subject: c.subject,
            body: c.bodyTemplate
          }
        })
        setClientMap(map)
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPayload()
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <PageHeader 
        title="Debug Payload" 
        description="Inspect the exact clientMap payload that will be sent to n8n alongside the Excel file."
      />

      <div className="bg-slate-900 rounded-lg p-6 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
          <h3 className="text-slate-200 font-medium">clientMap (JSON Stringified in FormData)</h3>
          <span className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
            {clients.length} active clients
          </span>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Generating payload...
          </div>
        ) : (
          <pre className="text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {JSON.stringify({ clientMap }, null, 2)}
          </pre>
        )}
      </div>

      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-2">How this works</h3>
        <p className="text-sm text-slate-600 mb-4">
          When you click "Generate & Send Reports" on the upload page, a <code>multipart/form-data</code> POST request is sent to the n8n webhook.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
          <li><strong>file:</strong> The raw .xlsx binary file.</li>
          <li><strong>clientMap:</strong> The JSON payload shown above, constructed from all active clients that have "Auto Send" enabled.</li>
        </ul>
      </div>
    </div>
  )
}
