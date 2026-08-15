import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientes, useContasBancarias } from "@/lib/dados";
import { hoje } from "@/lib/format";
import {
  ignorarLinhaPlanilha,
  resolverLinhaPlanilha,
  sincronizarRecebimentosPlanilha,
} from "@/lib/planilha-recebimentos.functions";

type Pendencia = {
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

type Resultado = {
  importadas: number;
  atualizadas: number;
  inalteradas: number;
  ignoradas: number;
  pendentes: Pendencia[];
  erros: { aba: string; mensagem: string }[];
};

const soNumero = (t: string) => {
  const limpo = t.replace(/[^\d,.-]/g, "");
  const n = Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo);
  return Number.isFinite(n) ? n : 0;
};

/** Aceita "14/07/2026" ou "2026-07-14" e devolve yyyy-mm-dd. */
const paraISO = (t: string): string | null => {
  const br = t.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const ano = br[3]!.length === 2 ? `20${br[3]}` : br[3]!;
    return `${ano}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
  }
  const iso = t.trim().match(/^\d{4}-\d{2}-\d{2}/);
  return iso ? iso[0] : null;
};

export function SincronizarPlanilha({ empresaId }: { empresaId: string | null }) {
  const sincronizar = useServerFn(sincronizarRecebimentosPlanilha);
  const ignorar = useServerFn(ignorarLinhaPlanilha);
  const resolver = useServerFn(resolverLinhaPlanilha);
  const queryClient = useQueryClient();
  const { data: contas = [] } = useContasBancarias(empresaId ?? undefined);
  const { data: clientes = [] } = useClientes(empresaId ?? undefined);

  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [edicao, setEdicao] = useState<Record<string, { cliente: string; conta: string; data: string; valor: string }>>({});

  const chaveDe = (p: Pendencia) => `${p.aba}#${p.linhaNumero}`;

  const rodar = async () => {
    if (!empresaId) return;
    setCarregando(true);
    setAberto(true);
    setResultado(null);
    try {
      const r = (await sincronizar({ data: { empresaId } })) as Resultado;
      setResultado(r);
      setEdicao(
        Object.fromEntries(
          r.pendentes.map((p) => [
            chaveDe(p),
            {
              cliente: p.cliente,
              conta: contas.find((c) => c.banco.trim().toLowerCase() === p.banco.trim().toLowerCase())?.id ?? "",
              data: paraISO(p.dataPagamento) ?? hoje(),
              valor: String(soNumero(p.valorTexto) || ""),
            },
          ]),
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["conta_receber"] });
      if (r.erros.length === 0) toast.success("Sincronização concluída.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha na sincronização", { description: msg });
      setAberto(false);
    } finally {
      setCarregando(false);
    }
  };

  const removerPendencia = (p: Pendencia) =>
    setResultado((r) =>
      r ? { ...r, pendentes: r.pendentes.filter((x) => chaveDe(x) !== chaveDe(p)) } : r,
    );

  const aoIgnorar = async (p: Pendencia) => {
    if (!empresaId) return;
    try {
      await ignorar({ data: { empresaId, aba: p.aba, linhaNumero: p.linhaNumero, hash: p.hash } });
      removerPendencia(p);
      toast.success("Linha ignorada permanentemente.");
    } catch (e) {
      toast.error("Não foi possível ignorar", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const aoResolver = async (p: Pendencia) => {
    if (!empresaId) return;
    const dados = edicao[chaveDe(p)];
    if (!dados?.cliente.trim()) {
      toast.error("Informe o cliente.");
      return;
    }
    if (!dados.conta) {
      toast.error("Selecione a conta bancária.");
      return;
    }
    const valor = soNumero(dados.valor);
    if (!(valor > 0)) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    try {
      await resolver({
        data: {
          empresaId,
          aba: p.aba,
          linhaNumero: p.linhaNumero,
          hash: p.hash,
          clienteNome: dados.cliente.trim(),
          contaBancariaId: dados.conta,
          valor,
          dataRecebimento: dados.data || hoje(),
          nfse: p.nfse,
          observacao: [p.observacoes, p.dataPasseio && `Passeio em ${p.dataPasseio}`]
            .filter(Boolean)
            .join(" — "),
        },
      });
      removerPendencia(p);
      queryClient.invalidateQueries({ queryKey: ["conta_receber"] });
      toast.success("Lançamento criado.");
    } catch (e) {
      toast.error("Não foi possível importar a linha", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const alterar = (p: Pendencia, campo: "cliente" | "conta" | "data" | "valor", valor: string) =>
    setEdicao((e) => ({ ...e, [chaveDe(p)]: { ...e[chaveDe(p)]!, [campo]: valor } }));

  return (
    <>
      <Button
        variant="outline"
        disabled={!empresaId || carregando}
        onClick={rodar}
        title={empresaId ? "Importar lançamentos da planilha" : "Selecione uma empresa"}
      >
        {carregando ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4" />
        )}
        Sincronizar planilha
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sincronização da planilha de recebimentos</DialogTitle>
          </DialogHeader>

          {carregando && (
            <p className="text-sm text-muted-foreground">Lendo a planilha, aguarde…</p>
          )}

          {resultado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Novas", resultado.importadas],
                  ["Atualizadas", resultado.atualizadas],
                  ["Sem mudança", resultado.inalteradas],
                  ["Ignoradas", resultado.ignoradas],
                ].map(([rotulo, n]) => (
                  <div key={rotulo as string} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{rotulo}</p>
                    <p className="text-lg font-semibold">{n as number}</p>
                  </div>
                ))}
              </div>

              {resultado.erros.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <p className="mb-1 font-medium text-destructive">Problemas de acesso</p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {resultado.erros.map((e, i) => (
                      <li key={i}>
                        {e.aba}: {e.mensagem}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium">
                  Pendentes de revisão ({resultado.pendentes.length})
                </p>
                {resultado.pendentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma linha pendente.</p>
                ) : (
                  <div className="space-y-3">
                    {resultado.pendentes.map((p) => (
                      <div key={chaveDe(p)} className="rounded-md border p-3">
                        <p className="text-sm">
                          <span className="font-medium">
                            {p.aba} · linha {p.linhaNumero}
                          </span>{" "}
                          — <span className="text-destructive">{p.motivo}</span>
                        </p>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Cliente: {p.cliente || "—"} · Valor: {p.valorTexto || "—"} · Banco:{" "}
                          {p.banco || "—"} · Status: {p.status || "—"}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-4">
                          <div>
                            <Label className="text-xs">Cliente</Label>
                            <Input
                              list="clientes-planilha"
                              placeholder="Nome do cliente"
                              value={edicao[chaveDe(p)]?.cliente ?? ""}
                              onChange={(e) => alterar(p, "cliente", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Conta bancária</Label>
                            <Select
                              value={edicao[chaveDe(p)]?.conta ?? ""}
                              onValueChange={(v) => alterar(p, "conta", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {contas.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.banco}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Valor (R$)</Label>
                            <Input
                              value={edicao[chaveDe(p)]?.valor ?? ""}
                              onChange={(e) => alterar(p, "valor", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Data do recebimento</Label>
                            <Input
                              type="date"
                              value={edicao[chaveDe(p)]?.data ?? ""}
                              onChange={(e) => alterar(p, "data", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => aoResolver(p)}>
                            Importar como recebido
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => aoIgnorar(p)}>
                            Ignorar sempre
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
