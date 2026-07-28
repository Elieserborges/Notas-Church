import { NextResponse } from "next/server";
import { checarAdmin } from "@/lib/adminAuth";
import { ensureCurrentEvent } from "@/lib/adminEvent";
import { clearConfigCache } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "event-media";
const KINDS = ["logo", "banner", "favicon", "background"];
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/gif": "gif",
};
const MAX = 5 * 1024 * 1024; // 5 MB

/**
 * Sobe uma imagem para o Storage e guarda a URL em events.branding[kind].
 * multipart/form-data: { file, kind }
 */
export async function POST(req: Request) {
  const a = await checarAdmin(req);
  if (!a.ok) return a.res;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");

    if (!KINDS.includes(kind))
      return NextResponse.json({ error: "Tipo de imagem inválido." }, { status: 400 });
    if (!(file instanceof File))
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    if (file.size > MAX)
      return NextResponse.json({ error: "Imagem grande demais (máx. 5 MB)." }, { status: 400 });

    const ext = EXT[file.type];
    if (!ext)
      return NextResponse.json({ error: "Formato não suportado (use PNG, JPG, WEBP, SVG…)." }, { status: 400 });

    const ev = await ensureCurrentEvent();
    const db = supabaseAdmin();
    const buf = Buffer.from(await file.arrayBuffer());
    // Timestamp no nome quebra o cache do navegador quando trocar a imagem.
    const path = `${ev.id}/${kind}-${Date.now()}.${ext}`;

    const up = await db.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: file.type, upsert: true });
    if (up.error) throw new Error(up.error.message);

    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;

    // Registra em media_assets e aponta o branding do evento para a nova URL.
    await db.from("media_assets").insert({ event_id: ev.id, kind, url });
    const { error: upErr } = await db
      .from("events")
      .update({ branding: { ...ev.branding, [kind]: url }, updated_at: new Date().toISOString() })
      .eq("id", ev.id);
    if (upErr) throw new Error(upErr.message);

    clearConfigCache();
    return NextResponse.json({ url, kind });
  } catch (e) {
    console.error("[admin/media]", e);
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 });
  }
}

/** Remove a imagem de um tipo (volta ao padrão do site). ?kind=logo */
export async function DELETE(req: Request) {
  const a = await checarAdmin(req);
  if (!a.ok) return a.res;
  try {
    const kind = new URL(req.url).searchParams.get("kind") ?? "";
    if (!KINDS.includes(kind))
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });

    const ev = await ensureCurrentEvent();
    const branding = { ...ev.branding };
    delete branding[kind];

    const db = supabaseAdmin();
    const { error } = await db
      .from("events")
      .update({ branding, updated_at: new Date().toISOString() })
      .eq("id", ev.id);
    if (error) throw new Error(error.message);

    clearConfigCache();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/media DELETE]", e);
    return NextResponse.json({ error: "Não foi possível remover." }, { status: 500 });
  }
}
