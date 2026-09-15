/** Leitura de extratos bancários no formato OFX (versões 1.x SGML e 2.x XML). */

export type LancamentoOFX = {
  data: string; // YYYY-MM-DD
  valor: number; // negativo = saída
  descricao: string;
  fitid: string | null;
  hash: string;
};

const tag = (bloco: string, nome: string): string | null => {
  const fechado = new RegExp(`<${nome}>([\\s\\S]*?)</${nome}>`, "i").exec(bloco);
  if (fechado?.[1] !== undefined) return fechado[1].trim();
  const aberto = new RegExp(`<${nome}>([^<\\r\\n]*)`, "i").exec(bloco);
  return aberto?.[1] !== undefined ? aberto[1].trim() : null;
};

/** DTPOSTED vem como AAAAMMDD[HHMMSS][.000[FUSO]] — usamos só a parte da data. */
const dataOFX = (bruto: string | null): string | null => {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec((bruto ?? "").trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

const limpar = (t: string) =>
  t
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

/** Extrai os lançamentos (STMTTRN) de um arquivo OFX. */
export function lerOFX(conteudo: string): LancamentoOFX[] {
  const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const saida: LancamentoOFX[] = [];
  for (const bloco of blocos) {
    const data = dataOFX(tag(bloco, "DTPOSTED") ?? tag(bloco, "DTUSER"));
    const bruto = (tag(bloco, "TRNAMT") ?? "").replace(/\s/g, "").replace(",", ".");
    const valor = Number(bruto);
    if (!data || !Number.isFinite(valor) || valor === 0) continue;
    const descricao = limpar(tag(bloco, "MEMO") ?? tag(bloco, "NAME") ?? "Lançamento do extrato");
    const fitid = tag(bloco, "FITID");
    saida.push({
      data,
      valor,
      descricao,
      fitid: fitid || null,
      hash: `${data}|${valor.toFixed(2)}|${fitid || descricao}`,
    });
  }
  return saida.sort((a, b) => a.data.localeCompare(b.data));
}
