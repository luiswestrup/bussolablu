import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SecaoVazia } from "@/components/ui-kit";
import { useEmpresa } from "@/lib/empresa";
import { tabela, useTaxasRecebimento } from "@/lib/dados";

export const FORMAS_RECEBIMENTO = [
  "Pix",
  "Débito",
  "Crédito",
  "Transferência",
  "Boleto",
  "Dinheiro",
  "Cartão",
  "Cheque",
];

export function TaxasRecebimento() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: taxas = [] } = useTaxasRecebimento(empresa?.id);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  useEffect(() => {
    setRascunho(
      Object.fromEntries(taxas.map((t) => [t.id, String(Number(t.percentual))])),
    );
  }, [taxas]);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["taxa_recebimento"] });

  const salvar = useMutation({
    mutationFn: async ({ id, valores }: { id: string; valores: Record<string, unknown> }) => {
      const { error } = await tabela("taxa_recebimento").update(valores).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Taxa atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarFaltantes = useMutation({
    mutationFn: async () => {
      const faltantes = FORMAS_RECEBIMENTO.filter(
        (f) => !taxas.some((t) => t.forma_recebimento === f),
      );
      for (const forma of faltantes) {
        const { error } = await tabela("taxa_recebimento").insert({
          empresa_id: empresa!.id,
          forma_recebimento: forma,
          percentual: 0,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      invalidar();
      toast.success("Meios de pagamento sincronizados.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const faltam = FORMAS_RECEBIMENTO.some((f) => !taxas.some((t) => t.forma_recebimento === f));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Taxas de recebimento de {empresa?.nome ?? "—"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Percentual descontado do valor bruto em cada meio de pagamento. Use 0 para meios sem
          taxa; o percentual ainda pode ser ajustado em cada lançamento.
        </p>
        {faltam && (
          <Button
            variant="outline"
            className="mb-3"
            disabled={!empresa || criarFaltantes.isPending}
            onClick={() => criarFaltantes.mutate()}
          >
            Adicionar meios de pagamento que faltam
          </Button>
        )}
        {taxas.length === 0 ? (
          <SecaoVazia texto="Nenhum meio de pagamento cadastrado." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meio de pagamento</TableHead>
                <TableHead className="w-40">Taxa (%)</TableHead>
                <TableHead className="w-24">Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxas.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.forma_recebimento}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="max-w-[130px]"
                      value={rascunho[t.id] ?? ""}
                      onChange={(e) => setRascunho({ ...rascunho, [t.id]: e.target.value })}
                      onBlur={() => {
                        const novo = Number(rascunho[t.id] ?? 0);
                        if (Number.isNaN(novo) || novo < 0) {
                          toast.error("Informe um percentual válido.");
                          return;
                        }
                        if (novo !== Number(t.percentual)) {
                          salvar.mutate({ id: t.id, valores: { percentual: novo } });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={t.ativo}
                      onCheckedChange={(v) =>
                        salvar.mutate({ id: t.id, valores: { ativo: v } })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
