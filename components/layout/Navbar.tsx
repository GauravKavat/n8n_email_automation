import Link from "next/link"
import { Package } from "lucide-react"

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center border-b bg-white px-6 shadow-sm">
      <div className="flex items-center gap-2 font-semibold text-lg text-blue-900">
        <Package className="h-6 w-6 text-blue-600" />
        <span>Logistics Report Automation</span>
      </div>
      <div className="ml-auto flex items-center space-x-4">
        {/* Additional navbar items (user profile, etc.) can go here */}
        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
          U
        </div>
      </div>
    </header>
  )
}
