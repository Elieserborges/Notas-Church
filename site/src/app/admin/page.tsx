import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AdminApp } from "@/components/admin/AdminApp";
import "./admin.css";

// Fonte do painel (design system VERUS).
const inter = Inter({ subsets: ["latin"], variable: "--font-admin", display: "swap" });

// Painel interno — não deve ser indexado por buscadores.
export const metadata: Metadata = {
  title: "Painel · Face a Face",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className={inter.variable}>
      <AdminApp />
    </div>
  );
}
