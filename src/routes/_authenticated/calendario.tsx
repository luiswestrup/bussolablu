import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SecaoVazia } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useEmpresa } from "@/lib/empresa";
import { brl, dataBR, hoje } from "@/lib/format";
import { situacao, usePagar, useReceber } from "@/lib/dados";
import { StatusBadge } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário financeiro — Bussola Blu" },
      {
        name: "description",
        content: "Veja em um calendário mensal os vencimentos de contas a pagar e a receber.",
      },
      { property: "og:title", content: "Calendário financeiro — Bussola Blu" },
      {
        property: "og:description",
        content: "Vencimentos diários de pagamentos e recebimentos em visão de calendário.",
      },
    ],
  }),
  component: CalendarioPage,
});

type Titulo = {
  id: string;
  tipo: "pagar" | "receber";
  descricao: string;
  valor: number;
  status: string;
  vencimento: string;
  empresa_id: string;
  pago: number;
};

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const iso = (a: number, m: number, d: number) =>
  `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function CalendarioPage() {
  const { escopo, consolidado, nomeEmpresa } = useEmpresa();
  const { data: pagar = [] } = usePagar(escopo);
  const { data: receber = [] } = useReceber(escopo);
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth());
  const [visao, setVisao] = useState<"pagar" | "geral">("pagar");
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const hojeISO = hoje();

  const titulos = useMemo<Titulo[]>(
    () => [
      ...pagar.map((c) => ({
        id: c.id,
        tipo: "pagar" as const,
        descricao: c.descricao,
        valor: Number(c.valor),
        status: situacao(c.status, c.data_vencimento, hojeISO),
        vencimento: c.data_vencimento,
        empresa_id: c.empresa_id,
        pago: c.status === "pago" ? Number(c.valor_pago ?? c.valor) : 0,
      })),
      ...receber.map((c) => ({
        id: c.id,
        tipo: "receber" as const,
        descricao: c.descricao,
        valor: Number(c.valor),
        status: situacao(c.status, c.data_vencimento, hojeISO),
        vencimento: c.data_vencimento,
        empresa_id: c.empresa_id,
        pago: 0,
      })),
    ],
    [pagar, receber, hojeISO],
  );

  const porDia = useMemo(() => {
    const mapa = new Map<string, Titulo[]>();
    for (const t of titulos) {
      const lista = mapa.get(t.vencimento) ?? [];
      lista.push(t);
      mapa.set(t.vencimento, lista);
    }
    return mapa;
  }, [titulos]);

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  const mover = (delta: number) => {
    const d = new Date(ano, mes + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth());
  };

  const totalMes = (tipo: "pagar" | "receber") =>
    titulos
      .filter((t) => t.tipo === tipo && t.vencimento.slice(0, 7) === iso(ano, mes, 1).slice(0, 7))
      .reduce((s, t) => s + t.valor, 0);

  const mesISO = iso(ano, mes, 1).slice(0, 7);
  const pagarMes = titulos.filter((t) => t.tipo === "pagar" && t.vencimento.slice(0, 7) === mesISO);
  const lancadoMes = pagarMes.reduce((s, t) => s + t.valor, 0);
  const pagoMes = pagarMes.reduce((s, t) => s + t.pago, 0);
  const pendenteMes = pagarMes.filter((t) => t.status !== "pago").reduce((s, t) => s + t.valor, 0);

  const itensDoDia = (diaAberto ? (porDia.get(diaAberto) ?? []) : []).filter(
    (t) => visao === "geral" || t.tipo === "pagar",
  );

  return (
    <AppShell titulo="Calendário financeiro">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => mover(-1)} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base capitalize">
              {MESES[mes]} de {ano}
            </CardTitle>
            <Button variant="outline" size="icon" onClick={() => mover(1)} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex rounded-md border p-0.5 text-sm">
            {(["pagar", "geral"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVisao(v)}
                className={cn(
                  "rounded px-3 py-1 transition-colors",
                  visao === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "pagar" ? "Contas a pagar: lançado x pago" : "Visão geral"}
              </button>
            ))}
          </div>
          {visao === "pagar" ? (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>Lançado: <strong className="tabular-nums">{brl(lancadoMes)}</strong></span>
            <span className="text-success">
              Pago: <strong className="tabular-nums">{brl(pagoMes)}</strong>
              {lancadoMes > 0 && ` (${Math.round((pagoMes / lancadoMes) * 100)}%)`}
            </span>
            <span className="text-destructive">A pagar: <strong className="tabular-nums">{brl(pendenteMes)}</strong></span>
          </div>
          ) : (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> A pagar:{" "}
              <strong className="tabular-nums">{brl(totalMes("pagar"))}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" /> A receber:{" "}
              <strong className="tabular-nums">{brl(totalMes("receber"))}</strong>
            </span>
          </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase text-muted-foreground">
            {SEMANA.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celulas.map((dia, i) => {
              if (dia === null) return <div key={`v-${i}`} className="min-h-24 rounded-md" />;
              const data = iso(ano, mes, dia);
              const itens = (porDia.get(data) ?? []).filter(
                (t) => visao === "geral" || t.tipo === "pagar",
              );
              const pg = itens.filter((t) => t.tipo === "pagar");
              const lancDia = pg.reduce((s, t) => s + t.valor, 0);
              const pagoDia = pg.reduce((s, t) => s + t.pago, 0);
              const quitado = pg.length > 0 && pg.every((t) => t.status === "pago");
              const aPagar = itens
                .filter((t) => t.tipo === "pagar")
                .reduce((s, t) => s + t.valor, 0);
              const aReceber = itens
                .filter((t) => t.tipo === "receber")
                .reduce((s, t) => s + t.valor, 0);
              return (
                <button
                  key={data}
                  onClick={() => itens.length && setDiaAberto(data)}
                  className={cn(
                    "min-h-24 rounded-md border p-1.5 text-left transition-colors",
                    itens.length ? "hover:border-primary hover:bg-muted/50" : "cursor-default",
                    data === hojeISO && "border-primary ring-1 ring-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium",
                      data === hojeISO ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {dia}
                  </span>
                  {visao === "pagar" ? (
                  <div className="mt-1 space-y-0.5 text-[11px] tabular-nums">
                    {lancDia > 0 && (
                      <>
                        <div className="truncate text-muted-foreground">L: {brl(lancDia)}</div>
                        <div className={cn("truncate font-medium", pagoDia > 0 ? "text-success" : "text-muted-foreground")}>
                          P: {brl(pagoDia)}
                        </div>
                        {quitado ? (
                          <div className="truncate rounded bg-success/12 px-1 text-success">Quitado</div>
                        ) : (
                          <div className="truncate rounded bg-destructive/12 px-1 text-destructive">
                            Falta {brl(pg.filter((t) => t.status !== "pago").reduce((s, t) => s + t.valor, 0))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  ) : (
                  <div className="mt-1 space-y-1">
                    {aPagar > 0 && (
                      <div className="truncate rounded bg-destructive/12 px-1 py-0.5 text-[11px] font-medium tabular-nums text-destructive">
                        {brl(aPagar)}
                      </div>
                    )}
                    {aReceber > 0 && (
                      <div className="truncate rounded bg-success/12 px-1 py-0.5 text-[11px] font-medium tabular-nums text-success">
                        {brl(aReceber)}
                      </div>
                    )}
                  </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!diaAberto} onOpenChange={(o) => !o && setDiaAberto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vencimentos em {dataBR(diaAberto)}</DialogTitle>
          </DialogHeader>
          {itensDoDia.length === 0 ? (
            <SecaoVazia texto="Nenhum título nesta data." />
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {itensDoDia.map((t) => (
                <div
                  key={`${t.tipo}-${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.tipo === "pagar" ? "A pagar" : "A receber"}
                      {consolidado ? ` · ${nomeEmpresa(t.empresa_id)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} />
                    {t.tipo === "pagar" && t.pago > 0 && (
                      <span className="text-xs text-success tabular-nums">pago {brl(t.pago)}</span>
                    )}
                    <span
                      className={cn(
                        "tabular-nums font-semibold",
                        t.tipo === "pagar" ? "text-destructive" : "text-success",
                      )}
                    >
                      {brl(t.valor)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}