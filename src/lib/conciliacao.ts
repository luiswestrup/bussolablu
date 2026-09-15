import type { ContaPagar, ContaReceber } from "@/lib/dados";
import { liquidoRecebimento } from "@/lib/dados";
import type { LancamentoOFX } from "@/lib/ofx";

export type Candidato = {
  id: string;
  tabela: "conta_pagar" | "conta_receber";
  descricao: string;
  data: string;
  valor: number; // com sinal (saída negativa)
  conciliado: boolean;
};

export type Resultado = {
  linha: LancamentoOFX;
  candidatos: Candidato[];
};

const dias = (a: string, b: string) =>
  Math.abs(Date.parse(`${a}T12:00:00`) - Date.parse(`${b}T12:00:00`)) / 86_400_000;

/** Lançamentos já baixados de uma conta bancária, no formato de candidato. */
export function candidatosDaConta(
  contaId: string,
  pagar: ContaPagar[],
  receber: ContaReceber[],
): Candidato[] {
  const p: Candidato[] = pagar
    .filter((c) => c.conta_bancaria_id === contaId && c.status === "pago" && c.data_pagamento)
    .map((c) => ({
      id: c.id,
      tabela: "conta_pagar" as const,
      descricao: c.descricao,
      data: c.data_pagamento!,
      valor: -Number(c.valor_pago ?? c.valor),
      conciliado: !!c.conciliado,
    }));
  const r: Candidato[] = receber
    .filter((c) => c.conta_bancaria_id === contaId && c.status === "recebido" && c.data_recebimento)
    .map((c) => ({
      id: c.id,
      tabela: "conta_receber" as const,
      descricao: c.descricao,
      data: c.data_recebimento!,
      valor: liquidoRecebimento(c),
      conciliado: !!c.conciliado,
    }));
  return [...p, ...r];
}

/**
 * Casa cada linha do extrato com os lançamentos baixados:
 * mesmo sinal, mesmo valor (tolerância de 1 centavo) e até `toleranciaDias` de diferença.
 * Um candidato = conciliação automática; zero ou vários = divergência.
 */
export function casarLinhas(
  linhas: LancamentoOFX[],
  candidatos: Candidato[],
  toleranciaDias = 3,
): Resultado[] {
  const usados = new Set<string>();
  const resultados: Resultado[] = [];
  // Primeiro passe: data exata; depois, dentro da tolerância.
  for (const exato of [true, false]) {
    for (const linha of linhas) {
      const jaFeito = resultados.find((r) => r.linha.hash === linha.hash);
      if (jaFeito && jaFeito.candidatos.length === 1) continue;
      const possiveis = candidatos.filter(
        (c) =>
          !usados.has(`${c.tabela}:${c.id}`) &&
          Math.sign(c.valor) === Math.sign(linha.valor) &&
          Math.abs(Math.abs(c.valor) - Math.abs(linha.valor)) < 0.01 &&
          (exato ? c.data === linha.data : dias(c.data, linha.data) <= toleranciaDias),
      );
      if (jaFeito) {
        jaFeito.candidatos = possiveis;
      } else {
        resultados.push({ linha, candidatos: possiveis });
      }
      if (possiveis.length === 1) usados.add(`${possiveis[0]!.tabela}:${possiveis[0]!.id}`);
    }
  }
  return linhas.map((l) => resultados.find((r) => r.linha.hash === l.hash) ?? { linha: l, candidatos: [] });
}
