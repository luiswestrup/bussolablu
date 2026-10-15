import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileSearch, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { selecionar, tabela } from "@/lib/dados";
import { cfopDevolucaoCompra, parseNFe } from "@/lib/nfe";
import { dataBR, num } from "@/lib/format";

/** CFOPs cujos movimentos devem ser saída: devoluções de compra e x.9xx de entrada. */
function cfopAlvo(cfop: string) {
  return cfopDevolucaoCompra(cfop) || /^[12]9\d\d$/.test(cfop);
}

type Mov = {
  id: string;
  empresa_id: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  custo_unitario: number | null;
  observacao: string | null;
  data: string;
};

type Achado = {
  chave: string;
  numero: string;
  fornecedor: string;
  data: string | null;
  cfops: string[];
  corrigir: Mov[];
  jaSaida: number;
  semVinculo: number;
};

export function CorrigirMovimentosNFe({ empresaId }: { empresaId?: string }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [achados, setAchados] = useState<Achado[] | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [ignoradas, setIgnoradas] = useState(0);

  async function analisar(files: FileList | null) {
    if (!files?.length || !empresaId) return;
    setLendo(true);
    try {
      const fornecedores = await selecionar<{ id: string; nome: string; documento: string | null }>(
        "fornecedor", "id, nome, documento", { empresa_id: empresaId },
      );
      const lista: Achado[] = [];
      let fora = 0;
      for (const f of Array.from(files)) {
        let nota;
        try { nota = parseNFe(f.name, await f.text()); } catch { fora++; continue; }
        const alvos = nota.itens.filter((i) => cfopAlvo(i.cfop));
        if (!alvos.length) { fora++; continue; }
        const imp = await selecionar<{ id: string }>("nota_fiscal_importada", "id", {
          empresa_id: empresaId, chave_acesso: nota.chaveAcesso,
        });
        if (!imp.length) { fora++; continue; }
        const forn = fornecedores.find((x) => (x.documento ?? "").replace(/\D/g, "") === nota.emitente.cnpj);
        const mapa = forn
          ? await selecionar<{ codigo_produto_fornecedor: string; produto_id: string }>(
              "produto_fornecedor_map", "codigo_produto_fornecedor, produto_id",
              { empresa_id: empresaId, fornecedor_id: forn.id })
          : [];
        const movs = await selecionar<Mov>(
          "movimento_estoque", "id, empresa_id, produto_id, tipo, quantidade, custo_unitario, observacao, data",
          { empresa_id: empresaId, observacao: `NF-e ${nota.numeroNota}` },
        );
        const usados = new Set<string>();
        const corrigir: Mov[] = [];
        let jaSaida = 0, semVinculo = 0;
        for (const item of alvos) {
          const prod = mapa.find((m) => m.codigo_produto_fornecedor === item.codigo)?.produto_id;
          const mesmo = (m: Mov) => !usados.has(m.id) && m.produto_id === prod && Math.abs(Number(m.quantidade) - item.quantidade) < 0.0001;
          const ent = prod ? movs.find((m) => m.tipo === "entrada" && mesmo(m)) : undefined;
          if (ent) { usados.add(ent.id); corrigir.push(ent); continue; }
          const sai = prod ? movs.find((m) => m.tipo === "saida" && mesmo(m)) : undefined;
          if (sai) { usados.add(sai.id); jaSaida++; } else semVinculo++;
        }
        lista.push({
          chave: nota.chaveAcesso, numero: nota.numeroNota, fornecedor: forn?.nome ?? nota.emitente.nome,
          data: nota.dataEmissao, cfops: [...new Set(alvos.map((i) => `${i.cfop[0]}.${i.cfop.slice(1)}`))],
          corrigir, jaSaida, semVinculo,
        });
      }
      setAchados(lista);
      setIgnoradas(fora);
      setMarcadas(new Set(lista.filter((a) => a.corrigir.length).map((a) => a.chave)));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function aplicar() {
    if (!achados) return;
    setAplicando(true);
    let feitos = 0;
    try {
      for (const a of achados.filter((x) => marcadas.has(x.chave))) {
        for (const m of a.corrigir) {
          // Lança a saída e remove a entrada: o saldo do produto é recalculado automaticamente.
          const { error: e1 } = await tabela("movimento_estoque").insert({
            empresa_id: m.empresa_id, produto_id: m.produto_id, tipo: "saida", quantidade: m.quantidade,
            custo_unitario: m.custo_unitario, observacao: m.observacao, data: m.data,
          });
          if (e1) throw new Error(e1.message);
          const { error: e2 } = await tabela("movimento_estoque").delete().eq("id", m.id);
          if (e2) throw new Error(e2.message);
          feitos++;
        }
      }
      toast.success(`${feitos} movimento(s) corrigido(s) para saída.`);
      setAchados((l) => l?.map((a) => marcadas.has(a.chave) ? { ...a, jaSaida: a.jaSaida + a.corrigir.length, corrigir: [] } : a) ?? null);
      setMarcadas(new Set());
      queryClient.invalidateQueries({ queryKey: ["movimento_estoque"] });
      queryClient.invalidateQueries({ queryKey: ["produto"] });
    } catch (e) {
      toast.error(`Parou após ${feitos} correção(ões): ${(e as Error).message}`);
    } finally {
      setAplicando(false);
    }
  }

  const total = achados?.filter((a) => marcadas.has(a.chave)).reduce((s, a) => s + a.corrigir.length, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Corrigir estoque de notas já importadas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecione os XMLs das notas já importadas. São localizadas as notas com CFOP 1.201, 1.202, 2.201, 2.202, 1.9XX ou 2.9XX,
          e os movimentos desses itens que ainda estão como entrada podem ser trocados por saída. Outras notas e outros itens não são alterados.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <input ref={inputRef} type="file" accept=".xml" multiple className="hidden" onChange={(e) => analisar(e.target.files)} />
        <Button variant="outline" disabled={lendo || !empresaId} onClick={() => inputRef.current?.click()}>
          {lendo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4" />}
          Localizar notas pelos XMLs
        </Button>

        {achados && (
          <>
            <p className="text-sm text-muted-foreground">
              {achados.length} nota(s) encontrada(s){ignoradas ? ` · ${ignoradas} arquivo(s) fora da regra ou não importados nesta empresa` : ""}.
            </p>
            {achados.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>NF-e</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>CFOP</TableHead>
                      <TableHead className="text-right">Corrigir</TableHead>
                      <TableHead className="text-right">Já saída</TableHead>
                      <TableHead className="text-right">Sem movimento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {achados.map((a) => (
                      <TableRow key={a.chave}>
                        <TableCell>
                          <Checkbox
                            disabled={!a.corrigir.length}
                            checked={marcadas.has(a.chave)}
                            onCheckedChange={(v) => setMarcadas((s) => { const n = new Set(s); if (v) n.add(a.chave); else n.delete(a.chave); return n; })}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{a.numero}</TableCell>
                        <TableCell>{a.fornecedor}</TableCell>
                        <TableCell>{a.data ? dataBR(a.data) : "—"}</TableCell>
                        <TableCell>{a.cfops.join(", ")}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(a.corrigir.length)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(a.jaSaida)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(a.semVinculo)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <Button disabled={!total || aplicando} onClick={aplicar}>
              {aplicando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Corrigir {total} movimento(s) para saída
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
