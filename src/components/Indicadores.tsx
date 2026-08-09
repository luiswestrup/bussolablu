import { useMemo } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";
import type { ContaPagar, ContaReceber } from "@/lib/dados";

type Periodo = { inicio: string; fim: string };

const mesRef = (offset: number): Periodo => {
  const d = new Date();
  const ini = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  const fim = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
  return { inicio: ini.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
};

const dentro = (d: string | null, p: Periodo) => !!d && d >= p.inicio && d <= p.fim;
const soma = (lista: { valor: number }[]) => lista.reduce((s, c) => s + Number(c.valor), 0);
const mediaDias = (lista: { data_vencimento: string }[], liquidacoes: (string | null)[]) => {
  const dias = lista
    .map((c, i) => {
      const liq = liquidacoes[i];
      if (!liq) return null;
      return (Date.parse(liq) - Date.parse(c.data_vencimento)) / 86_400_000;
    })
    .filter((v): v is number => v !== null);
  return dias.length ? dias.reduce((s, d) => s + d, 0) / dias.length : 0;
};

function calcular(pagar: ContaPagar[], receber: ContaReceber[], p: Periodo, hojeISO: string) {
  const recebidos = receber.filter((c) => dentro(c.data_recebimento, p));
  const pagos = pagar.filter((c) => dentro(c.data_pagamento, p));
  const faturamento = soma(recebidos);
  const despesas = soma(pagos);

  const aReceberPeriodo = receber.filter((c) => dentro(c.data_vencimento, p));
  const inadimplente = aReceberPeriodo.filter(
    (c) => c.status !== "recebido" && c.data_vencimento < hojeISO,
  );
  const totalAReceber = soma(aReceberPeriodo);
  const inadimplencia = totalAReceber > 0 ? (soma(inadimplente) / totalAReceber) * 100 : 0;

  const prazoRecebimento = mediaDias(
    recebidos,
    recebidos.map((c) => c.data_recebimento),
  );
  const prazoPagamento = mediaDias(
    pagos,
    pagos.map((c) => c.data_pagamento),
  );

  return {
    faturamento,
    despesas,
    lucro: faturamento - despesas,
    inadimplencia,
    ciclo: prazoRecebimento - prazoPagamento,
  };
}

function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  if (!isFinite(atual) || anterior === 0) {
    return (
      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> sem base no mês anterior
      </span>
    );
  }
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100;
  const subiu = pct >= 0;
  return (
    <span
      className={cn(
        "mt-1 flex items-center gap-1 text-xs font-medium",
        subiu ? "text-success" : "text-destructive",
      )}
    >
      {subiu ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}% vs. mês anterior
    </span>
  );
}

function CardIndicador({
  titulo,
  valor,
  atual,
  anterior,
  detalhe,
}: {
  titulo: string;
  valor: string;
  atual: number;
  anterior: number;
  detalhe?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {titulo}
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{valor}</p>
        <Variacao atual={atual} anterior={anterior} />
        {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  );
}

export function Indicadores({
  pagar,
  receber,
  saldoAtual,
  hojeISO,
}: {
  pagar: ContaPagar[];
  receber: ContaReceber[];
  saldoAtual: number;
  hojeISO: string;
}) {
  const atual = useMemo(
    () => calcular(pagar, receber, mesRef(0), hojeISO),
    [pagar, receber, hojeISO],
  );
  const anterior = useMemo(
    () => calcular(pagar, receber, mesRef(-1), hojeISO),
    [pagar, receber, hojeISO],
  );
  const saldoAnterior = saldoAtual - atual.lucro;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <CardIndicador
        titulo="Faturamento do mês"
        valor={brl(atual.faturamento)}
        atual={atual.faturamento}
        anterior={anterior.faturamento}
      />
      <CardIndicador
        titulo="Despesas do mês"
        valor={brl(atual.despesas)}
        atual={atual.despesas}
        anterior={anterior.despesas}
      />
      <CardIndicador
        titulo="Saldo atual"
        valor={brl(saldoAtual)}
        atual={saldoAtual}
        anterior={saldoAnterior}
        detalhe="Saldo inicial das contas + liquidações."
      />
      <CardIndicador
        titulo="Lucro do mês"
        valor={brl(atual.lucro)}
        atual={atual.lucro}
        anterior={anterior.lucro}
      />
      <CardIndicador
        titulo="Taxa de inadimplência"
        valor={`${atual.inadimplencia.toFixed(1)}%`}
        atual={atual.inadimplencia}
        anterior={anterior.inadimplencia}
        detalhe="Vencido não recebido ÷ total a receber do mês."
      />
      <CardIndicador
        titulo="Ciclo de caixa"
        valor={`${atual.ciclo.toFixed(1)} dias`}
        atual={atual.ciclo}
        anterior={anterior.ciclo}
        detalhe="Prazo médio de recebimento menos o de pagamento."
      />
    </div>
  );
}