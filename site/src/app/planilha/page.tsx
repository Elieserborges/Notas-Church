import { SheetClient } from "@/components/SheetClient";

export const metadata = {
  title: "Inscritos · Face a Face",
  robots: { index: false },
};

export default function PlanilhaPage() {
  return (
    <main className="sheet-page">
      <SheetClient />
    </main>
  );
}
