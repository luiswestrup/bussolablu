import type { ContaPagar, NotaFiscalImportada, Parceiro } from "@/lib/dados";

/** Normaliza número de nota/documento para cruzamento (sem zeros à esquerda). */
const chaveDoc = (v: string | null | undefined) =>
  String(v ?? "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");

const dias = (de: string, ate: string) =>
  Math.round((new Date(`${ate}T00:00:00`).getTime() - new Date(`${de}T00:00:00`).getTime()) / 86_400_000);

export type ItemCiclo = {
  id: string;
  fornecedorId: string | null;
  fornecedor: string;
  documento: string;
  descricao: string;
  parcela: string;
  emissao: string;
  origemEmissao: "nota" | "lancamento";
  vencimento: string;
  pagamento: string | null;
  valor: number;
  dias: number;
  pago: boolean;
};

export type CicloFornecedor = {
  fornecedorId: string | null;
  fornecedor: string;
  notas: number;
  totalFaturado: number;
  totalPago: number;
  prazoRealizado: number;
  prazoPrevisto: number;
  prazoGeral: number;
  itens: ItemCiclo[];
};

/** Média de dias ponderada pelo valor de cada parcela. */
const ponderado = (itens: ItemCiclo[]) => {
  const soma = itens.reduce((s, i) => s + i.valor, 0);
  if (soma <= 0) return 0;
  return itens.reduce((s, i) => s + i.dias * i.valor, 0) / soma;
};

/**
 * Ciclo financeiro por fornecedor: intervalo entre a emissão da nota
 * (ou o lançamento, quando não há nota) e o pagamento/vencimento da parcela.
 */
export function calcularCiclo(
  contas: ContaPagar[],
  notas: NotaFiscalImportada[],
  fornecedores: Parceiro[],
  inicio: string,
  fim: string,
): CicloFornecedor[] {
  const porNota = new Map<string, NotaFiscalImportada>();
  notas.forEach((n) => {
    const k = `${n.empresa_id}|${chaveDoc(n.numero_nota)}`;
    if (chaveDoc(n.numero_nota) && !porNota.has(k)) porNota.set(k, n);
  });

  const nomeFor = (id: string | null) =>
    fornecedores.find((f) => f.id === id)?.nome ?? "Sem fornecedor";

  const itens: ItemCiclo[] = [];

  contas.forEach((c) => {
    const pago = c.status === "pago" && !!c.data_pagamento;
    const referencia = pago ? c.data_pagamento! : c.data_vencimento;
    if (referencia < inicio || referencia > fim) return;

    const nota = porNota.get(`${c.empresa_id}|${chaveDoc(c.numero_documento)}`);
    const emissao = nota?.data_emissao ?? (c.criado_em ? String(c.criado_em).slice(0, 10) : null);
    if (!emissao) return;

    const d = dias(emissao, referencia);
    itens.push({
      id: c.id,
      fornecedorId: c.fornecedor_id,
      fornecedor: nomeFor(c.fornecedor_id),
      documento: c.numero_documento ?? "",
      descricao: c.descricao,
      parcela: c.parcela ?? "",
      emissao,
      origemEmissao: nota?.data_emissao ? "nota" : "lancamento",
      vencimento: c.data_vencimento,
      pagamento: pago ? c.data_pagamento : null,
      valor: Number(c.valor_pago ?? c.valor),
      dias: d < 0 ? 0 : d,
      pago,
    });
  });

  const mapa = new Map<string, ItemCiclo[]>();
  itens.forEach((i) => {
    const k = i.fornecedorId ?? "sem";
    mapa.set(k, [...(mapa.get(k) ?? []), i]);
  });

  return [...mapa.values()]
    .map((lista) => {
      const pagos = lista.filter((i) => i.pago);
      const abertos = lista.filter((i) => !i.pago);
      const documentos = new Set(lista.map((i) => i.documento || i.id));
      return {
        fornecedorId: lista[0]!.fornecedorId,
        fornecedor: lista[0]!.fornecedor,
        notas: documentos.size,
        totalFaturado: lista.reduce((s, i) => s + i.valor, 0),
        totalPago: pagos.reduce((s, i) => s + i.valor, 0),
        prazoRealizado: ponderado(pagos),
        prazoPrevisto: ponderado(abertos),
        prazoGeral: ponderado(lista),
        itens: lista.sort((a, b) => a.emissao.localeCompare(b.emissao)),
      };
    })
    .sort((a, b) => b.totalFaturado - a.totalFaturado);
}

/** Prazo médio ponderado da empresa inteira. */
export const prazoMedioGeral = (linhas: CicloFornecedor[]) => {
  const soma = linhas.reduce((s, l) => s + l.totalFaturado, 0);
  if (soma <= 0) return 0;
  return linhas.reduce((s, l) => s + l.prazoGeral * l.totalFaturado, 0) / soma;
};
