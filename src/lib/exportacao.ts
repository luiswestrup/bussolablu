import { dataBR } from "@/lib/format";
import type { ContaBancaria, Parceiro } from "@/lib/dados";

type Linha = Record<string, unknown>;

const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) =>
  v === null || v === undefined || v === "" ? "" : Number(v).toFixed(2).replace(".", ",");
const dia = (v: unknown) => (v ? dataBR(String(v)) : "");

const buscarBanco = (bancos: ContaBancaria[], id: unknown) =>
  bancos.find((b) => b.id === id)?.banco ?? "";
const buscarParceiro = (parceiros: Parceiro[], id: unknown) =>
  parceiros.find((p) => p.id === id);

/** Colunas oficiais do CSV de pagamentos, na ordem definida pela gestão. */
export const linhasPagamentosCSV = (
  contas: Linha[],
  fornecedores: Parceiro[],
  bancos: ContaBancaria[],
) =>
  contas.map((c) => {
    const f = buscarParceiro(fornecedores, c["fornecedor_id"]);
    return {
      "Data de pagamento": dia(c["data_pagamento"]),
      "Número do documento": txt(c["numero_documento"]),
      Parcela: txt(c["parcela"]),
      Fornecedor: f?.nome ?? "",
      CNPJ: f?.documento ?? "",
      "Valor da parcela": num(c["valor"]),
      Banco: buscarBanco(bancos, c["conta_bancaria_id"]),
      "Valor pago": num(c["valor_pago"]),
      Observação: txt(c["descricao"]),
      "Valor de desconto": num(c["valor_desconto"] ?? 0),
      "Valor de multa e juros pagos": num(c["valor_multa_juros"] ?? 0),
    };
  });

/** Colunas oficiais do CSV de recebimentos, na ordem definida pela gestão. */
export const linhasRecebimentosCSV = (
  contas: Linha[],
  clientes: Parceiro[],
  bancos: ContaBancaria[],
) =>
  contas.map((c) => ({
    "Data de recebimento": dia(c["data_recebimento"]),
    "Número do documento": txt(c["numero_documento"]),
    Parcela: txt(c["parcela"]),
    Cliente: buscarParceiro(clientes, c["cliente_id"])?.nome ?? "",
    "Valor da parcela": num(c["valor"]),
    Banco: buscarBanco(bancos, c["conta_bancaria_id"]),
    "Valor recebido": num(c["valor_recebido"]),
    Observação: txt(c["descricao"]),
    "Valor de desconto": num(c["valor_desconto"] ?? 0),
    "Valor de multa e juros recebidos": num(c["valor_multa_juros"] ?? 0),
    "% taxa de recebimento": num(c["percentual_taxa_maquininha"]),
    "Valor da taxa de recebimento": num(c["valor_taxa_maquininha"]),
  }));