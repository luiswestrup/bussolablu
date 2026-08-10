import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inserirRetornando, type Natureza } from "@/lib/dados";

const NOVA = "__nova_natureza__";

export function SeletorNatureza({
  naturezas,
  value,
  onChange,
  empresaId,
  disabled,
  className,
}: {
  naturezas: Natureza[];
  value: string;
  onChange: (id: string) => void;
  empresaId?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!empresaId || !nome.trim()) return;
    setSalvando(true);
    try {
      const nova = await inserirRetornando<{ id: string }>(
        "natureza",
        { empresa_id: empresaId, nome: nome.trim() },
        "id",
      );
      await queryClient.invalidateQueries({ queryKey: ["natureza"] });
      onChange(nova.id);
      setNome("");
      setCriando(false);
      toast.success("Natureza criada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar a natureza");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={className}>
      <Select
        value={value}
        disabled={disabled ?? false}
        onValueChange={(v) => {
          if (v === NOVA) setCriando(true);
          else onChange(v);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Natureza" />
        </SelectTrigger>
        <SelectContent>
          {naturezas.map((n) => (
            <SelectItem key={n.id} value={n.id}>
              {n.nome}
            </SelectItem>
          ))}
          <SelectItem value={NOVA} className="font-medium text-primary">
            + Nova natureza
          </SelectItem>
        </SelectContent>
      </Select>

      {criando && (
        <div className="mt-2 flex gap-2">
          <Input
            autoFocus
            value={nome}
            maxLength={60}
            placeholder="Nome da natureza"
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void salvar();
              }
            }}
          />
          <Button size="sm" onClick={() => void salvar()} disabled={!nome.trim() || salvando || !empresaId}>
            {salvando ? "..." : "Salvar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCriando(false);
              setNome("");
            }}
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
