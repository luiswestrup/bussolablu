# Ordenação por coluna em Contas a Pagar e a Receber

Hoje as duas telas usam a mesma listagem compartilhada e vêm sempre ordenadas por vencimento, sem possibilidade de clicar no cabeçalho.

## O que muda

Cada título de coluna passa a ser clicável, como nos filtros do Excel:

- 1º clique: ordena crescente (A-Z, menor valor, data mais antiga)
- 2º clique: ordena decrescente (Z-A)
- 3º clique: volta à ordenação padrão por vencimento
- Uma seta aparece ao lado do título indicando a direção ativa

Colunas ordenáveis: Empresa (na visão consolidada), Descrição, Documento, Parcela, Categoria, Fornecedor/Cliente, Vencimento, Valor, Situação e Cheque. "Ações" fica sem ordenação.

A ordenação sempre atua sobre o resultado já filtrado (busca, status, cheque, período), e ao abrir a tela a lista continua exibida por data de vencimento, como hoje. Trocar um filtro mantém a ordenação escolhida.

## Detalhes técnicos

- Em `src/components/ContasView.tsx`: novo estado `ordenacao: { coluna, direcao } | null`, aplicado num `useMemo` derivado da lista já filtrada (sem alterar os filtros existentes).
- Comparadores por tipo: texto com `localeCompare` (pt-BR, case-insensitive), números para Valor, string ISO para datas; valores vazios/nulos sempre ao final.
- Campos derivados (categoria, parceiro, empresa, parcela, situação, cheque) são ordenados pelo texto exibido na célula, não pelo id.
- Cabeçalho vira um botão dentro de `TableHead`, com ícones `ArrowUp`/`ArrowDown`/`ArrowUpDown` do lucide-react, mantendo alinhamento à direita na coluna Valor.
- As linhas expandidas de parcelas continuam ancoradas na linha do título correspondente.

Como as duas telas reutilizam esse componente, o comportamento vale para Contas a Pagar e Contas a Receber.
