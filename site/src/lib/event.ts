// Dados do evento — fonte única da verdade.
// Para mudar preço, horário, textos etc., edite somente este arquivo.

export const EVENT = {
  name: "Face a Face",
  tagline: "Um encontro de homens, face a face com Deus",
  audience: "para homens",
  church: "Fonte Church",
  dateLabel: "15 e 16 de Agosto de 2026",
  /** Prazo final das inscrições — exibido no aviso amarelo do topo do site */
  registrationDeadlineLabel: "13/08/2026",
  // ⚠️ AJUSTAR quando definirem a programação:
  timeLabel: "Programação divulgada em breve",
  isoStart: "2026-08-15T19:00:00-03:00",
  isoEnd: "2026-08-16T22:00:00-03:00",
  // ⚠️ AJUSTAR quando definirem o local (mapsUrl "" esconde o botão do mapa):
  addressLabel: "Local divulgado em breve",
  mapsUrl: "",
  /** Valor da inscrição, em reais */
  price: 230,
  /** Máximo de ingressos por compra */
  maxQuantity: 10,
  /** Parcelamento máximo no cartão (1 = só à vista) */
  maxInstallments: 10,
  /** Prefixo dos códigos de ingresso (4 letras maiúsculas) */
  codePrefix: "FACE",
  /** Identificador para nomes de arquivo (sem espaços/acentos) */
  slug: "face-a-face",
  /** Nome que aparece na fatura do cartão (máx. 16 caracteres) */
  statementDescriptor: "FACEAFACE",
  /** Preletores (deixe [] para esconder a seção) */
  speakers: [] as string[],
};

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
