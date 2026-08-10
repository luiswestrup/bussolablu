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
import { usePapel } from "@/lib/papel";
import { Usuarios } from "@/components/Usuarios";
import { Auditoria } from "@/components/Auditoria";
import { brl } from "@/lib/format";
import {
  tabela,
  useCategorias,
  useClientes,
  useContasBancarias,
  useFornecedores,
  useNaturezas,
} from "@/lib/dados";
import { SeletorNatureza } from "@/components/SeletorNatureza";

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
  const { eAdmin } = usePapel();
  const queryClient = useQueryClient();
  const { data: categorias = [] } = useCategorias(empresa?.id);
  const { data: naturezas = [] } = useNaturezas(empresa?.id);
  const { data: fornecedores = [] } = useFornecedores(empresa?.id);
  const { data: clientes = [] } = useClientes(empresa?.id);
  const [cat, setCat] = useState({ nome: "", tipo: "despesa", natureza_id: "" });

  const criarCategoria = useMutation({
    mutationFn: async () => {
      const { error } = await tabela("categoria").insert({
        empresa_id: empresa!.id,
        nome: cat.nome.trim(),
        tipo: cat.tipo,
        natureza_id: cat.tipo === "despesa" ? cat.natureza_id || null : null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setCat({ nome: "", tipo: "despesa", natureza_id: "" });
      queryClient.invalidateQueries({ queryKey: ["categoria"] });
      toast.success("Categoria criada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alterarNatureza = useMutation({
    mutationFn: async ({ id, naturezaId }: { id: string; naturezaId: string }) => {
      const { error } = await tabela("categoria").update({ natureza_id: naturezaId }).eq("id", id);
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
          <TabsTrigger value="naturezas">Naturezas</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="contas">Contas bancárias</TabsTrigger>
          {eAdmin && <TabsTrigger value="usuarios">Usuários</TabsTrigger>}
          {eAdmin && <TabsTrigger value="auditoria">Auditoria</TabsTrigger>}
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
                  <SeletorNatureza
                    className="w-[210px]"
                    naturezas={naturezas}
                    value={cat.natureza_id}
                    onChange={(v) => setCat({ ...cat, natureza_id: v })}
                    empresaId={empresa?.id}
                  />
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
                              <SeletorNatureza
                                className="w-[210px]"
                                naturezas={naturezas}
                                value={c.natureza_id ?? ""}
                                onChange={(v) => alterarNatureza.mutate({ id: c.id, naturezaId: v })}
                                empresaId={empresa?.id}
                              />
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

        <TabsContent value="naturezas" className="mt-4">
          <Naturezas />
        </TabsContent>

        <TabsContent value="fornecedores" className="mt-4">
          <ListaParceiros chave="fornecedor" titulo="Fornecedor" itens={fornecedores} />
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <ListaParceiros chave="cliente" titulo="Cliente" itens={clientes} />
        </TabsContent>

        <TabsContent value="contas" className="mt-4">
          <ContasBancarias />
        </TabsContent>

        {eAdmin && (
          <TabsContent value="usuarios" className="mt-4">
            <Usuarios />
          </TabsContent>
        )}

        {eAdmin && (
          <TabsContent value="auditoria" className="mt-4">
            <Auditoria />
          </TabsContent>
        )}
      </Tabs>
    </AppShell>
  );
}

const TIPOS_CONTA = ["corrente", "poupanca", "caixa", "investimento"];

function ContasBancarias() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: contas = [] } = useContasBancarias(empresa?.id);
  const [form, setForm] = useState({
    banco: "",
    agencia: "",
    conta: "",
    tipo: "corrente",
    saldo_inicial: "",
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["conta_bancaria"] });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await tabela("conta_bancaria").insert({
        empresa_id: empresa!.id,
        banco: form.banco.trim(),
        agencia: form.agencia.trim() || null,
        conta: form.conta.trim() || null,
        tipo: form.tipo,
        saldo_inicial: Number(form.saldo_inicial) || 0,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setForm({ banco: "", agencia: "", conta: "", tipo: "corrente", saldo_inicial: "" });
      invalidar();
      toast.success("Conta bancária cadastrada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela("conta_bancaria").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Conta removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contas bancárias de {empresa?.nome ?? "—"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Banco"
            maxLength={80}
            className="max-w-[200px]"
            value={form.banco}
            onChange={(e) => setForm({ ...form, banco: e.target.value })}
          />
          <Input
            placeholder="Agência"
            maxLength={20}
            className="max-w-[130px]"
            value={form.agencia}
            onChange={(e) => setForm({ ...form, agencia: e.target.value })}
          />
          <Input
            placeholder="Conta"
            maxLength={30}
            className="max-w-[160px]"
            value={form.conta}
            onChange={(e) => setForm({ ...form, conta: e.target.value })}
          />
          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_CONTA.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Saldo inicial"
            type="number"
            step="0.01"
            className="max-w-[150px]"
            value={form.saldo_inicial}
            onChange={(e) => setForm({ ...form, saldo_inicial: e.target.value })}
          />
          <Button onClick={() => criar.mutate()} disabled={!empresa || !form.banco.trim() || criar.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>

        <div className="mt-4">
          {contas.length === 0 ? (
            <SecaoVazia texto="Nenhuma conta bancária cadastrada." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Saldo inicial</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.banco}</TableCell>
                    <TableCell>{c.agencia ?? "—"}</TableCell>
                    <TableCell>{c.conta ?? "—"}</TableCell>
                    <TableCell className="capitalize">{c.tipo}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(Number(c.saldo_inicial))}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" title="Excluir" onClick={() => excluir.mutate(c.id)}>
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