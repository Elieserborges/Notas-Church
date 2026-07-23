"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type OrderData = {
  id: string;
  status: string;
  name: string;
  email: string;
  quantity: number;
  total: number;
  tickets: { code: string; used_at: string | null }[];
};

const POLL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutos

export function OrderStatus({ mode }: { mode: "sucesso" | "pendente" }) {
  const params = useSearchParams();
  const orderId = params.get("pedido");
  const paymentId = params.get("payment_id") ?? params.get("collection_id");

  const [order, setOrder] = useState<OrderData | null>(null);
  const [failed, setFailed] = useState(false);
  const polls = useRef(0);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const qs = paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : "";
      const res = await fetch(`/api/order/${orderId}${qs}`, { cache: "no-store" });
      if (res.status === 404) {
        setFailed(true);
        return;
      }
      if (!res.ok) return;
      const data: OrderData = await res.json();
      setOrder(data);
    } catch {
      // rede oscilou — o próximo poll tenta de novo
    }
  }, [orderId, paymentId]);

  useEffect(() => {
    if (!orderId) return;
    fetchOrder();
    const timer = setInterval(() => {
      polls.current += 1;
      if (polls.current > MAX_POLLS) {
        clearInterval(timer);
        return;
      }
      fetchOrder();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [orderId, fetchOrder]);

  // Sem pedido na URL
  if (!orderId || failed) {
    return (
      <div className="status-card">
        <div className="status-emoji">🤔</div>
        <h1>Pedido não encontrado</h1>
        <p>
          Não localizamos este pedido. Se você acabou de pagar, confira o e-mail
          de confirmação do Mercado Pago ou fale com a organização.
        </p>
        <Link className="btn" href="/#ingressos">
          Voltar para o site
        </Link>
      </div>
    );
  }

  // Aprovado 🎉
  if (order?.status === "approved") {
    return (
      <div className="status-card">
        <div className="status-emoji">🎉</div>
        <h1>Pagamento confirmado!</h1>
        <p>
          {order.name.split(" ")[0]}, sua inscrição está garantida. Enviamos{" "}
          {order.quantity === 1 ? "o ingresso" : `os ${order.quantity} ingressos`}{" "}
          com QR Code para <strong>{order.email}</strong>.
        </p>
        <div className="ticket-list">
          {order.tickets.map((t) => (
            <div className="ticket-item" key={t.code}>
              <span className="code">{t.code}</span>
              <Link href={`/ingresso/${t.code}`} target="_blank">
                Ver ingresso →
              </Link>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13.5 }}>
          Não achou o e-mail? Olhe a caixa de <strong>spam</strong> — ou salve
          os ingressos pelos links acima.
        </p>
      </div>
    );
  }

  // Rejeitado
  if (order?.status === "rejected") {
    return (
      <div className="status-card">
        <div className="status-emoji">😕</div>
        <h1>Pagamento não aprovado</h1>
        <p>
          O pagamento não foi concluído. Nenhum valor foi cobrado — você pode
          tentar novamente com outro meio de pagamento.
        </p>
        <Link className="btn" href="/#ingressos">
          Tentar novamente
        </Link>
      </div>
    );
  }

  // Pendente / carregando
  return (
    <div className="status-card">
      <div className="spinner" aria-hidden="true" />
      <h1>
        {mode === "pendente"
          ? "Quase lá! Aguardando o pagamento…"
          : "Confirmando seu pagamento…"}
      </h1>
      <p>
        {mode === "pendente"
          ? "Assim que o Mercado Pago confirmar (Pix costuma levar segundos), seu ingresso será liberado e enviado por e-mail."
          : "Só um instante — estamos confirmando com o Mercado Pago."}
      </p>
      <p style={{ fontSize: 13.5 }}>
        Esta página atualiza sozinha. Você também receberá tudo por e-mail.
      </p>
    </div>
  );
}
