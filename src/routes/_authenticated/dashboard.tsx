import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Boxes, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Kpi } from "@/components/ui-kit";
import { usePapel } from "@/lib/papel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmpresa } from "@/lib/empresa";
import { brl, hoje, num, rotuloMes } from "@/lib/format";
import { divergenciasExtrato, liquidoRecebimento, nomeNatureza, useCategorias, useContasBancarias, useExtratosSaldo, useMovimentos, useNaturezas, usePagar, useProdutos, useReceber, useTransferencias } from "@/lib/dados";
import { distribuirDespesa, mapaRateioNotas } from "@/lib/rateio";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Fluxo Gestão" },
      { name: "description", content: "Saldo de caixa, contas a pagar e receber e posição de estoque." },
      { property: "og:title", content: "Dashboard — Fluxo Gestão" },
      { property: "og:description", content: "Indicadores financeiros e operacionais da empresa." },
    ],
  }),
  component: DashboardPage,
});

const CORES = ["#2f4f86", "#2fa4a4", "#3f9a68", "#d69a34", "#c1523f", "#7a5ea8"];

type ItemDespesa = { nome: string; valor: number; rateado: number };
type LinhaDespesa = ItemDespesa & { itens: ItemDespesa[] };


function TooltipDespesa({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { payload: LinhaDespesa }[];
  total: number;
}) {
  const linha = active ? payload?.[0]?.payload : undefined;
  if (!linha) return null;
  const pct = total > 0 ? (linha.valor / total) * 100 : 0;
  const detalhe = linha.itens.slice(0, 12);
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{linha.nome}</p>
      <p className="text-muted-foreground">
        {brl(linha.valor)} · {pct.toFixed(1)}%
      </p>
      {detalhe.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t pt-2">
          {detalhe.map((i) => (
            <li key={i.nome} className="flex justify-between gap-4 text-muted-foreground">
              <span className="truncate max-w-45">{i.nome}</span>
              <span className="tabular-nums">{brl(i.valor)}</span>
            </li>
          ))}
          {linha.itens.length > detalhe.length && (
            <li className="text-muted-foreground">
              + {linha.itens.length - detalhe.length} outras categorias
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function ultimosMeses(qtd: number) {
  const base = new Date();
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() - (qtd - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function DashboardPage() {
  const { escopo, consolidado, empresas, nomeEmpresa } = useEmpresa();
  const { papel } = usePapel();
  const financeiro = papel !== "estoque";
  const { data: pagarTodos = [] } = usePagar(escopo);
  const { data: receberTodos = [] } = useReceber(escopo);
  const { data: produtosTodos = [] } = useProdutos(escopo);
  const { data: categorias = [] } = useCategorias(escopo);
  const { data: naturezas = [] } = useNaturezas(escopo);
  const { data: contasBancarias = [] } = useContasBancarias(escopo);
  const { data: transferencias = [] } = useTransferencias(escopo);
  const { data: extratos = [] } = useExtratosSaldo(escopo);
  const hj = hoje();

  // Filtro rápido da visão consolidada: "todas" soma os totais, sem misturar registros.
  const [foco, setFoco] = useState<string>("todas");
  const focoAtivo = consolidado && foco !== "todas" ? foco : null;
  const porFoco = <T extends { empresa_id: string }>(linhas: T[]) =>
    focoAtivo ? linhas.filter((l) => l.empresa_id === focoAtivo) : linhas;

  // Cheque cancelado saiu de circulação: não entra em nenhuma soma.
  const ativo = <T extends { status_cheque?: string | null }>(linhas: T[]) =>
    linhas.filter((l) => l.status_cheque !== "cancelado");

  const pagar = useMemo(() => ativo(porFoco(pagarTodos)), [pagarTodos, focoAtivo]);
  const receber = useMemo(() => ativo(porFoco(receberTodos)), [receberTodos, focoAtivo]);
  const produtos = useMemo(() => porFoco(produtosTodos), [produtosTodos, focoAtivo]);

  const resumo = useMemo(() => {
    // Cheque só entra/sai do caixa quando compensado.
    const emCaixa = (c: { status_cheque?: string | null }) =>
      !c.status_cheque || c.status_cheque === "compensado";
    const pago = pagar.filter((c) => c.status === "pago" && emCaixa(c));
    const recebido = receber.filter((c) => c.status === "recebido" && emCaixa(c));
    const inicial = contasBancarias.reduce((s, c) => s + Number(c.saldo_inicial), 0);
    const saldo =
      inicial +
      recebido.reduce((s, c) => s + liquidoRecebimento(c), 0) -
      pago.reduce((s, c) => s + Number(c.valor_pago ?? c.valor), 0);
    const pagarPend = pagar.filter((c) => c.status !== "pago" || !emCaixa(c));
    const receberPend = receber.filter((c) => c.status !== "recebido" || !emCaixa(c));
    const soma = (arr: { valor: number }[]) => arr.reduce((s, c) => s + Number(c.valor), 0);
    const devolvidos = [
      ...pagar.filter((c) => c.status_cheque === "devolvido"),
      ...receber.filter((c) => c.status_cheque === "devolvido"),
    ];
    return {
      saldo,
      chequesDevolvidos: devolvidos.length,
      valorDevolvidos: soma(devolvidos),
      pagarVencido: soma(pagarPend.filter((c) => c.data_vencimento < hj)),
      pagarAVencer: soma(pagarPend.filter((c) => c.data_vencimento >= hj)),
      receberVencido: soma(receberPend.filter((c) => c.data_vencimento < hj)),
      receberAVencer: soma(receberPend.filter((c) => c.data_vencimento >= hj)),
      valorEstoque: produtos.reduce((s, p) => s + Number(p.quantidade) * Number(p.custo), 0),
      baixoEstoque: produtos.filter((p) => Number(p.quantidade) <= Number(p.estoque_minimo)).length,
    };
  }, [pagar, receber, produtos, contasBancarias, hj]);

  const serieMensal = useMemo(() => {
    const meses = ultimosMeses(6);
    let acumulado = 0;
    return meses.map((m) => {
      const entradas = receber
        .filter(
          (c) =>
            c.data_recebimento?.startsWith(m) &&
            (!c.status_cheque || c.status_cheque === "compensado"),
        )
        .reduce((s, c) => s + liquidoRecebimento(c), 0);
      const saidas = pagar
        .filter(
          (c) =>
            c.data_pagamento?.startsWith(m) &&
            (!c.status_cheque || c.status_cheque === "compensado"),
        )
        .reduce((s, c) => s + Number(c.valor_pago ?? c.valor), 0);
      acumulado += entradas - saidas;
      return { mes: rotuloMes(`${m}-01`), entradas, saidas, saldo: acumulado };
    });
  }, [pagar, receber]);

  const despesasPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    pagar.forEach((c) => {
      const nome = categorias.find((k) => k.id === c.categoria_id)?.nome ?? "Sem categoria";
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(c.valor));
    });
    return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  }, [pagar, categorias]);

  const [agrupamento, setAgrupamento] = useState<"categoria" | "natureza">("categoria");

  const despesasPorNatureza = useMemo(() => {
    const mapa = new Map<string, number>();
    pagar.forEach((c) => {
      const cat = categorias.find((k) => k.id === c.categoria_id);
      const nome = nomeNatureza(naturezas, cat?.natureza_id ?? null);
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(c.valor));
    });
    return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  }, [pagar, categorias, naturezas]);

  const despesasGrafico = agrupamento === "categoria" ? despesasPorCategoria : despesasPorNatureza;

  const totalDespesas = useMemo(
    () => despesasGrafico.reduce((s, d) => s + d.valor, 0),
    [despesasGrafico],
  );

  /** 7 maiores + linha "Outras" agregando o restante (detalhe no tooltip). */
  const despesasBarras = useMemo<LinhaDespesa[]>(() => {
    const topo = despesasGrafico.slice(0, 7).map((d) => ({ ...d, itens: [] as ItemDespesa[] }));
    const resto = despesasGrafico.slice(7);
    if (resto.length) {
      topo.push({
        nome: `Outras (${resto.length})`,
        valor: resto.reduce((s, d) => s + d.valor, 0),
        itens: resto,
      });
    }
    return topo;
  }, [despesasGrafico]);

  const estoquePorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    produtos.forEach((p) => {
      const nome = categorias.find((k) => k.id === p.categoria_id)?.nome ?? "Sem categoria";
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(p.quantidade) * Number(p.custo));
    });
    return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  }, [produtos, categorias]);

  const tooltipMoeda = (v: number | string) => brl(Number(v));

  return (
    <AppShell titulo="Dashboard">
      {consolidado && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtro rápido:</span>
          {[{ id: "todas", nome: "Todas" }, ...empresas].map((op) => (
            <Button
              key={op.id}
              size="sm"
              variant={foco === op.id ? "default" : "outline"}
              onClick={() => setFoco(op.id)}
            >
              {op.id === "todas" ? "Todas" : nomeEmpresa(op.id)}
            </Button>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {financeiro && <Kpi
          titulo="Saldo de caixa"
          valor={brl(resumo.saldo)}
          detalhe="Recebimentos confirmados menos pagamentos efetuados"
          tom={resumo.saldo >= 0 ? "positivo" : "negativo"}
          icone={<Wallet className="h-4 w-4" />}
        />}
        {financeiro && <Kpi
          titulo="Contas a pagar"
          valor={brl(resumo.pagarVencido + resumo.pagarAVencer)}
          detalhe={`${brl(resumo.pagarVencido)} vencidas · ${brl(resumo.pagarAVencer)} a vencer`}
          tom={resumo.pagarVencido > 0 ? "negativo" : "neutro"}
          icone={<TrendingDown className="h-4 w-4" />}
        />}
        {financeiro && <Kpi
          titulo="Contas a receber"
          valor={brl(resumo.receberVencido + resumo.receberAVencer)}
          detalhe={`${brl(resumo.receberVencido)} vencidas · ${brl(resumo.receberAVencer)} a vencer`}
          tom={resumo.receberVencido > 0 ? "alerta" : "neutro"}
          icone={<TrendingUp className="h-4 w-4" />}
        />}
        <Kpi
          titulo="Valor em estoque"
          valor={brl(resumo.valorEstoque)}
          detalhe={
            resumo.baixoEstoque > 0
              ? `${resumo.baixoEstoque} produto(s) abaixo do mínimo`
              : "Nenhum produto abaixo do mínimo"
          }
          tom={resumo.baixoEstoque > 0 ? "alerta" : "neutro"}
          icone={<Boxes className="h-4 w-4" />}
        />
      </div>

      {resumo.baixoEstoque > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning" />
          {resumo.baixoEstoque} produto(s) com estoque abaixo do mínimo — verifique a tela de Estoque.
        </div>
      )}

      {financeiro && resumo.chequesDevolvidos > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span>
            <strong>{resumo.chequesDevolvidos} cheque(s) devolvido(s)</strong> em aberto, somando{" "}
            {brl(resumo.valorDevolvidos)} — risco imediato de liquidez.
          </span>
        </div>
      )}

      {financeiro &&
        divergenciasExtrato({
          contas: contasBancarias,
          receber: receberTodos,
          pagar: pagarTodos,
          transferencias,
          extratos,
        }).map((d) => (
          <div
            key={d.conta.id}
            className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
          >
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span>
              <strong>{d.conta.banco}</strong> com divergência de extrato em{" "}
              {d.data.slice(8, 10)}/{d.data.slice(5, 7)}/{d.data.slice(0, 4)}: sistema{" "}
              {d.diferenca > 0 ? "a menos" : "a mais"} que o banco em {brl(Math.abs(d.diferenca))} —
              revise em Conciliação bancária.
            </span>
          </div>
        ))}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {financeiro && <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução do caixa (6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serieMensal}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CORES[0]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CORES[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} width={70} />
                <Tooltip formatter={tooltipMoeda} />
                <Area type="monotone" dataKey="saldo" stroke={CORES[0]} fill="url(#grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>}

        {financeiro && <Card>
          <CardHeader>
            <CardTitle className="text-base">Entradas x Saídas</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieMensal}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} width={70} />
                <Tooltip formatter={tooltipMoeda} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill={CORES[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill={CORES[4]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>}

        {financeiro && <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                Despesas por {agrupamento === "categoria" ? "categoria" : "natureza"}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={agrupamento === "categoria" ? "default" : "outline"}
                  onClick={() => setAgrupamento("categoria")}
                >
                  Categoria
                </Button>
                <Button
                  size="sm"
                  variant={agrupamento === "natureza" ? "default" : "outline"}
                  onClick={() => setAgrupamento("natureza")}
                >
                  Natureza
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            {despesasGrafico.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma despesa lançada ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={despesasBarras} layout="vertical" margin={{ left: 8, right: 44, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} hide />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    fontSize={12}
                    width={150}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    content={<TooltipDespesa total={totalDespesas} />}
                  />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={18}>
                    {despesasBarras.map((d, i) => (
                      <Cell
                        key={d.nome}
                        fill={d.itens.length ? "#94a3b8" : CORES[i % CORES.length]}
                      />
                    ))}
                    <LabelList
                      dataKey="valor"
                      position="right"
                      fontSize={11}
                      formatter={(v: number) =>
                        `${totalDespesas > 0 ? ((v / totalDespesas) * 100).toFixed(1) : "0.0"}%`
                      }
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estoque por categoria (valor de custo)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {estoquePorCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={estoquePorCategoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="nome" fontSize={12} width={110} tickLine={false} axisLine={false} />
                  <Tooltip formatter={tooltipMoeda} />
                  <Bar dataKey="valor" name="Valor" fill={CORES[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {produtos.length} produto(s) · {num(produtos.reduce((s, p) => s + Number(p.quantidade), 0))} itens
        em estoque
      </p>
    </AppShell>
  );
}