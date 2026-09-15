import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileSpreadsheet, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Kpi, SecaoVazia } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  brl,
  dataBR,
  exportarCSV,
  exportarXLSX,
  fimDoMes,
  hoje,
  inicioDoMes,
} from "@/lib/format";
import {
  liquidoRecebimento,
  saldoContaAte,
  useContasBancarias,
  usePagar,
  useReceber,
  useTransferencias,
} from "@/lib/dados";

export const Route = createFileRoute("/_authenticated/fluxo-caixa")({
  head: () => ({
    meta: [
      { title: "Fluxo de caixa diário — Bussola Blu" },
      {
        name: "description",
        content:
          "Entradas e saídas por dia, realizado e previsto, com saldo acumulado por empresa e período.",
      },
      { property: "og:title", content: "Fluxo de caixa diário — Bussola Blu" },
      {
        property: "og:description",
        content: "Acompanhe o caixa dia a dia, com projeção de saldo e alerta de caixa negativo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FluxoCaixaPage,
});

type Lancamento = {
  id: string;
  tipo: "Entrada" | "Saída";
  origem: "Realizado" | "Previsto";
  descricao: string;
  valor: number;
};

type Dia = {
  data: string;
  entradas: number;
  saidas: number;
  resultado: number;
  acumulado: number;
  previsto: boolean;
  itens: Lancamento[];
};

function FluxoCaixaPage() {
  const { escopo, empresa, consolidado } = useEmpresa();
  const { data: pagar = [] } = usePagar(escopo);
  const { data: receber = [] } = useReceber(escopo);
  const { data: contas = [] } = useContasBancarias(escopo);
  const { data: transferencias = [] } = useTransferencias(escopo);

  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(fimDoMes());
  const [aberto, setAberto] = useState<string | null>(null);

  const hj = hoje();

  const diaAnterior = useMemo(() => {
    const d = new Date(`${inicio}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, [inicio]);

  const saldoInicial = useMemo(
    () =>
      contas.reduce(
        (s, c) =>
          s + saldoContaAte(c.id, diaAnterior, { contas, receber, pagar, transferencias }),
        0,
      ),
    [contas, diaAnterior, receber, pagar, transferencias],
  );

  const dias = useMemo<Dia[]>(() => {
    const mapa = new Map<string, Dia>();
    const garante = (data: string): Dia => {
      const atual =
        mapa.get(data) ??
        ({
          data,
          entradas: 0,
          saidas: 0,
          resultado: 0,
          acumulado: 0,
          previsto: data > hj,
          itens: [],
        } as Dia);
      mapa.set(data, atual);
      return atual;
    };
    const noPeriodo = (d: string | null | undefined) => !!d && d >= inicio && d <= fim;

    for (const c of receber) {
      const realizado = c.status === "recebido" && !!c.data_recebimento;
      const data = realizado ? c.data_recebimento! : c.data_vencimento;
      if (!noPeriodo(data)) continue;
      if (!realizado && data < hj) continue; // vencidos não entram como previsão do passado
      const valor = realizado ? liquidoRecebimento(c) : Number(c.valor);
      const dia = garante(data);
      dia.entradas += valor;
      dia.itens.push({
        id: `r-${c.id}`,
        tipo: "Entrada",
        origem: realizado ? "Realizado" : "Previsto",
        descricao: c.descricao,
        valor,
      });
    }

    for (const c of pagar) {
      const realizado = c.status === "pago" && !!c.data_pagamento;
      const data = realizado ? c.data_pagamento! : c.data_vencimento;
      if (!noPeriodo(data)) continue;
      if (!realizado && data < hj) continue;
      const valor = Number(c.valor_pago ?? c.valor);
      const dia = garante(data);
      dia.saidas += valor;
      dia.itens.push({
        id: `p-${c.id}`,
        tipo: "Saída",
        origem: realizado ? "Realizado" : "Previsto",
        descricao: c.descricao,
        valor: -valor,
      });
    }

    const lista = [...mapa.values()].sort((a, b) => a.data.localeCompare(b.data));
    let acumulado = saldoInicial;
    for (const d of lista) {
      d.resultado = d.entradas - d.saidas;
      acumulado += d.resultado;
      d.acumulado = acumulado;
      d.itens.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
    }
    return lista;
  }, [receber, pagar, inicio, fim, hj, saldoInicial]);

  const totais = useMemo(
    () => ({
      entradas: dias.reduce((s, d) => s + d.entradas, 0),
      saidas: dias.reduce((s, d) => s + d.saidas, 0),
      final: dias.length ? dias[dias.length - 1]!.acumulado : saldoInicial,
      menor: dias.length ? Math.min(...dias.map((d) => d.acumulado)) : saldoInicial,
    }),
    [dias, saldoInicial],
  );

  const dadosGrafico = dias.map((d) => ({
    dia: dataBR(d.data).slice(0, 5),
    Entradas: d.entradas,
    Saídas: d.saidas,
    Saldo: d.acumulado,
  }));

  const linhasExport = dias.map((d) => ({
    Data: dataBR(d.data),
    Tipo: d.previsto ? "Previsto" : "Realizado",
    Entradas: d.entradas,
    Saídas: d.saidas,
    Resultado: d.resultado,
    "Saldo acumulado": d.acumulado,
  }));

  return (
    <AppShell titulo="Fluxo de caixa">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div>
            <Label htmlFor="ini">Início</Label>
            <Input id="ini" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fim">Fim</Label>
            <Input id="fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">
            Empresa: {consolidado ? "Todas" : (empresa?.nome ?? "—")} · Saldo em {dataBR(diaAnterior)}:{" "}
            <span className="tabular-nums font-medium">{brl(saldoInicial)}</span>
          </p>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => exportarCSV("fluxo-de-caixa", linhasExport)}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void exportarXLSX("fluxo-de-caixa", [
                  { nome: "Fluxo de caixa", linhas: linhasExport },
                ])
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Kpi titulo="Entradas no período" valor={brl(totais.entradas)} tom="positivo" icone={<TrendingUp className="h-4 w-4" />} />
        <Kpi titulo="Saídas no período" valor={brl(totais.saidas)} tom="negativo" icone={<TrendingDown className="h-4 w-4" />} />
        <Kpi
          titulo="Saldo final projetado"
          valor={brl(totais.final)}
          tom={totais.final < 0 ? "negativo" : "positivo"}
          icone={<Wallet className="h-4 w-4" />}
        />
        <Kpi
          titulo="Menor saldo do período"
          valor={brl(totais.menor)}
          tom={totais.menor < 0 ? "negativo" : "neutro"}
        />
      </div>

      {dias.length === 0 ? (
        <div className="mt-6">
          <SecaoVazia texto="Nenhuma movimentação no período selecionado." />
        </div>
      ) : (
        <>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Entradas e saídas por dia</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="dia" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v: number) => brl(v).replace("R$", "")} />
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Legend />
                  <Bar dataKey="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Saldo" stroke="hsl(var(--primary))" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead className="text-right">Resultado do dia</TableHead>
                    <TableHead className="text-right">Saldo acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dias.map((d) => (
                    <Fragment key={d.data}>
                      <TableRow
                        key={d.data}
                        className="cursor-pointer"
                        onClick={() => setAberto(aberto === d.data ? null : d.data)}
                      >
                        <TableCell className="whitespace-nowrap font-medium">
                          {dataBR(d.data)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.previsto ? "Previsto" : "Realizado"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-success">
                          {d.entradas ? brl(d.entradas) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {d.saidas ? brl(d.saidas) : "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            d.resultado < 0 ? "text-destructive" : "text-success",
                          )}
                        >
                          {brl(d.resultado)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium tabular-nums",
                            d.acumulado < 0 && "text-destructive",
                          )}
                        >
                          {brl(d.acumulado)}
                        </TableCell>
                      </TableRow>
                      {aberto === d.data &&
                        d.itens.map((i) => (
                          <TableRow key={`${d.data}-${i.id}`} className="bg-muted/40 text-sm">
                            <TableCell />
                            <TableCell className="text-xs text-muted-foreground">
                              {i.origem}
                            </TableCell>
                            <TableCell colSpan={3}>{i.descricao}</TableCell>
                            <TableCell
                              className={cn(
                                "text-right tabular-nums",
                                i.valor < 0 ? "text-destructive" : "text-success",
                              )}
                            >
                              {brl(i.valor)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </Fragment>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2}>Total do período</TableCell>
                    <TableCell className="text-right tabular-nums text-success">
                      {brl(totais.entradas)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      {brl(totais.saidas)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {brl(totais.entradas - totais.saidas)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{brl(totais.final)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}
