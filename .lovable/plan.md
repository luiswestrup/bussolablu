# Lançar no sistema as linhas do extrato que não existem em contas a pagar/receber

Hoje, quando uma linha do OFX não encontra correspondência, a única saída é ignorá-la. Passa a existir a opção de criar o lançamento na hora, direto na tela de Conciliação.

## Como vai funcionar

Nas duas situações em que a linha aparece sem correspondência:

- na prévia do arquivo, antes de confirmar a importação;
- na lista "Divergências do extrato aguardando revisão", depois de importado.

surge o botão **Lançar no sistema**, que abre uma janela já preenchida com os dados do banco (data, valor e histórico como descrição).

Três tipos de lançamento, escolhidos no topo da janela:

1. **Pagamento** (valor negativo no extrato) — descrição, valor, data do pagamento, categoria de despesa, fornecedor, forma de pagamento, número do documento e observação. Conta bancária fixa na conta do extrato.
2. **Recebimento** (valor positivo) — mesmos campos, com categoria de receita, cliente e forma de recebimento.
3. **Transferência entre contas** — escolhe a outra conta; a conta do extrato entra como origem (valor negativo) ou destino (valor positivo), com valor, data e observação.

O tipo já vem sugerido pelo sinal do valor, mas pode ser trocado. Categoria e fornecedor/cliente permitem criar novo item na hora, como nas demais telas.

Ao salvar:

- o lançamento nasce já baixado (pago/recebido) na data do extrato, marcado como conciliado;
- a linha do extrato fica com situação "conciliado" e vinculada ao novo lançamento;
- na prévia, a linha passa a aparecer como conciliada e o resumo é recalculado; ao importar, ela já entra vinculada;
- os totais de saldo, KPIs e as telas de pagamentos/recebimentos atualizam na hora.

Validações: valor diferente de zero, data obrigatória, descrição obrigatória, categoria obrigatória para pagamento/recebimento, conta de destino diferente da origem na transferência.

## Detalhes técnicos

- Novo componente `src/components/LancarDoExtrato.tsx`: diálogo controlado, recebe `{ data, valor, descricao }`, `contaBancariaId`, `empresaId` e um callback `onCriado(vinculo)` com `{ tabela, id }` ou `null` (transferência).
- Inserção via `inserirRetornando` em `conta_pagar` / `conta_receber` com `status: 'pago' | 'recebido'`, `data_pagamento`/`data_recebimento` = data do extrato, `valor_pago`/`valor_recebido` = |valor|, `conta_bancaria_id`, `conciliado: true`, `conciliado_em`. Transferência insere em `transferencia_bancaria` (origem/destino conforme o sinal).
- Reaproveita `SeletorCategoria`, os seletores de fornecedor/cliente do padrão de `ContasView.tsx`, e `useCategorias`/`useFornecedores`/`useClientes`/`useContasBancarias`.
- Em `ImportarExtrato.tsx`:
  - estado local `manuais: Record<hash, { tabela, id } | 'transferencia'>` para linhas resolvidas na prévia; `casarLinhas` continua igual e o resultado é sobreposto por esse mapa ao montar os registros de `extrato_bancario_linha` (status `conciliado`, ids preenchidos).
  - coluna de ação nas duas tabelas com o botão que abre o diálogo; após criar, invalida `conta_pagar`, `conta_receber`, `transferencia_bancaria` e `extrato_bancario_linha`.
  - na lista pendente salva, gravar `status: 'conciliado'` + id na própria linha via `tabela('extrato_bancario_linha').update(...)`, reutilizando a lógica de `resolverPendente`.
- Sem mudanças de banco: as colunas `conta_pagar_id`/`conta_receber_id` de `extrato_bancario_linha` já cobrem o vínculo; transferência fica como linha conciliada sem vínculo de título.
