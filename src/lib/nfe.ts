/** Parser de NF-e (XML) no navegador. */

export type ItemNFe = {
  codigo: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  cfop: string;
};

export type DuplicataNFe = {
  numero: string;
  vencimento: string | null;
  valor: number;
};

export type NotaFiscal = {
  arquivo: string;
  chaveAcesso: string;
  numeroNota: string;
  dataEmissao: string | null;
  valorTotal: number;
  emitente: { cnpj: string; nome: string; contato: string | null };
  itens: ItemNFe[];
  duplicatas: DuplicataNFe[];
  semPagamento: boolean;
};

/** CFOP que não gera financeiro: remessas/bonificações (x.9xx) e devoluções (x.201/x.202). */
export function cfopSemFinanceiro(cfop: string): boolean {
  if (cfop.length !== 4) return false;
  if (!["1", "2", "5", "6"].includes(cfop[0]!)) return false;
  const resto = cfop.slice(1);
  return resto.startsWith("9") || resto === "201" || resto === "202";
}

/** Valor dos itens que geram financeiro e motivo quando nenhum gera. */
export function analisarFinanceiro(nota: NotaFiscal): {
  gera: boolean;
  valorFaturado: number;
  cfops: string[];
} {
  const semFin = nota.itens.filter((i) => cfopSemFinanceiro(i.cfop));
  const cfops = [...new Set(semFin.map((i) => `${i.cfop[0]}.${i.cfop.slice(1)}`))];
  const valorSemFin = semFin.reduce((s, i) => s + i.valorTotal, 0);
  const todos = semFin.length === nota.itens.length;
  if (todos || nota.semPagamento) return { gera: false, valorFaturado: 0, cfops };
  const valorItens = nota.itens.reduce((s, i) => s + i.valorTotal, 0);
  return { gera: true, valorFaturado: Math.max(0, nota.valorTotal - (semFin.length ? valorSemFin : 0)), cfops: valorItens ? cfops : [] };
}

export type ArquivoErro = { arquivo: string; motivo: string };

const texto = (el: Element | null | undefined, tag: string): string => {
  const found = el?.getElementsByTagName(tag)?.[0];
  return found?.textContent?.trim() ?? "";
};

const numero = (valor: string): number => {
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Converte "2024-05-10T09:00:00-03:00" ou "2024-05-10" em "2024-05-10". */
const dataISO = (valor: string): string | null => {
  const m = valor.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1]! : null;
};

export function adicionarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Faz o parse de um XML de NF-e. Lança Error com motivo legível. */
export function parseNFe(arquivo: string, xml: string): NotaFiscal {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Arquivo XML inválido ou corrompido.");
  }

  const infNFe = doc.getElementsByTagName("infNFe")[0];
  if (!infNFe) throw new Error("Não é um XML de NF-e (tag infNFe ausente).");

  const chaveAcesso = (infNFe.getAttribute("Id") ?? "").replace(/^NFe/i, "").replace(/\D/g, "");
  if (chaveAcesso.length !== 44) {
    throw new Error("Chave de acesso inválida (esperados 44 dígitos).");
  }

  const ide = infNFe.getElementsByTagName("ide")[0] ?? null;
  const emit = infNFe.getElementsByTagName("emit")[0] ?? null;
  if (!emit) throw new Error("Dados do emitente ausentes no XML.");

  const cnpj = texto(emit, "CNPJ") || texto(emit, "CPF");
  if (!cnpj) throw new Error("CNPJ do emitente ausente no XML.");

  const itens: ItemNFe[] = Array.from(infNFe.getElementsByTagName("det")).map((det) => {
    const prod = det.getElementsByTagName("prod")[0] ?? null;
    return {
      codigo: texto(prod, "cProd"),
      descricao: texto(prod, "xProd"),
      quantidade: numero(texto(prod, "qCom")),
      valorUnitario: numero(texto(prod, "vUnCom")),
      valorTotal: numero(texto(prod, "vProd")),
      cfop: texto(prod, "CFOP").replace(/\D/g, ""),
    };
  });
  if (itens.length === 0) throw new Error("Nota sem itens (tag det ausente).");

  const cobr = infNFe.getElementsByTagName("cobr")[0] ?? null;
  const duplicatas: DuplicataNFe[] = cobr
    ? Array.from(cobr.getElementsByTagName("dup")).map((dup, i) => ({
        numero: texto(dup, "nDup") || String(i + 1).padStart(3, "0"),
        vencimento: dataISO(texto(dup, "dVenc")),
        valor: numero(texto(dup, "vDup")),
      }))
    : [];

  const total = infNFe.getElementsByTagName("ICMSTot")[0] ?? null;
  const tPags = Array.from(infNFe.getElementsByTagName("tPag")).map((e) => e.textContent?.trim() ?? "");

  return {
    arquivo,
    chaveAcesso,
    numeroNota: texto(ide, "nNF") || chaveAcesso.slice(25, 34).replace(/^0+/, ""),
    dataEmissao: dataISO(texto(ide, "dhEmi") || texto(ide, "dEmi")),
    valorTotal: numero(texto(total, "vNF")),
    emitente: {
      cnpj: cnpj.replace(/\D/g, ""),
      nome: texto(emit, "xNome") || texto(emit, "xFant") || "Fornecedor sem nome",
      contato: texto(emit.getElementsByTagName("enderEmit")[0] ?? null, "fone") || null,
    },
    itens,
    duplicatas: duplicatas.filter((d) => d.valor > 0),
    semPagamento: tPags.length > 0 && tPags.every((t) => t === "90"),
  };
}
