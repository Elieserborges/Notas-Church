import { Suspense } from "react";
import { ValidateClient } from "@/components/ValidateClient";

export const metadata = {
  title: "Validação de ingressos · Face a Face",
  robots: { index: false },
};

export default function ValidarPage() {
  return (
    <main className="validate-page">
      <Suspense fallback={<div className="spinner" />}>
        <ValidateClient />
      </Suspense>
    </main>
  );
}
