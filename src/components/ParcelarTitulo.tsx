import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

type Linha = { valor: string; data: string };

/** Soma um número de meses mantendo o dia quando possível. */
function somarMeses(iso: string, meses: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

function gerar(total: number, valorTotal: number, primeira: string): Linha[] {
  const base = Math.round((valorTotal / total) * 100) / 100;
  return Array.from({ length: total }, (_, i) => ({
    valor: (i === total - 1
      ? Math.round((valorTotal - base * (total - 1)) * 100) / 100
      : base
    ).toFixed(2),
    data: somarMeses(primeira, i),
  }));
}

/** Divide um título já lançado (em aberto) em parcelas, reaproveitando o registro como 1/N. */
export function ParcelarTitulo({
  conta,
  onClose,
}: {
  conta: Record<string, unknown> | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [qtd, setQtd] = useState(2);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [salvando, setSalvando] = useState(false);

  const valorTotal = Number(conta?.["valor"] ?? 0);
  const vencimento = (conta?.["data_vencimento"] as string) ?? "";

  useEffect(() => {
    if (conta) {
      setQtd(2);
      setLinhas(gerar(2, Number(conta["valor"] ?? 0), (conta["data_vencimento"] as string) ?? ""));
    }
  }, [conta]);

  const soma = useMemo(
    () => linhas.reduce((s, l) => s + (Number(l.valor) || 0), 0),
    [linhas],
  );
  const diferenca = Math.round((soma - valorTotal) * 100) / 100;
  const valido =
    linhas.length >= 2 &&
    linhas.length <= 36 &&
    linhas.every((l) => Number(l.valor) > 0 && !!l.data && !Number.isNaN(Date.parse(l.data)));

  const mudarQtd = (n: number) => {
    const total = Math.min(36, Math.max(2, n || 2));
    setQtd(total);
    setLinhas(gerar(total, valorTotal, vencimento));
  };

  const confirmar = async () => {
    if (!conta || !valido) return;
    setSalvando(true);
    try {
      const total = linhas.length;
      const grupo = crypto.randomUUID();
      const primeira = linhas[0]!;
      const alvo = supabase.from("conta_pagar" as never) as unknown as {
        insert: (v: Record<string, unknown>[]) => PromiseLike<{ error: { message: string } | null }>;
        update: (v: Record<string, unknown>) => {
          eq: (k: string, val: string) => PromiseLike<{ error: { message: string } | null }>;
        };
      };

      const { error: erroUpd } = await alvo
        .update({
          valor: Number(primeira.valor),
          data_vencimento: primeira.data,
          grupo_parcelamento_id: grupo,
          numero_parcela: 1,
          total_parcelas: total,
          parcela: `1/${total}`,
        })
        .eq("id", conta["id"] as string);
      if (erroUpd) throw new Error(erroUpd.message);

      const novas = linhas.slice(1).map((l, i) => ({
        empresa_id: conta["empresa_id"],
        descricao: conta["descricao"],
        valor: Number(l.valor),
        data_vencimento: l.data,
        status: "pendente",
        categoria_id: conta["categoria_id"] ?? null,
        fornecedor_id: conta["fornecedor_id"] ?? null,
        forma_pagamento: conta["forma_pagamento"] ?? null,
        conta_bancaria_id: conta["conta_bancaria_id"] ?? null,
        numero_documento: conta["numero_documento"] ?? null,
        observacao: conta["observacao"] ?? null,
        numero_nfse: conta["numero_nfse"] ?? null,
        prestador_cnpj: conta["prestador_cnpj"] ?? null,
        xml_hash: conta["xml_hash"] ?? null,
        grupo_parcelamento_id: grupo,
        numero_parcela: i + 2,
        total_parcelas: total,
        parcela: `${i + 2}/${total}`,
      }));

      if (novas.length) {
        const { error } = await alvo.insert(novas);
        if (error) throw new Error(error.message);
      }

      await queryClient.invalidateQueries({ queryKey: ["conta_pagar"] });
      toast.success(`Título dividido em ${total} parcelas`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível parcelar o título");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={!!conta} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Parcelar este pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{(conta?.["descricao"] as string) ?? ""}</p>
            <p className="text-muted-foreground">
              Valor total do título: <span className="font-semibold">{brl(valorTotal)}</span>
            </p>
          </div>

          <div className="max-w-[180px]">
            <Label htmlFor="qtd-parcelas-retro">Número de parcelas</Label>
            <Input
              id="qtd-parcelas-retro"
              type="number"
              min={2}
              max={36}
              value={qtd}
              onChange={(e) => mudarQtd(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            {linhas.map((l, i) => (
              <div key={i} className="flex items-end gap-2">
                <span className="w-12 pb-2 text-xs text-muted-foreground">
                  {i + 1}/{linhas.length}
                </span>
                <div className="flex-1">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.valor}
                    onChange={(e) =>
                      setLinhas(linhas.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Vencimento</Label>
                  <Input
                    type="date"
                    value={l.data}
                    onChange={(e) =>
                      setLinhas(linhas.map((x, j) => (j === i ? { ...x, data: e.target.value } : x)))
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm">
            Soma das parcelas: <span className="font-semibold tabular-nums">{brl(soma)}</span>{" "}
            <span className="text-muted-foreground">· total do título {brl(valorTotal)}</span>
          </p>
          {Math.abs(diferenca) >= 0.01 && (
            <p className="text-sm text-warning-foreground">
              A soma das parcelas difere do valor original em {brl(Math.abs(diferenca))}.
            </p>
          )}
          {!valido && (
            <p className="text-sm text-destructive">
              Informe de 2 a 36 parcelas, todas com valor maior que zero e data de vencimento válida.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmar()} disabled={!valido || salvando}>
            {salvando ? "Salvando..." : "Confirmar parcelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
