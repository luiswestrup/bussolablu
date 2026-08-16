import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ResultadoSync } from "./planilha-recebimentos.server";

export const descobrirAbasPlanilha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ nome: string; gid: string }[]> => {
    const { descobrirAbas } = await import("./planilha-recebimentos.server");
    return descobrirAbas();
  });

export const sincronizarRecebimentosPlanilha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { empresaId: string }) => data)
  .handler(async ({ data, context }): Promise<ResultadoSync> => {
    const { sincronizarPlanilha } = await import("./planilha-sync.server");
    return sincronizarPlanilha(context.supabase as never, data.empresaId);
  });

export const ignorarLinhaPlanilha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { empresaId: string; aba: string; linhaNumero: number; hash: string }) => data)
  .handler(async ({ data, context }) => {
    const { ignorarLinha } = await import("./planilha-sync.server");
    await ignorarLinha(context.supabase as never, data.empresaId, data.aba, data.linhaNumero, data.hash);
    return { ok: true };
  });

export const resolverLinhaPlanilha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      empresaId: string;
      aba: string;
      linhaNumero: number;
      hash: string;
      clienteNome: string;
      contaBancariaId: string;
      valor: number;
      dataRecebimento: string;
      nfse?: string;
      observacao?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { resolverPendencia } = await import("./planilha-sync.server");
    const { empresaId, ...entrada } = data;
    await resolverPendencia(context.supabase as never, empresaId, entrada);
    return { ok: true };
  });
