import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Kpi, SecaoVazia } from "@/components/ui-kit";
import { SeletorCategoria } from "@/components/SeletorCategoria";
import { SeletorNatureza } from "@/components/SeletorNatureza";
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
import { Badge } from "@/components/ui/badge";
import { useEmpresa } from "@/lib/empresa";
import { brl, dataBR } from "@/lib/format";
import {
  inserirRetornando,
  selecionar,
  tabela,
  useCategorias,
  useFornecedores,
  useNaturezas,
  type Categoria,
} from "@/lib/dados";
import { hashXml, parseNFSe, type NotaServico } from "@/lib/nfse";

export const Route = createFileRoute("/_authenticated/importar-nfse")({
  head: () => ({
    meta: [
      { title: "Importar NFS-e — Bussola Blu" },
      {
        name: "description",
        content:
          "Importe XMLs de NFS-e padrão nacional, revise os dados extraídos e gere títulos de contas a pagar ou referências de receita.",
      },
      { property: "og:title", content: "Importar NFS-e — Bussola Blu" },
      {
        property: "og:description",
        content: "Importação em lote de NFS-e nacional com revisão campo a campo antes de salvar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportarNFSePage,
});

type Papel = "tomador" | "prestador";

type Linha = {
  chave: string;
  nota: NotaServico;
  empresaId: string;
  papel: Papel;
  vencimento: string;
  valor: string;
  descricao: string;
  categoriaId: string;
  naturezaId: string;
  fornecedorId: string;
  salvo: boolean;
};

type ErroArquivo = { arquivo: string; motivo: string };

const NOVO_FORNECEDOR = "__novo__";

function ImportarNFSePage() {
  const { empresas, empresaId: empresaAtiva } = useEmpresa();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const idsEmpresas = useMemo(() => empresas.map((e) => e.id), [empresas]);

  const { data: categorias = [] } = useCategorias(idsEmpresas);
  const { data: naturezas = [] } = useNaturezas(idsEmpresas);
  const { data: fornecedores = [] } = useFornecedores(idsEmpresas);

  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [erros, setErros] = useState<ErroArquivo[]>([]);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const atualizar = (chave: string, campos: Partial<Linha>) =>
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...campos } : l)));

  async function lerArquivos(arquivos: File[]) {
    if (arquivos.length === 0) return;
    setLendo(true);
    const novos: Linha[] = [];
    const novosErros: ErroArquivo[] = [];

    for (const arquivo of arquivos) {
      try {
        const conteudo = await arquivo.text();
        const hash = await hashXml(conteudo);
        const nota = parseNFSe(arquivo.name, conteudo, hash);
        if (linhas.some((l) => l.nota.hash === hash) || novos.some((n) => n.nota.hash === hash)) {
          novosErros.push({ arquivo: arquivo.name, motivo: "XML idêntico já está nesta revisão." });
          continue;
        }
        novos.push({
          chave: `${hash}-${novos.length}`,
          nota,
          // Empresa NUNCA é preenchida automaticamente: exige escolha do usuário.
          empresaId: "",
          papel: "tomador",
          vencimento: nota.vencimento ?? "",
          valor: String(nota.valorServico),
          descricao: `NFS-e ${nota.numeroNota} — ${nota.descricao.slice(0, 120)}`.trim(),
          categoriaId: "",
          naturezaId: "",
          fornecedorId: "",
          salvo: false,
        });
      } catch (e) {
        novosErros.push({ arquivo: arquivo.name, motivo: (e as Error).message });
      }
    }

    setLinhas((atuais) => [...atuais, ...novos]);
    setErros(novosErros);
    setLendo(false);
    if (inputRef.current) inputRef.current.value = "";
    if (novos.length > 0) toast.success(`${novos.length} NFS-e lida(s). Revise antes de salvar.`);
    if (novosErros.length > 0) toast.error(`${novosErros.length} arquivo(s) com erro.`);
  }

  const categoriasDe = (empresaId: string, tipo: Categoria["tipo"]) =>
    categorias.filter((c) => c.empresa_id === empresaId && c.tipo === tipo);

  const pronta = (l: Linha) =>
    !l.salvo &&
    l.empresaId !== "" &&
    l.vencimento !== "" &&
    Number(l.valor) > 0 &&
    l.categoriaId !== "" &&
    l.naturezaId !== "" &&
    (l.papel === "prestador" || l.fornecedorId !== "");

  async function fornecedorDaLinha(l: Linha): Promise<string> {
    if (l.fornecedorId !== NOVO_FORNECEDOR) return l.fornecedorId;
    const criado = await inserirRetornando<{ id: string }>("fornecedor", {
      empresa_id: l.empresaId,
      nome: l.nota.prestador.nome,
      documento: l.nota.prestador.cnpj,
      contato: l.nota.prestador.fone ?? l.nota.prestador.email,
    });
    return criado.id;
  }

  async function clienteDaLinha(l: Linha): Promise<string | null> {
    const existentes = await selecionar<{ id: string; documento: string | null }>(
      "cliente",
      "id, documento",
      { empresa_id: l.empresaId },
    );
    const achado = existentes.find(
      (c) => (c.documento ?? "").replace(/\D/g, "") === l.nota.tomador.cnpj,
    );
    if (achado) return achado.id;
    const criado = await inserirRetornando<{ id: string }>("cliente", {
      empresa_id: l.empresaId,
      nome: l.nota.tomador.nome,
      documento: l.nota.tomador.cnpj,
    });
    return criado.id;
  }

  async function salvarLinha(l: Linha) {
    const alvo = l.papel === "tomador" ? "conta_pagar" : "conta_receber";
    const duplicados = await selecionar<{ id: string }>(alvo, "id", {
      empresa_id: l.empresaId,
      numero_nfse: l.nota.numeroNota,
      prestador_cnpj: l.nota.prestador.cnpj,
    });
    if (duplicados.length > 0) {
      throw new Error(
        `NFS-e ${l.nota.numeroNota} do prestador ${l.nota.prestador.nome} já foi importada para esta empresa.`,
      );
    }

    // Natureza fica na categoria: alinhamos a categoria escolhida à natureza revisada.
    const categoria = categorias.find((c) => c.id === l.categoriaId);
    if (categoria && categoria.natureza_id !== l.naturezaId) {
      await tabela("categoria").update({ natureza_id: l.naturezaId }).eq("id", l.categoriaId);
    }

    const comum = {
      empresa_id: l.empresaId,
      descricao: l.descricao || `NFS-e ${l.nota.numeroNota}`,
      valor: Number(l.valor),
      categoria_id: l.categoriaId,
      data_vencimento: l.vencimento,
      status: "pendente",
      numero_documento: l.nota.numeroNota || null,
      numero_nfse: l.nota.numeroNota,
      prestador_cnpj: l.nota.prestador.cnpj,
      xml_hash: l.nota.hash,
      observacao:
        `NFS-e ${l.nota.numeroNota} • competência ${l.nota.competencia ?? "—"} • ISS ${brl(l.nota.valorIss)}`.trim(),
    };

    if (l.papel === "tomador") {
      const fornecedorId = await fornecedorDaLinha(l);
      const { error } = await tabela("conta_pagar").insert({
        ...comum,
        fornecedor_id: fornecedorId,
        categoria_sugerida: false,
        vencimento_estimado: !l.nota.vencimento,
      });
      if (error) throw new Error(error.message);
    } else {
      const clienteId = await clienteDaLinha(l);
      const { error } = await tabela("conta_receber").insert({
        ...comum,
        cliente_id: clienteId,
      });
      if (error) throw new Error(error.message);
    }
  }

  async function confirmarImportacao() {
    const alvos = linhas.filter(pronta);
    if (alvos.length === 0) return;
    setSalvando(true);
    const falhas: ErroArquivo[] = [];
    let ok = 0;

    for (const l of alvos) {
      try {
        await salvarLinha(l);
        atualizar(l.chave, { salvo: true });
        ok += 1;
      } catch (e) {
        falhas.push({ arquivo: l.nota.arquivo, motivo: (e as Error).message });
      }
    }

    setErros(falhas);
    setSalvando(false);
    queryClient.invalidateQueries({ queryKey: ["conta_pagar"] });
    queryClient.invalidateQueries({ queryKey: ["conta_receber"] });
    queryClient.invalidateQueries({ queryKey: ["fornecedor"] });
    queryClient.invalidateQueries({ queryKey: ["cliente"] });
    queryClient.invalidateQueries({ queryKey: ["categoria"] });
    if (ok > 0) toast.success(`${ok} NFS-e importada(s).`);
    if (falhas.length > 0) toast.error(`${falhas.length} NFS-e não importada(s).`);
  }

  const prontas = linhas.filter(pronta).length;
  const salvas = linhas.filter((l) => l.salvo).length;

  return (
    <AppShell titulo="Importar NFS-e">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arquivos XML de NFS-e (padrão nacional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <Label htmlFor="xmls-nfse">Selecione um ou mais arquivos</Label>
              <Input
                id="xmls-nfse"
                ref={inputRef}
                type="file"
                accept=".xml,text/xml,application/xml"
                multiple
                onChange={(e) => void lerArquivos(Array.from(e.target.files ?? []))}
              />
            </div>
            <Button disabled={lendo} variant="outline" onClick={() => inputRef.current?.click()}>
              {lendo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Ler XMLs
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Os dados são extraídos no navegador e ficam em revisão. Nada é gravado até você confirmar a
            importação. A empresa precisa ser escolhida manualmente em cada nota.
          </p>
        </CardContent>
      </Card>

      {(linhas.length > 0 || erros.length > 0) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Kpi titulo="Notas em revisão" valor={String(linhas.length - salvas)} />
          <Kpi titulo="Prontas para salvar" valor={String(prontas)} tom={prontas > 0 ? "positivo" : "neutro"} />
          <Kpi
            titulo="Arquivos com erro"
            valor={String(erros.length)}
            tom={erros.length > 0 ? "alerta" : "neutro"}
            icone={<AlertTriangle className="h-4 w-4" />}
          />
        </div>
      )}

      {erros.length > 0 && (
        <Card className="mt-6 border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Arquivos com erro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {erros.map((e, i) => (
              <p key={`${e.arquivo}-${i}`} className="text-sm">
                <span className="font-medium">{e.arquivo}</span>
                <span className="text-muted-foreground"> — {e.motivo}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Revisão das notas</CardTitle>
          <Button disabled={prontas === 0 || salvando} onClick={() => void confirmarImportacao()}>
            {salvando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Confirmar importação {prontas > 0 ? `(${prontas})` : ""}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {linhas.length === 0 ? (
            <SecaoVazia texto="Nenhuma NFS-e carregada. Selecione os arquivos XML acima." />
          ) : (
            linhas.map((l) => {
              const tipoCategoria: Categoria["tipo"] = l.papel === "tomador" ? "despesa" : "receita";
              const fornecedorExistente = fornecedores.find(
                (f) =>
                  f.empresa_id === l.empresaId &&
                  (f.documento ?? "").replace(/\D/g, "") === l.nota.prestador.cnpj,
              );
              return (
                <div
                  key={l.chave}
                  className={`rounded-lg border p-4 ${l.salvo ? "opacity-60" : ""}`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">NFS-e {l.nota.numeroNota}</Badge>
                    <span className="text-sm font-medium">{l.nota.prestador.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      CNPJ prestador {l.nota.prestador.cnpj} • tomador {l.nota.tomador.nome} (
                      {l.nota.tomador.cnpj})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Competência {l.nota.competencia ? dataBR(l.nota.competencia) : "—"} • ISS{" "}
                      {brl(l.nota.valorIss)}
                    </span>
                    {l.salvo ? (
                      <Badge>Importada</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setLinhas((atuais) => atuais.filter((x) => x.chave !== l.chave))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <p className="mb-3 text-xs text-muted-foreground">{l.nota.descricao}</p>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <Label>Empresa (obrigatório)</Label>
                      <Select
                        value={l.empresaId}
                        disabled={l.salvo}
                        onValueChange={(v) =>
                          atualizar(l.chave, { empresaId: v, categoriaId: "", naturezaId: "", fornecedorId: "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha a empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {empresas.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Nosso papel</Label>
                      <Select
                        value={l.papel}
                        disabled={l.salvo}
                        onValueChange={(v) =>
                          atualizar(l.chave, { papel: v as Papel, categoriaId: "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tomador">Tomador — gera conta a pagar</SelectItem>
                          <SelectItem value="prestador">Prestador — referência de receita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Valor do serviço</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={l.salvo}
                        value={l.valor}
                        onChange={(e) => atualizar(l.chave, { valor: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>
                        Vencimento {l.nota.vencimento ? "(extraído do XML)" : "(não encontrado)"}
                      </Label>
                      <Input
                        type="date"
                        disabled={l.salvo}
                        value={l.vencimento}
                        onChange={(e) => atualizar(l.chave, { vencimento: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Categoria</Label>
                      <SeletorCategoria
                        categorias={categorias.filter((c) => c.empresa_id === l.empresaId)}
                        value={l.categoriaId}
                        onChange={(v: string) => {
                          const cat = categorias.find((c) => c.id === v);
                          atualizar(l.chave, {
                            categoriaId: v,
                            naturezaId: cat?.natureza_id ?? l.naturezaId,
                          });
                        }}
                        tipo={tipoCategoria}
                        empresaId={l.empresaId || undefined}
                        disabled={l.salvo || !l.empresaId}
                      />
                      {l.empresaId && categoriasDe(l.empresaId, tipoCategoria).length === 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Nenhuma categoria de {tipoCategoria} nesta empresa.
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Natureza</Label>
                      <SeletorNatureza
                        naturezas={naturezas.filter((n) => n.empresa_id === l.empresaId)}
                        value={l.naturezaId}
                        onChange={(v) => atualizar(l.chave, { naturezaId: v })}
                        empresaId={l.empresaId || undefined}
                        disabled={l.salvo || !l.empresaId}
                      />
                    </div>

                    {l.papel === "tomador" && (
                      <div>
                        <Label>Fornecedor (prestador)</Label>
                        <Select
                          value={l.fornecedorId}
                          disabled={l.salvo || !l.empresaId}
                          onValueChange={(v) => atualizar(l.chave, { fornecedorId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha o fornecedor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NOVO_FORNECEDOR} className="font-medium text-primary">
                              + Cadastrar “{l.nota.prestador.nome}”
                            </SelectItem>
                            {fornecedores
                              .filter((f) => f.empresa_id === l.empresaId)
                              .map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.nome}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {fornecedorExistente && l.fornecedorId === "" && (
                          <button
                            type="button"
                            className="mt-1 text-xs text-primary underline"
                            onClick={() => atualizar(l.chave, { fornecedorId: fornecedorExistente.id })}
                          >
                            Usar cadastro existente: {fornecedorExistente.nome}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="md:col-span-2 xl:col-span-4">
                      <Label>Descrição do título</Label>
                      <Input
                        disabled={l.salvo}
                        value={l.descricao}
                        maxLength={200}
                        onChange={(e) => atualizar(l.chave, { descricao: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {empresaAtiva === null && (
            <p className="text-xs text-muted-foreground">Carregando empresas…</p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
