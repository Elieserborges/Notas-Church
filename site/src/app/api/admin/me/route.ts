import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/adminAuth";
import { emailDoUsuario } from "@/lib/authServer";

export const runtime = "nodejs";

/**
 * Diz ao painel quem está logado e se tem acesso admin.
 * Sempre 200: o cliente decide a tela (login / sem acesso / painel).
 */
export async function GET(req: Request) {
  const email = await emailDoUsuario(req);
  if (!email) {
    return NextResponse.json({ authenticated: false, isAdmin: false });
  }
  const isAdmin = await isAdminEmail(email);
  return NextResponse.json({ authenticated: true, email, isAdmin });
}
