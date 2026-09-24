import { Fragment, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Kpi, SecaoVazia } from "@/components/ui-kit";
import { brl, dataBR, exportarCSV, exportarXLSX } from "@/lib/format";
import { calcularCiclo, prazoMedioGeral, type CicloFornecedor } from "@/lib/ciclo-fornecedor";
import type { ContaPagar, NotaFiscalImportada, Parceiro } from "@/lib/dados";

type Coluna =
  | "fornecedor"
  | "notas"
  | "totalFaturado"
  | "totalPago"
  | "prazoRealizado"
  | "prazoPrevisto"
  | "prazoGeral";

const dias = (n: number) => `${n.toFixed(0)} d`;

export function CicloFornecedores({
  pagar,
  notas,
  fornecedores,
  inicio,
  fim,
}: {
  pagar: ContaPagar[];
  notas: NotaFiscalImportada[];
  fornecedores: Parceiro[];
  inicio: string;
  fim: string;
}) {
  const linhas = useMemo(
    () => calcularCiclo(pagar, notas, fornecedores, inicio, fim),
    [pagar, notas, fornecedores, inicio, fim],
  );
  const [coluna, setColuna] = useState<Coluna>("totalFaturado");
  const [asc, setAsc] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const ordenadas = useMemo(() => {
    const copia = [...linhas];
    copia.sort((a, b) => {
      const va = a[coluna];
      const vb = b[coluna];
      const cmp =
        typeof va === "string" && typeof vb === "string"
          ? va.localeCompare(vb, "pt-BR")
          : Number(va) - Number(vb);
      return asc ? cmp : -cmp;
    });
    return copia;
  }, [linhas, coluna, asc]);

  const alternar = (c: Coluna) => {
    if (c === coluna) setAsc((v) => !v);
    else {
      setColuna(c);
      setAsc(c === "fornecedor");
    }
  };

  const Cabecalho = ({ c, children, right }: { c: Coluna; children: string; right?: boolean }) => (
    <TableHead className={right ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => alternar(c)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${right ? "justify-end" : ""}`}
      >
        {children}
        {coluna === c &&
          (asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  const geral = prazoMedioGeral(linhas);
  const volume = linhas.reduce((s, l) => s + l.totalFaturado, 0);
  const comPrazo = [...linhas].sort((a, b) => b.prazoGeral - a.prazoGeral);
  const maior = comPrazo[0];
  const menor = comPrazo[comPrazo.length - 1];

  const grafico = [...linhas]
    .sort((a, b) => b.totalFaturado - a.totalFaturado)
    .slice(0, 10)
    .map((l) => ({ nome: l.fornecedor, prazo: Number(l.prazoGeral.toFixed(1)) }))
    .reverse();

  const linhasExport = (fmt: (n: number) => string | number) =>
    ordenadas.map((l: CicloFornecedor) => ({
      Fornecedor: l.fornecedor,
      "Qtd. notas": l.notas,
      "Total faturado": fmt(l.totalFaturado),
      "Total pago": fmt(l.totalPago),
      "Prazo médio realizado (dias)": fmt(Number(l.prazoRealizado.toFixed(1))),
      "Prazo médio previsto (dias)": fmt(Number(l.prazoPrevisto.toFixed(1))),
      "Prazo geral ponderado (dias)": fmt(Number(l.prazoGeral.toFixed(1))),
    }));

  if (linhas.length === 0) {
    return <SecaoVazia texto="Nenhum título de fornecedor no período selecionado." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Prazo médio da empresa" valor={dias(geral)} tom="neutro" />
        <Kpi titulo="Volume analisado" valor={brl(volume)} tom="neutro" />
        <Kpi
          titulo="Maior prazo"
          valor={maior ? `${maior.fornecedor} · ${dias(maior.prazoGeral)}` : "—"}
          tom="positivo"
        />
        <Kpi
          titulo="Menor prazo"
          valor={menor ? `${menor.fornecedor} · ${dias(menor.prazoGeral)}` : "—"}
          tom="negativo"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prazo médio por fornecedor (maiores volumes)</CardTitle>
        </CardHeader>
        <CardContent style={{ height: Math.max(220, grafico.length * 38) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={grafico} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
              <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="nome"
                width={150}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(v: number | string) => `${Number(v).toFixed(1)} dias`} />
              <Bar dataKey="prazo" name="Prazo médio" fill="#2f4f86" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Ciclo financeiro por fornecedor</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportarCSV(
                  "ciclo-fornecedores",
                  linhasExport((n) => n.toFixed(2).replace(".", ",")),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportarXLSX("ciclo-fornecedores", [
                  { nome: "Ciclo fornecedores", linhas: linhasExport((n) => n) },
                ])
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <Cabecalho c="fornecedor">Fornecedor</Cabecalho>
                <Cabecalho c="notas" right>Qtd. notas</Cabecalho>
                <Cabecalho c="totalFaturado" right>Total faturado</Cabecalho>
                <Cabecalho c="totalPago" right>Total pago</Cabecalho>
                <Cabecalho c="prazoRealizado" right>Prazo realizado</Cabecalho>
                <Cabecalho c="prazoPrevisto" right>Prazo previsto</Cabecalho>
                <Cabecalho c="prazoGeral" right>Prazo ponderado</Cabecalho>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((l) => {
                const chave = l.fornecedorId ?? "sem";
                const expandido = aberto === chave;
                return (
                  <Fragment key={chave}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setAberto(expandido ? null : chave)}
                    >
                      <TableCell>
                        {expandido ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{l.fornecedor}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.notas}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(l.totalFaturado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(l.totalPago)}</TableCell>
                      <TableCell className="text-right tabular-nums">{dias(l.prazoRealizado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{dias(l.prazoPrevisto)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {dias(l.prazoGeral)}
                      </TableCell>
                    </TableRow>
                    {expandido && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/40">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Documento</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Parcela</TableHead>
                                <TableHead>Emissão</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Pagamento</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-right">Dias</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {l.itens.map((i) => (
                                <TableRow key={i.id}>
                                  <TableCell>{i.documento || "—"}</TableCell>
                                  <TableCell className="max-w-[16rem] truncate">{i.descricao}</TableCell>
                                  <TableCell>{i.parcela || "—"}</TableCell>
                                  <TableCell>
                                    {dataBR(i.emissao)}
                                    {i.origemEmissao === "lancamento" && (
                                      <span className="ml-1 text-xs text-muted-foreground">
                                        (lançamento)
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>{dataBR(i.vencimento)}</TableCell>
                                  <TableCell>
                                    {i.pagamento ? dataBR(i.pagamento) : "Em aberto"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{brl(i.valor)}</TableCell>
                                  <TableCell className="text-right tabular-nums">{i.dias}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
