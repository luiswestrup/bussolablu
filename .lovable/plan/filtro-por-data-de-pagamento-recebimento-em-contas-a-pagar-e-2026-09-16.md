# Filtro por data de pagamento/recebimento em Contas a Pagar e a Receber

Hoje a barra de filtros das duas telas (busca, status, cheque e período por **vencimento**) não permite filtrar pela data em que o título foi efetivamente pago/recebido (baixa).

## O que muda

Ao final da barra de filtros, depois do período por vencimento, entra um novo par de datas:

- Rótulo dinâmico: "Pagto. de / até" em Contas a Pagar e "Receb. de / até" em Contas a Receber.
- Filtra pela data de baixa de cada título (`data_pagamento` ou `data_recebimento`, conforme a tela), do jeito que já existe para vencimento.
- Títulos sem data de baixa (em aberto) ficam de fora quando o filtro está ativo — o objetivo é conferir o que saiu/entrou de caixa no período.
- O botão "Limpar" existente também limpa o novo filtro, e ele aparece junto com o mesmo botão quando algum período está preenchido.
- Funciona junto com os demais filtros e com a ordenação por coluna (aplica-se sobre o resultado já filtrado).

## Detalhes técnicos

- Em `src/components/ContasView.tsx` (componente compartilhado pelas duas telas):
  - Novos estados `pagamentoDe` / `pagamentoAte`.
  - No `useMemo` de `listaFiltrada`, dois `.filter` novos lendo `c[config.campoData]` (o campo já vem do banco nos hooks `usePagar`/`useReceber`).
  - Novo bloco de inputs `type="date"` no fim da linha de filtros, mesmo padrão visual do bloco de vencimento.
  - Dependências do `useMemo` atualizadas; sem mudanças no backend.
