import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleSlash, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Kpi, SecaoVazia } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { brl, dataBR, fimDoMes, hoje, inicioDoMes } from "@/lib/format";
import {
  atualizarEmLote,
  saldoConciliadoAte,
  saldoContaAte,
  useContasBancarias,
  useExtratosSaldo,
  usePagar,
  useReceber,
  useTransferencias,
} from "@/lib/dados";
import { FormularioExtrato, HistoricoExtrato } from "@/components/VerificacaoExtrato";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/conciliacao")({
  head: () => ({
    meta: [
      { title: "Conciliação bancária — Bussola Blu" },
      {
        name: "description",
        content:
          "Concilie lançamentos pagos e recebidos por conta bancária e período, em lote.",
      },
      { property: "og:title", content: "Conciliação bancária — Bussola Blu" },
      {
        property: "og:description",
        content: "Marque lançamentos liquidados como conciliados e acompanhe pendências.",
      },
    ],
  }),
  component: ConciliacaoPage,
});

type Linha = {
  id: string;
  tabela: "conta_pagar" | "conta_receber";
  empresa_id: string;
  descricao: string;
  valor: number;
  data: string;
  conta_bancaria_id: string | null;
  conciliado: boolean;
};

const diasDesde = (iso: string) =>
  Math.floor((Date.parse(hoje()) - Date.parse(iso)) / 86_400_000);

function ConciliacaoPage() {
  const { escopo, consolidado, nomeEmpresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: pagar = [] } = usePagar(escopo);
  const { data: receber = [] } = useReceber(escopo);
  const { data: contas = [] } = useContasBancarias(escopo);
  const { data: transferencias = [] } = useTransferencias(escopo);
  useExtratosSaldo(escopo);

  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(fimDoMes());
  const [contaSel, setContaSel] = useState("");
  const [selecao, setSelecao] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);

  const linhas = useMemo<Linha[]>(() => {
    const noPeriodo = (d: string | null) => !!d && d >= inicio && d <= fim;
    const a: Linha[] = pagar
      .filter((c) => c.status === "pago" && noPeriodo(c.data_pagamento))
      .map((c) => ({
        id: c.id,
        tabela: "conta_pagar" as const,
        empresa_id: c.empresa_id,
        descricao: c.descricao,
        valor: -Number(c.valor),
        data: c.data_pagamento!,
        conta_bancaria_id: c.conta_bancaria_id,
        conciliado: !!c.conciliado,
      }));
    const b: Linha[] = receber
      .filter((c) => c.status === "recebido" && noPeriodo(c.data_recebimento))
      .map((c) => ({
        id: c.id,
        tabela: "conta_receber" as const,
        empresa_id: c.empresa_id,
        descricao: c.descricao,
        valor: Number(c.valor),
        data: c.data_recebimento!,
        conta_bancaria_id: c.conta_bancaria_id,
        conciliado: !!c.conciliado,
      }));
    return [...a, ...b]
      .filter((l) => !contaSel || l.conta_bancaria_id === contaSel)
      .sort((x, y) => y.data.localeCompare(x.data));
  }, [pagar, receber, inicio, fim, contaSel]);

  const dadosSaldo = { contas, receber, pagar, transferencias };
  const saldoSistema = contaSel ? saldoContaAte(contaSel, fim, dadosSaldo) : null;
  const saldoConciliado = contaSel ? saldoConciliadoAte(contaSel, fim, dadosSaldo) : null;
  const extratoDoDia = useExtratosSaldo(escopo).data?.find(
    (e) => e.conta_bancaria_id === contaSel && e.data === fim,
  );
  const saldoExtrato = extratoDoDia ? Number(extratoDoDia.saldo_extrato) : null;
  const diferenca =
    saldoExtrato !== null && saldoSistema !== null ? saldoExtrato - saldoSistema : null;

  const grupos = useMemo(() => {
    const mapa = new Map<string, { titulo: string; itens: Linha[] }>();
    for (const l of linhas) {
      const chave = l.conta_bancaria_id ?? "sem-conta";
      const banco = contas.find((c) => c.id === l.conta_bancaria_id);
      const titulo = banco
        ? `${banco.banco}${banco.conta ? ` · conta ${banco.conta}` : ""}`
        : "Sem conta bancária informada";
      const atual = mapa.get(chave) ?? { titulo, itens: [] };
      atual.itens.push(l);
      mapa.set(chave, atual);
    }
    return [...mapa.values()].sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [linhas, contas]);

  const pendentes = linhas.filter((l) => !l.conciliado);
  const atrasadas = pendentes.filter((l) => diasDesde(l.data) > 7);
  const marcados = Object.keys(selecao).filter((k) => selecao[k]);

  async function aplicar(conciliado: boolean) {
    const alvo = linhas.filter((l) => selecao[l.id]);
    if (!alvo.length) return;
    setSalvando(true);
    try {
      const valores = {
        conciliado,
        conciliado_em: conciliado ? new Date().toISOString() : null,
      };
      for (const t of ["conta_pagar", "conta_receber"] as const) {
        const ids = alvo.filter((l) => l.tabela === t).map((l) => l.id);
        await atualizarEmLote(t, ids, valores);
      }
      await queryClient.invalidateQueries({ queryKey: ["conta_pagar"] });
      await queryClient.invalidateQueries({ queryKey: ["conta_receber"] });
      setSelecao({});
      toast.success(
        `${alvo.length} lançamento(s) ${conciliado ? "conciliados" : "desmarcados"}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar conciliação.");
    } finally {
      setSalvando(false);
    }
  }

  const alternarGrupo = (itens: Linha[], valor: boolean) =>
    setSelecao((s) => {
      const novo = { ...s };
      for (const i of itens) novo[i.id] = valor;
      return novo;
    });

  return (
    <AppShell titulo="Conciliação bancária">
      <Card>
        <CardContent className="space-y-4 p-4">
          <FormularioExtrato
            contaId={contaSel}
            onContaId={setContaSel}
            data={fim}
            onData={setFim}
          />
          <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="ini">Início</Label>
            <Input id="ini" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fim">Fim (data do extrato)</Label>
            <Input id="fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div>
            <Label>Conta bancária</Label>
            <Select value={contaSel || "todas"} onValueChange={(v) => setContaSel(v === "todas" ? "" : v)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as contas</SelectItem>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.banco} {c.conta ? `· ${c.conta}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button disabled={!marcados.length || salvando} onClick={() => aplicar(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Conciliar ({marcados.length})
            </Button>
            <Button
              variant="outline"
              disabled={!marcados.length || salvando}
              onClick={() => aplicar(false)}
            >
              <CircleSlash className="mr-2 h-4 w-4" /> Desmarcar
            </Button>
          </div>
          </div>
        </CardContent>
      </Card>

      {contaSel && (
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Kpi
            titulo={`Saldo do extrato (${dataBR(fim)})`}
            valor={saldoExtrato !== null ? brl(saldoExtrato) : "—"}
          />
          <Kpi titulo="Saldo do sistema" valor={brl(saldoSistema ?? 0)} />
          <Kpi titulo="Saldo conciliado" valor={brl(saldoConciliado ?? 0)} />
          <Kpi
            titulo="Diferença (extrato − sistema)"
            valor={diferenca !== null ? brl(diferenca) : "—"}
            tom={diferenca === null ? "neutro" : Math.abs(diferenca) < 0.01 ? "positivo" : "negativo"}
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Kpi titulo="Lançamentos no período" valor={String(linhas.length)} />
        <Kpi
          titulo="Não conciliados"
          valor={String(pendentes.length)}
          tom={pendentes.length ? "alerta" : "positivo"}
        />
        <Kpi
          titulo="Pendentes há mais de 7 dias"
          valor={String(atrasadas.length)}
          tom={atrasadas.length ? "negativo" : "positivo"}
        />
      </div>

      {grupos.length === 0 ? (
        <div className="mt-6">
          <SecaoVazia texto="Nenhum lançamento liquidado no período selecionado." />
        </div>
      ) : (
        grupos.map((g) => {
          const todos = g.itens.every((i) => selecao[i.id]);
          const saldo = g.itens.reduce((s, i) => s + i.valor, 0);
          return (
            <Card key={g.titulo} className="mt-4">
              <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">{g.titulo}</CardTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="tabular-nums">Saldo: {brl(saldo)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => alternarGrupo(g.itens, !todos)}
                  >
                    {todos ? "Limpar seleção" : "Selecionar tudo"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Data</TableHead>
                      {consolidado && <TableHead>Empresa</TableHead>}
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Conciliação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.itens.map((l) => {
                      const atrasado = !l.conciliado && diasDesde(l.data) > 7;
                      return (
                        <TableRow
                          key={`${l.tabela}-${l.id}`}
                          className={cn(atrasado && "bg-destructive/5")}
                        >
                          <TableCell>
                            <Checkbox
                              checked={!!selecao[l.id]}
                              onCheckedChange={(v) =>
                                setSelecao((s) => ({ ...s, [l.id]: v === true }))
                              }
                              aria-label="Selecionar lançamento"
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{dataBR(l.data)}</TableCell>
                          {consolidado && (
                            <TableCell className="text-muted-foreground">
                              {nomeEmpresa(l.empresa_id)}
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{l.descricao}</TableCell>
                          <TableCell>
                            {l.tabela === "conta_pagar" ? "Pagamento" : "Recebimento"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              l.valor < 0 ? "text-destructive" : "text-success",
                            )}
                          >
                            {brl(l.valor)}
                          </TableCell>
                          <TableCell>
                            {l.conciliado ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Conciliado
                              </span>
                            ) : atrasado ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5" /> {diasDesde(l.data)} dias
                                sem conciliar
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Pendente</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Histórico de verificações de extrato</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoricoExtrato contaId={contaSel || undefined} />
        </CardContent>
      </Card>
    </AppShell>
  );
}