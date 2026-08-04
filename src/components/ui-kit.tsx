import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Kpi({
  titulo,
  valor,
  detalhe,
  icone,
  tom = "neutro",
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone?: ReactNode;
  tom?: "neutro" | "positivo" | "negativo" | "alerta";
}) {
  const cor = {
    neutro: "text-foreground",
    positivo: "text-success",
    negativo: "text-destructive",
    alerta: "text-warning",
  }[tom];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {titulo}
          </p>
          {icone && <span className="text-muted-foreground">{icone}</span>}
        </div>
        <p className={cn("mt-2 text-2xl font-semibold tabular-nums", cor)}>{valor}</p>
        {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const estilo: Record<string, string> = {
    pago: "bg-success/12 text-success",
    recebido: "bg-success/12 text-success",
    pendente: "bg-warning/15 text-warning-foreground",
    vencido: "bg-destructive/12 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        estilo[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function SecaoVazia({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}