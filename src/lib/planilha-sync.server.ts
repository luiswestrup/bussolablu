import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ABAS_PLANILHA,
  acharConta,
  acharOuCriarCliente,
  baixarAba,
  hashLinha,
  mapaColunas,
  montarObservacao,
  parseData,
  parseValor,
  periodoDaAba,
  type AbaPlanilha,
  type Cliente,
  type ContaBanco,
  type Pendencia,
  type ResultadoSync,
} from "./planilha-recebimentos.server";

type Registro = {
  id: string;
  aba: string;
  linha_numero: number;
  hash_conteudo: string;
  conta_receber_id: string | null;
  ignorado: boolean;
};

export async function sincronizarPlanilha(
  supabase: SupabaseClient,
  empresaId: string,
): Promise<ResultadoSync> {
  const resultado: ResultadoSync = {
    importadas: 0,
    atualizadas: 0,
    inalteradas: 0,
    ignoradas: 0,
    pendentes: [],
    erros: [],
  };

  const [{ data: clientesData }, { data: contasData }, { data: registrosData }] = await Promise.all([
    supabase.from("cliente").select("id, nome").eq("empresa_id", empresaId),
    supabase.from("conta_bancaria").select("id, banco").eq("empresa_id", empresaId),
    supabase
      .from("recebimento_planilha_importado")
      .select("id, aba, linha_numero, hash_conteudo, conta_receber_id, ignorado")
      .eq("empresa_id", empresaId),
  ]);

  const clientes = (clientesData ?? []) as Cliente[];
  const contas = (contasData ?? []) as ContaBanco[];
  const registros = new Map<string, Registro>(
    ((registrosData ?? []) as Registro[]).map((r) => [`${r.aba}#${r.linha_numero}`, r]),
  );

  const { data: abasData } = await supabase
    .from("planilha_aba_config")
    .select("nome, gid, ativo")
    .eq("empresa_id", empresaId)
    .eq("ativo", true)
    .order("nome");
  const abas: AbaPlanilha[] = ((abasData ?? []) as AbaPlanilha[]).length
    ? ((abasData ?? []) as AbaPlanilha[])
    : ABAS_PLANILHA;

  for (const { nome: aba, gid } of abas) {
    let linhas: string[][];
    try {
      linhas = await baixarAba(gid);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("aba não encontrada")) resultado.erros.push({ aba, mensagem: msg });
      continue;
    }
    if (linhas.length < 2) continue;
    const col = mapaColunas(linhas[0]!);
    if (col["cliente"] === undefined || col["valor"] === undefined) {
      resultado.erros.push({ aba, mensagem: "cabeçalho sem as colunas Cliente e Valor da Reserva" });
      continue;
    }

    // Validação defensiva: os dados retornados precisam bater com o mês/ano do nome da aba.
    const esperado = periodoDaAba(aba);
    if (esperado && col["dataPagamento"] !== undefined) {
      const amostra: string[] = [];
      for (let i = 1; i < linhas.length && amostra.length < 10; i++) {
        const iso = parseData((linhas[i]![col["dataPagamento"]!] ?? "").trim());
        if (iso) amostra.push(iso);
      }
      const batem = amostra.filter(
        (iso) =>
          Number(iso.slice(0, 4)) === esperado.ano && Number(iso.slice(5, 7)) === esperado.mes,
      ).length;
      if (amostra.length > 0 && batem <= amostra.length / 2) {
        resultado.erros.push({
          aba,
          mensagem: `os dados retornados para a aba ${aba} não correspondem ao período esperado (pode ser um problema de nome de aba no Google Sheets) — sincronização dessa aba cancelada por falta de correspondência de período`,
        });
        continue;
      }
    }

    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i]!;
      const campo = (chave: string) =>
        col[chave] === undefined ? "" : (linha[col[chave]!] ?? "").trim();
      const linhaNumero = i + 1;
      const chave = `${aba}#${linhaNumero}`;
      const hash = hashLinha(linha);
      const existente = registros.get(chave);

      if (existente?.ignorado) {
        resultado.ignoradas += 1;
        continue;
      }

      const cliente = campo("cliente");
      const valorTexto = campo("valor");
      const banco = campo("banco");
      const status = campo("status");
      const dataPagamento = campo("dataPagamento");

      // Nova checagem: se tanto Data de pagamento quanto Cliente estiverem vazios, trate a linha como em branco e pule completamente.
      const pagamentoVazio = dataPagamento === "";
      const clienteVazio = cliente === "";
      if (pagamentoVazio && clienteVazio) {
        // pula sem marcar como pendente nem registrar erro
        continue;
      }

      const valor = parseValor(valorTexto);
      const contaBanco = banco ? acharConta(contas, banco) : null;
      const dataRecebimento = parseData(dataPagamento);

      const motivo = !cliente
        ? "cliente vazio"
        : valor === null
          ? "valor inválido"
          : status !== "Concluído"
            ? "status não reconhecido"
            : !contaBanco
              ? "banco não reconhecido"
              : !dataRecebimento
                ? "data de pagamento inválida ou ausente"
                : null;

      if (motivo) {
        resultado.pendentes.push({
          aba,
          linhaNumero,
          hash,
          cliente,
          valorTexto,
          banco,
          status,
          dataPagamento,
          dataPasseio: campo("dataPasseio"),
          nfse: campo("nfse"),
          observacoes: campo("observacoes"),
          motivo,
        });
        continue;
      }

      if (existente && existente.hash_conteudo === hash && existente.conta_receber_id) {
        resultado.inalteradas += 1;
        continue;
      }

      try {
        const clienteId = await acharOuCriarCliente(supabase, empresaId, clientes, cliente);
        const valores = {
          empresa_id: empresaId,
          descricao: `Reserva — ${cliente}`,
          valor,
          valor_recebido: valor,
          cliente_id: clienteId,
          conta_bancaria_id: contaBanco!.id,
          data_vencimento: dataRecebimento!,
          data_recebimento: dataRecebimento,
          status: "recebido",
          numero_documento: /^(false|true|-|não|nao)$/i.test(campo("nfse")) ? null : campo("nfse") || null,
          observacao: montarObservacao(campo("observacoes"), campo("dataPasseio")),
        };

        if (existente?.conta_receber_id) {
          const { error } = await supabase
            .from("conta_receber")
            .update(valores)
            .eq("id", existente.conta_receber_id);
          if (error) throw new Error(error.message);
          await supabase
            .from("recebimento_planilha_importado")
            .update({ hash_conteudo: hash, importado_em: new Date().toISOString() })
            .eq("id", existente.id);
          resultado.atualizadas += 1;
        } else {
          const { data: criada, error } = await supabase
            .from("conta_receber")
            .insert(valores)
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          const contaReceberId = (criada as { id: string }).id;
          if (existente) {
            await supabase
              .from("recebimento_planilha_importado")
              .update({ hash_conteudo: hash, conta_receber_id: contaReceberId })
              .eq("id", existente.id);
          } else {
            await supabase.from("recebimento_planilha_importado").insert({
              empresa_id: empresaId,
              aba,
              linha_numero: linhaNumero,
              hash_conteudo: hash,
              conta_receber_id: contaReceberId,
            });
          }
          resultado.importadas += 1;
        }
      } catch (e) {
        resultado.erros.push({
          aba,
          mensagem: `linha ${linhaNumero}: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
  }

  return resultado;
}

export async function ignorarLinha(
  supabase: SupabaseClient,
  empresaId: string,
  aba: string,
  linhaNumero: number,
  hash: string,
): Promise<void> {
  const { error } = await supabase.from("recebimento_planilha_importado").upsert(
    {
      empresa_id: empresaId,
      aba,
      linha_numero: linhaNumero,
      hash_conteudo: hash,
      conta_receber_id: null,
      ignorado: true,
    },
    { onConflict: "empresa_id,aba,linha_numero" },
  );
  if (error) throw new Error(error.message);
}

export async function resolverPendencia(
  supabase: SupabaseClient,
  empresaId: string,
  entrada: {
    aba: string;
    linhaNumero: number;
    hash: string;
    clienteNome: string;
    contaBancariaId: string;
    valor: number;
    dataRecebimento: string;
    nfse?: string;
    observacao?: string;
  },
): Promise<void> {
  const { data: clientesData } = await supabase
    .from("cliente")
    .select("id, nome")
    .eq("empresa_id", empresaId);
  const clientes = (clientesData ?? []) as Cliente[];
  const clienteId = await acharOuCriarCliente(supabase, empresaId, clientes, entrada.clienteNome);

  const { data: criada, error } = await supabase
    .from("conta_receber")
    .insert({
      empresa_id: empresaId,
      descricao: `Reserva — ${entrada.clienteNome}`,
      valor: entrada.valor,
      valor_recebido: entrada.valor,
      cliente_id: clienteId,
      conta_bancaria_id: entrada.contaBancariaId,
      data_vencimento: entrada.dataRecebimento,
      data_recebimento: entrada.dataRecebimento,
      status: "recebido",
      numero_documento: entrada.nfse || null,
      observacao: entrada.observacao || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: erroReg } = await supabase.from("recebimento_planilha_importado").upsert(
    {
      empresa_id: empresaId,
      aba: entrada.aba,
      linha_numero: entrada.linhaNumero,
      hash_conteudo: entrada.hash,
      conta_receber_id: (criada as { id: string }).id,
      ignorado: false,
    },
    { onConflict: "empresa_id,aba,linha_numero" },
  );
  if (erroReg) throw new Error(erroReg.message);
}
