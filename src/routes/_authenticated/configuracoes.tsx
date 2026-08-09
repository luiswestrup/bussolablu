import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SecaoVazia } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useEmpresa } from "@/lib/empresa";
import {
  NATUREZAS,
  rotuloNatureza,
  tabela,
  useCategorias,
  useClientes,
  useContasBancarias,
  useFornecedores,
} from "@/lib/dados";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Cadastros — Fluxo Gestão" },
      { name: "description", content: "Gerencie categorias, fornecedores e clientes de cada empresa." },
      { property: "og:title", content: "Cadastros — Fluxo Gestão" },
      { property: "og:description", content: "Categorias, fornecedores e clientes por empresa." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ListaParceiros({
  chave,
  titulo,
  itens,
}: {
  chave: "fornecedor" | "cliente";
  titulo: string;
  itens: { id: string; nome: string; contato: string | null; documento: string | null }[];
}) {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ nome: "", contato: "", documento: "" });
  const invalidar = () => queryClient.invalidateQueries({ queryKey: [chave] });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await tabela(chave).insert({
        empresa_id: empresa!.id,
        nome: form.nome.trim(),
        contato: form.contato.trim() || null,
        documento: form.documento.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setForm({ nome: "", contato: "", documento: "" });
      invalidar();
      toast.success(`${titulo} cadastrado.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela(chave).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Registro removido.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}s</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Nome"
            maxLength={120}
            className="max-w-xs"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Input
            placeholder="Contato"
            maxLength={120}
            className="max-w-xs"
            value={form.contato}
            onChange={(e) => setForm({ ...form, contato: e.target.value })}
          />
          <Input
            placeholder="CNPJ/CPF"
            maxLength={20}
            className="max-w-[180px]"
            value={form.documento}
            onChange={(e) => setForm({ ...form, documento: e.target.value })}
          />
          <Button onClick={() => criar.mutate()} disabled={!form.nome.trim() || criar.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>

        <div className="mt-4">
          {itens.length === 0 ? (
            <SecaoVazia texto={`Nenhum ${titulo.toLowerCase()} cadastrado.`} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.nome}</TableCell>
                    <TableCell>{i.contato ?? "—"}</TableCell>
                    <TableCell>{i.documento ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => excluir.mutate(i.id)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ConfiguracoesPage() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: categorias = [] } = useCategorias(empresa?.id);
  const { data: fornecedores = [] } = useFornecedores(empresa?.id);
  const { data: clientes = [] } = useClientes(empresa?.id);
  const [cat, setCat] = useState({ nome: "", tipo: "despesa", natureza: "mercadoria" });

  const criarCategoria = useMutation({
    mutationFn: async () => {
      const { error } = await tabela("categoria").insert({
        empresa_id: empresa!.id,
        nome: cat.nome.trim(),
        tipo: cat.tipo,
        natureza: cat.tipo === "despesa" ? cat.natureza : null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setCat({ nome: "", tipo: "despesa", natureza: "mercadoria" });
      queryClient.invalidateQueries({ queryKey: ["categoria"] });
      toast.success("Categoria criada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alterarNatureza = useMutation({
    mutationFn: async ({ id, natureza }: { id: string; natureza: string }) => {
      const { error } = await tabela("categoria").update({ natureza }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoria"] });
      toast.success("Natureza atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirCategoria = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela("categoria").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoria"] });
      toast.success("Categoria removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell titulo="Cadastros">
      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="contas">Contas bancárias</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categorias de {empresa?.nome ?? "—"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Nome da categoria"
                  maxLength={80}
                  className="max-w-xs"
                  value={cat.nome}
                  onChange={(e) => setCat({ ...cat, nome: e.target.value })}
                />
                <Select value={cat.tipo} onValueChange={(v) => setCat({ ...cat, tipo: v })}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="produto">Produto</SelectItem>
                  </SelectContent>
                </Select>
                {cat.tipo === "despesa" && (
                  <Select value={cat.natureza} onValueChange={(v) => setCat({ ...cat, natureza: v })}>
                    <SelectTrigger className="w-[210px]">
                      <SelectValue placeholder="Natureza" />
                    </SelectTrigger>
                    <SelectContent>
                      {NATUREZAS.map((n) => (
                        <SelectItem key={n.valor} value={n.valor}>
                          {n.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  onClick={() => criarCategoria.mutate()}
                  disabled={!empresa || !cat.nome.trim() || criarCategoria.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar
                </Button>
              </div>

              <div className="mt-4">
                {categorias.length === 0 ? (
                  <SecaoVazia texto="Nenhuma categoria cadastrada." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Natureza</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorias.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.nome}</TableCell>
                          <TableCell className="capitalize">{c.tipo}</TableCell>
                          <TableCell>
                            {c.tipo === "despesa" ? (
                              <Select
                                value={c.natureza ?? "outro"}
                                onValueChange={(v) => alterarNatureza.mutate({ id: c.id, natureza: v })}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {NATUREZAS.map((n) => (
                                    <SelectItem key={n.valor} value={n.valor}>
                                      {n.rotulo}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Excluir"
                              onClick={() => excluirCategoria.mutate(c.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fornecedores" className="mt-4">
          <ListaParceiros chave="fornecedor" titulo="Fornecedor" itens={fornecedores} />
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <ListaParceiros chave="cliente" titulo="Cliente" itens={clientes} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}