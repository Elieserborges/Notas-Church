import { Suspense } from "react";
import { OrderStatus } from "@/components/OrderStatus";

export const metadata = { title: "Aguardando pagamento · Face a Face" };

export default function PendentePage() {
  return (
    <main className="status-page">
      <Suspense fallback={<div className="spinner" />}>
        <OrderStatus mode="pendente" />
      </Suspense>
    </main>
  );
}
