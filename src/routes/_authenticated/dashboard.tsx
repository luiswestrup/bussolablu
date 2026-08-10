import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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
import { nomeNatureza, useCategorias, useNaturezas, usePagar, useProdutos, useReceber } from "@/lib/dados";

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
    const saldo =
      recebido.reduce((s, c) => s + Number(c.valor), 0) - pago.reduce((s, c) => s + Number(c.valor), 0);
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
  }, [pagar, receber, produtos, hj]);

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
        .reduce((s, c) => s + Number(c.valor), 0);
      const saidas = pagar
        .filter(
          (c) =>
            c.data_pagamento?.startsWith(m) &&
            (!c.status_cheque || c.status_cheque === "compensado"),
        )
        .reduce((s, c) => s + Number(c.valor), 0);
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
                <PieChart>
                  <Pie
                    data={despesasGrafico}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {despesasGrafico.map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={tooltipMoeda} />
                  <Legend />
                </PieChart>
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