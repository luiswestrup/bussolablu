import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  inserirRetornando,
  nomeNatureza,
  useNaturezas,
  type Categoria,
} from "@/lib/dados";
import { SeletorNatureza } from "@/components/SeletorNatureza";

const NOVA = "__nova__";

const TIPOS: { valor: Categoria["tipo"]; rotulo: string }[] = [
  { valor: "despesa", rotulo: "Despesa" },
  { valor: "receita", rotulo: "Receita" },
  { valor: "produto", rotulo: "Produto" },
];

export function SeletorCategoria({
  categorias,
  value,
  onChange,
  tipo,
  empresaId,
  placeholder = "Obrigatório",
  disabled,
}: {
  categorias: Categoria[];
  value: string;
  onChange: (id: string) => void;
  tipo: Categoria["tipo"];
  empresaId?: string | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
}) {
  const queryClient = useQueryClient();
  const { data: naturezas = [] } = useNaturezas(empresaId);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [tipoNovo, setTipoNovo] = useState<Categoria["tipo"]>(tipo);
  const [naturezaId, setNaturezaId] = useState("");

  const opcoes = categorias.filter((c) => c.tipo === tipo);

  const abrirModal = () => {
    setNome("");
    setTipoNovo(tipo);
    setNaturezaId("");
    setAberto(true);
  };

  const fechar = (open: boolean) => {
    setAberto(open);
    if (!open && salvando === false) {
      // cancelou: nenhuma categoria escolhida
    }
  };

  const salvar = async () => {
    if (!empresaId || !nome.trim()) return;
    setSalvando(true);
    try {
      const nova = await inserirRetornando<{ id: string }>(
        "categoria",
        {
          empresa_id: empresaId,
          nome: nome.trim(),
          tipo: tipoNovo,
          natureza_id:
            tipoNovo === "despesa" || tipoNovo === "produto" ? naturezaId || null : null,
        },
        "id",
      );
      await queryClient.invalidateQueries({ queryKey: ["categoria"] });
      setAberto(false);
      if (tipoNovo === tipo) onChange(nova.id);
      toast.success("Categoria criada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar a categoria");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Select
        value={value}
        disabled={disabled ?? false}
        onValueChange={(v) => {
          if (v === NOVA) abrirModal();
          else onChange(v);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
              {c.natureza_id ? ` · ${nomeNatureza(naturezas, c.natureza_id)}` : ""}
            </SelectItem>
          ))}
          <SelectItem value={NOVA} className="font-medium text-primary">
            + Nova categoria
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={aberto} onOpenChange={fechar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-nome">Nome</Label>
              <Input
                id="cat-nome"
                value={nome}
                autoFocus
                placeholder="Ex.: Peixes, Bebidas, Manutenção"
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={tipoNovo}
                onValueChange={(v) => setTipoNovo(v as Categoria["tipo"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(tipoNovo === "despesa" || tipoNovo === "produto") && (
              <div>
                <Label>Natureza</Label>
                <SeletorNatureza
                  naturezas={naturezas}
                  value={naturezaId}
                  onChange={setNaturezaId}
                  empresaId={empresaId}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!nome.trim() || salvando || !empresaId}>
              {salvando ? "Salvando..." : "Salvar categoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
