---
title: 'Deixei o GitHub Copilot fazer toda a minha declaração de imposto de renda — de 837 lançamentos contábeis até a entrega'
description: 'Da classificação e verificação de 837 lançamentos contábeis acumulados via integração de dados de contabilidade em nuvem, passando pela conferência de contribuições previdenciárias, entrada de deduções até a entrega da declaração. O registro completo de uma declaração de imposto de renda onde o trabalho foi quase totalmente delegado ao GitHub Copilot Agent Mode × Simple Browser.'
date: 2026-03-17
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code']
image: https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop&q=80
processFigure:
  title: Fluxo geral da declaração com Copilot
  steps:
    - title: Integração e acumulação de dados
      description: Integração automática de bancos, cartões e Suica no MF Cloud, acumulando 837 lançamentos.
      icon: i-lucide-database
    - title: Classificação e verificação de lançamentos
      description: Copilot confrontou o guia de políticas com o livro-razão e detectou 8 inconsistências.
      icon: i-lucide-search
    - title: Entrada de deduções e formulário da declaração
      description: Coletou valores de múltiplos serviços e preencheu o formulário da declaração.
      icon: i-lucide-file-text
    - title: Verificação e entrega da declaração
      description: Verificação cruzada das Tabelas 1 e 2, e entrega da declaração pelo MF Cloud.
      icon: i-lucide-check-circle
compareTable:
  title: Comparação antes e depois do Copilot
  before:
    label: Declaração de IR tradicional
    items:
      - Navegar entre múltiplos serviços web em várias abas do navegador
      - Copiar valores manualmente para planilhas
      - Verificar a classificação contábil de cada lançamento manualmente
      - Procurar comprovantes de dedução em envelopes físicos
      - Erros no formulário só são encontrados pelo próprio declarante
  after:
    label: Copilot × Simple Browser
    items:
      - Operar todos os serviços no Simple Browser dentro do VS Code
      - Copilot lê a página e extrai/totaliza valores automaticamente
      - Confronta guia de políticas com livro-razão para detectar inconsistências automaticamente
      - Copilot busca por palavra-chave no Cloud Box e e-mails
      - Copilot executa verificação cruzada entre Tabelas 1 e 2
callout:
  type: tip
  title: O ponto principal deste artigo
  text: O maior fator de sucesso foi acumular dados de lançamentos contábeis no dia a dia através da integração de dados do MoneyForward. O Copilot cuidou da parte de "organizar, verificar e inserir os dados acumulados", enquanto o humano se concentrou apenas nas decisões de política e na aprovação final para completar a declaração.
faq:
  title: Perguntas frequentes
  items:
    - question: É realmente possível fazer a declaração de IR com o GitHub Copilot?
      answer: Sim, combinando o Agent Mode com o Simple Browser, é possível completar desde a classificação de lançamentos, entrada de deduções até a criação do formulário da declaração dentro do VS Code. Porém, a entrega final requer autenticação com cartão My Number, então o humano precisa fazer isso.
    - question: Quais são os pré-requisitos para usar o Copilot?
      answer: O maior pré-requisito é acumular dados de lançamentos contábeis no dia a dia usando contabilidade em nuvem como o MoneyForward. O Copilot é responsável por organizar e verificar os dados acumulados, então sem dados ele não funciona.
    - question: Como as inconsistências nos lançamentos foram detectadas?
      answer: O Copilot confrontou o guia de políticas (regras de contas contábeis) com o livro-razão e detectou mecanicamente os lançamentos que não estavam de acordo com as regras. Foram encontradas 8 inconsistências em 837 lançamentos, que foram corrigidas.
---

Deleguei todo o trabalho operacional da declaração de imposto de renda ao Agent Mode do GitHub Copilot. O resultado: desde a classificação de 837 lançamentos contábeis até a criação e verificação do formulário da declaração, tudo foi concluído dentro do VS Code. Apenas a entrega final foi feita pelo aplicativo de smartphone com autenticação por cartão My Number, completando a declaração.

Neste artigo, registro sem esconder nada "até onde o Copilot conseguiu fazer" e "o que o humano fez".

## Premissa: A integração de dados do MF Cloud é a base

Primeiro, preciso ser claro: a maior razão do sucesso foi **ter configurado a integração de dados do MoneyForward Cloud no dia a dia**.

Em vez de correr atrás de comprovantes na época da declaração, os seguintes serviços foram integrados automaticamente ao longo do ano, acumulando lançamentos contábeis:

- **Conta bancária empresarial** — Depósitos de receita, taxas de transferência
- **Conta bancária pessoal** — Financiamento imobiliário, J-Coin Pay, separação de despesas pessoais
- **Banco digital** — Registros de débito automático de contribuições previdenciárias
- **Cartão de crédito empresarial** — Comunicação, publicidade, viagem, livros
- **[Mobile Suica](https://www.jreast.co.jp/suica/)** — Transportes como trem e ônibus (método de adiantamento para evitar duplicação)
- **E-commerce** — Registros de compra de materiais de consumo
- **[Myna Portal](https://myna.go.jp/)** — Comprovantes de dedução de pensão e seguro de vida

Graças a essa integração, no momento do fechamento havia **837 lançamentos** acumulados na nuvem. O trabalho do Copilot foi classificar corretamente esses dados brutos e transformá-los no formulário da declaração.

## Ambiente utilizado

### Editor e IA

- **[VS Code](https://code.visualstudio.com/)** — Editor, navegador, terminal e chat. Tudo se resolve aqui
- **[GitHub Copilot](https://github.com/features/copilot) Agent Mode ([Claude Opus 4.6](https://www.anthropic.com/claude))** — O modelo principal desta vez. Combina autonomamente edição de arquivos (leitura e escrita de Markdown), execução de comandos no terminal e operação web via Simple Browser
- **[Simple Browser](https://code.visualstudio.com/docs/editor/simple-browser) (navegador integrado do VS Code)** — Através de ferramentas [MCP (Model Context Protocol)](https://modelcontextprotocol.io/), o Copilot lê o DOM, clica em botões e links com `click_element`, preenche formulários com `type_in_page` e obtém o texto completo da página com `read_page`. São os "olhos e mãos" do Copilot

### Serviços web

- **[MoneyForward Cloud Declaração de IR](https://biz.moneyforward.com/tax_return/)** — Gerenciamento de livro-razão, demonstrações financeiras e formulário da declaração
- **[MoneyForward Cloud Box](https://biz.moneyforward.com/box/)** — Gerenciamento de documentos como recibos e comprovantes
- **[MoneyForward ME](https://moneyforward.com/)** — Gerenciamento de patrimônio pessoal (verificação cruzada de entradas e saídas de múltiplas contas)

### Por que GitHub Copilot e não Computer Use

Para delegar operações de tela à IA, existem ferramentas baseadas em screenshots como o Computer Use da Anthropic. Porém, o que esta declaração de IR exigia não era apenas "operar a tela", mas **ler e escrever arquivos enquanto toma decisões, e compartilhar esse registro com o humano**.

Razões para escolher o GitHub Copilot Agent Mode:

- **Divisão de trabalho onde o humano faz login e a IA trabalha** — O humano faz login em bancos e softwares contábeis e deixa as páginas abertas. A partir daí, as operações (busca, entrada, confirmação) são feitas pelo Copilot via Simple Browser. Computer Use é projetado para entregar o desktop inteiro à IA, não permitindo a divisão "apenas login pelo humano, resto pela IA" na mesma tela
- **Edição de arquivos e operação do navegador se completam no mesmo ambiente** — Ler o guia-de-politicas.md, avaliar a correção dos lançamentos, escrever os resultados no verificacao-inconsistencias.md, e em seguida corrigir os registros via Simple Browser. Esse fluxo não se interrompe dentro do VS Code
- **Arquivos Markdown funcionam como workspace compartilhado entre humano e IA** — Computer Use é baseado em screenshots, então não é adequado para acumular e consultar conhecimento estruturado. Com o Copilot, é possível trocar "com que base e como decidimos" bidireccionalmente através de arquivos .md
- **O log de conversa se torna o registro de trabalho** — Trocas como "Coloca essa dedução?" "Não tem comprovante, então vamos deixar de fora" ficam todas registradas no histórico do chat. Poder rastrear o processo decisório depois é especialmente importante na declaração de IR

Em resumo, operar a tela é possível com outras ferramentas, mas **a divisão de trabalho com humano e IA compartilhando a mesma tela e os mesmos arquivos** é o ponto forte do Copilot Agent Mode.

### O núcleo do workflow: conjunto de arquivos Markdown

Na colaboração com o Copilot, o mais importante foi **estruturar conhecimento e tarefas em arquivos Markdown**. Configuração de arquivos utilizada:

| Arquivo | Função |
| --- | --- |
| `politicas.md` | Regras de mapeamento: padrão de descrição → conta contábil (16 seções). Critério de julgamento para classificação de lançamentos pelo Copilot |
| `tarefas.md` | Hub de gerenciamento de progresso geral da declaração. Gerenciamento com ✅ do status de 38 comprovantes |
| `tarefas-declaracao.md` | Questões pendentes e notas de pesquisa da fase de entrada da declaração. Fatos e inferências separados |
| `tarefas-declaracao_concluido.md` | Itens concluídos/suspensos movidos para evitar inchaço do arquivo de trabalho |
| `verificacao-inconsistencias.md` | Relatório de confrontação entre políticas e livro-razão. Referência a seções §do guia de políticas |
| `relatorio-revisao-MF.md` | Revisão de BS/PL. Gerenciamento por ID de problema (A1, B1 etc.) e severidade |
| `tabela-correspondencia-razao.md` | Registro com todas as 837 entradas do livro-razão categorizadas em tabelas |

O Copilot **lê esses arquivos .md para tomar decisões e escreve para registrar**. O humano lê exatamente os mesmos arquivos para entender a situação. Os arquivos Markdown funcionam como workspace compartilhado entre humano e IA.

O uso básico é com 5 a 6 abas do Simple Browser abertas simultaneamente, avançando em consulta com o Copilot.

## Fase 1: Criar o guia de políticas de lançamentos junto com o Copilot

### Definição das políticas de lançamentos

A primeira coisa que fizemos foi documentar as regras de classificação de lançamentos no `politicas.md`. Consultando o Copilot com perguntas como "Qual conta usar para esta transação?" e "Isso é uso empresarial ou pessoal?", resumimos as contas contábeis por padrão de transação.

A estrutura deste guia é o ponto-chave. Cada seção está no formato `### Padrão de descrição → Conta contábil`, com tabelas Markdown definindo descrição, conteúdo e conta. Para casos duvidosos, adicionamos fundamentação em blocos `> Nota:`. Como o campo de descrição do MF Cloud registra em katakana de meia-largura (ex: `ﾃｽｳﾘｮｳ`), transcrevemos da mesma forma no guia para facilitar copiar e colar nas buscas.

As regras de classificação definidas abrangem 15 seções:

| Categoria | Conta | Exemplos |
| --- | --- | --- |
| Depósitos de clientes | Receita | Depósitos mensais |
| Parcela de financiamento | Retirada pessoal | Débito automático de conta pessoal |
| Recarga de pagamento QR | Retirada/Aporte pessoal | Recarga e estorno de conta pessoal |
| Transferência entre contas | Depósito bancário | Conta empresarial ↔ conta pessoal |
| ISP / SaaS | Comunicação | GitHub, Cloudflare, ChatGPT, Canva etc. |
| Publicidade web / Redes sociais | Publicidade | Google Ads, X Premium, SocialDog etc. |
| Transporte | Viagem e transporte | Trem-bala, táxi, espaço de teletrabalho |
| Uso de Suica | Viagem e transporte | Registros individuais de trem/ônibus com método de adiantamento |
| Compras em e-commerce | Material de consumo | Periféricos de PC, ferramentas |

## Fase 2: Classificação e verificação de 837 lançamentos

### Confrontação completa pelo Copilot

Com o guia de políticas pronto, passamos naturalmente para confrontar com os dados reais do livro-razão.

Método específico: O Copilot abriu a tela do livro-razão do MF Cloud no Simple Browser, obteve o conteúdo da página com `read_page`. Aplicou filtros por palavras-chave de descrição e confrontou com as tabelas do guia de políticas. Quando encontrou divergências, adicionou linhas no `verificacao-inconsistencias.md` e editou diretamente a seção correspondente do guia de políticas (ex: `§13`). A regra declarada no início do `verificacao-inconsistencias.md` é "corrigir o guia de políticas tomando o livro-razão como referência", então o Copilot corrigiu o guia sem hesitar.

Resultado: **8 inconsistências** detectadas:

| Descrição | Conta no guia | Lançamento real | Ação |
| --- | --- | --- | --- |
| Premium de rede social | Retirada pessoal (uso pessoal) | Publicidade | Rede social empresarial, então publicidade é correto |
| Ferramenta de design | Retirada pessoal (uso pessoal) | Comunicação | Ferramenta empresarial, então comunicação é correto |
| Serviço de chat IA | Retirada pessoal (uso pessoal) | Comunicação | Ferramenta empresarial, então comunicação é correto |
| Aluguel de bateria portátil | Comunicação | Retirada pessoal | Uso pessoal, então retirada pessoal é correto |
| Compras em app (múltiplos apps) | Comunicação uniforme | Dividido por app | Rotas→comunicação, bloqueador→retirada pessoal etc. |
| Anúncio em vídeo (fatura por limiar) | Classificado em seção de uso pessoal | Publicidade | Erro de posicionamento no guia corrigido |
| Compra e-commerce (periférico PC) | Livros | Material de consumo | Conta corrigida |
| Ferramenta de gerenciamento de redes | Comunicação | Publicidade | Operação de redes sociais, então publicidade é correto |

"Criar o guia, confrontar com o livro-razão e corrigir o guia quando houver divergência" — ter o Copilot fazendo esse trabalho enquanto edita os arquivos automaticamente foi uma eficiência de outra dimensão comparada a verificar 837 linhas visualmente.

### Visão geral do livro-razão

Os lançamentos finais organizados tiveram a seguinte composição:

- **Integração bancária** (conta empresarial, conta pessoal, banco digital — 4 bancos) — Depósitos de receita, financiamento, transferências entre contas
- **Integração de cartão de crédito** (Sumitomo Mitsui Card titular + Apple Pay separado) — Comunicação 116 itens, publicidade 21 itens, transporte 24 itens, livros 27 itens, uso pessoal 29 itens etc.
- **Integração Mobile Suica** — Trem 248, ônibus 130, recargas 21, compras 4
- **Integração e-commerce** — Material de consumo 5 itens
- **AI-OCR / Faturas** — 16 itens

## Fase 3: Organização de comprovantes no Cloud Box

### Upload e leitura automática

Para organizar os comprovantes, fizemos upload de recibos e extrato de cartão para a funcionalidade Box da contabilidade em nuvem via Copilot. O AI-OCR leu automaticamente data, fornecedor e valor, e o Copilot complementou manualmente as informações faltantes.

Comprovantes individuais (recibos avulsos) tiveram data, fornecedor e valor completamente complementados. Documentos de extrato (lista de uso do cartão, histórico de Suica, extrato bancário etc.) foram apenas carregados como material de referência.

## Fase 4: Conferência de contribuições previdenciárias — O melhor do cruzamento entre múltiplos serviços

Esta parte começou com uma consulta: "Como confirmar os valores das contribuições previdenciárias?" Conversando com o Copilot, definimos a abordagem de **abrir 5 serviços web simultaneamente para conferência cruzada**.

### Previdência Nacional

Nem sempre os dados da integração com o Myna Portal são suficientes. Por exemplo, quando a previdência do cônjuge é paga de outra conta, não aparece nos dados integrados.

Nesses casos, o fluxo de trabalho com o Copilot foi:

1. "Vamos procurar pagamentos de previdência no extrato do cartão" → Abrir no Simple Browser e buscar "Organismo de Previdência", extrair valores
2. "Pode ter pagamento de outra conta" → Verificar registros de débito de outra conta no app de finanças pessoais, descobrir débitos fora da integração
3. "Vamos ver os meses anteriores e seguintes" → Entender o padrão de pagamento (trimestral, mensal etc.)
4. "Então vamos cruzar e calcular o total" → Cruzar valores de múltiplas fontes e confirmar o valor anual

O ponto é que nenhum serviço é suficiente sozinho. Trocar com o Copilot "onde olhamos agora?" e "vamos verificar lá também" enquanto navegamos entre múltiplas abas é o padrão básico desta fase.

### Seguro saúde

Abrimos a aba do Simple Browser do banco digital e buscamos os registros de débito automático de contribuições do seguro. Fizemos a busca ajustando as palavras-chave conforme o sistema (associação de saúde, seguro nacional etc.) e confirmamos as parcelas e valores anuais.

### Pagamentos às prefeituras (armadilha)

Mesmo que haja registros de pagamento à prefeitura no app de finanças, não é possível distinguir apenas pelos registros se é "seguro saúde nacional", "imposto municipal" ou "imposto sobre propriedade".

Fluxo de investigação junto com o Copilot:

1. "Vamos verificar os prazos de pagamento da prefeitura" → Consultar boletins e sites para verificar datas de cobrança ordinária por tipo de tributo
2. "Coincide com o mês de pagamento?" → Cruzar para refinar candidatos de tributo
3. "Estava pagando outro seguro no mesmo período?" → Verificar se não há sobreposição de regimes

Quando não é possível confirmar o tipo de tributo sem o comprovante original, a decisão segura é **não incluir na dedução**. Essa decisão de "incluir/não incluir" é feita pelo humano, e a pesquisa dos materiais de apoio fica com o Copilot — essa divisão de papéis é fundamental.

### Descoberta de classificação errada

A classificação automática do app de finanças não é perfeita. Na prática, uma despesa havia sido automaticamente classificada como "previdência", mas quando o Copilot verificou no extrato do cartão, na realidade era uma conta pública completamente diferente. Se tivéssemos aceitado sem questionar, teríamos superestimado as contribuições previdenciárias.

**O que sempre deve ser feito**: Não confiar na classificação do app de finanças e confirmar com o Copilot "Esse valor é realmente previdência? Vamos verificar no extrato do cartão". O cruzamento entre serviços é o verdadeiro valor do Copilot × Simple Browser.

## Fase 5: Entrada das deduções

Passamos então a inserir as demais deduções junto com o Copilot via Simple Browser nos formulários.

### Deduções inseridas

| Tipo de dedução | Descrição | Trabalho do Copilot |
| --- | --- | --- |
| Dedução de seguro de vida | Dados integrados do Myna Portal + entrada manual | Operou select boxes do formulário e inseriu item por item |
| Dedução de seguro contra terremotos | Seguro contra terremoto de cooperativa/seguradora | Inseriu valores no formulário |
| Dedução de cônjuge | Cálculo de renda total do cônjuge | Calculou o valor da renda aplicando a dedução de renda salarial e confirmou o valor da dedução |
| Dedução de contribuição previdenciária | Previdência + seguro saúde (valores confirmados na Fase 4) | Selecionou tipo na tela de seguridade social da declaração e inseriu valores |
| Dedução de dependentes (menores de 16 anos) | Não afeta o valor da dedução mas impacta imposto municipal | Verificou status de registro na tela Informações básicas → Família e dependentes |

### Itens analisados e recusados

Itens que analisamos com o Copilot e decidimos "desta vez, vamos deixar de fora":

- **Dedução de financiamento imobiliário** — Comprovante de saldo final do ano não disponível, então adiado
- **Dedução de despesas médicas** — Verificados dados integrados do Myna Portal, mas valores insuficientes para impacto significativo
- **Rateio de conta de luz** — Servidor doméstico usado para negócios, mas documentação de rateio não preparada a tempo
- **Doações / iDeCo** — Não aplicável neste ano

## Fase 6: Rateio de despesas do ISP

A mensalidade do ISP (internet) estava integralmente classificada como despesa de comunicação no livro-razão, but como o escritório é em casa, 100% de uso empresarial não é aceitável.

Ao perguntar ao Copilot "como fazer o rateio?", ele apresentou opções e decidimos juntos o método:

1. Buscar todos os lançamentos de ISP no livro-razão → Calcular total anual
2. Definir a proporção de uso empresarial (50% é uma referência comum para escritório doméstico)
3. Em vez de alterar cada lançamento individual, adicionar **um lançamento de ajuste único em 31/12** "Retirada pessoal / Comunicação"
4. Copilot inseriu o lançamento no livro-razão

Apresentar opções práticas como "ajustar cada item individual em 50% ou fazer ajuste único no final do ano" também é uma qualidade das conversas com o Copilot.

## Fase 7: Entrada e verificação do formulário da declaração

### Operação de formulários no Simple Browser

Abrimos a tela do formulário da declaração do software contábil em nuvem no Simple Browser e avançamos com a entrada dos formulários conversando com o Copilot.

O que o Copilot realmente faz:

1. Obtém a estrutura da página atual com `read_page` para decidir qual menu clicar
2. Clica em links do menu lateral e "Seguridade social" etc. com `click_element` para navegar entre telas
3. Para select boxes, abre o dropdown com `click_element` e seleciona a opção com outro `click_element`
4. Insere valores nos campos com `type_in_page`, transcrevendo os valores registrados no `tarefas-declaracao.md`
5. Clica no botão "Salvar" com `click_element` para enviar o formulário

Do lado humano, a conversa é do tipo "vamos preencher a parte de seguridade social", "começando pela previdência", "tem mais um item", "vamos verificar se bate com a Tabela 1". Não é necessário especificar seletores ou instruções detalhadas de operação — o Copilot lê o DOM e decide autonomamente.

Além de ser mais fácil do que operar o navegador sozinho, o grande benefício é que **essa troca de conversa em si fica registrada no log do chat**. É possível verificar depois o que foi inserido e em que ordem.

### Verificação cruzada das Tabelas 1 e 2

Para verificar a consistência entre as Tabelas 1 e 2, pedimos ao Copilot:

- **Tabela 1** — Valor da renda, total de deduções, renda tributável, valor do imposto
- **Tabela 2** — Detalhes das deduções de seguridade social, seguro de vida, cônjuge, dependentes

Fizemos o Copilot ler ambas as abas e verificar "se o total dos detalhes da Tabela 2 coincide com o valor da dedução na Tabela 1". Se houver inconsistência, ele aponta na hora, sendo eficaz para descobrir erros de entrada precocemente.

Importante: no MoneyForward, a tela de imposto municipal não tem campo para dependentes menores de 16 anos. As informações de dependentes são gerenciadas em "Informações básicas → Família e dependentes", então é necessário verificar o registro nessa tela.

## Fase 8: Entrega da declaração

A entrega final foi feita pelo aplicativo de smartphone do MoneyForward Cloud Declaração de IR. Autenticação por leitura NFC do cartão My Number e envio dos dados da declaração. Não é necessário abrir o e-Tax separadamente — a entrega é concluída diretamente pelo MF Cloud.

Pontos de verificação após a entrega:

- Data e hora de recebimento registrados
- Número de protocolo emitido
- Mensagem "Os dados enviados foram recebidos" exibida

Fizemos o Copilot ler a tela de confirmação de entrega para verificar esses pontos.

### Tratamento de informações confidenciais

As telas de bancos e softwares contábeis naturalmente exibem informações pessoais. É necessário estar ciente de que essas informações ficam incluídas no histórico do chat do Copilot. No GitHub Copilot for Business, a política é não usar dados de autocompletar de código para treinamento, mas avalie de acordo com a política de segurança da sua organização.

## O que o humano fez

Olhando para trás, o que o humano fez foi surpreendentemente pouco:

1. **Decisões de política** — "Isso é despesa empresarial ou não", "rateio de 50%", "sem comprovante, não incluir na dedução"
2. **Consulta com o Copilot** — "Vamos fazer aquilo agora?", "verificamos aqui também?", "o que acha?"
3. **Aprovação final** — "Esse número está OK", "pode enviar"
4. **Operação física** — Leitura NFC do cartão My Number (apenas na entrega por smartphone)

Quase não foi necessário abrir telas específicas ou dar instruções detalhadas de operação. Bastou indicar a direção com "vamos fazer isso agora" e o Copilot avançou autonomamente com navegação, busca, entrada e verificação.

Isso foi possível graças aos arquivos Markdown. Como há regras de classificação no guia de políticas.md, o Copilot consegue avaliar se os lançamentos estão corretos, e como há notas de pesquisa no tarefas-declaracao.md, ele consegue rastrear a origem dos valores. O humano consegue só dizer "agora isso" porque os critérios de julgamento e registros de trabalho estão compartilhados em arquivos .md.

## Retrospectiva: O que fazer diferente na próxima vez

Com base na experiência desta vez, pontos de melhoria:

- **Fazer upload dos comprovantes de dedução no Cloud Box para facilitar** — Desta vez foram guardados apenas em papel, mas como o Copilot identificou valores pelos registros de entrada/saída, não houve problemas. Porém, com dados digitais o Copilot pode ler diretamente, tornando o processo ainda mais fluido
- **Para pagamentos à prefeitura, anotar o tipo de tributo** — Sem comprovante original, não é possível distinguir seguro saúde nacional, imposto municipal ou imposto sobre propriedade
- **Manter o guia de políticas atualizado** — Se o guia estiver preciso, a precisão do trabalho do Copilot também aumenta
- **Organizar melhor a estrutura dos arquivos .md** — Desta vez os arquivos foram crescendo durante o trabalho, mas definir previamente a divisão de responsabilidades e formatos dos arquivos melhoraria tanto a precisão de leitura do Copilot quanto a compreensão pelo humano

## Conclusão

O que ficou claro nesta declaração de IR é que a combinação de **"acumulação de dados" e "delegação do trabalho operacional à IA"** é extremamente poderosa.

A integração de dados do MoneyForward acumula automaticamente dados de transações de bancos, cartões e Suica ao longo do ano. Na época da declaração, avançamos juntos com o GitHub Copilot Agent Mode conversando "vamos fazer isso agora?" e "verificamos aqui também?". O humano apenas decide as políticas e dá a aprovação final, mas o processo não é delegação total — é uma conversa contínua.

O Copilot não serve apenas para escrever código. "Navegar por múltiplos serviços web, coletar dados, organizar, inserir e verificar" — todo esse trabalho de escritório pode ser resolvido juntos enquanto conversamos no chat. Agent Mode × Simple Browser são perfeitamente utilizáveis além da programação.
