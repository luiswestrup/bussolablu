import { inserirVarios, tabela, type ContaBancaria } from "@/lib/dados";

/**
 * Mútuo entre empresas ("conta empréstimo").
 *
 * Cada conta empréstimo aponta para a sua conta espelho na outra empresa
 * (conta_bancaria.conta_espelho_id). Quando uma empresa paga um documento da
 * outra, o sistema registra a contrapartida automaticamente na outra empresa,
 * mantendo os dois saldos espelhados.
 */

export const ehContaMutuo = (c: Pick<ContaBancaria, "conta_espelho_id">) => !!c.conta_espelho_id;

export const contaPorId = (contas: ContaBancaria[], id: string | null | undefined) =>
  contas.find((c) => c.id === id) ?? null;

/** Conta espelho (na outra empresa) da conta informada. */
export const espelhoDe = (contas: ContaBancaria[], id: string | null | undefined) => {
  const conta = contaPorId(contas, id);
  return conta ? contaPorId(contas, conta.conta_espelho_id) : null;
};

/**
 * Registra a contrapartida na empresa que realmente pagou:
 * saída da conta bancária real → entrada na conta empréstimo daquela empresa.
 */
export async function registrarEspelhoPagamento(params: {
  contas: ContaBancaria[];
  /** Conta empréstimo usada na baixa do título (empresa devedora). */
  contaMutuoId: string;
  /** Conta bancária real da outra empresa de onde o dinheiro saiu. */
  contaOrigemRealId: string;
  contaPagarId: string;
  valor: number;
  data: string;
  descricao: string;
}): Promise<void> {
  const espelho = espelhoDe(params.contas, params.contaMutuoId);
  if (!espelho) throw new Error("Esta conta empréstimo não está vinculada a uma conta da outra empresa.");
  const origem = contaPorId(params.contas, params.contaOrigemRealId);
  if (!origem) throw new Error("Conta de origem não encontrada.");
  if (origem.empresa_id !== espelho.empresa_id) {
    throw new Error("A conta de origem precisa pertencer à empresa que pagou.");
  }
  if (origem.id === espelho.id) {
    throw new Error("A conta de origem deve ser diferente da conta empréstimo.");
  }

  await removerEspelhoPagamento(params.contaPagarId);

  const { error } = await tabela("transferencia_bancaria").insert({
    empresa_id: espelho.empresa_id,
    conta_origem_id: origem.id,
    conta_destino_id: espelho.id,
    valor: params.valor,
    data: params.data,
    observacao: `Pagamento por conta da outra empresa: ${params.descricao}`,
    conta_pagar_id: params.contaPagarId,
  });
  if (error) throw new Error(error.message);
}

/** Remove a contrapartida gerada para um título (estorno/edição). */
export async function removerEspelhoPagamento(contaPagarId: string): Promise<void> {
  const { error } = await tabela("transferencia_bancaria")
    .delete()
    .eq("conta_pagar_id", contaPagarId);
  if (error) throw new Error(error.message);
}

/**
 * Repasse direto de caixa entre as empresas: duas transferências amarradas.
 * Empresa de origem: conta real → sua conta empréstimo.
 * Empresa de destino: sua conta empréstimo → conta real.
 */
export async function registrarRepasseEntreEmpresas(params: {
  contas: ContaBancaria[];
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  data: string;
  observacao: string | null;
}): Promise<void> {
  const origem = contaPorId(params.contas, params.contaOrigemId);
  const destino = contaPorId(params.contas, params.contaDestinoId);
  if (!origem || !destino) throw new Error("Selecione as contas de origem e destino.");
  if (origem.empresa_id === destino.empresa_id) {
    throw new Error("Para repasse entre empresas as contas devem ser de empresas diferentes.");
  }
  const mutuoOrigem = params.contas.find(
    (c) => c.empresa_id === origem.empresa_id && !!c.conta_espelho_id,
  );
  const mutuoDestino = mutuoOrigem ? contaPorId(params.contas, mutuoOrigem.conta_espelho_id) : null;
  if (!mutuoOrigem || !mutuoDestino || mutuoDestino.empresa_id !== destino.empresa_id) {
    throw new Error(
      "Vincule as contas empréstimo das duas empresas antes de registrar um repasse entre elas.",
    );
  }

  const grupo = crypto.randomUUID();
  const obs = params.observacao?.trim() || "Repasse entre empresas";

  await inserirVarios("transferencia_bancaria", [
    {
      empresa_id: origem.empresa_id,
      conta_origem_id: origem.id,
      conta_destino_id: mutuoOrigem.id,
      valor: params.valor,
      data: params.data,
      observacao: obs,
      grupo_intercompany: grupo,
    },
    {
      empresa_id: destino.empresa_id,
      conta_origem_id: mutuoDestino.id,
      conta_destino_id: destino.id,
      valor: params.valor,
      data: params.data,
      observacao: obs,
      grupo_intercompany: grupo,
    },
  ]);
}

