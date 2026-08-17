import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ChequeBadge, Kpi, SecaoVazia, StatusBadge } from "@/components/ui-kit";
import { SeletorCategoria } from "@/components/SeletorCategoria";
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
import { linhasPagamentosCSV, linhasRecebimentosCSV } from "@/lib/exportacao";
import {
  situacao,
  tabela,
  datasParcelas,
  liquidoRecebimento,
  percentualTaxaPadrao,
  useCategorias,
  useContasBancarias,
  useTaxasRecebimento,
  type Categoria,
  type Parceiro,
  type StatusCheque,
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

const STATUS_CHEQUE: StatusCheque[] = ["emitido", "compensado", "devolvido", "cancelado"];

type ChequeLinha = { data: string; numero: string };

export function ContasView({
  config,
  contas,
  parceiros,
  carregando,
  acoes,
}: {
  config: Config;
  contas: (Conta & Record<string, unknown>)[];
  parceiros: Parceiro[];
  carregando: boolean;
  acoes?: ReactNode;
}) {
  const { empresa, escopo, consolidado, nomeEmpresa } = useEmpresa();
  const { data: categorias = [] } = useCategorias(escopo);
  const { data: contasBancarias = [] } = useContasBancarias(escopo);
  const { data: taxas = [] } = useTaxasRecebimento(escopo);
  const queryClient = useQueryClient();
  const hj = hoje();

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCheque, setFiltroCheque] = useState("todos");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    categoria_id: "",
    parceiro_id: "",
    forma: "",
    conta_bancaria_id: "",
    data_vencimento: hj,
    numero_documento: "",
    parcela: "",
    banco_emissor: "",
    numero_cheque: "",
  });
  const [parcelarCheque, setParcelarCheque] = useState(false);
  const [qtdCheques, setQtdCheques] = useState("2");
  const [intervalo, setIntervalo] = useState<"mensal" | "quinzenal" | "semanal">("mensal");
  const [cheques, setCheques] = useState<ChequeLinha[]>([]);

  const ehCheque = form.forma === "Cheque";

  const gerarDatas = () => {
    const qtd = Math.max(1, Math.min(48, Number(qtdCheques) || 1));
    setCheques(
      datasParcelas(form.data_vencimento, qtd, intervalo).map((data, i) => ({
        data,
        numero: cheques[i]?.numero ?? "",
      })),
    );
  };

  const limparForm = () => {
    setForm({
      descricao: "",
      valor: "",
      categoria_id: "",
      parceiro_id: "",
      forma: "",
      conta_bancaria_id: "",
      data_vencimento: hj,
      numero_documento: "",
      parcela: "",
      banco_emissor: "",
      numero_cheque: "",
    });
    setParcelarCheque(false);
    setQtdCheques("2");
    setIntervalo("mensal");
    setCheques([]);
  };

  const abrirEdicao = (c: Record<string, unknown>) => {
    setEditandoId(c["id"] as string);
    setForm({
      descricao: (c["descricao"] as string) ?? "",
      valor: String(c["valor"] ?? ""),
      categoria_id: (c["categoria_id"] as string) ?? "",
      parceiro_id: (c[config.campoParceiro] as string) ?? "",
      forma: (c[config.campoForma] as string) ?? "",
      conta_bancaria_id: (c["conta_bancaria_id"] as string) ?? "",
      data_vencimento: (c["data_vencimento"] as string) ?? hj,
      numero_documento: (c["numero_documento"] as string) ?? "",
      parcela: (c["parcela"] as string) ?? "",
      banco_emissor: (c["banco_emissor"] as string) ?? "",
      numero_cheque: (c["numero_cheque"] as string) ?? "",
    });
    setParcelarCheque(false);
    setCheques([]);
    setAberto(true);
  };

  const fecharForm = (aberta: boolean) => {
    setAberto(aberta);
    if (!aberta) {
      setEditandoId(null);
      limparForm();
    }
  };
  const [baixa, setBaixa] = useState<{
    id: string;
    descricao: string;
    valor: number;
    data: string;
    pago: string;
    desconto: string;
    multa: string;
    conta_bancaria_id: string;
    forma: string;
    percentualTaxa: string;
    valorTaxa: string;
  } | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: [config.tabelaNome] });

  const criar = useMutation({
    mutationFn: async () => {
      const base = {
        empresa_id: empresa?.id as string,
        descricao: form.descricao.trim(),
        categoria_id: form.categoria_id || null,
        [config.campoParceiro]: form.parceiro_id || null,
        [config.campoForma]: form.forma || null,
        conta_bancaria_id: form.conta_bancaria_id || null,
        numero_documento: form.numero_documento.trim() || null,
        status: "pendente",
        ...(ehCheque
          ? {
              banco_emissor: form.banco_emissor.trim() || null,
              status_cheque: "emitido",
              ...(config.tipo === "pagar"
                ? { cheque_conta_bancaria_id: form.conta_bancaria_id || null }
                : {}),
            }
          : {}),
      };

      // Edição de um título já lançado: sempre UPDATE, nunca novo INSERT.
      if (editandoId) {
        const { empresa_id: _ignorado, status: _statusIgnorado, ...campos } = base;
        const { error } = await tabela(config.tabelaNome)
          .update({
            ...campos,
            valor: Number(form.valor),
            data_vencimento: form.data_vencimento,
            parcela: form.parcela.trim() || null,
            numero_cheque: ehCheque ? form.numero_cheque.trim() || null : null,
            ...(config.tipo === "pagar" && form.categoria_id
              ? { categoria_sugerida: true }
              : {}),
          })
          .eq("id", editandoId);
        if (error) throw new Error(error.message);
        return;
      }

      // Parcelamento manual em cheques: um título por cheque, mesmo grupo.
      if (ehCheque && parcelarCheque && cheques.length > 0) {
        const grupo = crypto.randomUUID();
        const total = cheques.length;
        const valorTotal = Number(form.valor);
        const parcelaValor = Math.round((valorTotal / total) * 100) / 100;
        for (let i = 0; i < total; i++) {
          const ultimo = i === total - 1;
          const valor = ultimo
            ? Math.round((valorTotal - parcelaValor * (total - 1)) * 100) / 100
            : parcelaValor;
          const { error } = await tabela(config.tabelaNome).insert({
            ...base,
            valor,
            data_vencimento: cheques[i]!.data,
            parcela: `${i + 1}/${total}`,
            numero_cheque: cheques[i]!.numero.trim() || null,
            grupo_parcelamento_id: grupo,
          });
          if (error) throw new Error(error.message);
        }
        return;
      }

      const { error } = await tabela(config.tabelaNome).insert({
        ...base,
        valor: Number(form.valor),
        data_vencimento: form.data_vencimento,
        parcela: form.parcela.trim() || null,
        ...(ehCheque ? { numero_cheque: form.numero_cheque.trim() || null } : {}),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setAberto(false);
      setEditandoId(null);
      limparForm();
      invalidar();
      toast.success(editandoId ? "Lançamento atualizado." : "Lançamento registrado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const baixar = useMutation({
    mutationFn: async () => {
      if (!baixa) return;
      if (config.tipo === "pagar" && !baixa.conta_bancaria_id) {
        throw new Error("Informe a conta bancária de onde saiu o pagamento.");
      }
      const { error } = await tabela(config.tabelaNome)
        .update({
          status: config.statusFinal,
          [config.campoData]: baixa.data,
          [config.tipo === "pagar" ? "valor_pago" : "valor_recebido"]:
            baixa.pago === "" ? baixa.valor : Number(baixa.pago),
          valor_desconto: Number(baixa.desconto || 0),
          valor_multa_juros: Number(baixa.multa || 0),
          ...(baixa.conta_bancaria_id ? { conta_bancaria_id: baixa.conta_bancaria_id } : {}),
          ...(config.tipo === "receber"
            ? {
                percentual_taxa_maquininha: Number(baixa.percentualTaxa || 0) || null,
                valor_taxa_maquininha: Number(baixa.valorTaxa || 0) || null,
                [config.campoForma]: baixa.forma || null,
              }
            : {}),
        })
        .eq("id", baixa.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setBaixa(null);
      invalidar();
      toast.success(config.tipo === "pagar" ? "Conta paga." : "Recebimento confirmado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Regra de caixa do cheque: só compensado entra/sai do caixa, na data da compensação.
  const mudarCheque = useMutation({
    mutationFn: async ({ id, novo }: { id: string; novo: StatusCheque }) => {
      const valores: Record<string, unknown> =
        novo === "compensado"
          ? { status_cheque: novo, status: config.statusFinal, [config.campoData]: hj }
          : { status_cheque: novo, status: "pendente", [config.campoData]: null };
      const { error } = await tabela(config.tabelaNome).update(valores).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Situação do cheque atualizada.");
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
        .map((c) => ({
          ...c,
          statusCheque: (c["status_cheque"] as StatusCheque | null) ?? null,
          numeroCheque: (c["numero_cheque"] as string | null) ?? null,
          bancoEmissor: (c["banco_emissor"] as string | null) ?? null,
          situacao: situacao(
            c.status,
            c.data_vencimento,
            hj,
            c["status_cheque"] as StatusCheque | null,
          ),
        }))
        .filter((c) => (filtroStatus === "todos" ? true : c.situacao === filtroStatus))
        .filter((c) =>
          filtroCheque === "todos"
            ? true
            : filtroCheque === "sem_cheque"
              ? !c.statusCheque
              : c.statusCheque === filtroCheque,
        )
        .filter((c) => c.descricao.toLowerCase().includes(busca.trim().toLowerCase()))
        .filter((c) => (dataDe ? c.data_vencimento >= dataDe : true))
        .filter((c) => (dataAte ? c.data_vencimento <= dataAte : true)),
    [contas, filtroStatus, filtroCheque, busca, hj, dataDe, dataAte],
  );

  const totais = useMemo(() => {
    const soma = (f: (c: (typeof lista)[number]) => boolean) =>
      lista
        .filter((c) => c.situacao !== "cancelado")
        .filter(f)
        .reduce((s, c) => s + Number(c.valor), 0);
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
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroCheque} onValueChange={setFiltroCheque}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Cheques: todos</SelectItem>
                <SelectItem value="sem_cheque">Sem cheque</SelectItem>
                {STATUS_CHEQUE.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    Cheque {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Venc. de</label>
              <Input
                type="date"
                value={dataDe}
                onChange={(e) => setDataDe(e.target.value)}
                className="w-[150px]"
              />
              <label className="text-xs text-muted-foreground">até</label>
              <Input
                type="date"
                value={dataAte}
                onChange={(e) => setDataAte(e.target.value)}
                className="w-[150px]"
              />
              {(dataDe || dataAte) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDataDe("");
                    setDataAte("");
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>

            <div className="ml-auto flex gap-2">
              {acoes}
              <Button
                variant="outline"
                onClick={() =>
                  exportarCSV(
                    config.tabelaNome,
                    config.tipo === "pagar"
                      ? linhasPagamentosCSV(lista, parceiros, contasBancarias)
                      : linhasRecebimentosCSV(lista, parceiros, contasBancarias),
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>

              <Dialog open={aberto} onOpenChange={fecharForm}>
                <DialogTrigger asChild>
                  <Button
                    disabled={!empresa}
                    onClick={() => {
                      setEditandoId(null);
                      limparForm();
                    }}
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
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editandoId
                        ? config.tipo === "pagar"
                          ? "Editar conta a pagar"
                          : "Editar conta a receber"
                        : config.tipo === "pagar"
                          ? "Nova conta a pagar"
                          : "Nova conta a receber"}
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
                      <Label htmlFor="numdoc">Número do documento</Label>
                      <Input
                        id="numdoc"
                        value={form.numero_documento}
                        maxLength={40}
                        placeholder="Ex: 12345"
                        onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="parcela">Parcela</Label>
                      <Input
                        id="parcela"
                        value={form.parcela}
                        maxLength={12}
                        placeholder="Ex: 1/3"
                        onChange={(e) => setForm({ ...form, parcela: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>
                        Categoria <span className="text-destructive">*</span>
                      </Label>
                      <SeletorCategoria
                        categorias={categorias}
                        value={form.categoria_id}
                        onChange={(v: string) => setForm((f) => ({ ...f, categoria_id: v }))}
                        tipo={config.tipoCategoria}
                        empresaId={empresa?.id}
                      />
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

                    {ehCheque && (
                      <div className="sm:col-span-2 space-y-4 rounded-lg border border-dashed p-4">
                        <p className="text-sm font-medium">Dados do cheque</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="banco-emissor">Banco emissor</Label>
                            <Input
                              id="banco-emissor"
                              value={form.banco_emissor}
                              maxLength={60}
                              placeholder="Ex: Banco do Brasil"
                              onChange={(e) => setForm({ ...form, banco_emissor: e.target.value })}
                            />
                          </div>
                          {!parcelarCheque && (
                            <div>
                              <Label htmlFor="num-cheque">Número do cheque</Label>
                              <Input
                                id="num-cheque"
                                value={form.numero_cheque}
                                maxLength={30}
                                onChange={(e) => setForm({ ...form, numero_cheque: e.target.value })}
                              />
                            </div>
                          )}
                        </div>

                        {!editandoId && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={parcelarCheque}
                            onChange={(e) => {
                              setParcelarCheque(e.target.checked);
                              if (e.target.checked && cheques.length === 0) gerarDatas();
                            }}
                          />
                          Parcelar em vários cheques pré-datados
                        </label>
                        )}

                        {parcelarCheque && (
                          <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div>
                                <Label htmlFor="qtd-cheques">Quantidade</Label>
                                <Input
                                  id="qtd-cheques"
                                  type="number"
                                  min="1"
                                  max="48"
                                  value={qtdCheques}
                                  onChange={(e) => setQtdCheques(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Intervalo</Label>
                                <Select
                                  value={intervalo}
                                  onValueChange={(v) =>
                                    setIntervalo(v as "mensal" | "quinzenal" | "semanal")
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="mensal">Mensal</SelectItem>
                                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                    <SelectItem value="semanal">Semanal</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-end">
                                <Button type="button" variant="outline" onClick={gerarDatas}>
                                  Gerar datas
                                </Button>
                              </div>
                            </div>

                            {cheques.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  A partir do primeiro vencimento ({dataBR(form.data_vencimento)}). O
                                  valor total é dividido entre os cheques; as datas podem ser
                                  ajustadas uma a uma.
                                </p>
                                {cheques.map((ch, i) => (
                                  <div key={i} className="grid grid-cols-[54px_1fr_1fr] items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {i + 1}/{cheques.length}
                                    </span>
                                    <Input
                                      type="date"
                                      value={ch.data}
                                      onChange={(e) =>
                                        setCheques(
                                          cheques.map((x, j) =>
                                            j === i ? { ...x, data: e.target.value } : x,
                                          ),
                                        )
                                      }
                                    />
                                    <Input
                                      placeholder="Nº do cheque"
                                      value={ch.numero}
                                      maxLength={30}
                                      onChange={(e) =>
                                        setCheques(
                                          cheques.map((x, j) =>
                                            j === i ? { ...x, numero: e.target.value } : x,
                                          ),
                                        )
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
                      {editandoId ? "Salvar alterações" : "Salvar"}
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
                    <TableHead>Documento</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>{config.rotuloParceiro}</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Cheque</TableHead>
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
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {(c as Record<string, unknown>)["numero_documento"] as string ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {(c as Record<string, unknown>)["parcela"] as string ?? "—"}
                      </TableCell>
                      <TableCell>
                        {c.categoria_id ? (
                          nomeCategoria(c.categoria_id)
                        ) : (c as Record<string, unknown>)["categoria_sugerida"] === false ? (
                          <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                            revisar categoria
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{nomeParceiro((c as Record<string, unknown>)[config.campoParceiro])}</TableCell>
                      <TableCell>{dataBR(c.data_vencimento)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {config.tipo === "receber" &&
                        Number((c as Record<string, unknown>)["valor_taxa_maquininha"] ?? 0) > 0 ? (
                          <span
                            title={`Bruto ${brl(Number(c.valor))} · taxa ${brl(
                              Number((c as Record<string, unknown>)["valor_taxa_maquininha"] ?? 0),
                            )}`}
                          >
                            <span className="font-semibold">
                              {brl(
                                liquidoRecebimento(
                                  c as unknown as {
                                    valor: number;
                                    forma_recebimento?: string | null;
                                    valor_taxa_maquininha?: number | null;
                                  },
                                ),
                              )}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              bruto {brl(Number(c.valor))} · taxa{" "}
                              {brl(
                                Number(
                                  (c as Record<string, unknown>)["valor_taxa_maquininha"] ?? 0,
                                ),
                              )}
                            </span>
                          </span>
                        ) : (
                          brl(Number(c.valor))
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.situacao} />
                      </TableCell>
                      <TableCell>
                        {c.statusCheque ? (
                          <div className="flex items-center gap-2">
                            <ChequeBadge status={c.statusCheque} />
                            <Select
                              value={c.statusCheque}
                              onValueChange={(v) =>
                                mudarCheque.mutate({ id: c.id, novo: v as StatusCheque })
                              }
                            >
                              <SelectTrigger className="h-7 w-[130px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_CHEQUE.map((s) => (
                                  <SelectItem key={s} value={s} className="capitalize">
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {c.numeroCheque ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Nº {c.numeroCheque}
                            {c.bancoEmissor ? ` · ${c.bancoEmissor}` : ""}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {c.situacao !== config.statusFinal && c.situacao !== "cancelado" && !c.statusCheque && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title={config.tipo === "pagar" ? "Marcar como pago" : "Marcar como recebido"}
                              onClick={() =>
                                setBaixa({
                                  id: c.id,
                                  descricao: c.descricao,
                                  valor: Number(c.valor),
                                  data: hj,
                                  pago: Number(c.valor).toFixed(2),
                                  desconto: "0",
                                  multa: "0",
                                  conta_bancaria_id:
                                    ((c as Record<string, unknown>)["conta_bancaria_id"] as string) ??
                                    "",
                                  forma:
                                    ((c as Record<string, unknown>)[config.campoForma] as string) ??
                                    "",
                                  percentualTaxa: String(
                                    ((c as Record<string, unknown>)[
                                      "percentual_taxa_maquininha"
                                    ] ??
                                      percentualTaxaPadrao(
                                        taxas,
                                        (c as Record<string, unknown>)[config.campoForma] as string,
                                      )) || "",
                                  ),
                                  valorTaxa: String(
                                    ((c as Record<string, unknown>)["valor_taxa_maquininha"] ??
                                      (Number(c.valor) *
                                        percentualTaxaPadrao(
                                          taxas,
                                          (c as Record<string, unknown>)[
                                            config.campoForma
                                          ] as string,
                                        )) /
                                        100) || "",
                                  ),
                                })
                              }
                            >
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Editar lançamento"
                            disabled={consolidado}
                            onClick={() => abrirEdicao(c as unknown as Record<string, unknown>)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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

      <Dialog open={!!baixa} onOpenChange={(o) => !o && setBaixa(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {config.tipo === "pagar" ? "Baixa de pagamento" : "Baixa de recebimento"}
            </DialogTitle>
          </DialogHeader>
          {baixa && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 text-sm text-muted-foreground">
                {baixa.descricao} · valor da parcela {brl(baixa.valor)}
              </div>
              <div>
                <Label htmlFor="dt-baixa">
                  {config.tipo === "pagar" ? "Data do pagamento" : "Data do recebimento"}
                </Label>
                <Input
                  id="dt-baixa"
                  type="date"
                  value={baixa.data}
                  onChange={(e) => setBaixa({ ...baixa, data: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="vl-baixa">
                  {config.tipo === "pagar" ? "Valor pago (R$)" : "Valor recebido (R$)"}
                </Label>
                <Input
                  id="vl-baixa"
                  type="number"
                  min="0"
                  step="0.01"
                  value={baixa.pago}
                  onChange={(e) => setBaixa({ ...baixa, pago: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="vl-desc">Desconto (R$)</Label>
                <Input
                  id="vl-desc"
                  type="number"
                  min="0"
                  step="0.01"
                  value={baixa.desconto}
                  onChange={(e) => setBaixa({ ...baixa, desconto: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="vl-multa">Multa e juros (R$)</Label>
                <Input
                  id="vl-multa"
                  type="number"
                  min="0"
                  step="0.01"
                  value={baixa.multa}
                  onChange={(e) => setBaixa({ ...baixa, multa: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>
                  Conta bancária{" "}
                  {config.tipo === "pagar" ? (
                    <span className="text-destructive">*</span>
                  ) : (
                    <span className="text-muted-foreground">(opcional)</span>
                  )}
                </Label>
                <Select
                  value={baixa.conta_bancaria_id}
                  onValueChange={(v) => setBaixa({ ...baixa, conta_bancaria_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        config.tipo === "pagar"
                          ? "Informe de qual conta saiu o pagamento"
                          : "Onde entrou o recebimento"
                      }
                    />
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
                {config.tipo === "pagar" && !baixa.conta_bancaria_id && (
                  <p className="mt-1 text-xs text-destructive">
                    Obrigatório para confirmar a baixa do pagamento.
                  </p>
                )}
              </div>

              {config.tipo === "receber" && (
                <div className="sm:col-span-2">
                  <Label>Forma de recebimento</Label>
                  <Select
                    value={baixa.forma}
                    onValueChange={(v) => {
                      const perc = percentualTaxaPadrao(taxas, v);
                      const bruto = Number(baixa.pago || baixa.valor);
                      setBaixa({
                        ...baixa,
                        forma: v,
                        percentualTaxa: perc > 0 ? String(perc) : "",
                        valorTaxa: perc > 0 ? ((bruto * perc) / 100).toFixed(2) : "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Como o valor foi recebido" />
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
              )}

              {config.tipo === "receber" &&
                (percentualTaxaPadrao(taxas, baixa.forma) > 0 ||
                  Number(baixa.percentualTaxa || 0) > 0 ||
                  Number(baixa.valorTaxa || 0) > 0) && (
                <div className="sm:col-span-2 grid gap-4 rounded-lg border border-dashed p-4 sm:grid-cols-2">
                  <p className="sm:col-span-2 text-sm font-medium">Taxa de recebimento</p>
                  <div>
                    <Label htmlFor="perc-taxa">Percentual (%)</Label>
                    <Input
                      id="perc-taxa"
                      type="number"
                      min="0"
                      step="0.01"
                      value={baixa.percentualTaxa}
                      onChange={(e) => {
                        const perc = e.target.value;
                        const bruto = Number(baixa.pago || baixa.valor);
                        setBaixa({
                          ...baixa,
                          percentualTaxa: perc,
                          valorTaxa:
                            perc === ""
                              ? ""
                              : ((bruto * Number(perc)) / 100).toFixed(2),
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vl-taxa">Valor da taxa (R$)</Label>
                    <Input
                      id="vl-taxa"
                      type="number"
                      min="0"
                      step="0.01"
                      value={baixa.valorTaxa}
                      onChange={(e) => setBaixa({ ...baixa, valorTaxa: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Valor líquido recebido (R$)</Label>
                    <Input
                      readOnly
                      value={brl(
                        Number(baixa.pago || baixa.valor) - Number(baixa.valorTaxa || 0),
                      )}
                      className="bg-muted"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bruto {brl(Number(baixa.pago || baixa.valor))} menos a taxa de recebimento. É
                      esse valor que entra no caixa.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => baixar.mutate()}
              disabled={
                baixar.isPending || (config.tipo === "pagar" && !baixa?.conta_bancaria_id)
              }
            >
              Confirmar baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}