import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Kpi, SecaoVazia } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useEmpresa } from "@/lib/empresa";
import { brl, dataBR, exportarCSV, fimDoMes, inicioDoMes } from "@/lib/format";
import { tabela, useContasBancarias, useTransferencias } from "@/lib/dados";
import { registrarRepasseEntreEmpresas } from "@/lib/intercompany";

export const Route = createFileRoute("/_authenticated/transferencias")({
  head: () => ({
    meta: [
      { title: "Transferências entre contas — Bussola Blu" },
      {
        name: "description",
        content: "Transferências entre contas e repasses entre empresas, com filtros e conciliação.",
      },
      { property: "og:title", content: "Transferências entre contas — Bussola Blu" },
      {
        property: "og:description",
        content: "Acompanhe transferências internas e repasses entre empresas em uma tela própria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransferenciasPage,
});

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type FiltroTipo = "todas" | "interna" | "intercompany";
type FiltroConc = "todas" | "pendente" | "parcial" | "conciliada";

function TransferenciasPage() {
  const { escopo, empresa, empresas, nomeEmpresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: transferencias = [] } = useTransferencias(escopo);
  const { data: contasTodas = [] } = useContasBancarias(empresas.map((e) => e.id));

  const [de, setDe] = useState(inicioDoMes());
  const [ate, setAte] = useState(fimDoMes());
  const [conta, setConta] = useState("todas");
  const [tipo, setTipo] = useState<FiltroTipo>("todas");
  const [conc, setConc] = useState<FiltroConc>("todas");
  const [busca, setBusca] = useState("");

  const nomeConta = (id: string) => {
    const c = contasTodas.find((x) => x.id === id);
    return c ? `${c.banco}${c.conta ? ` · ${c.conta}` : ""}` : "—";
  };

  const situacao = (t: (typeof transferencias)[number]): FiltroConc =>
    t.conciliado_origem && t.conciliado_destino
      ? "conciliada"
      : t.conciliado_origem || t.conciliado_destino
        ? "parcial"
        : "pendente";

  const filtradas = useMemo(
    () =>
      transferencias
        .filter((t) => (!de || t.data >= de) && (!ate || t.data <= ate))
        .filter(
          (t) => conta === "todas" || t.conta_origem_id === conta || t.conta_destino_id === conta,
        )
        .filter((t) =>
          tipo === "todas" ? true : tipo === "intercompany" ? !!t.grupo_intercompany : !t.grupo_intercompany,
        )
        .filter((t) => conc === "todas" || situacao(t) === conc)
        .filter((t) => !busca.trim() || (t.observacao ?? "").toLowerCase().includes(busca.toLowerCase()))
        .sort((a, b) => b.data.localeCompare(a.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transferencias, de, ate, conta, tipo, conc, busca],
  );

  const total = filtradas.reduce((s, t) => s + Number(t.valor), 0);
  const totalInterno = filtradas
    .filter((t) => !t.grupo_intercompany)
    .reduce((s, t) => s + Number(t.valor), 0);
  const totalInter = total - totalInterno;
  const aConciliar = filtradas.filter((t) => situacao(t) !== "conciliada").length;

  // ---- Nova transferência ----
  const [aberto, setAberto] = useState(false);
  const [tr, setTr] = useState({
    conta_origem_id: "",
    conta_destino_id: "",
    valor: "",
    data: hoje(),
    observacao: "",
  });
  const contas = contasTodas.filter((c) => c.empresa_id === empresa?.id);
  const contasOutras = contasTodas.filter((c) => c.empresa_id !== empresa?.id);
  const destinoOutra = contasOutras.some((c) => c.id === tr.conta_destino_id);
  const valida =
    !!empresa &&
    !!tr.conta_origem_id &&
    !!tr.conta_destino_id &&
    tr.conta_origem_id !== tr.conta_destino_id &&
    Number(tr.valor) > 0 &&
    !!tr.data;

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["transferencia_bancaria"] });

  const criar = useMutation({
    mutationFn: async () => {
      if (!valida) throw new Error("Preencha origem, destino, valor e data.");
      if (destinoOutra) {
        await registrarRepasseEntreEmpresas({
          contas: contasTodas,
          contaOrigemId: tr.conta_origem_id,
          contaDestinoId: tr.conta_destino_id,
          valor: Number(tr.valor),
          data: tr.data,
          observacao: tr.observacao.trim() || null,
        });
        return;
      }
      const { error } = await tabela("transferencia_bancaria").insert({
        empresa_id: empresa!.id,
        conta_origem_id: tr.conta_origem_id,
        conta_destino_id: tr.conta_destino_id,
        valor: Number(tr.valor),
        data: tr.data,
        observacao: tr.observacao.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setAberto(false);
      setTr({ conta_origem_id: "", conta_destino_id: "", valor: "", data: hoje(), observacao: "" });
      invalidar();
      toast.success("Transferência registrada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela("transferencia_bancaria").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Transferência excluída.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportar() {
    exportarCSV(
      "transferencias.csv",
      ["Data", "Empresa", "Origem", "Destino", "Valor", "Tipo", "Conciliação", "Observação"],
      filtradas.map((t) => [
        dataBR(t.data),
        nomeEmpresa(t.empresa_id),
        nomeConta(t.conta_origem_id),
        nomeConta(t.conta_destino_id),
        Number(t.valor).toFixed(2).replace(".", ","),
        t.grupo_intercompany ? "Entre empresas" : "Interna",
        situacao(t),
        t.observacao ?? "",
      ]),
    );
  }

  const Ponta = ({ ok, rotulo }: { ok: boolean; rotulo: string }) => (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs",
        ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {rotulo} {ok ? "✓" : "pendente"}
    </span>
  );

  return (
    <AppShell titulo="Transferências">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Total no período" valor={brl(total)} detalhe={`${filtradas.length} transferência(s)`} />
          <Kpi titulo="Entre contas da empresa" valor={brl(totalInterno)} />
          <Kpi titulo="Repasses entre empresas" valor={brl(totalInter)} />
          <Kpi
            titulo="Aguardando conciliação"
            valor={String(aConciliar)}
            tom={aConciliar ? "alerta" : "positivo"}
          />
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label>De</Label>
                <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
              </div>
              <div>
                <Label>Até</Label>
                <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
              </div>
              <div className="w-56">
                <Label>Conta</Label>
                <Select value={conta} onValueChange={setConta}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as contas</SelectItem>
                    {contasTodas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {nomeEmpresa(c.empresa_id)} · {nomeConta(c.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as FiltroTipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todos</SelectItem>
                    <SelectItem value="interna">Entre contas</SelectItem>
                    <SelectItem value="intercompany">Entre empresas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label>Conciliação</Label>
                <Select value={conc} onValueChange={(v) => setConc(v as FiltroConc)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="parcial">Só uma ponta</SelectItem>
                    <SelectItem value="conciliada">Conciliada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label>Observação</Label>
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" />
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={exportar} disabled={!filtradas.length}>
                  <Download className="mr-2 h-4 w-4" /> CSV
                </Button>
                <Button disabled={!empresa || contas.length < 1} onClick={() => setAberto(true)}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" /> Nova transferência
                </Button>
              </div>
            </div>
            {!empresa && (
              <p className="text-xs text-muted-foreground">
                Selecione uma empresa no topo para registrar uma nova transferência.
              </p>
            )}

            {filtradas.length === 0 ? (
              <SecaoVazia texto="Nenhuma transferência encontrada com esses filtros." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Origem → Destino</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Conciliação</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">{dataBR(t.data)}</TableCell>
                      <TableCell>
                        {nomeEmpresa(t.empresa_id)}
                        {t.grupo_intercompany && (
                          <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs">
                            entre empresas
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {nomeConta(t.conta_origem_id)} → {nomeConta(t.conta_destino_id)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{brl(Number(t.valor))}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Ponta ok={t.conciliado_origem} rotulo="Saída" />
                          <Ponta ok={t.conciliado_destino} rotulo="Entrada" />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.observacao ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Excluir transferência"
                          onClick={() => {
                            if (confirm("Excluir esta transferência?")) excluir.mutate(t.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova transferência</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Conta de origem</Label>
              <Select
                value={tr.conta_origem_id}
                onValueChange={(v) =>
                  setTr({
                    ...tr,
                    conta_origem_id: v,
                    conta_destino_id: tr.conta_destino_id === v ? "" : tr.conta_destino_id,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {nomeConta(c.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta de destino</Label>
              <Select value={tr.conta_destino_id} onValueChange={(v) => setTr({ ...tr, conta_destino_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contas
                    .filter((c) => c.id !== tr.conta_origem_id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {nomeConta(c.id)}
                      </SelectItem>
                    ))}
                  {contasOutras.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Outras empresas (repasse via conta empréstimo)
                      </div>
                      {contasOutras.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {nomeEmpresa(c.empresa_id)} · {nomeConta(c.id)}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {destinoOutra && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Repasse entre empresas: o sistema registra a saída aqui e a entrada na outra empresa
                  pelas contas empréstimo.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tr.valor}
                  onChange={(e) => setTr({ ...tr, valor: e.target.value })}
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={tr.data} onChange={(e) => setTr({ ...tr, data: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input
                maxLength={200}
                value={tr.observacao}
                onChange={(e) => setTr({ ...tr, observacao: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => criar.mutate()} disabled={!valida || criar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
