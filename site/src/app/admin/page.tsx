import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import "./admin.css";

// Painel interno — não deve ser indexado por buscadores.
export const metadata: Metadata = {
  title: "Painel · Face a Face",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
