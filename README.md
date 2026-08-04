# FlowMaster Pro

Você é um desenvolvedor full-stack sênior e deve criar um sistema de gestão financeira e operacional para uma empresa, com foco em pagamentos, recebimentos, controle de estoque e dashboards com gráficos.

O sistema deve ser moderno, responsivo, simples de usar e pensado para rotina de gestão de pequenas e médias empresas.

Objetivo do sistema

Permitir ao usuário:

Registrar e acompanhar pagamentos.

Registrar e acompanhar recebimentos.

Controlar estoque de produtos.

Visualizar indicadores financeiros e operacionais por meio de gráficos e relatórios.

Ter visão clara de caixa, contas a pagar, contas a receber e posição de estoque.

Funcionalidades obrigatórias

Dashboard principal

Saldo de caixa atual.

Contas a pagar vencidas e a vencer.

Contas a receber vencidas e a vencer.

Valor total em estoque.

Gráficos de entradas e saídas.

Gráficos de evolução do caixa.

Gráficos de estoque por categoria ou produto.

Pagamentos

Cadastro de despesas/pagamentos.

Campos: descrição, valor, data de vencimento, data de pagamento, categoria, status, fornecedor, forma de pagamento.

Filtros por período, status e categoria.

Recebimentos

Cadastro de receitas/recebimentos.

Campos: descrição, valor, data de vencimento, data de recebimento, cliente, status, forma de recebimento.

Filtros por período, status e origem.

Controle de estoque

Cadastro de produtos.

Campos: nome, SKU, categoria, custo, preço de venda, quantidade, estoque mínimo, status.

Movimentação de entrada e saída.

Alerta de estoque baixo.

Relatórios

Fluxo de caixa por período.

Contas a pagar e receber.

Lucratividade simplificada.

Estoque atual e baixo estoque.

Gráficos

Gráfico de linha para fluxo de caixa.

Gráfico de barras para entradas e saídas.

Gráfico de pizza ou barras para categorias de despesas.

Gráfico de estoque por produto/categoria.

Requisitos técnicos

Interface limpa, profissional e intuitiva.

Sistema responsivo para desktop e celular.

Estrutura preparada para banco de dados.

Permitir autenticação de usuário.

Permitir exportação de relatórios em CSV ou PDF, se possível.

Código organizado, escalável e de fácil manutenção.

Entidades principais

Usuário

Conta a pagar

Conta a receber

Produto

Movimento de estoque

Categoria

Cliente

Fornecedor

Relatório/Dashboard

Regras de negócio

Contas vencidas devem ser destacadas.

Estoque abaixo do mínimo deve gerar alerta.

Recebimentos e pagamentos devem impactar automaticamente o saldo de caixa.

O sistema deve atualizar os gráficos em tempo real ou quase real.

Entrega esperada

Entregue:

Estrutura do sistema.

Telas principais.

Modelo de dados.

Componentes de dashboard.

Gráficos funcionais.

Fluxo de navegação.

Sugestão de stack tecnológica.

Observação

O sistema deve ser pensado para uso prático de gestão financeira e operacional, com foco em clareza, produtividade e tomada de decisão.

Utilize os anexos para ajudar o desenvolvimento

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dff2bf3c-32f0-4e1a-bc4f-3a8ad5e45484).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
