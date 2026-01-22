import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: google('gemini-1.5-flash'),
        messages,
        system: `
      Você é um assistente teológico sábio, amigável e especialista em Bíblia.
      Seu objetivo é ajudar o usuário a entender as escrituras, tirar dúvidas teológicas e oferecer conselhos baseados na Bíblia.
      Use formatação Markdown para deixar suas respostas bonitas e legíveis.
      Seja conciso, mas profundo. Evite polêmicas desnecessárias, foque no consenso cristão histórico e na aplicação prática.
    `,
    });

    return result.toTextStreamResponse();
}
