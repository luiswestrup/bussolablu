/** Parser de NF-e (XML) no navegador. */

export type ItemNFe = {
  codigo: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
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
};

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
  };
}
