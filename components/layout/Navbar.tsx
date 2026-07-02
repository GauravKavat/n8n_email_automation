import { Package } from "lucide-react"

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center bg-slate-50 px-6">
      <div className="flex items-center gap-2 font-semibold text-lg text-blue-900">
        <Package className="h-6 w-6 text-blue-600" />
        <span>Logistics Report Automation</span>
      </div>
    </header>
  )
}
