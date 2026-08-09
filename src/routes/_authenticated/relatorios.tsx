import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
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
import { useEmpresa } from "@/lib/empresa";
import { brl, exportarCSV, fimDoMes, mesesAtras, rotuloMes } from "@/lib/format";
import { rotuloNatureza, useCategorias, usePagar, useProdutos, useReceber } from "@/lib/dados";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Fluxo Gestão" },
      { name: "description", content: "Fluxo de caixa por período, despesas por categoria e margem de estoque." },
      { property: "og:title", content: "Relatórios — Fluxo Gestão" },
      { property: "og:description", content: "Análises financeiras por período com exportação em CSV." },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { escopo } = useEmpresa();
  const { data: pagar = [] } = usePagar(escopo);
  const { data: receber = [] } = useReceber(escopo);
  const { data: produtos = [] } = useProdutos(escopo);
  const { data: categorias = [] } = useCategorias(escopo);

  const [inicio, setInicio] = useState(mesesAtras(5));
  const [fim, setFim] = useState(fimDoMes());

  const noPeriodo = (d: string | null) => !!d && d >= inicio && d <= fim;

  const entradas = useMemo(
    () => receber.filter((c) => noPeriodo(c.data_recebimento)),
    [receber, inicio, fim],
  );
  const saidas = useMemo(() => pagar.filter((c) => noPeriodo(c.data_pagamento)), [pagar, inicio, fim]);

  const totalEntradas = entradas.reduce((s, c) => s + Number(c.valor), 0);
  const totalSaidas = saidas.reduce((s, c) => s + Number(c.valor), 0);
  const resultado = totalEntradas - totalSaidas;
  const margem = totalEntradas > 0 ? (resultado / totalEntradas) * 100 : 0;

  const porMes = useMemo(() => {
    const mapa = new Map<string, { mes: string; entradas: number; saidas: number }>();
    const add = (data: string, campo: "entradas" | "saidas", valor: number) => {
      const chave = data.slice(0, 7);
      const atual = mapa.get(chave) ?? { mes: chave, entradas: 0, saidas: 0 };
      atual[campo] += valor;
      mapa.set(chave, atual);
    };
    entradas.forEach((c) => add(c.data_recebimento!, "entradas", Number(c.valor)));
    saidas.forEach((c) => add(c.data_pagamento!, "saidas", Number(c.valor)));
    return [...mapa.values()]
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((m) => ({ ...m, rotulo: rotuloMes(`${m.mes}-01`), resultado: m.entradas - m.saidas }));
  }, [entradas, saidas]);

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, { nome: string; despesa: number; receita: number }>();
    const nome = (id: string | null) => categorias.find((c) => c.id === id)?.nome ?? "Sem categoria";
    const add = (id: string | null, campo: "despesa" | "receita", valor: number) => {
      const chave = nome(id);
      const atual = mapa.get(chave) ?? { nome: chave, despesa: 0, receita: 0 };
      atual[campo] += valor;
      mapa.set(chave, atual);
    };
    saidas.forEach((c) => add(c.categoria_id, "despesa", Number(c.valor)));
    entradas.forEach((c) => add(c.categoria_id, "receita", Number(c.valor)));
    return [...mapa.values()].sort((a, b) => b.despesa + b.receita - (a.despesa + a.receita));
  }, [entradas, saidas, categorias]);

  const margemEstoque = useMemo(
    () =>
      produtos
        .map((p) => {
          const lucro = (Number(p.preco_venda) - Number(p.custo)) * Number(p.quantidade);
          const perc =
            Number(p.preco_venda) > 0
              ? ((Number(p.preco_venda) - Number(p.custo)) / Number(p.preco_venda)) * 100
              : 0;
          return { nome: p.nome, lucro, perc };
        })
        .sort((a, b) => b.lucro - a.lucro),
    [produtos],
  );

  const porNatureza = useMemo(() => {
    const mapa = new Map<string, number>();
    saidas.forEach((c) => {
      const cat = categorias.find((k) => k.id === c.categoria_id);
      const nome = rotuloNatureza(cat?.natureza ?? null);
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(c.valor));
    });
    return [...mapa.entries()].map(([nome, despesa]) => ({ nome, despesa })).sort((a, b) => b.despesa - a.despesa);
  }, [saidas, categorias]);

  return (
    <AppShell titulo="Relatórios">
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
          <Button
            variant="outline"
            className="ml-auto"
            onClick={() =>
              exportarCSV(
                "fluxo-de-caixa",
                porMes.map((m) => ({
                  Mês: m.rotulo,
                  Entradas: m.entradas.toFixed(2).replace(".", ","),
                  Saídas: m.saidas.toFixed(2).replace(".", ","),
                  Resultado: m.resultado.toFixed(2).replace(".", ","),
                })),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Exportar fluxo
          </Button>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Entradas no período" valor={brl(totalEntradas)} tom="positivo" />
        <Kpi titulo="Saídas no período" valor={brl(totalSaidas)} tom="negativo" />
        <Kpi titulo="Resultado" valor={brl(resultado)} tom={resultado >= 0 ? "positivo" : "negativo"} />
        <Kpi
          titulo="Margem sobre entradas"
          valor={`${margem.toFixed(1)}%`}
          tom={margem >= 0 ? "neutro" : "negativo"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo de caixa mensal</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {porMes.length === 0 ? (
              <SecaoVazia texto="Sem movimentações liquidadas no período." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={porMes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="rotulo" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} width={70} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number | string) => brl(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#3f9a68" strokeWidth={2} />
                  <Line type="monotone" dataKey="saidas" name="Saídas" stroke="#c1523f" strokeWidth={2} />
                  <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#2f4f86" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas x despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {porCategoria.length === 0 ? (
              <SecaoVazia texto="Sem dados no período." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porCategoria}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="nome" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} width={70} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number | string) => brl(Number(v))} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="#3f9a68" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" name="Despesa" fill="#c1523f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Despesas por natureza (mercadoria x serviço x outro)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {porNatureza.length === 0 ? (
            <SecaoVazia texto="Sem despesas liquidadas no período." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porNatureza}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="nome" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} width={70} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number | string) => brl(Number(v))} />
                <Bar dataKey="despesa" name="Despesa" fill="#2f4f86" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Lucratividade potencial do estoque</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarCSV(
                "lucratividade-estoque",
                margemEstoque.map((m) => ({
                  Produto: m.nome,
                  "Lucro potencial": m.lucro.toFixed(2).replace(".", ","),
                  "Margem %": m.perc.toFixed(1).replace(".", ","),
                })),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          {margemEstoque.length === 0 ? (
            <SecaoVazia texto="Nenhum produto cadastrado." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Lucro potencial</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {margemEstoque.map((m) => (
                  <TableRow key={m.nome}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(m.lucro)}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.perc.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}