import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDays, ArrowRight, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { generateDailyDevotional } from "@/app/actions/generate-devotional"

interface DevotionalData {
    verseReference: string
    verseText: string
    title: string
    theologicalExplanation: string
    actionPoints: string[]
}

export function DailyDevotionalCard() {
    const [data, setData] = useState<DevotionalData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadDevotional() {
            // In a real app we would check if we already have today's devotional in DB
            const result = await generateDailyDevotional()
            if (result.success && result.data) {
                setData(result.data)
            }
            setLoading(false)
        }
        loadDevotional()
    }, [])

    if (loading) {
        return (
            <Card className="w-full max-w-2xl mx-auto shadow-md border-muted-foreground/20 animate-pulse">
                <CardHeader>
                    <div className="h-4 w-32 bg-muted rounded mb-2"></div>
                    <div className="h-8 w-64 bg-muted rounded"></div>
                </CardHeader>
                <CardContent className="h-40 bg-muted/20"></CardContent>
            </Card>
        )
    }

    if (!data) return null

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-md border-muted-foreground/20">
            <CardHeader>
                <div className="flex items-center space-x-2 text-primary mb-2">
                    <CalendarDays className="h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Devocional do Dia</span>
                </div>
                <CardTitle className="text-3xl font-serif">{data.title}</CardTitle>
                <CardDescription className="text-lg mt-2">
                    "{data.verseText}"
                    <br />
                    <span className="font-semibold text-foreground">— {data.verseReference}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="leading-relaxed text-muted-foreground">
                    {data.theologicalExplanation}
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm flex items-center"><Sparkles className="w-4 h-4 mr-2 text-yellow-500" /> Pontos de Ação:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        {data.actionPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                        ))}
                    </ul>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full sm:w-auto">
                    Ler devocional completo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    )
}
