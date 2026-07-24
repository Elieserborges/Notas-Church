export type OrderRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  unit_price: string | number;
  total: string | number;
  status: string; // pending | approved | rejected
  tipo: string; // participante | obreiro
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  email_sent_at: string | null;
  email_error: string | null;

  // --- Ficha de inscrição (acampamento) ---
  birth_date: string | null;
  cpf: string | null;
  shirt_size: string | null;
  family_name: string | null;
  family_relationship: string | null;
  family_phone: string | null;
  payment_method: string | null; // pix | cartao | dinheiro
  uses_medication: boolean | null;
  medication_details: string | null;
  climbs_stairs: boolean | null;
  sleeps_top_bunk: boolean | null;
  gc_leader: string | null;
  close_person_name: string | null;
  close_person_phone: string | null;
};

export type TicketRow = {
  id: string;
  created_at: string;
  order_id: string;
  code: string;
  used_at: string | null;
};
