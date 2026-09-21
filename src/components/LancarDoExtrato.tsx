import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl, dataBR } from "@/lib/format";
import { SeletorCategoria } from "@/components/SeletorCategoria";
import {
  inserirRetornando,
  useCategorias,
  useClientes,
  useContasBancarias,
  useFornecedores,
} from "@/lib/dados";

const FORMAS = [
  "Pix",
  "Débito",
  "Crédito",
  "Transferência",
  "Boleto",
  "Dinheiro",
  "Cartão",
  "Cheque",
];

const NOVO = "__novo__";

export type VinculoCriado =
  | { tabela: "conta_pagar" | "conta_receber"; id: string }
  | { tabela: "transferencia"; id: null };

type Tipo = "pagar" | "receber" | "transferencia";

export function LancarDoExtrato({
  linha,
  contaBancariaId,
  empresaId,
  onCriado,
}: {
  linha: { data: string; valor: number; descricao: string | null };
  contaBancariaId: string;
  empresaId: string;
  onCriado: (v: VinculoCriado) => Promise<void> | void;
}) {
  const queryClient = useQueryClient();
  const { data: categorias = [] } = useCategorias(empresaId);
  const { data: fornecedores = [] } = useFornecedores(empresaId);
  const { data: clientes = [] } = useClientes(empresaId);
  const { data: contas = [] } = useContasBancarias(empresaId);

  const saida = Number(linha.valor) < 0;
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [tipo, setTipo] = useState<Tipo>(saida ? "pagar" : "receber");
  const [descricao, setDescricao] = useState(linha.descricao ?? "");
  const [valor, setValor] = useState(String(Math.abs(Number(linha.valor)).toFixed(2)));
  const [data, setData] = useState(linha.data);
  const [categoriaId, setCategoriaId] = useState("");
  const [parceiroId, setParceiroId] = useState("");
  const [forma, setForma] = useState("");
  const [documento, setDocumento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [outraConta, setOutraConta] = useState("");

  // Criação rápida de fornecedor/cliente
  const [novoParceiro, setNovoParceiro] = useState(false);
  const [nomeParceiro, setNomeParceiro] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setTipo(saida ? "pagar" : "receber");
    setDescricao(linha.descricao ?? "");
    setValor(Math.abs(Number(linha.valor)).toFixed(2));
    setData(linha.data);
    setCategoriaId("");
    setParceiroId("");
    setForma("");
    setDocumento("");
    setObservacao("");
    setOutraConta("");
    setNovoParceiro(false);
    setNomeParceiro("");
  }, [aberto, linha.data, linha.valor, linha.descricao, saida]);

  const parceiros = tipo === "pagar" ? fornecedores : clientes;
  const tabelaParceiro = tipo === "pagar" ? "fornecedor" : "cliente";

  const valorNum = Number(valor.replace(",", "."));
  const valido =
    Number.isFinite(valorNum) &&
    valorNum > 0 &&
    !!data &&
    (tipo === "transferencia"
      ? !!outraConta && outraConta !== contaBancariaId
      : !!descricao.trim() && !!categoriaId);

  async function criarParceiro() {
    if (!nomeParceiro.trim()) return;
    try {
      const novo = await inserirRetornando<{ id: string }>(
        tabelaParceiro,
        { empresa_id: empresaId, nome: nomeParceiro.trim() },
        "id",
      );
      await queryClient.invalidateQueries({ queryKey: [tabelaParceiro] });
      setParceiroId(novo.id);
      setNovoParceiro(false);
      setNomeParceiro("");
      toast.success(tipo === "pagar" ? "Fornecedor criado" : "Cliente criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar o cadastro");
    }
  }

  async function salvar() {
    if (!valido) return;
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      if (tipo === "transferencia") {
        await inserirRetornando<{ id: string }>(
          "transferencia_bancaria",
          {
            empresa_id: empresaId,
            conta_origem_id: saida ? contaBancariaId : outraConta,
            conta_destino_id: saida ? outraConta : contaBancariaId,
            valor: valorNum,
            data,
            observacao: observacao.trim() || descricao.trim() || null,
          },
          "id",
        );
        await queryClient.invalidateQueries({ queryKey: ["transferencia_bancaria"] });
        await onCriado({ tabela: "transferencia", id: null });
      } else if (tipo === "pagar") {
        const novo = await inserirRetornando<{ id: string }>(
          "conta_pagar",
          {
            empresa_id: empresaId,
            descricao: descricao.trim(),
            valor: valorNum,
            valor_pago: valorNum,
            categoria_id: categoriaId,
            fornecedor_id: parceiroId || null,
            forma_pagamento: forma || null,
            numero_documento: documento.trim() || null,
            observacao: observacao.trim() || null,
            data_vencimento: data,
            data_pagamento: data,
            status: "pago",
            conta_bancaria_id: contaBancariaId,
            conciliado: true,
            conciliado_em: agora,
          },
          "id",
        );
        await queryClient.invalidateQueries({ queryKey: ["conta_pagar"] });
        await onCriado({ tabela: "conta_pagar", id: novo.id });
      } else {
        const novo = await inserirRetornando<{ id: string }>(
          "conta_receber",
          {
            empresa_id: empresaId,
            descricao: descricao.trim(),
            valor: valorNum,
            valor_recebido: valorNum,
            categoria_id: categoriaId,
            cliente_id: parceiroId || null,
            forma_recebimento: forma || null,
            numero_documento: documento.trim() || null,
            observacao: observacao.trim() || null,
            data_vencimento: data,
            data_recebimento: data,
            status: "recebido",
            conta_bancaria_id: contaBancariaId,
            conciliado: true,
            conciliado_em: agora,
          },
          "id",
        );
        await queryClient.invalidateQueries({ queryKey: ["conta_receber"] });
        await onCriado({ tabela: "conta_receber", id: novo.id });
      }
      setAberto(false);
      toast.success("Lançamento criado e conciliado com a linha do extrato.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar o lançamento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setAberto(true)}>
        <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Lançar no sistema
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lançar linha do extrato</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {dataBR(linha.data)} · {brl(Number(linha.valor))} · {linha.descricao ?? "—"}
          </p>

          <div className="space-y-4">
            <div>
              <Label>Tipo de lançamento</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagar">Pagamento</SelectItem>
                  <SelectItem value="receber">Recebimento</SelectItem>
                  <SelectItem value="transferencia">Transferência entre contas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ext-valor">Valor</Label>
                <Input
                  id="ext-valor"
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ext-data">Data</Label>
                <Input
                  id="ext-data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
            </div>

            {tipo === "transferencia" ? (
              <div>
                <Label>{saida ? "Conta de destino" : "Conta de origem"}</Label>
                <Select value={outraConta} onValueChange={setOutraConta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a outra conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas
                      .filter((c) => c.id !== contaBancariaId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.banco} {c.conta ? `· ${c.conta}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="ext-desc">Descrição</Label>
                  <Input
                    id="ext-desc"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Categoria</Label>
                  <SeletorCategoria
                    categorias={categorias}
                    value={categoriaId}
                    onChange={setCategoriaId}
                    tipo={tipo === "pagar" ? "despesa" : "receita"}
                    empresaId={empresaId}
                  />
                </div>

                <div>
                  <Label>{tipo === "pagar" ? "Fornecedor" : "Cliente"}</Label>
                  {novoParceiro ? (
                    <div className="flex gap-2">
                      <Input
                        autoFocus
                        value={nomeParceiro}
                        placeholder="Nome"
                        onChange={(e) => setNomeParceiro(e.target.value)}
                      />
                      <Button type="button" onClick={() => void criarParceiro()}>
                        Salvar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setNovoParceiro(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={parceiroId}
                      onValueChange={(v) => {
                        if (v === NOVO) setNovoParceiro(true);
                        else setParceiroId(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {parceiros.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                        <SelectItem value={NOVO} className="font-medium text-primary">
                          + Novo {tipo === "pagar" ? "fornecedor" : "cliente"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{tipo === "pagar" ? "Forma de pagamento" : "Forma de recebimento"}</Label>
                    <Select value={forma} onValueChange={setForma}>
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ext-doc">Nº do documento</Label>
                    <Input
                      id="ext-doc"
                      value={documento}
                      onChange={(e) => setDocumento(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="ext-obs">Observação</Label>
              <Textarea
                id="ext-obs"
                rows={2}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={!valido || salvando}>
              {salvando ? "Salvando..." : "Criar e conciliar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
