"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Send, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Client Management", href: "/clients", icon: Users },
  { name: "Send Reports", href: "/send", icon: Send },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex-col border-r bg-slate-50 hidden md:flex">
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-900"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-blue-700" : "text-slate-400 group-hover:text-slate-500"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
