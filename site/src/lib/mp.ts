import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

function config(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN não configurado (.env.local)");
  }
  return new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
}

export const mpPreference = () => new Preference(config());
export const mpPayment = () => new Payment(config());
