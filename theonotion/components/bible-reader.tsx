"use client"

import { useState, useEffect } from "react"
import { getBibleChapter, BIBLE_BOOKS, type BibleChapter } from "@/lib/bible-api"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function BibleReader() {
    const [selectedBook, setSelectedBook] = useState("John")
    const [chapter, setChapter] = useState(1)
    const [data, setData] = useState<BibleChapter | null>(null)
    const [loading, setLoading] = useState(false)

    // Simple hardcoded chapter counts for a few books or just handle 1-150 generically
    // In a real app, strict chapter counts per book is better.
    const CHAPTERS_LIMIT = 150

    useEffect(() => {
        async function load() {
            setLoading(true)
            const res = await getBibleChapter(selectedBook, chapter)
            setData(res)
            setLoading(false)
        }
        load()
    }, [selectedBook, chapter])

    const nextChapter = () => setChapter(c => c + 1)
    const prevChapter = () => setChapter(c => Math.max(1, c - 1))

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between p-2 border-b gap-2 bg-background/95 backdrop-blur z-10">
                <Select value={selectedBook} onValueChange={b => { setSelectedBook(b); setChapter(1) }}>
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue placeholder="Livro" />
                    </SelectTrigger>
                    <SelectContent>
                        {BIBLE_BOOKS.map(b => (
                            <SelectItem key={b.value} value={b.value}>
                                {b.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={prevChapter} disabled={chapter <= 1}>
                        <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center">{chapter}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextChapter}>
                        <ChevronRight className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : data ? (
                    <div className="space-y-4 pb-8">
                        <h2 className="text-xl font-serif font-bold text-center mb-4">{BIBLE_BOOKS.find(b => b.value === selectedBook)?.label} {chapter}</h2>
                        {data.verses.map((verse) => (
                            <p key={verse.verse} className="font-serif leading-relaxed text-sm">
                                <sup className="text-xs text-muted-foreground mr-1 select-none">{verse.verse}</sup>
                                {verse.text}
                            </p>
                        ))}
                        <p className="text-xs text-muted-foreground text-center mt-6 italic bg-muted/30 p-2 rounded">
                            {data.translation_name}
                        </p>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground p-8">
                        Erro ao carregar texto.
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
