# 🌸 Cura-me · Site de Ingressos

Site de venda de ingressos do evento **Cura-me — Há graça no processo da cura**
(Fonte Church · 12 de Setembro de 2026 · Av. Independência, 36 · Maringá — Alvorada).

**Como funciona a venda:**

1. A pessoa preenche nome, e-mail, WhatsApp e quantidade no site.
2. Paga com **Pix ou cartão** no ambiente seguro do **Mercado Pago**.
3. Recebe automaticamente um **e-mail com o(s) ingresso(s) e QR Code**.
4. No dia do evento, a equipe valida os QR Codes pela página **`/validar`** do próprio site.

---

## O que você precisa criar (tudo tem plano grátis)

| Serviço | Para quê | Onde |
|---|---|---|
| **Mercado Pago** | Receber os pagamentos | [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers/panel/app) |
| **Supabase** | Banco de dados (pedidos e ingressos) | [supabase.com](https://supabase.com) |
| **Gmail (senha de app)** | Enviar os e-mails com ingressos | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) |
| **Vercel** | Hospedar o site | [vercel.com](https://vercel.com) |

---

## Passo 1 — Banco de dados (Supabase)

1. Crie uma conta em [supabase.com](https://supabase.com) → **New project** (nome: `curame`, região: `South America (São Paulo)`).
2. No projeto, abra **SQL Editor** → cole todo o conteúdo do arquivo [`supabase.sql`](./supabase.sql) → **Run**.
3. Vá em **Project Settings → API Keys** e copie:
   - **Project URL** → vai em `SUPABASE_URL`
   - **service_role** (secret) → vai em `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ A `service_role` é secreta: fica só nas variáveis de ambiente, nunca no código nem no git.

## Passo 2 — Mercado Pago

1. Acesse o [painel de desenvolvedores](https://www.mercadopago.com.br/developers/panel/app) com a conta que vai **receber o dinheiro**.
2. **Criar aplicação** → nome `Cura-me Ingressos` → solução de pagamento: **CheckoutPro**.
3. Em **Credenciais de produção**, copie o **Access Token** → vai em `MP_ACCESS_TOKEN`.

> Para testar sem dinheiro real antes de lançar, use o Access Token de **Credenciais de teste**
> e pague com os [cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards).
> Depois é só trocar pelo token de produção.

## Passo 3 — E-mail (Gmail)

1. Na conta Google que vai enviar os ingressos, ative a **verificação em 2 etapas**.
2. Acesse [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → crie uma senha de app chamada `curame`.
3. Use assim:
   - `SMTP_USER` = seu e-mail do Gmail
   - `SMTP_PASS` = a senha de app gerada (16 letras, sem espaços)

> Funciona com qualquer SMTP (Resend, Brevo, etc.) — basta ajustar `SMTP_HOST`/`SMTP_PORT`.

## Passo 4 — Rodar no seu computador

```bash
cd site
copy .env.example .env.local
# → abra o .env.local e preencha os valores dos passos 1 a 3
npm install
npm run dev
```

Abra <http://localhost:3000>. 🎉

> Localmente o pagamento até abre, mas a confirmação automática (webhook) só funciona
> com o site publicado (o Mercado Pago precisa de uma URL pública para avisar o pagamento).

## Passo 5 — Publicar (Vercel)

1. Suba a pasta `site` para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New Project** → importe o repositório.
3. Em **Environment Variables**, cadastre todas as variáveis do `.env.example`, com:
   - `NEXT_PUBLIC_SITE_URL` = a URL final do site (ex.: `https://curame.vercel.app`) — **sem barra no final**
   - `ADMIN_PIN` = um PIN numérico que só a equipe da portaria vai saber
4. **Deploy**. Pronto, o site está no ar.

## Passo 6 — Webhook do Mercado Pago (confirmação automática)

1. No [painel da aplicação](https://www.mercadopago.com.br/developers/panel/app) → **Webhooks → Configurar notificações**.
2. Modo **Produção** · URL: `https://SEU-SITE.vercel.app/api/webhook`
3. Evento: **Pagamentos** → Salvar.
4. Copie a **assinatura secreta** exibida → cadastre na Vercel como `MP_WEBHOOK_SECRET` → faça **Redeploy**.

> Mesmo que o webhook atrase, o site confere o pagamento direto no Mercado Pago quando o
> comprador volta para a página de confirmação — ninguém fica sem ingresso.

## Passo 7 — No dia do evento (portaria)

1. A equipe abre `https://SEU-SITE.vercel.app/validar` no celular e digita o `ADMIN_PIN` (uma vez por aparelho).
2. Escaneia o QR Code do ingresso com a **câmera do celular** → o link já abre com o código preenchido.
3. Confere o nome → toca em **✔ Confirmar entrada**.
4. Se o mesmo QR for apresentado de novo, aparece **“Já utilizado”** com o horário. ✅

---

## Mudar preço, textos, data etc.

Quase tudo está em um único arquivo: [`src/lib/event.ts`](./src/lib/event.ts)
(preço, horário, endereço, preletoras, máximo de ingressos por compra).
As cores estão no topo de [`src/app/globals.css`](./src/app/globals.css).

## Acompanhar as vendas

- **Dinheiro:** painel do Mercado Pago (Atividade).
- **Lista de compradores e ingressos:** Supabase → **Table Editor** → tabelas `orders` e `tickets`.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| E-mail não chegou | Caixa de spam; ou `SMTP_PASS` errada (veja a coluna `email_error` na tabela `orders`) |
| Pagamento aprovado mas pedido “pendente” | Webhook não configurado (Passo 6) — abre a página de sucesso que ele se corrige |
| “ADMIN_PIN não configurado” | Falta a variável `ADMIN_PIN` na Vercel |
| Pagamento de teste recusado | Use os cartões de teste oficiais com credenciais de teste |

## Estrutura do projeto

```
site/
├── supabase.sql              ← esquema do banco (rodar no Supabase)
├── .env.example              ← modelo das variáveis de ambiente
└── src/
    ├── lib/event.ts          ← DADOS DO EVENTO (preço, textos, data…)
    ├── lib/orders.ts         ← aprovação de pedidos + geração de ingressos
    ├── lib/mailer.ts         ← e-mail com QR Code
    ├── app/page.tsx          ← página principal (landing + formulário)
    ├── app/sucesso|pendente|erro
    ├── app/ingresso/[code]   ← ingresso digital com QR Code
    ├── app/validar           ← portaria (validação de ingressos)
    └── app/api/
        ├── checkout          ← cria o pedido e o link de pagamento
        ├── webhook           ← recebe a confirmação do Mercado Pago
        ├── order/[id]        ← status do pedido (página de retorno)
        └── validate          ← valida/queima ingresso na portaria
```
