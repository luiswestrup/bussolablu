import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Abas (meses) da planilha "Controle de recebimentos Principe de Joinville".
 * Atualize manualmente esta lista quando um novo mês for criado na planilha.
 */
export const ABAS_PLANILHA: string[] = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const PLANILHA_ID = "1sQ1Smkcz_RsK-UXD9JujqhIi4TUnIAdr0G1SUYKgljI";

export const urlAba = (aba: string) =>
  `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(aba)}`;

export type Pendencia = {
  aba: string;
  linhaNumero: number;
  hash: string;
  cliente: string;
  valorTexto: string;
  banco: string;
  status: string;
  dataPagamento: string;
  dataPasseio: string;
  nfse: string;
  observacoes: string;
  motivo: string;
};

export type ResultadoSync = {
  importadas: number;
  atualizadas: number;
  inalteradas: number;
  ignoradas: number;
  pendentes: Pendencia[];
  erros: { aba: string; mensagem: string }[];
};

/** CSV com suporte a aspas e quebras de linha dentro de células. */
export function parseCSV(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') aspas = true;
    else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((v) => v.trim() !== ""));
}

const normal = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Índices das colunas conhecidas, identificadas pelo texto do cabeçalho. */
export function mapaColunas(cabecalho: string[]): Record<string, number> {
  const alvos: Record<string, string[]> = {
    dataPagamento: ["data de pagamento", "data pagamento"],
    cliente: ["cliente"],
    contato: ["contato"],
    valor: ["valor da reserva", "valor"],
    status: ["status"],
    dataPasseio: ["data do passeio", "data passeio"],
    banco: ["banco"],
    nfse: ["nfse", "nf-se", "nfs-e"],
    observacoes: ["observacoes", "observacao", "obs"],
  };
  const mapa: Record<string, number> = {};
  cabecalho.forEach((titulo, i) => {
    const t = normal(titulo);
    for (const [chave, nomes] of Object.entries(alvos)) {
      if (mapa[chave] === undefined && nomes.some((n) => t === n || t.startsWith(n))) mapa[chave] = i;
    }
  });
  return mapa;
}

export function hashLinha(valores: string[]): string {
  let h = 5381;
  const s = valores.join("|");
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/** Aceita "R$ 1.500,00", "1500.00", "1.500", "1500,5". */
export function parseValor(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return null;
  const temVirgula = limpo.includes(",");
  const normalizado = temVirgula ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Converte "12/03/2025", "2025-03-12" ou "Date(2025,2,12)" em ISO yyyy-mm-dd. */
export function parseData(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  const gviz = t.match(/^Date\((\d+),(\d+),(\d+)/);
  if (gviz) {
    const [, a, m, d] = gviz;
    return `${a}-${String(Number(m) + 1).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
  }
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const [, d, m, a] = br;
    const ano = a!.length === 2 ? `20${a}` : a;
    return `${ano}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0]! : null;
}

export type Cliente = { id: string; nome: string };
export type ContaBanco = { id: string; banco: string };

export async function acharOuCriarCliente(
  supabase: SupabaseClient,
  empresaId: string,
  clientes: Cliente[],
  nome: string,
): Promise<string> {
  const existente = clientes.find((c) => normal(c.nome) === normal(nome));
  if (existente) return existente.id;
  const { data, error } = await supabase
    .from("cliente")
    .insert({ empresa_id: empresaId, nome })
    .select("id, nome")
    .single();
  if (error) throw new Error(error.message);
  clientes.push(data as Cliente);
  return (data as Cliente).id;
}

export const acharConta = (contas: ContaBanco[], banco: string) =>
  contas.find((c) => normal(c.banco) === normal(banco)) ?? null;

export function montarObservacao(observacoes: string, dataPasseio: string): string | null {
  const partes = [observacoes.trim()].filter(Boolean);
  const passeio = parseData(dataPasseio);
  if (passeio) partes.push(`Passeio em ${passeio.split("-").reverse().join("/")}`);
  return partes.length ? partes.join(" — ") : null;
}

export async function baixarAba(aba: string): Promise<string[][]> {
  let resposta: Response;
  try {
    resposta = await fetch(urlAba(aba));
  } catch {
    throw new Error(
      "não foi possível acessar a planilha — verifique se o link de compartilhamento ainda está ativo como 'qualquer pessoa com o link pode visualizar'",
    );
  }
  if (!resposta.ok) {
    throw new Error(
      resposta.status === 404
        ? "aba não encontrada na planilha"
        : "não foi possível acessar a planilha — verifique se o link de compartilhamento ainda está ativo como 'qualquer pessoa com o link pode visualizar'",
    );
  }
  return parseCSV(await resposta.text());
}
