"use client";

import { useChat } from 'ai/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useEffect, useRef } from 'react';

export function ChatComponent() {
    const { messages, input, setInput, handleInputChange, handleSubmit, isLoading } = useChat();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground mt-8 p-4">
                        <p>Olá! Sou seu assistente bíblico.</p>
                        <p className="text-xs mt-2">Pergunte sobre um versículo, tema teológico ou peça uma oração.</p>
                    </div>
                )}
                {messages.map(m => (
                    <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                            className={`rounded-lg px-3 py-2 max-w-[85%] ${m.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                                }`}
                        >
                            {m.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start">
                        <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-xs animate-pulse">
                            Escrevendo...
                        </div>
                    </div>
                )}
            </div>
            <div className="p-4 border-t bg-background">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Pergunte algo..."
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
