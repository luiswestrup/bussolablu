import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Kpi, SecaoVazia } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  atualizarEmLote,
  nomeNatureza,
  saldoContaAte,
  useCategorias,
  useClientes,
  useContasBancarias,
  useFornecedores,
  useNaturezas,
  usePagar,
  useReceber,
  useTransferencias,
} from "@/lib/dados";

export const Route = createFileRoute("/_authenticated/razao-bancario")({
  head: () => ({
    meta: [
      { title: "Razão bancário — Bussola Blu" },
      {
        name: "description",
        content:
          "Extrato razão por conta bancária: lançamentos baixados em ordem cronológica com saldo acumulado.",
      },
      { property: "og:title", content: "Razão bancário — Bussola Blu" },
      {
        property: "og:description",
        content: "Confira lançamentos baixados e transferências de um banco lado a lado com o extrato.",
      },
    ],
  }),
  component: RazaoBancarioPage,
});

type Tipo = "Pagamento" | "Recebimento" | "Transferência entrada" | "Transferência saída";

type LinhaRazao = {
  chave: string;
  id: string;
  origem: "conta_pagar" | "conta_receber" | "transferencia_bancaria";
  data: string;
  tipo: Tipo;
  descricao: string;
  classificacao: string;
  valor: number;
  conciliado: boolean;
  conciliavel: boolean;
};

const diaAnterior = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

function RazaoBancarioPage() {
  const { escopo } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: contas = [] } = useContasBancarias(escopo);
  const { data: pagar = [] } = usePagar(escopo);
  const { data: receber = [] } = useReceber(escopo);
  const { data: transferencias = [] } = useTransferencias(escopo);
  const { data: categorias = [] } = useCategorias(escopo);
  const { data: naturezas = [] } = useNaturezas(escopo);
  const { data: fornecedores = [] } = useFornecedores(escopo);
  const { data: clientes = [] } = useClientes(escopo);

  const [contaSel, setContaSel] = useState("");
  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(fimDoMes());
  const [salvando, setSalvando] = useState(false);

  const conta = contas.find((c) => c.id === contaSel);

  const classificacao = (categoriaId: string | null | undefined) => {
    const cat = categorias.find((c) => c.id === categoriaId);
    if (!cat) return "Sem categoria";
    return `${cat.nome} · ${nomeNatureza(naturezas, cat.natureza_id)}`;
  };
  const nomeDe = (lista: { id: string; nome: string }[], id: unknown) =>
    lista.find((p) => p.id === id)?.nome ?? "";

  const linhas = useMemo<LinhaRazao[]>(() => {
    if (!contaSel) return [];
    const dentro = (d: string | null | undefined) => !!d && d >= inicio && d <= fim;
    const saidas: LinhaRazao[] = pagar
      .filter((c) => c.conta_bancaria_id === contaSel && c.status === "pago" && dentro(c.data_pagamento))
      .map((c) => ({
        chave: `p-${c.id}`,
        id: c.id,
        origem: "conta_pagar" as const,
        data: c.data_pagamento!,
        tipo: "Pagamento" as const,
        descricao: [nomeDe(fornecedores, c.fornecedor_id), c.descricao].filter(Boolean).join(" · "),
        classificacao: classificacao(c.categoria_id),
        valor: -Number(c.valor_pago ?? c.valor),
        conciliado: !!c.conciliado,
        conciliavel: true,
      }));
    const entradas: LinhaRazao[] = receber
      .filter(
        (c) => c.conta_bancaria_id === contaSel && c.status === "recebido" && dentro(c.data_recebimento),
      )
      .map((c) => ({
        chave: `r-${c.id}`,
        id: c.id,
        origem: "conta_receber" as const,
        data: c.data_recebimento!,
        tipo: "Recebimento" as const,
        descricao: [nomeDe(clientes, c.cliente_id), c.descricao].filter(Boolean).join(" · "),
        classificacao: classificacao(c.categoria_id),
        valor: Number(c.valor_recebido ?? c.valor) - Number(c.valor_taxa_maquininha ?? 0),
        conciliado: !!c.conciliado,
        conciliavel: true,
      }));
    const transf: LinhaRazao[] = transferencias
      .filter(
        (t) =>
          dentro(t.data) && (t.conta_origem_id === contaSel || t.conta_destino_id === contaSel),
      )
      .map((t) => {
        const entrada = t.conta_destino_id === contaSel;
        const outra = contas.find(
          (c) => c.id === (entrada ? t.conta_origem_id : t.conta_destino_id),
        );
        return {
          chave: `t-${t.id}-${entrada ? "e" : "s"}`,
          id: t.id,
          origem: "transferencia_bancaria" as const,
          data: t.data,
          tipo: (entrada ? "Transferência entrada" : "Transferência saída") as Tipo,
          descricao:
            t.observacao ||
            `Transferência ${entrada ? "recebida de" : "enviada para"} ${outra?.banco ?? "outra conta"}`,
          classificacao: "Transferência entre contas",
          valor: entrada ? Number(t.valor) : -Number(t.valor),
          conciliado: false,
          conciliavel: false,
        };
      });
    return [...saidas, ...entradas, ...transf].sort(
      (a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo),
    );
  }, [contaSel, inicio, fim, pagar, receber, transferencias, contas, categorias, naturezas, fornecedores, clientes]);

  const saldoInicial = contaSel
    ? saldoContaAte(contaSel, diaAnterior(inicio), { contas, receber, pagar, transferencias })
    : 0;

  const comSaldo = useMemo(() => {
    let acumulado = saldoInicial;
    return linhas.map((l) => {
      acumulado += l.valor;
      return { ...l, saldo: acumulado };
    });
  }, [linhas, saldoInicial]);

  const saldoFinal = comSaldo.length ? comSaldo[comSaldo.length - 1]!.saldo : saldoInicial;
  const totalEntradas = linhas.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
  const totalSaidas = linhas.filter((l) => l.valor < 0).reduce((s, l) => s + l.valor, 0);

  const exportar = () => {
    if (!comSaldo.length) return;
    exportarCSV(
      `razao-${conta?.banco ?? "banco"}`,
      comSaldo.map((l) => ({
        Data: dataBR(l.data),
        Tipo: l.tipo,
        Descrição: l.descricao,
        "Categoria / natureza": l.classificacao,
        Valor: l.valor.toFixed(2).replace(".", ","),
        "Saldo acumulado": l.saldo.toFixed(2).replace(".", ","),
        Conciliado: l.conciliavel ? (l.conciliado ? "Sim" : "Não") : "—",
      })),
    );
  };

  const marcar = async (l: LinhaRazao, valor: boolean) => {
    if (!l.conciliavel) return;
    setSalvando(true);
    try {
      await atualizarEmLote(l.origem, [l.id], {
        conciliado: valor,
        conciliado_em: valor ? new Date().toISOString() : null,
      });
      await queryClient.invalidateQueries({ queryKey: [l.origem] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a marcação.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AppShell titulo="Razão bancário">
      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div>
            <Label>Conta bancária</Label>
            <Select value={contaSel} onValueChange={setContaSel}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.banco} {c.conta ? `· ${c.conta}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="razao-ini">Data inicial</Label>
            <Input
              id="razao-ini"
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="razao-fim">Data final</Label>
            <Input id="razao-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportar} disabled={!comSaldo.length}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!comSaldo.length}>
              <Printer className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {!contaSel ? (
        <div className="mt-6">
          <SecaoVazia texto="Selecione uma conta bancária para ver o razão do período." />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <Kpi titulo={`Saldo inicial (${dataBR(diaAnterior(inicio))})`} valor={brl(saldoInicial)} />
            <Kpi titulo="Entradas do período" valor={brl(totalEntradas)} tom="positivo" />
            <Kpi titulo="Saídas do período" valor={brl(totalSaidas)} tom="negativo" />
            <Kpi titulo={`Saldo final (${dataBR(fim)})`} valor={brl(saldoFinal)} />
          </div>

          <Card className="mt-4">
            <CardContent className="p-0">
              {comSaldo.length === 0 ? (
                <div className="p-6">
                  <SecaoVazia texto="Nenhum lançamento baixado nesta conta no período." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria / natureza</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Saldo acumulado</TableHead>
                        <TableHead className="text-center">Conf.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="font-medium">
                          Saldo inicial do período ({dataBR(diaAnterior(inicio))})
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {brl(saldoInicial)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                      {comSaldo.map((l) => (
                        <TableRow key={l.chave}>
                          <TableCell className="whitespace-nowrap">{dataBR(l.data)}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {l.tipo}
                          </TableCell>
                          <TableCell className="font-medium">{l.descricao}</TableCell>
                          <TableCell className="text-muted-foreground">{l.classificacao}</TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              l.valor < 0 ? "text-destructive" : "text-success",
                            )}
                          >
                            {brl(l.valor)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{brl(l.saldo)}</TableCell>
                          <TableCell className="text-center">
                            {l.conciliavel ? (
                              <Checkbox
                                checked={l.conciliado}
                                disabled={salvando}
                                aria-label="Marcar como conferido"
                                onCheckedChange={(v) => void marcar(l, v === true)}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="font-medium">
                          Saldo final do período ({dataBR(fim)})
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {brl(saldoFinal)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}
