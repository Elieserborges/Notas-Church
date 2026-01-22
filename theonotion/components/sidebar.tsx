"use client"

import * as React from "react"
import { Book, MessageSquare, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChatComponent } from "@/components/chat-component"
import { BibleReader } from "@/components/bible-reader"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
}

export function Sidebar({ className, isCollapsed, setIsCollapsed }: SidebarProps) {
    return (
        <div
            className={cn(
                "relative flex flex-col border-l bg-background transition-all duration-300",
                isCollapsed ? "w-12" : "w-80",
                className
            )}
        >
            <div className="flex h-12 items-center justify-between border-b px-2">
                {!isCollapsed && <span className="font-semibold px-2">Assistente</span>}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="sr-only">Toggle Sidebar</span>
                </Button>
            </div>

            <div className="flex-1 overflow-hidden">
                {isCollapsed ? (
                    <div className="flex flex-col items-center py-4 gap-4">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Book className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">Bíblia</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MessageSquare className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">Chat IA</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                ) : (
                    <Tabs defaultValue="bible" className="h-full flex flex-col">
                        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                            <TabsTrigger
                                value="bible"
                                className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                            >
                                Bíblia
                            </TabsTrigger>
                            <TabsTrigger
                                value="chat"
                                className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                            >
                                Chat IA
                            </TabsTrigger>
                        </TabsList>
                        <ScrollArea className="flex-1">
                            <TabsContent value="bible" className="h-full border-none m-0 p-0 overflow-hidden flex flex-col">
                                <BibleReader />
                            </TabsContent>
                            <TabsContent value="chat" className="h-full border-none m-0 p-0 overflow-hidden flex flex-col">
                                <ChatComponent />
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                )}
            </div>
        </div>
    )
}
