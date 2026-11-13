# Finanças do Casal

Aplicação web para o casal acompanhar receitas, despesas, investimentos e dinheiro guardado. **Não é um banco**: não movimenta dinheiro nem se conecta a contas. Tudo é digitado manualmente e fica salvo no `LocalStorage` do seu navegador (sem backend, sem sincronização entre dispositivos).

## Requisitos
- Node.js **20 LTS** (recomendado; funciona com 18+ e 22). Há um `.nvmrc` com a versão 20.

## Rodar no VS Code
```bash
npm install      # instala as dependências
npm run dev      # abre em http://localhost:5173
npm test         # testes dos cálculos financeiros
npm run build    # build de produção em dist/
npm run preview  # testa o build localmente
```

## Publicar no GitHub Pages
1. Crie um repositório no GitHub e envie o projeto para a branch `main`.
2. Em **Settings → Pages**, escolha **Source: GitHub Actions**.
3. A cada push em `main`, o workflow `.github/workflows/deploy.yml` roda testes, build e publica o site.
4. Depois do primeiro `npm install`, versione também o `package-lock.json`.

## O que já funciona
- **Visão geral**: renda de referência, despesas, investido, guardado, saldo, % da renda utilizada, comparação com o mês anterior, gráficos, gastos por categoria com alerta de limite excedido e últimas movimentações.
- **Movimentações**: criar, editar e excluir (receita, despesa, investimento, guardado), com filtros por mês, tipo, categoria e responsável.
- **Meu orçamento**: renda e destinações (despesas, investimentos, reserva) de cada pessoa e do casal, planejado × realizado, e limite × uso por categoria.
- **Investimentos**: cadastro manual (instituição, tipo, titular, valor inicial, saldo informado, rentabilidade informada), aportes, patrimônio, distribuição por modalidade e por pessoa e evolução. Nada de rentabilidade ou cotação é calculado automaticamente.
- **Planos**: metas financeiras (progresso, prazo, prioridade, histórico de contribuições, reordenar), lista de desejos agrupada por mês com confirmação de compra e planejamento do próximo mês (renda prevista × despesas, investimentos, reserva, metas e compras planejadas).
- **Histórico**: relatório anual por mês (receitas, despesas, investido, guardado, resultado), variação de despesas, distribuição percentual, comparação de categorias com o mês anterior e evolução da reserva e do patrimônio investido. Somente leitura.
- **Recorrentes e parceladas**: ao criar uma receita ou despesa, escolha “Recorrente (mensal)” ou “Parcelada”. As ocorrências futuras ficam agendadas e só entram nos resultados na data; ao excluir, dá para remover também as próximas da série.
- **Transferências**: entre categorias (move orçamento do mês) ou entre metas (move valor acumulado). Não são receita nem despesa.
- **Divisão de despesas**: em despesas compartilhadas, divisão igualitária, proporcional à renda ou personalizada; o Meu orçamento mostra quem pagou, a parte de cada um e o acerto.
- **Configurações**: nomes e rendas das duas pessoas, categorias com limite mensal, tema claro/escuro, backup JSON (exportar/importar), CSV de movimentações e apagar dados com confirmação.

## Regras financeiras
- Valores guardados em **centavos inteiros**; exibição em Real (R$).
- Renda de referência = salários + rendas extras cadastradas.
- Saldo = renda de referência + receitas registradas − despesas − investimentos − guardado (pode ficar negativo).
- Percentual utilizado = (despesas + investimentos + guardado) ÷ renda de referência.
- Só despesas contam nos limites por categoria; um aporte nunca conta como despesa e investimento ao mesmo tempo.
- Um aporte é **uma única movimentação** do tipo Investimento (vinculada ao investimento): aparece em Investido e no histórico de aportes, nunca como despesa. O saldo atual do investimento é informado por você.
- Planos (itens do próximo mês, metas e desejos) **não são movimentações**. Uma contribuição para meta vira uma movimentação do tipo Guardado e uma compra só entra nos resultados quando você a confirma (vira uma Despesa uma única vez; o desejo sai do planejado).
- O Histórico usa as receitas **registradas** em Movimentações (a renda de referência cadastrada muda com o tempo e não é reescrita no passado).
- Despesa compartilhada conta para cada pessoa só a sua parte; no total do casal ela conta uma única vez. Ocorrências agendadas de séries não entram nos totais antes da data.
- Trocar de mês não apaga nada: o seletor de mês apenas filtra a visualização.

## Ainda não incluído
Página dedicada de Reserva financeira (depósitos e retiradas). Hoje o dinheiro guardado é registrado como movimentação “Guardado”, inclusive pelas contribuições às metas.

## Dados e privacidade
Seus dados não vão para o repositório. Arquivos `backup-*.json` e `movimentacoes*.csv` estão no `.gitignore`.

## Licença
MIT — veja `LICENSE`.
