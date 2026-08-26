/** Parser de NFS-e padrão nacional (<NFSe> / <infNFSe> / <DPS> / <infDPS>). */

export type NotaServico = {
  arquivo: string;
  /** Hash SHA-256 do XML original (rastreabilidade / anti-duplicidade). */
  hash: string;
  numeroNota: string;
  competencia: string | null;
  descricao: string;
  informacoesComplementares: string;
  valorServico: number;
  valorIss: number;
  vencimento: string | null;
  prestador: { cnpj: string; nome: string; email: string | null; fone: string | null };
  tomador: { cnpj: string; nome: string };
};

const texto = (el: Element | Document | null | undefined, tag: string): string => {
  const found = el?.getElementsByTagName(tag)?.[0];
  return found?.textContent?.trim() ?? "";
};

const numero = (valor: string): number => {
  const n = Number(valor.replace(/\./g, (m, i, s: string) => (s.includes(",") ? "" : m)).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const dataISO = (valor: string): string | null => {
  const m = valor.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1]! : null;
};

const soDigitos = (v: string) => v.replace(/\D/g, "");

/** Converte "10/09/2026" em "2026-09-10". Retorna null se a data for impossível. */
export function brParaISO(valor: string): string | null {
  const m = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, a] = m;
  const dia = Number(d);
  const mm = Number(mes);
  if (dia < 1 || dia > 31 || mm < 1 || mm > 12) return null;
  return `${a}-${mes}-${d}`;
}

/**
 * Procura uma data de vencimento em texto livre. O formato varia por emissor,
 * então aceitamos "Vencto.", "Vencimento", "Venc." seguidos de dd/mm/aaaa.
 */
export function extrairVencimento(...textos: string[]): string | null {
  const alvo = textos.filter(Boolean).join("\n");
  const padroes = [
    /venc\w*\.?\s*(?:em|para|:|-)?\s*(\d{2}\/\d{2}\/\d{4})/i,
    /(\d{2}\/\d{2}\/\d{4})\s*(?:-|\|)?\s*venc\w*/i,
  ];
  for (const padrao of padroes) {
    const m = alvo.match(padrao);
    if (m?.[1]) {
      const iso = brParaISO(m[1]);
      if (iso) return iso;
    }
  }
  return null;
}

export async function hashXml(xml: string): Promise<string> {
  const bytes = new TextEncoder().encode(xml);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Faz o parse de um XML de NFS-e nacional. Lança Error com motivo legível. */
export function parseNFSe(arquivo: string, xml: string, hash: string): NotaServico {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Arquivo XML inválido ou corrompido.");
  }

  const infNFSe = doc.getElementsByTagName("infNFSe")[0];
  if (!infNFSe) {
    throw new Error("Não é um XML de NFS-e nacional (tag infNFSe ausente).");
  }

  const emit = infNFSe.getElementsByTagName("emit")[0] ?? null;
  const infDPS = doc.getElementsByTagName("infDPS")[0] ?? null;
  if (!infDPS) throw new Error("Bloco DPS/infDPS ausente no XML.");

  const toma = infDPS.getElementsByTagName("toma")[0] ?? null;
  if (!toma) throw new Error("Tomador do serviço ausente no XML (tag toma).");

  const cnpjPrestador = soDigitos(texto(emit, "CNPJ") || texto(emit, "CPF"));
  if (!cnpjPrestador) throw new Error("CNPJ do prestador ausente no XML.");
  const cnpjTomador = soDigitos(texto(toma, "CNPJ") || texto(toma, "CPF"));
  if (!cnpjTomador) throw new Error("CNPJ do tomador ausente no XML.");

  const serv = infDPS.getElementsByTagName("serv")[0] ?? null;
  const descricao = texto(serv, "xDescServ");
  const infoCompl = texto(serv, "xInfComp");

  const valoresDps = infDPS.getElementsByTagName("valores")[0] ?? null;
  const vServ = numero(texto(valoresDps, "vServ"));
  const valoresNfse = infNFSe.getElementsByTagName("valores")[0] ?? null;
  const vLiq = numero(texto(valoresNfse, "vLiq"));
  const valorServico = vServ > 0 ? vServ : vLiq;
  if (valorServico <= 0) throw new Error("Valor do serviço ausente ou zerado no XML.");

  return {
    arquivo,
    hash,
    numeroNota: texto(infNFSe, "nNFSe") || texto(infDPS, "nDPS"),
    competencia: dataISO(texto(infDPS, "dCompet")) ?? dataISO(texto(infDPS, "dhEmi")),
    descricao,
    informacoesComplementares: infoCompl,
    valorServico,
    valorIss: numero(texto(valoresNfse, "vISSQN")),
    vencimento: extrairVencimento(infoCompl, descricao),
    prestador: {
      cnpj: cnpjPrestador,
      nome: texto(emit, "xNome") || "Prestador sem nome",
      email: texto(emit, "email") || null,
      fone: texto(emit, "fone") || null,
    },
    tomador: {
      cnpj: cnpjTomador,
      nome: texto(toma, "xNome") || "Tomador sem nome",
    },
  };
}
