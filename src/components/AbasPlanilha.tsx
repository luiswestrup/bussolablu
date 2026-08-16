import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { SecaoVazia } from "@/components/ui-kit";
import { useEmpresa } from "@/lib/empresa";
import { tabela, usePlanilhaAbas } from "@/lib/dados";

export function AbasPlanilha() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: abas = [] } = usePlanilhaAbas(empresa?.id);
  const [nova, setNova] = useState({ nome: "", gid: "" });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["planilha_aba_config"] });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await tabela("planilha_aba_config").insert({
        empresa_id: empresa!.id,
        nome: nova.nome.trim(),
        gid: nova.gid.trim(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNova({ nome: "", gid: "" });
      invalidar();
      toast.success("Aba cadastrada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternar = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await tabela("planilha_aba_config").update({ ativo }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela("planilha_aba_config").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Aba removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Abas da planilha de {empresa?.nome ?? "—"}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Cada mês tem uma aba na planilha do Google. O gid aparece no fim do endereço da planilha
          quando a aba está aberta (…#gid=123456789).
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Nome da aba (ex: Agosto/2026)"
            className="max-w-xs"
            maxLength={60}
            value={nova.nome}
            onChange={(e) => setNova({ ...nova, nome: e.target.value })}
          />
          <Input
            placeholder="gid"
            className="max-w-[160px]"
            maxLength={30}
            value={nova.gid}
            onChange={(e) => setNova({ ...nova, gid: e.target.value })}
          />
          <Button
            disabled={!empresa || !nova.nome.trim() || !nova.gid.trim() || criar.isPending}
            onClick={() => criar.mutate()}
          >
            Adicionar
          </Button>
        </div>

        {abas.length === 0 ? (
          <SecaoVazia mensagem="Nenhuma aba cadastrada — a sincronização usará a lista padrão." />
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Aba</TableHead>
                <TableHead>gid</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {abas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{a.gid}</TableCell>
                  <TableCell>
                    <Switch
                      checked={a.ativo}
                      onCheckedChange={(v) => alternar.mutate({ id: a.id, ativo: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => excluir.mutate(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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