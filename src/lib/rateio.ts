import type { Movimento, Produto } from "./dados";

/** Parte de um título atribuída a uma categoria. */
export type Fatia = {
  categoriaId: string | null;
  valor: number;
  /** true quando o valor veio do rateio dos itens da nota, não do título. */
  rateado: boolean;
};

type Peso = { categoriaId: string | null; peso: number };

const chaveNota = (empresaId: string, numero: string) => `${empresaId}|${numero.trim()}`;

/** Número da nota gravado na observação da entrada de estoque ("NF-e 1001"). */
const numeroDaObservacao = (obs: string | null): string | null => {
  const m = /^NF-e\s+(.+)$/i.exec((obs ?? "").trim());
  return m?.[1] ? m[1].trim() : null;
};

/**
 * Pesos por categoria de cada nota importada, a partir das entradas de estoque.
 * Permite ratear títulos de notas com produtos de categorias diferentes.
 */
export function mapaRateioNotas(
  movimentos: Movimento[],
  produtos: Produto[],
): Map<string, Peso[]> {
  const categoriaDoProduto = new Map(produtos.map((p) => [p.id, p.categoria_id]));
  const acumulado = new Map<string, Map<string | null, number>>();

  for (const m of movimentos) {
    if (m.tipo !== "entrada") continue;
    const numero = numeroDaObservacao(m.observacao);
    if (!numero) continue;
    const chave = chaveNota(m.empresa_id, numero);
    const qtd = Number(m.quantidade) || 0;
    const valor = qtd * (Number(m.custo_unitario) || 0);
    const peso = valor > 0 ? valor : qtd;
    if (peso <= 0) continue;
    const porCategoria = acumulado.get(chave) ?? new Map<string | null, number>();
    const categoria = categoriaDoProduto.get(m.produto_id) ?? null;
    porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + peso);
    acumulado.set(chave, porCategoria);
  }

  const mapa = new Map<string, Peso[]>();
  for (const [chave, porCategoria] of acumulado) {
    const total = [...porCategoria.values()].reduce((s, v) => s + v, 0);
    if (total <= 0) continue;
    mapa.set(
      chave,
      [...porCategoria.entries()].map(([categoriaId, peso]) => ({ categoriaId, peso: peso / total })),
    );
  }
  return mapa;
}

type TituloRateavel = {
  empresa_id: string;
  categoria_id: string | null;
  numero_documento: string | null;
};

/**
 * Divide o valor de um título entre categorias.
 * Título com categoria definida fica inteiro nela; sem categoria, usa os itens
 * da nota (quando rastreáveis) e, por último, cai em "Sem categoria".
 */
export function distribuirDespesa(
  titulo: TituloRateavel,
  valor: number,
  mapa: Map<string, Peso[]>,
): Fatia[] {
  if (titulo.categoria_id) {
    return [{ categoriaId: titulo.categoria_id, valor, rateado: false }];
  }
  const numero = titulo.numero_documento?.trim();
  const pesos = numero ? mapa.get(chaveNota(titulo.empresa_id, numero)) : undefined;
  if (!pesos || pesos.length === 0) {
    return [{ categoriaId: null, valor, rateado: false }];
  }
  if (pesos.length === 1) {
    return [{ categoriaId: pesos[0]!.categoriaId, valor, rateado: true }];
  }
  // Ajusta a última fatia para a soma bater exatamente com o valor do título.
  const fatias = pesos.map((p) => ({
    categoriaId: p.categoriaId,
    valor: Math.round(valor * p.peso * 100) / 100,
    rateado: true,
  }));
  const diferenca = valor - fatias.reduce((s, f) => s + f.valor, 0);
  fatias[fatias.length - 1]!.valor += diferenca;
  return fatias;
}
