import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Kpi, SecaoVazia } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { brl, dataBR, exportarCSV, num } from "@/lib/format";
import { tabela, useCategorias, useMovimentos, useProdutos } from "@/lib/dados";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Fluxo Gestão" },
      { name: "description", content: "Cadastro de produtos, entradas e saídas com alerta de estoque mínimo." },
      { property: "og:title", content: "Estoque — Fluxo Gestão" },
      { property: "og:description", content: "Controle de produtos, saldo e movimentações de estoque." },
    ],
  }),
  component: EstoquePage,
});

function EstoquePage() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: produtos = [], isLoading } = useProdutos(empresa?.id);
  const { data: movimentos = [] } = useMovimentos(empresa?.id);
  const { data: categorias = [] } = useCategorias(empresa?.id);

  const [busca, setBusca] = useState("");
  const [abertoProduto, setAbertoProduto] = useState(false);
  const [abertoMov, setAbertoMov] = useState(false);
  const [prod, setProd] = useState({
    nome: "",
    sku: "",
    categoria_id: "",
    custo: "",
    preco_venda: "",
    estoque_minimo: "0",
  });
  const [mov, setMov] = useState({ produto_id: "", tipo: "entrada", quantidade: "", custo_unitario: "", observacao: "" });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["produto"] });
    queryClient.invalidateQueries({ queryKey: ["movimento_estoque"] });
  };

  const criarProduto = useMutation({
    mutationFn: async () => {
      const { error } = await tabela("produto").insert({
        empresa_id: empresa!.id,
        nome: prod.nome.trim(),
        sku: prod.sku.trim() || null,
        categoria_id: prod.categoria_id || null,
        custo: Number(prod.custo || 0),
        preco_venda: Number(prod.preco_venda || 0),
        estoque_minimo: Number(prod.estoque_minimo || 0),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setAbertoProduto(false);
      setProd({ nome: "", sku: "", categoria_id: "", custo: "", preco_venda: "", estoque_minimo: "0" });
      invalidar();
      toast.success("Produto cadastrado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarMovimento = useMutation({
    mutationFn: async () => {
      const { error } = await tabela("movimento_estoque").insert({
        empresa_id: empresa!.id,
        produto_id: mov.produto_id,
        tipo: mov.tipo,
        quantidade: Number(mov.quantidade),
        custo_unitario: mov.custo_unitario ? Number(mov.custo_unitario) : null,
        observacao: mov.observacao.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setAbertoMov(false);
      setMov({ produto_id: "", tipo: "entrada", quantidade: "", custo_unitario: "", observacao: "" });
      invalidar();
      toast.success("Movimentação registrada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = useMemo(
    () => produtos.filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase())),
    [produtos, busca],
  );

  const totais = useMemo(
    () => ({
      itens: produtos.reduce((s, p) => s + Number(p.quantidade), 0),
      custo: produtos.reduce((s, p) => s + Number(p.quantidade) * Number(p.custo), 0),
      venda: produtos.reduce((s, p) => s + Number(p.quantidade) * Number(p.preco_venda), 0),
      baixos: produtos.filter((p) => Number(p.quantidade) <= Number(p.estoque_minimo)).length,
    }),
    [produtos],
  );

  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? "—";
  const nomeCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.nome ?? "—";

  return (
    <AppShell titulo="Estoque">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Itens em estoque" valor={num(totais.itens)} />
        <Kpi titulo="Valor de custo" valor={brl(totais.custo)} />
        <Kpi titulo="Valor de venda" valor={brl(totais.venda)} tom="positivo" />
        <Kpi
          titulo="Abaixo do mínimo"
          valor={String(totais.baixos)}
          tom={totais.baixos > 0 ? "alerta" : "neutro"}
          icone={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="produtos" className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <TabsList>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="movimentos">Movimentações</TabsTrigger>
          </TabsList>

          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                exportarCSV(
                  "estoque",
                  lista.map((p) => ({
                    Produto: p.nome,
                    SKU: p.sku ?? "",
                    Categoria: nomeCategoria(p.categoria_id),
                    Quantidade: p.quantidade,
                    Mínimo: p.estoque_minimo,
                    Custo: Number(p.custo).toFixed(2).replace(".", ","),
                    Venda: Number(p.preco_venda).toFixed(2).replace(".", ","),
                  })),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>

            <Dialog open={abertoMov} onOpenChange={setAbertoMov}>
              <DialogTrigger asChild>
                <Button variant="secondary" disabled={!produtos.length}>
                  <ArrowUpRight className="mr-2 h-4 w-4" /> Movimentar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova movimentação</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Produto</Label>
                    <Select value={mov.produto_id} onValueChange={(v) => setMov({ ...mov, produto_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={mov.tipo} onValueChange={(v) => setMov({ ...mov, tipo: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="qtd">Quantidade</Label>
                    <Input
                      id="qtd"
                      type="number"
                      min="0"
                      step="0.001"
                      value={mov.quantidade}
                      onChange={(e) => setMov({ ...mov, quantidade: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cu">Custo unitário (R$)</Label>
                    <Input
                      id="cu"
                      type="number"
                      min="0"
                      step="0.01"
                      value={mov.custo_unitario}
                      onChange={(e) => setMov({ ...mov, custo_unitario: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="obs">Observação</Label>
                    <Input
                      id="obs"
                      maxLength={140}
                      value={mov.observacao}
                      onChange={(e) => setMov({ ...mov, observacao: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => criarMovimento.mutate()}
                    disabled={!mov.produto_id || Number(mov.quantidade) <= 0 || criarMovimento.isPending}
                  >
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={abertoProduto} onOpenChange={setAbertoProduto}>
              <DialogTrigger asChild>
                <Button disabled={!empresa}>
                  <Plus className="mr-2 h-4 w-4" /> Novo produto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo produto</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      maxLength={120}
                      value={prod.nome}
                      onChange={(e) => setProd({ ...prod, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      maxLength={40}
                      value={prod.sku}
                      onChange={(e) => setProd({ ...prod, sku: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select
                      value={prod.categoria_id}
                      onValueChange={(v) => setProd({ ...prod, categoria_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias
                          .filter((c) => c.tipo === "produto")
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="custo">Custo (R$)</Label>
                    <Input
                      id="custo"
                      type="number"
                      min="0"
                      step="0.01"
                      value={prod.custo}
                      onChange={(e) => setProd({ ...prod, custo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="venda">Preço de venda (R$)</Label>
                    <Input
                      id="venda"
                      type="number"
                      min="0"
                      step="0.01"
                      value={prod.preco_venda}
                      onChange={(e) => setProd({ ...prod, preco_venda: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="min">Estoque mínimo</Label>
                    <Input
                      id="min"
                      type="number"
                      min="0"
                      value={prod.estoque_minimo}
                      onChange={(e) => setProd({ ...prod, estoque_minimo: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => criarProduto.mutate()}
                    disabled={!prod.nome.trim() || criarProduto.isPending}
                  >
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="produtos" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Input
                placeholder="Buscar produto"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="max-w-xs"
              />
              <div className="mt-4 overflow-x-auto">
                {isLoading ? (
                  <SecaoVazia texto="Carregando produtos…" />
                ) : lista.length === 0 ? (
                  <SecaoVazia texto="Nenhum produto cadastrado." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="text-right">Mínimo</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lista.map((p) => {
                        const baixo = Number(p.quantidade) <= Number(p.estoque_minimo);
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              <span className="flex items-center gap-2">
                                {p.nome}
                                {baixo && <AlertTriangle className="h-4 w-4 text-warning" />}
                              </span>
                            </TableCell>
                            <TableCell>{p.sku ?? "—"}</TableCell>
                            <TableCell>{nomeCategoria(p.categoria_id)}</TableCell>
                            <TableCell
                              className={`text-right tabular-nums ${baixo ? "text-warning font-semibold" : ""}`}
                            >
                              {num(p.quantidade)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{num(p.estoque_minimo)}</TableCell>
                            <TableCell className="text-right tabular-nums">{brl(p.custo)}</TableCell>
                            <TableCell className="text-right tabular-nums">{brl(p.preco_venda)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentos" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {movimentos.length === 0 ? (
                <SecaoVazia texto="Nenhuma movimentação registrada." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Custo unit.</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{dataBR(m.data)}</TableCell>
                        <TableCell className="font-medium">{nomeProduto(m.produto_id)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 text-sm ${
                              m.tipo === "entrada" ? "text-success" : "text-destructive"
                            }`}
                          >
                            {m.tipo === "entrada" ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                            {m.tipo === "entrada" ? "Entrada" : "Saída"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{num(m.quantidade)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.custo_unitario ? brl(m.custo_unitario) : "—"}
                        </TableCell>
                        <TableCell>{m.observacao ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}