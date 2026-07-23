import { Suspense } from "react";
import { OrderStatus } from "@/components/OrderStatus";

export const metadata = { title: "Pagamento confirmado · Face a Face" };

export default function SucessoPage() {
  return (
    <main className="status-page">
      <Suspense fallback={<div className="spinner" />}>
        <OrderStatus mode="sucesso" />
      </Suspense>
    </main>
  );
}
