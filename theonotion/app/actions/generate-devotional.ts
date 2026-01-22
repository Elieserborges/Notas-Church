'use server';

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function generateDailyDevotional() {
    try {
        const { object } = await generateObject({
            model: google('gemini-1.5-flash'),
            schema: z.object({
                verseReference: z.string(),
                verseText: z.string(),
                title: z.string(),
                theologicalExplanation: z.string(),
                actionPoints: z.array(z.string()),
            }),
            prompt: `
        Gere um devocional cristão curto e inspirador para o dia de hoje.
        O público é jovem/adulto, buscando produtividade e propósito.
        
        Estrutura desejada:
        1. Um versículo chave bíblico (NVI ou Almeida).
        2. Título cativante.
        3. Uma explicação teológica breve (2-3 parágrafos curtos).
        4. 3 pontos de ação práticos para aplicar no dia a dia.
        
        Mantenha o tom encorajador, sábio e direto.
      `,
        });

        return { success: true, data: object };
    } catch (error) {
        console.error('Error generating devotional:', error);
        return { success: false, error: 'Falha ao gerar devocional' };
    }
}
