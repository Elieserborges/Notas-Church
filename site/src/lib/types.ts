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
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  email_sent_at: string | null;
  email_error: string | null;
};

export type TicketRow = {
  id: string;
  created_at: string;
  order_id: string;
  code: string;
  used_at: string | null;
};
