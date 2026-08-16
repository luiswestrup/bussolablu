import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Pencil, Check, X, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
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
import { descobrirAbasPlanilha } from "@/lib/planilha-recebimentos.functions";

export function AbasPlanilha() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: abas = [] } = usePlanilhaAbas(empresa?.id);
  const [nova, setNova] = useState({ nome: "", gid: "" });
  const [editando, setEditando] = useState<{ id: string; nome: string; gid: string } | null>(null);
  const [encontradas, setEncontradas] = useState<{ nome: string; gid: string }[] | null>(null);
  const buscarAbas = useServerFn(descobrirAbasPlanilha);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["planilha_aba_config"] });

  const criar = useMutation({
    mutationFn: async (entrada?: { nome: string; gid: string }) => {
      const dados = entrada ?? nova;
      const { error } = await tabela("planilha_aba_config").insert({
        empresa_id: empresa!.id,
        nome: dados.nome.trim(),
        gid: dados.gid.trim(),
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

  const salvarEdicao = useMutation({
    mutationFn: async () => {
      const { error } = await tabela("planilha_aba_config")
        .update({ nome: editando!.nome.trim(), gid: editando!.gid.trim() })
        .eq("id", editando!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setEditando(null);
      invalidar();
      toast.success("Aba atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const descobrir = useMutation({
    mutationFn: async () => buscarAbas({}),
    onSuccess: (lista) => {
      setEncontradas(lista);
      if (lista.length === 0) toast.info("Nenhuma aba encontrada na planilha.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const novasEncontradas = (encontradas ?? []).filter(
    (e) => !abas.some((a) => a.gid === e.gid),
  );

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
            onClick={() => criar.mutate(undefined)}
          >
            Adicionar
          </Button>
          <Button
            variant="outline"
            disabled={!empresa || descobrir.isPending}
            onClick={() => descobrir.mutate()}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${descobrir.isPending ? "animate-spin" : ""}`} />
            Buscar abas novas
          </Button>
        </div>

        {encontradas && (
          <div className="mt-4 rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">
              {novasEncontradas.length
                ? "Abas encontradas na planilha que ainda não estão cadastradas:"
                : "Todas as abas da planilha já estão cadastradas."}
            </p>
            <div className="flex flex-wrap gap-2">
              {novasEncontradas.map((a) => (
                <div key={a.gid} className="flex items-center gap-2 rounded-md border px-2 py-1">
                  <span className="text-sm">{a.nome}</span>
                  <span className="font-mono text-xs text-muted-foreground">{a.gid}</span>
                  <Button size="sm" variant="secondary" onClick={() => criar.mutate(a)}>
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {abas.length === 0 ? (
          <SecaoVazia texto="Nenhuma aba cadastrada — a sincronização usará a lista padrão." />
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
                  <TableCell>
                    {editando?.id === a.id ? (
                      <Input
                        value={editando.nome}
                        maxLength={60}
                        onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                      />
                    ) : (
                      a.nome
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {editando?.id === a.id ? (
                      <Input
                        value={editando.gid}
                        maxLength={30}
                        onChange={(e) => setEditando({ ...editando, gid: e.target.value })}
                      />
                    ) : (
                      a.gid
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={a.ativo}
                      onCheckedChange={(v) => alternar.mutate({ id: a.id, ativo: v })}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {editando?.id === a.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!editando.nome.trim() || !editando.gid.trim()}
                          onClick={() => salvarEdicao.mutate()}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditando(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditando({ id: a.id, nome: a.nome, gid: a.gid })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => excluir.mutate(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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