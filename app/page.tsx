import Link from "next/link"
import { Send, Users } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader 
        title="Dashboard" 
        description="Welcome to the Logistics Report Automation portal. Please select an action below."
      />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/clients" className="group">
          <Card className="h-full transition-all hover:shadow-md hover:border-blue-200 group-hover:-translate-y-1">
            <CardHeader>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle className="group-hover:text-blue-600 transition-colors">Client Management</CardTitle>
              <CardDescription>
                Manage browser-only client configurations for report distribution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-blue-600 flex items-center">
                Configure Clients &rarr;
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/send" className="group">
          <Card className="h-full transition-all hover:shadow-md hover:border-blue-200 group-hover:-translate-y-1">
            <CardHeader>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Send className="h-6 w-6" />
              </div>
              <CardTitle className="group-hover:text-blue-600 transition-colors">Send Reports</CardTitle>
              <CardDescription>
                Upload your latest shipment Excel file to automatically generate and send reports to all active clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-blue-600 flex items-center">
                Upload & Send &rarr;
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
