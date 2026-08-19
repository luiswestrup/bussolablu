import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SecaoVazia } from "@/components/ui-kit";
import { brl, dataBR, hoje } from "@/lib/format";
import { useEmpresa } from "@/lib/empresa";
import {
  saldoContaAte,
  tabela,
  useContasBancarias,
  useExtratosSaldo,
  usePagar,
  useReceber,
  useTransferencias,
} from "@/lib/dados";

/** Formulário de registro do saldo final do extrato, com conta/data controladas por fora. */
export function FormularioExtrato({
  contaId,
  onContaId,
  data,
  onData,
}: {
  contaId: string;
  onContaId: (v: string) => void;
  data: string;
  onData: (v: string) => void;
}) {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: contas = [] } = useContasBancarias(empresa?.id);
  const [saldoExtrato, setSaldoExtrato] = useState("");
  const [observacao, setObservacao] = useState("");

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["extrato_saldo_diario"] });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!contaId) throw new Error("Selecione a conta bancária.");
      if (!data) throw new Error("Informe a data do extrato.");
      if (saldoExtrato.trim() === "" || Number.isNaN(Number(saldoExtrato)))
        throw new Error("Informe o saldo final do extrato.");
      const { error } = await tabela("extrato_saldo_diario").insert({
        empresa_id: empresa!.id,
        conta_bancaria_id: contaId,
        data,
        saldo_extrato: Number(saldoExtrato),
        observacao: observacao.trim() || null,
      });
      if (error)
        throw new Error(
          error.message.includes("duplicate")
            ? "Já existe um saldo de extrato para esta conta nesta data."
            : error.message,
        );
    },
    onSuccess: () => {
      setSaldoExtrato("");
      setObservacao("");
      invalidar();
      toast.success("Saldo de extrato registrado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="text-xs text-muted-foreground">Conta</label>
        <Select value={contaId} onValueChange={onContaId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Selecione" />
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
        <label className="text-xs text-muted-foreground">Data do extrato</label>
        <Input
          type="date"
          className="w-[160px]"
          value={data}
          onChange={(e) => onData(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Saldo do extrato</label>
        <Input
          type="number"
          step="0.01"
          className="w-[170px]"
          value={saldoExtrato}
          onChange={(e) => setSaldoExtrato(e.target.value)}
        />
      </div>
      <div className="flex-1 min-w-[180px]">
        <label className="text-xs text-muted-foreground">Observação (opcional)</label>
        <Input maxLength={200} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>
      <Button onClick={() => salvar.mutate()} disabled={!empresa || salvar.isPending}>
        <Plus className="mr-2 h-4 w-4" /> Registrar
      </Button>
    </div>
  );
}

/** Histórico de verificações de extrato, opcionalmente filtrado por conta. */
export function HistoricoExtrato({ contaId }: { contaId?: string | undefined }) {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: contas = [] } = useContasBancarias(empresa?.id);
  const { data: pagar = [] } = usePagar(empresa?.id);
  const { data: receber = [] } = useReceber(empresa?.id);
  const { data: transferencias = [] } = useTransferencias(empresa?.id);
  const { data: extratos = [] } = useExtratosSaldo(empresa?.id);

  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [revisar, setRevisar] = useState<{ id: string; observacao: string } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["extrato_saldo_diario"] });

  const linhas = useMemo(() => {
    return extratos
      .filter((e) => (!contaId || e.conta_bancaria_id === contaId))
      .filter((e) => (!de || e.data >= de) && (!ate || e.data <= ate))
      .map((e) => {
        const sistema = saldoContaAte(e.conta_bancaria_id, e.data, {
          contas,
          receber,
          pagar,
          transferencias,
        });
        const diferenca = Number(e.saldo_extrato) - sistema;
        return { extrato: e, sistema, diferenca, confere: Math.abs(diferenca) < 0.01 };
      })
      .sort((a, b) => (a.extrato.data < b.extrato.data ? 1 : -1));
  }, [extratos, contaId, de, ate, contas, receber, pagar, transferencias]);

  const nomeConta = (id: string) => {
    const c = contas.find((x) => x.id === id);
    return c ? `${c.banco}${c.conta ? ` · ${c.conta}` : ""}` : "—";
  };

  const marcarRevisado = useMutation({
    mutationFn: async ({ id, observacao }: { id: string; observacao: string }) => {
      const { error } = await tabela("extrato_saldo_diario")
        .update({
          revisado: true,
          revisado_em: new Date().toISOString(),
          observacao: observacao.trim() || null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setRevisar(null);
      invalidar();
      toast.success("Divergência marcada como revisada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela("extrato_saldo_diario").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Verificação removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Período de</label>
          <Input type="date" className="w-[160px]" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">até</label>
          <Input type="date" className="w-[160px]" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        {(de || ate) && (
          <Button
            variant="ghost"
            onClick={() => {
              setDe("");
              setAte("");
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      <div className="mt-3">
        {linhas.length === 0 ? (
          <SecaoVazia texto="Nenhuma verificação de extrato registrada." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Saldo extrato</TableHead>
                <TableHead className="text-right">Saldo sistema</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ extrato, sistema, diferenca, confere }) => (
                <TableRow key={extrato.id}>
                  <TableCell>{dataBR(extrato.data)}</TableCell>
                  <TableCell className="font-medium">{nomeConta(extrato.conta_bancaria_id)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(Number(extrato.saldo_extrato))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{brl(sistema)}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${confere ? "" : "font-medium text-destructive"}`}
                  >
                    {brl(diferenca)}
                  </TableCell>
                  <TableCell>
                    {confere ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3 w-3" /> Confere
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2.5 py-0.5 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Diverge
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Sistema {diferenca > 0 ? "a menos" : "a mais"} que o banco em{" "}
                          {brl(Math.abs(diferenca))}
                          {extrato.revisado ? " · revisado" : ""}
                        </p>
                        {extrato.observacao && (
                          <p className="text-xs text-muted-foreground">{extrato.observacao}</p>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {!confere && !extrato.revisado && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevisar({ id: extrato.id, observacao: extrato.observacao ?? "" })}
                      >
                        Marcar como revisado
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Excluir verificação"
                      onClick={() => excluir.mutate(extrato.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!revisar} onOpenChange={(o) => !o && setRevisar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar divergência como revisada</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs text-muted-foreground">Observação (opcional)</label>
            <Input
              maxLength={200}
              placeholder="Ex.: tarifa bancária ainda não lançada"
              value={revisar?.observacao ?? ""}
              onChange={(e) => revisar && setRevisar({ ...revisar, observacao: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisar(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => revisar && marcarRevisado.mutate(revisar)}
              disabled={marcarRevisado.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
