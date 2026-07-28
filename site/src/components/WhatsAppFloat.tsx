const MENSAGEM = "PRECISO DE AJUDA COM MINHA INSCRIÇÃO.";

/** Botão flutuante de WhatsApp para quem precisa de ajuda com a inscrição. */
export function WhatsAppFloat({ whatsapp }: { whatsapp: string }) {
  const href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(MENSAGEM)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="Precisa de ajuda com a inscrição? Fale conosco no WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="33" height="33" fill="#fff" aria-hidden="true">
        <path d="M16.04 4C9.9 4 4.92 8.98 4.92 15.12c0 2.05.56 4.05 1.62 5.8L4 28l7.28-2.48a11.06 11.06 0 0 0 4.76 1.08h.01c6.14 0 11.12-4.98 11.12-11.12 0-2.97-1.16-5.76-3.26-7.86A11.05 11.05 0 0 0 16.04 4zm0 20.36h-.01c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.9 1.33 1.35-3.8-.2-.31a9.2 9.2 0 0 1-1.4-4.9c0-5.1 4.15-9.24 9.26-9.24 2.47 0 4.79.96 6.54 2.71a9.18 9.18 0 0 1 2.71 6.54c0 5.1-4.15 9.25-9.25 9.25zm5.08-6.93c-.28-.14-1.65-.81-1.9-.9-.26-.1-.44-.14-.63.14-.18.28-.72.9-.88 1.09-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.24-1.38-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.49.14-.16.18-.28.28-.46.09-.19.05-.35-.02-.49-.07-.14-.63-1.51-.86-2.07-.23-.55-.46-.47-.63-.48l-.54-.01c-.18 0-.49.07-.74.35-.26.28-.97.95-.97 2.32 0 1.37 1 2.69 1.14 2.87.14.18 1.96 3 4.76 4.21.66.29 1.18.46 1.59.59.67.21 1.28.18 1.76.11.54-.08 1.65-.67 1.89-1.32.23-.65.23-1.2.16-1.32-.06-.12-.25-.19-.53-.33z" />
      </svg>
    </a>
  );
}
