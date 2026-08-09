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
  rotuloNatureza,
  type Categoria,
} from "@/lib/dados";

const NOVA = "__nova__";

const TIPOS: { valor: Categoria["tipo"]; rotulo: string }[] = [
  { valor: "despesa", rotulo: "Despesa" },
  { valor: "receita", rotulo: "Receita" },
  { valor: "produto", rotulo: "Produto" },
];

const NATUREZAS: { valor: NonNullable<Categoria["natureza"]>; rotulo: string }[] = [
  { valor: "mercadoria", rotulo: "Mercadoria" },
  { valor: "servico", rotulo: "Serviço" },
  { valor: "outro", rotulo: "Outro" },
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
  empresaId?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [tipoNovo, setTipoNovo] = useState<Categoria["tipo"]>(tipo);
  const [natureza, setNatureza] = useState<NonNullable<Categoria["natureza"]>>("mercadoria");

  const opcoes = categorias.filter((c) => c.tipo === tipo);

  const abrirModal = () => {
    setNome("");
    setTipoNovo(tipo);
    setNatureza("mercadoria");
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
          natureza: tipoNovo === "despesa" ? natureza : null,
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
        disabled={disabled}
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
              {c.natureza ? ` · ${rotuloNatureza(c.natureza)}` : ""}
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
            {tipoNovo === "despesa" && (
              <div>
                <Label>Natureza</Label>
                <Select
                  value={natureza}
                  onValueChange={(v) =>
                    setNatureza(v as NonNullable<Categoria["natureza"]>)
                  }
                >
                  <SelectTrigger>
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
