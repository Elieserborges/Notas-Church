import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Corresponde a todos os caminhos de solicitação, exceto:
         * - _next/static (arquivos estáticos)
         * - _next/image (arquivos de otimização de imagem)
         * - favicon.ico (ícone de favoritos)
         * - imagens (svg, png, jpg, jpeg, gif, webp)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
