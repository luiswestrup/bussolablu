import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Kpi, SecaoVazia } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { brl, dataBR, num } from "@/lib/format";
import { inserirRetornando, selecionar, tabela, useCategorias, useProdutos } from "@/lib/dados";
import { adicionarDias, parseNFe, type ItemNFe, type NotaFiscal } from "@/lib/nfe";

export const Route = createFileRoute("/_authenticated/importar-notas")({
  head: () => ({
    meta: [
      { title: "Importar NF-e — Bussola Blu" },
      {
        name: "description",
        content:
          "Importe notas fiscais eletrônicas em lote para dar entrada no estoque e gerar contas a pagar automaticamente.",
      },
      { property: "og:title", content: "Importar NF-e — Bussola Blu" },
      { property: "og:description", content: "Importação em lote de XML de NF-e com entrada de estoque e títulos." },
    ],
  }),
  component: ImportarNotasPage,
});

type Pendente = {
  chave: string;
  numeroNota: string;
  fornecedorId: string;
  fornecedorNome: string;
  item: ItemNFe;
  escolha: string;
  nomeNovo: string;
  categoriaId: string;
};

type Resumo = {
  importadas: number;
  puladas: number;
  titulos: number;
  entradas: number;
  erros: { arquivo: string; motivo: string }[];
};

const RESUMO_ZERO: Resumo = { importadas: 0, puladas: 0, titulos: 0, entradas: 0, erros: [] };

function ImportarNotasPage() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { data: produtos = [] } = useProdutos(empresa?.id);
  const { data: categorias = [] } = useCategorias(empresa?.id);
  const categoriasProduto = categorias.filter((c) => c.tipo === "produto");
  const inputRef = useRef<HTMLInputElement>(null);

  const [arquivos, setArquivos] = useState<File[]>([]);
  const [processando, setProcessando] = useState(false);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [salvandoPendente, setSalvandoPendente] = useState<string | null>(null);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["produto"] });
    queryClient.invalidateQueries({ queryKey: ["movimento_estoque"] });
    queryClient.invalidateQueries({ queryKey: ["conta_pagar"] });
    queryClient.invalidateQueries({ queryKey: ["fornecedor"] });
  };

  async function acharOuCriarFornecedor(nota: NotaFiscal, empresaId: string) {
    const existentes = await selecionar<{ id: string; nome: string; documento: string | null }>(
      "fornecedor",
      "id, nome, documento",
      { empresa_id: empresaId },
    );
    const achado = existentes.find(
      (f) => (f.documento ?? "").replace(/\D/g, "") === nota.emitente.cnpj,
    );
    if (achado) return { id: achado.id, nome: achado.nome };

    const criado = await inserirRetornando<{ id: string }>("fornecedor", {
      empresa_id: empresaId,
      nome: nota.emitente.nome,
      documento: nota.emitente.cnpj,
      contato: nota.emitente.contato,
    });
    return { id: criado.id, nome: nota.emitente.nome };
  }

  async function importarNota(nota: NotaFiscal, empresaId: string, acc: Resumo, novosPendentes: Pendente[]) {
    const jaExiste = await selecionar<{ id: string }>("nota_fiscal_importada", "id", {
      empresa_id: empresaId,
      chave_acesso: nota.chaveAcesso,
    });
    if (jaExiste.length > 0) {
      acc.puladas += 1;
      toast.info(`NF-e ${nota.numeroNota} já havia sido importada antes.`);
      return;
    }

    const fornecedor = await acharOuCriarFornecedor(nota, empresaId);

    await tabela("nota_fiscal_importada").insert({
      empresa_id: empresaId,
      chave_acesso: nota.chaveAcesso,
      fornecedor_id: fornecedor.id,
      numero_nota: nota.numeroNota,
      data_emissao: nota.dataEmissao,
      valor_total: nota.valorTotal,
      status: "importada",
    });

    const mapa = await selecionar<{ codigo_produto_fornecedor: string; produto_id: string }>(
      "produto_fornecedor_map",
      "codigo_produto_fornecedor, produto_id",
      { empresa_id: empresaId, fornecedor_id: fornecedor.id },
    );

    for (const item of nota.itens) {
      const vinculo = mapa.find((m) => m.codigo_produto_fornecedor === item.codigo);
      if (vinculo) {
        await tabela("movimento_estoque").insert({
          empresa_id: empresaId,
          produto_id: vinculo.produto_id,
          tipo: "entrada",
          quantidade: item.quantidade,
          custo_unitario: item.valorUnitario,
          observacao: `NF-e ${nota.numeroNota}`,
          data: nota.dataEmissao,
        });
        acc.entradas += 1;
      } else {
        novosPendentes.push({
          chave: `${nota.chaveAcesso}-${item.codigo}-${novosPendentes.length}`,
          numeroNota: nota.numeroNota,
          fornecedorId: fornecedor.id,
          fornecedorNome: fornecedor.nome,
          item,
          escolha: "",
          nomeNovo: item.descricao,
          categoriaId: "",
        });
      }
    }

    if (nota.duplicatas.length > 0) {
      for (const dup of nota.duplicatas) {
        await tabela("conta_pagar").insert({
          empresa_id: empresaId,
          descricao: `NF-e ${nota.numeroNota} — parcela ${dup.numero}`,
          valor: dup.valor,
          fornecedor_id: fornecedor.id,
          data_vencimento: dup.vencimento ?? adicionarDias(nota.dataEmissao ?? hoje(), 30),
          vencimento_estimado: !dup.vencimento,
          status: "pendente",
        });
        acc.titulos += 1;
      }
    } else {
      await tabela("conta_pagar").insert({
        empresa_id: empresaId,
        descricao: `NF-e ${nota.numeroNota} — parcela única`,
        valor: nota.valorTotal,
        fornecedor_id: fornecedor.id,
        data_vencimento: adicionarDias(nota.dataEmissao ?? hoje(), 30),
        vencimento_estimado: true,
        status: "pendente",
      });
      acc.titulos += 1;
    }

    acc.importadas += 1;
  }

  async function importarLote() {
    if (!empresa || arquivos.length === 0) return;
    setProcessando(true);
    const acc: Resumo = { ...RESUMO_ZERO, erros: [] };
    const novosPendentes: Pendente[] = [];

    for (const arquivo of arquivos) {
      try {
        const conteudo = await arquivo.text();
        const nota = parseNFe(arquivo.name, conteudo);
        await importarNota(nota, empresa.id, acc, novosPendentes);
      } catch (e) {
        acc.erros.push({ arquivo: arquivo.name, motivo: (e as Error).message });
      }
    }

    setPendentes((atuais) => [...atuais, ...novosPendentes]);
    setResumo(acc);
    setArquivos([]);
    if (inputRef.current) inputRef.current.value = "";
    setProcessando(false);
    invalidar();
    if (acc.importadas > 0) toast.success(`${acc.importadas} nota(s) importada(s).`);
    if (acc.erros.length > 0) toast.error(`${acc.erros.length} arquivo(s) com erro.`);
  }

  async function resolverPendente(p: Pendente) {
    if (!empresa || !p.escolha || !p.categoriaId) return;
    setSalvandoPendente(p.chave);
    try {
      let produtoId = p.escolha;
      if (p.escolha === "novo") {
        const criado = await inserirRetornando<{ id: string }>("produto", {
          empresa_id: empresa.id,
          nome: p.nomeNovo.trim() || p.item.descricao,
          sku: p.item.codigo,
          categoria_id: p.categoriaId,
          custo: p.item.valorUnitario,
          preco_venda: 0,
        });
        produtoId = criado.id;
      } else {
        const { error } = await tabela("produto")
          .update({ categoria_id: p.categoriaId })
          .eq("id", produtoId);
        if (error) throw new Error(error.message);
      }

      await tabela("produto_fornecedor_map").insert({
        empresa_id: empresa.id,
        fornecedor_id: p.fornecedorId,
        codigo_produto_fornecedor: p.item.codigo,
        produto_id: produtoId,
      });

      await tabela("movimento_estoque").insert({
        empresa_id: empresa.id,
        produto_id: produtoId,
        tipo: "entrada",
        quantidade: p.item.quantidade,
        custo_unitario: p.item.valorUnitario,
        observacao: `NF-e ${p.numeroNota}`,
      });

      setPendentes((atuais) => atuais.filter((x) => x.chave !== p.chave));
      invalidar();
      toast.success("Item reconhecido e entrada registrada.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvandoPendente(null);
    }
  }

  const atualizar = (chave: string, campos: Partial<Pendente>) =>
    setPendentes((atuais) => atuais.map((p) => (p.chave === chave ? { ...p, ...campos } : p)));

  return (
    <AppShell titulo="Importar notas fiscais">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arquivos XML de NF-e</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <Label htmlFor="xmls">Selecione um ou mais arquivos</Label>
              <Input
                id="xmls"
                ref={inputRef}
                type="file"
                accept=".xml,text/xml,application/xml"
                multiple
                onChange={(e) => setArquivos(Array.from(e.target.files ?? []))}
              />
            </div>
            <Button
              onClick={() => void importarLote()}
              disabled={!empresa || arquivos.length === 0 || processando}
            >
              {processando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar {arquivos.length > 0 ? `(${arquivos.length})` : ""}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Cada nota gera entradas de estoque para os itens já reconhecidos e os títulos de contas a pagar
            correspondentes. Notas já importadas são ignoradas automaticamente.
          </p>
        </CardContent>
      </Card>

      {resumo && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi titulo="Notas importadas" valor={String(resumo.importadas)} tom="positivo" />
            <Kpi titulo="Já existiam (puladas)" valor={String(resumo.puladas)} />
            <Kpi
              titulo="Itens pendentes"
              valor={String(pendentes.length)}
              tom={pendentes.length > 0 ? "alerta" : "neutro"}
              icone={<AlertTriangle className="h-4 w-4" />}
            />
            <Kpi titulo="Títulos a pagar criados" valor={String(resumo.titulos)} />
          </div>

          {resumo.erros.length > 0 && (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Arquivos com erro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resumo.erros.map((e) => (
                  <p key={e.arquivo} className="text-sm">
                    <span className="font-medium">{e.arquivo}</span>
                    <span className="text-muted-foreground"> — {e.motivo}</span>
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4" /> Itens não reconhecidos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {pendentes.length === 0 ? (
            <SecaoVazia texto="Nenhum item aguardando reconhecimento." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nota</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição no XML</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Custo unit.</TableHead>
                    <TableHead className="min-w-[240px]">Produto do sistema</TableHead>
                    <TableHead className="min-w-[200px]">Categoria do produto</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendentes.map((p) => (
                    <TableRow key={p.chave}>
                      <TableCell className="font-medium">{p.numeroNota}</TableCell>
                      <TableCell>{p.fornecedorNome}</TableCell>
                      <TableCell>{p.item.codigo}</TableCell>
                      <TableCell>{p.item.descricao}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(p.item.quantidade)}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(p.item.valorUnitario)}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Select
                            value={p.escolha}
                            onValueChange={(v) => atualizar(p.chave, { escolha: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Escolher produto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="novo">+ Criar novo produto</SelectItem>
                              {produtos.map((prod) => (
                                <SelectItem key={prod.id} value={prod.id}>
                                  {prod.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {p.escolha === "novo" && (
                            <Input
                              value={p.nomeNovo}
                              maxLength={120}
                              onChange={(e) => atualizar(p.chave, { nomeNovo: e.target.value })}
                              placeholder="Nome do novo produto"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={p.categoriaId}
                          onValueChange={(v) => atualizar(p.chave, { categoriaId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Obrigatório" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoriasProduto.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {categoriasProduto.length === 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Cadastre categorias do tipo “produto” em Cadastros.
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={!p.escolha || !p.categoriaId || salvandoPendente === p.chave}
                          onClick={() => void resolverPendente(p)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NotasImportadas empresaId={empresa?.id} />
    </AppShell>
  );
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function NotasImportadas({ empresaId }: { empresaId: string | undefined }) {
  const [notas, setNotas] = useState<
    { id: string; chave_acesso: string; numero_nota: string | null; data_emissao: string | null; valor_total: number }[]
  >([]);

  const carregar = async () => {
    if (!empresaId) return;
    try {
      setNotas(
        await selecionar("nota_fiscal_importada", "id, chave_acesso, numero_nota, data_emissao, valor_total", {
          empresa_id: empresaId,
        }),
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Notas já importadas</CardTitle>
        <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={!empresaId}>
          Atualizar lista
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        {notas.length === 0 ? (
          <SecaoVazia texto="Clique em “Atualizar lista” para ver as notas importadas." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Chave de acesso</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.numero_nota ?? "—"}</TableCell>
                    <TableCell>{n.data_emissao ? dataBR(n.data_emissao) : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{n.chave_acesso}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(n.valor_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
