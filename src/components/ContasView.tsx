import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Kpi, SecaoVazia, StatusBadge } from "@/components/ui-kit";
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
import { brl, dataBR, exportarCSV, hoje } from "@/lib/format";
import {
  situacao,
  tabela,
  useCategorias,
  useContasBancarias,
  rotuloNatureza,
  type Categoria,
  type Parceiro,
} from "@/lib/dados";

export type Conta = {
  id: string;
  empresa_id: string;
  descricao: string;
  valor: number;
  categoria_id: string | null;
  data_vencimento: string;
  status: string;
};

type Config = {
  tipo: "pagar" | "receber";
  tabelaNome: string;
  titulo: string;
  statusFinal: "pago" | "recebido";
  campoData: "data_pagamento" | "data_recebimento";
  campoForma: "forma_pagamento" | "forma_recebimento";
  campoParceiro: "fornecedor_id" | "cliente_id";
  rotuloParceiro: string;
  tipoCategoria: Categoria["tipo"];
};

const FORMAS = ["Pix", "Boleto", "Transferência", "Cartão", "Dinheiro"];

export function ContasView({
  config,
  contas,
  parceiros,
  carregando,
}: {
  config: Config;
  contas: (Conta & Record<string, unknown>)[];
  parceiros: Parceiro[];
  carregando: boolean;
}) {
  const { empresa, escopo, consolidado, nomeEmpresa } = useEmpresa();
  const { data: categorias = [] } = useCategorias(escopo);
  const { data: contasBancarias = [] } = useContasBancarias(escopo);
  const queryClient = useQueryClient();
  const hj = hoje();

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    categoria_id: "",
    parceiro_id: "",
    forma: "",
    conta_bancaria_id: "",
    data_vencimento: hj,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: [config.tabelaNome] });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await tabela(config.tabelaNome).insert({
        empresa_id: empresa!.id,
        descricao: form.descricao.trim(),
        valor: Number(form.valor),
        categoria_id: form.categoria_id || null,
        [config.campoParceiro]: form.parceiro_id || null,
        [config.campoForma]: form.forma || null,
        conta_bancaria_id: form.conta_bancaria_id || null,
        data_vencimento: form.data_vencimento,
        status: "pendente",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setAberto(false);
      setForm({
        descricao: "",
        valor: "",
        categoria_id: "",
        parceiro_id: "",
        forma: "",
        conta_bancaria_id: "",
        data_vencimento: hj,
      });
      invalidar();
      toast.success("Lançamento registrado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const baixar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela(config.tabelaNome)
        .update({ status: config.statusFinal, [config.campoData]: hj })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success(config.tipo === "pagar" ? "Conta paga." : "Recebimento confirmado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela(config.tabelaNome).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Lançamento excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nomeCategoria = (id: string | null) => categorias.find((c) => c.id === id)?.nome ?? "—";
  const nomeParceiro = (id: unknown) => parceiros.find((p) => p.id === id)?.nome ?? "—";

  const lista = useMemo(
    () =>
      contas
        .map((c) => ({ ...c, situacao: situacao(c.status, c.data_vencimento, hj) }))
        .filter((c) => (filtroStatus === "todos" ? true : c.situacao === filtroStatus))
        .filter((c) => c.descricao.toLowerCase().includes(busca.trim().toLowerCase())),
    [contas, filtroStatus, busca, hj],
  );

  const totais = useMemo(() => {
    const soma = (f: (c: (typeof lista)[number]) => boolean) =>
      lista.filter(f).reduce((s, c) => s + Number(c.valor), 0);
    return {
      total: soma(() => true),
      liquidado: soma((c) => c.situacao === config.statusFinal),
      vencido: soma((c) => c.situacao === "vencido"),
      pendente: soma((c) => c.situacao === "pendente"),
    };
  }, [lista, config.statusFinal]);

  return (
    <AppShell titulo={config.titulo}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Total filtrado" valor={brl(totais.total)} />
        <Kpi
          titulo={config.tipo === "pagar" ? "Já pago" : "Já recebido"}
          valor={brl(totais.liquidado)}
          tom="positivo"
        />
        <Kpi titulo="Em aberto" valor={brl(totais.pendente)} tom="alerta" />
        <Kpi titulo="Vencido" valor={brl(totais.vencido)} tom="negativo" />
      </div>

      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Buscar por descrição"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="max-w-xs"
            />
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value={config.statusFinal}>
                  {config.tipo === "pagar" ? "Pago" : "Recebido"}
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  exportarCSV(
                    config.tabelaNome,
                    lista.map((c) => ({
                      ...(consolidado ? { Empresa: nomeEmpresa(c.empresa_id) } : {}),
                      Descrição: c.descricao,
                      Categoria: nomeCategoria(c.categoria_id),
                      [config.rotuloParceiro]: nomeParceiro((c as Record<string, unknown>)[config.campoParceiro]),
                      Vencimento: dataBR(c.data_vencimento),
                      Valor: Number(c.valor).toFixed(2).replace(".", ","),
                      Situação: c.situacao,
                    })),
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>

              <Dialog open={aberto} onOpenChange={setAberto}>
                <DialogTrigger asChild>
                  <Button
                    disabled={!empresa}
                    title={
                      consolidado
                        ? "Selecione uma empresa específica para lançar"
                        : "Novo lançamento"
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {consolidado ? "Selecione uma empresa para lançar" : "Novo lançamento"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {config.tipo === "pagar" ? "Nova conta a pagar" : "Nova conta a receber"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input
                        id="descricao"
                        value={form.descricao}
                        maxLength={140}
                        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="valor">Valor (R$)</Label>
                      <Input
                        id="valor"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.valor}
                        onChange={(e) => setForm({ ...form, valor: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="venc">Vencimento</Label>
                      <Input
                        id="venc"
                        type="date"
                        value={form.data_vencimento}
                        onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>
                        Categoria <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.categoria_id}
                        onValueChange={(v) => setForm({ ...form, categoria_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Obrigatório" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias
                            .filter((c) => c.tipo === config.tipoCategoria)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nome}
                                {c.natureza ? ` · ${rotuloNatureza(c.natureza)}` : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {!form.categoria_id && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Todo lançamento precisa de categoria — inclusive prestadores de serviço.
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>{config.rotuloParceiro}</Label>
                      <Select
                        value={form.parceiro_id}
                        onValueChange={(v) => setForm({ ...form, parceiro_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {parceiros.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Forma</Label>
                      <Select value={form.forma} onValueChange={(v) => setForm({ ...form, forma: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
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
                    <div className="sm:col-span-2">
                      <Label>
                        Conta bancária{" "}
                        <span className="text-muted-foreground">
                          (opcional — {config.tipo === "pagar" ? "de onde saiu" : "onde entrou"})
                        </span>
                      </Label>
                      <Select
                        value={form.conta_bancaria_id}
                        onValueChange={(v) => setForm({ ...form, conta_bancaria_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sem conta definida" />
                        </SelectTrigger>
                        <SelectContent>
                          {contasBancarias.map((cb) => (
                            <SelectItem key={cb.id} value={cb.id}>
                              {cb.banco}
                              {cb.conta ? ` · ${cb.conta}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => criar.mutate()}
                      disabled={
                        !form.descricao.trim() ||
                        Number(form.valor) <= 0 ||
                        !form.categoria_id ||
                        criar.isPending
                      }
                    >
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {carregando ? (
              <SecaoVazia texto="Carregando lançamentos…" />
            ) : lista.length === 0 ? (
              <SecaoVazia texto="Nenhum lançamento encontrado para os filtros atuais." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {consolidado && <TableHead>Empresa</TableHead>}
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>{config.rotuloParceiro}</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((c) => (
                    <TableRow key={c.id}>
                      {consolidado && (
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {nomeEmpresa(c.empresa_id)}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{c.descricao}</TableCell>
                      <TableCell>{nomeCategoria(c.categoria_id)}</TableCell>
                      <TableCell>{nomeParceiro((c as Record<string, unknown>)[config.campoParceiro])}</TableCell>
                      <TableCell>{dataBR(c.data_vencimento)}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(Number(c.valor))}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.situacao} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {c.situacao !== config.statusFinal && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title={config.tipo === "pagar" ? "Marcar como pago" : "Marcar como recebido"}
                              onClick={() => baixar.mutate(c.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Excluir"
                            onClick={() => excluir.mutate(c.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}