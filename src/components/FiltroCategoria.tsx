import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Categoria } from "@/lib/dados";

/** "" = todas as categorias; "__sem__" = títulos sem categoria; demais = id da categoria. */
export const CATEGORIA_TODAS = "";
export const CATEGORIA_SEM = "__sem__";

/**
 * Filtro de categoria com busca digitada — são muitas categorias para um
 * seletor comum, então a lista abre já com o campo de busca focado.
 */
export function FiltroCategoria({
  categorias,
  tipo,
  value,
  onChange,
  nomeEmpresa,
}: {
  categorias: Categoria[];
  tipo: Categoria["tipo"];
  value: string;
  onChange: (v: string) => void;
  /** Passado na visão consolidada: categorias homônimas de empresas diferentes. */
  nomeEmpresa?: ((id: string) => string | null | undefined) | undefined;
}) {
  const [aberto, setAberto] = useState(false);

  const opcoes = [...categorias]
    .filter((c) => c.tipo === tipo)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

  // Na visão "Todas", a mesma categoria pode existir em mais de uma empresa.
  const comEmpresa =
    !!nomeEmpresa && new Set(opcoes.map((c) => c.empresa_id)).size > 1;
  const comEmpresaDe = (c: Categoria) =>
    comEmpresa ? ` · ${nomeEmpresa?.(c.empresa_id) ?? ""}` : "";

  const escolhida = categorias.find((c) => c.id === value);

  const rotulo =
    value === CATEGORIA_TODAS
      ? "Categoria: todas"
      : value === CATEGORIA_SEM
        ? "Categoria: sem categoria"
        : escolhida
          ? `${escolhida.nome}${comEmpresaDe(escolhida)}`
          : "Categoria: todas";

  const escolher = (v: string) => {
    onChange(v);
    setAberto(false);
  };

  const marca = (ativo: boolean) =>
    cn("mr-2 h-4 w-4 shrink-0", ativo ? "opacity-100" : "opacity-0");

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-label="Filtrar por categoria"
          className={cn(
            "w-[220px] justify-between",
            value !== CATEGORIA_TODAS && "border-primary/50",
          )}
        >
          <span className="truncate">{rotulo}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar categoria..." />
          <CommandList>
            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="todas as categorias" onSelect={() => escolher(CATEGORIA_TODAS)}>
                <Check className={marca(value === CATEGORIA_TODAS)} />
                Todas as categorias
              </CommandItem>
              <CommandItem value="sem categoria" onSelect={() => escolher(CATEGORIA_SEM)}>
                <Check className={marca(value === CATEGORIA_SEM)} />
                Sem categoria
              </CommandItem>
              {opcoes.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.nome}${comEmpresaDe(c)}`}
                  onSelect={() => escolher(c.id)}
                >
                  <Check className={marca(value === c.id)} />
                  {c.nome}
                  {comEmpresa && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {comEmpresaDe(c)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
