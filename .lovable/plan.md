# Categoria e natureza no CSV de pagamentos

Hoje o arquivo de pagamentos exportado termina na coluna K ("Valor de multa e juros pagos"). Vamos acrescentar duas colunas ao final:

- **Coluna L — Categoria**: nome da categoria da despesa (vazio quando não houver).
- **Coluna M — Natureza**: nome da natureza ligada àquela categoria (vazio quando não houver).

Assim as posições L e M pedidas ficam exatamente com essas informações, sem mexer nas colunas já existentes.

## Onde aparece

A mudança vale para os dois pontos de exportação de pagamentos:
- Relatórios > exportar pagamentos
- Contas a Pagar > exportar lista filtrada

O arquivo de recebimentos fica como está (o pedido é sobre despesa).

## Detalhes técnicos

- `src/lib/exportacao.ts`: `linhasPagamentosCSV` passa a receber também as listas de categorias e naturezas e acrescenta os campos `Categoria` e `Natureza` ao final de cada linha, resolvendo o nome via `categoria_id` e `categoria.natureza_id` (usando o helper `nomeNatureza` já existente em `src/lib/dados.ts`).
- `src/routes/_authenticated/relatorios.tsx`: já carrega `useCategorias`/`useNaturezas`; só repassar nos argumentos.
- `src/components/ContasView.tsx`: passar as categorias/naturezas já disponíveis na tela para a chamada de exportação (carregar os hooks se ainda não estiverem em uso).
