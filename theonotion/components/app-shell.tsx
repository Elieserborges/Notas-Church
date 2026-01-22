"use client"

import * as React from "react"
import { Sidebar } from "@/components/sidebar"

interface AppShellProps {
    children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <main className="flex-1 overflow-y-auto">
                <div className="flex h-full flex-col">
                    {children}
                </div>
            </main>
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
            />
        </div>
    )
}
