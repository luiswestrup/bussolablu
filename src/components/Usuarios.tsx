import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { SecaoVazia } from "@/components/ui-kit";
import { useEmpresa } from "@/lib/empresa";
import { ROTULO_PAPEL, type Papel } from "@/lib/papel";
import { tabela } from "@/lib/dados";
import { dataBR } from "@/lib/format";

type UsuarioLinha = {
  vinculo_id: string;
  user_id: string;
  email: string;
  empresa_id: string;
  papel: Papel;
  pode_ver_consolidado: boolean;
};

type Convite = {
  id: string;
  empresa_id: string;
  email: string;
  papel: Papel;
  pode_ver_consolidado: boolean;
  status: string;
  criado_em: string;
};

const PAPEIS: Papel[] = ["admin", "financeiro", "estoque"];

export function Usuarios() {
  const { empresas, empresa, escopo, nomeEmpresa } = useEmpresa();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    email: "",
    empresa_id: empresa?.id ?? empresas[0]?.id ?? "",
    papel: "financeiro" as Papel,
    consolidado: false,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios_da_empresa"],
    queryFn: async () => {
      const { data, error } = await (
        supabase as unknown as {
          rpc: (n: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
        }
      ).rpc("usuarios_da_empresa");
      if (error) throw new Error(error.message);
      return (data ?? []) as UsuarioLinha[];
    },
  });

  const { data: convites = [] } = useQuery({
    queryKey: ["convite", escopo.join(",")],
    enabled: escopo.length > 0,
    queryFn: async () => {
      const { data, error } = await (
        supabase.from("convite" as never) as unknown as {
          select: (c: string) => {
            in: (
              k: string,
              v: string[],
            ) => {
              order: (
                c: string,
                o: { ascending: boolean },
              ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
            };
          };
        }
      )
        .select("id, empresa_id, email, papel, pode_ver_consolidado, status, criado_em")
        .in("empresa_id", escopo)
        .order("criado_em", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Convite[];
    },
  });

  const convidar = useMutation({
    mutationFn: async () => {
      const { error } = await tabela("convite").insert({
        empresa_id: form.empresa_id,
        email: form.email.trim().toLowerCase(),
        papel: form.papel,
        pode_ver_consolidado: form.consolidado,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setForm({ ...form, email: "", consolidado: false });
      queryClient.invalidateQueries({ queryKey: ["convite"] });
      toast.success("Convite registrado. O acesso é liberado quando a pessoa criar a conta com esse e-mail.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removerConvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela("convite").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["convite"] });
      toast.success("Convite removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizarVinculo = useMutation({
    mutationFn: async ({ id, valores }: { id: string; valores: Record<string, unknown> }) => {
      const { error } = await tabela("usuario_empresa").update(valores).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios_da_empresa"] });
      queryClient.invalidateQueries({ queryKey: ["meus_papeis"] });
      toast.success("Permissões atualizadas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removerVinculo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela("usuario_empresa").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios_da_empresa"] });
      toast.success("Acesso revogado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Convidar usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="e-mail@empresa.com"
              type="email"
              className="max-w-xs"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Select
              value={form.empresa_id}
              onValueChange={(v) => setForm({ ...form, empresa_id: v })}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.papel} onValueChange={(v) => setForm({ ...form, papel: v as Papel })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAPEIS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {ROTULO_PAPEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.consolidado}
                onCheckedChange={(v) => setForm({ ...form, consolidado: v })}
              />
              Visão consolidada
            </label>
            <Button
              onClick={() => convidar.mutate()}
              disabled={!form.email.trim() || !form.empresa_id || convidar.isPending}
            >
              <Plus className="mr-2 h-4 w-4" /> Convidar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuários com acesso</CardTitle>
        </CardHeader>
        <CardContent>
          {usuarios.length === 0 ? (
            <SecaoVazia texto="Nenhum usuário vinculado." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Consolidado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.vinculo_id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{nomeEmpresa(u.empresa_id)}</TableCell>
                    <TableCell>
                      <Select
                        value={u.papel}
                        onValueChange={(v) =>
                          atualizarVinculo.mutate({ id: u.vinculo_id, valores: { papel: v } })
                        }
                      >
                        <SelectTrigger className="w-[170px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAPEIS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {ROTULO_PAPEL[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.pode_ver_consolidado}
                        onCheckedChange={(v) =>
                          atualizarVinculo.mutate({
                            id: u.vinculo_id,
                            valores: { pode_ver_consolidado: v },
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Revogar acesso"
                        onClick={() => removerVinculo.mutate(u.vinculo_id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Convites</CardTitle>
        </CardHeader>
        <CardContent>
          {convites.length === 0 ? (
            <SecaoVazia texto="Nenhum convite registrado." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Consolidado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {convites.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="flex items-center gap-2 font-medium">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {c.email}
                    </TableCell>
                    <TableCell>{nomeEmpresa(c.empresa_id)}</TableCell>
                    <TableCell>{ROTULO_PAPEL[c.papel]}</TableCell>
                    <TableCell>{c.pode_ver_consolidado ? "Sim" : "Não"}</TableCell>
                    <TableCell className="capitalize">{c.status}</TableCell>
                    <TableCell>{dataBR(c.criado_em.slice(0, 10))}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Remover convite"
                        onClick={() => removerConvite.mutate(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}