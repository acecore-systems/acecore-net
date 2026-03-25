---
title: 'Guia de migração do Zoho Mail para KAGOYA MAIL — Registro prático de DNS, autenticação e inventário de dados'
description: 'Explicação prática dos procedimentos de migração do Zoho Workplace para o KAGOYA MAIL, incluindo configuração de DNS, autenticação SPF/DKIM e inventário completo de dados do Zoho Workplace.'
date: 2026-03-16
author: gui
tags: ['技術', 'メール', 'DNS', 'インフラ']
image: https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&h=400&fit=crop&q=80
processFigure:
  title: Fluxo completo da migração
  steps:
    - title: Preparação do KAGOYA
      description: Adição de domínio e criação de contas de e-mail.
      icon: i-lucide-server
    - title: Migração dos dados de e-mail
      description: Exportação do Zoho → Importação IMAP no KAGOYA.
      icon: i-lucide-hard-drive-download
    - title: Troca de DNS
      description: Alteração de MX, SPF e DKIM para KAGOYA.
      icon: i-lucide-globe
    - title: Teste de autenticação
      description: Confirmação de PASS do SPF e DKIM, e teste de envio/recebimento.
      icon: i-lucide-shield-check
    - title: Inventário de dados do Zoho
      description: Seleção e descarte dos dados restantes em todos os serviços do Workplace.
      icon: i-lucide-clipboard-check
    - title: Cancelamento do Zoho
      description: Cancelamento da assinatura.
      icon: i-lucide-log-out
callout:
  type: warning
  title: Cuidado na troca de DNS
  text: Após a alteração do registro MX, pode haver um período de algumas horas até 48 horas em que e-mails chegam ao servidor antigo. Se gerenciado pelo Cloudflare, reduzir o TTL para 2 minutos antes da troca minimiza o impacto.
compareTable:
  title: Comparação da configuração antes e depois da migração
  before:
    label: Zoho Workplace Standard
    items:
      - Zoho Mail (plano 30 GB)
      - WorkDrive / Cliq / Calendar etc. inclusos (não utilizados após migração para Nextcloud)
      - Mensal ¥1.440 (3 usuários, cobrança por usuário)
      - SPF é include:zoho.jp
      - DKIM é zmail._domainkey
  after:
    label: KAGOYA MAIL Bronze
    items:
      - KAGOYA MAIL (servidor virtual dedicado, IP dedicado)
      - Servidor exclusivo para e-mail, usuários ilimitados
      - Mensal ¥3.300 (pagamento anual ¥2.640)
      - SPF é include:kagoya.net
      - DKIM é kagoya._domainkey
checklist:
  title: Checklist de migração
  items:
    - text: Adicionar domínio e criar contas no KAGOYA
      checked: true
    - text: Exportar dados de e-mail do Zoho em ZIP
      checked: true
    - text: Importar via IMAP para o KAGOYA
      checked: true
    - text: Trocar registro MX no DNS do Cloudflare
      checked: true
    - text: Alterar registro SPF para kagoya.net
      checked: true
    - text: Alterar registro DKIM para kagoya._domainkey
      checked: true
    - text: Configurar política DMARC
      checked: true
    - text: Teste de envio/recebimento e confirmação de PASS SPF/DKIM
      checked: true
    - text: Inventário de dados de todos os serviços do Zoho Workplace
      checked: true
    - text: Cancelar assinatura do Zoho
      checked: true
faq:
  title: Dúvidas frequentes
  items:
    - question: Há um período sem recebimento de e-mails durante a migração?
      answer: Se o TTL do DNS estiver configurado com valor baixo, são apenas alguns minutos a algumas horas. No caso de gerenciamento pelo Cloudflare, configurar o TTL para 2 minutos antes da troca minimiza o impacto. Continue verificando o servidor antigo por alguns dias.
    - question: Como exportar os dados de e-mail do Zoho?
      answer: No painel de administração do Zoho Mail → Gerenciamento de dados → Exportação da caixa de correio, é possível exportar em formato ZIP por conta. Os arquivos incluídos estão no formato EML.
    - question: O que acontece se não configurar tanto SPF quanto DKIM?
      answer: A probabilidade de o servidor de recebimento classificar como spam aumenta. O Gmail em particular é rigoroso, e os casos em que é necessário PASS tanto em SPF quanto DKIM estão aumentando.
    - question: O que acontece com os dados ao cancelar o Zoho Workplace?
      answer: Quando o plano pago expira, há migração para o plano gratuito. O plano gratuito também tem limite de armazenamento, então é recomendável exportar os dados necessários antecipadamente. Se a conta for deletada, todos os dados são perdidos.
---

Quer migrar do Zoho Workplace para outro serviço de e-mail, mas está preocupado com a configuração de DNS e autenticação de e-mail? Este é um guia prático de migração para você. Neste artigo, usando a migração do Zoho Mail para o KAGOYA MAIL como exemplo, explicamos os procedimentos de troca de DNS, autenticação SPF/DKIM e inventário de dados do serviço antigo.

## Você se identifica com esse cenário?

O Zoho Workplace é uma suíte de groupware que inclui Mail, WorkDrive, Cliq, Calendar e muitos outros serviços. Porém, você não está na seguinte situação?

- Usando apenas a função de e-mail, mas pagando pela suíte completa
- O armazenamento de arquivos já foi migrado para outro serviço (Nextcloud, Google Drive etc.)
- A cobrança por usuário é um peso cada vez que o time cresce

Nesses casos, migrar para um serviço dedicado de e-mail é uma opção válida.

## Por que KAGOYA MAIL

KAGOYA MAIL é um serviço de e-mail dedicado para empresas. Pontos a considerar na escolha:

- **Servidor virtual dedicado e IP dedicado exclusivo para e-mail** — Não compartilha com servidores web como WordPress, garantindo alta taxa de entrega e estabilidade
- **Preço fixo com usuários ilimitados** — Diferente da cobrança por usuário do Zoho, permite adicionar contas sem preocupação
- **Servidores no Japão** com amplo histórico de uso empresarial, suporte padrão a SPF/DKIM/DMARC
- Suporte a IMAP/SMTP, permitindo usar clientes de e-mail existentes

O plano Bronze custa ¥3.300/mês (¥2.640 no pagamento anual). Comparado ao Zoho Workplace Standard (¥1.440/mês para 3 usuários), o custo simples é maior, mas considerando ambiente dedicado para e-mail, IP dedicado e usuários ilimitados, vale considerar como investimento na confiabilidade do e-mail.

## PASSO 1: Preparação do servidor de destino

No painel de controle do KAGOYA, adicione o domínio personalizado e crie as contas de e-mail.

1. **Configuração de domínio → Adicionar domínio personalizado** para registrar o domínio
2. Configuração padrão de entrega: "tratar como erro" (processamento para endereços inexistentes)
3. Criar as contas de e-mail necessárias

## PASSO 2: Exportação dos dados de e-mail do Zoho

No painel de administração do Zoho Mail, exporte os dados de e-mail por conta.

1. Acesse **Painel de administração → Gerenciamento de dados → Exportação da caixa de correio**
2. Selecione a conta alvo e inicie a exportação
3. Faça o download quando o arquivo ZIP for gerado

O ZIP contém arquivos de e-mail no formato EML. Dependendo do número de contas e volume de e-mails, pode levar dezenas de minutos, então execute com tempo de sobra.

## PASSO 3: Importação IMAP

Importe os arquivos EML exportados no servidor IMAP de destino. Como fazer manualmente seria trabalhoso, recomendamos automatizar com um script Python.

```python
import imaplib
import email
import glob

# Conexão IMAP com KAGOYA
imap = imaplib.IMAP4_SSL("nome-do-servidor", 993)
imap.login("nome-da-conta", "senha")
imap.select("INBOX")

# Upload em lote dos arquivos EML
for eml_path in glob.glob("export/**/*.eml", recursive=True):
    with open(eml_path, "rb") as f:
        msg = f.read()
    imap.append("INBOX", None, None, msg)

imap.logout()
```

## PASSO 4: Troca de DNS

Para redirecionar a entrega de e-mails, altere os registros DNS. Aqui usamos Cloudflare como exemplo, mas o conteúdo a ser configurado é o mesmo em outros serviços de DNS.

### Registro MX

Delete os registros MX do Zoho (`mx.zoho.jp` / `mx2.zoho.jp` / `mx3.zoho.jp`) e registre o servidor de e-mail de destino. Para KAGOYA MAIL:

| Tipo | Nome | Valor | Prioridade |
| --- | --- | --- | --- |
| MX | (seu domínio) | dmail.kagoya.net | 10 |

### Registro SPF

```
v=spf1 include:kagoya.net ~all
```

Altere o antigo `include:zoho.jp` para `include:kagoya.net`.

### Registro DKIM

Obtenha a chave pública em **Configuração DKIM** no painel de controle do KAGOYA e registre como registro TXT.

| Tipo | Nome | Valor |
| --- | --- | --- |
| TXT | kagoya.\_domainkey.(seu domínio) | v=DKIM1;k=rsa;p=(chave pública) |

Delete o antigo `zmail._domainkey` (do Zoho).

### Registro DMARC

```
v=DMARC1; p=quarantine; rua=mailto:(endereço para relatórios)
```

Elevar a política de `none` para `quarantine` fortalece a proteção contra spoofing.

## PASSO 5: Teste de envio e recebimento

Após a troca de DNS, confirme obrigatoriamente os seguintes 4 pontos:

1. **Recebimento de e-mails externos** — Envie um e-mail do Gmail etc.
2. **Envio para e-mails externos** — Envie do KAGOYA para Gmail etc.
3. **SPF PASS** — Confirme `spf=pass` no cabeçalho do e-mail recebido
4. **DKIM PASS** — Confirme `dkim=pass` no cabeçalho do e-mail recebido

A verificação do cabeçalho de e-mail pode ser automatizada com Python. Especialmente a confirmação de PASS do SPF/DKIM é fácil de errar na verificação visual, então extrair com script é mais confiável.

```python
import imaplib
import email

imap = imaplib.IMAP4_SSL("nome-do-servidor", 993)
imap.login("nome-da-conta", "senha")
imap.select("INBOX")
_, data = imap.search(None, "ALL")

for num in data[0].split()[-3:]:  # 3 mais recentes
    _, msg_data = imap.fetch(num, "(RFC822)")
    msg = email.message_from_bytes(msg_data[0][1])
    auth = msg.get("Authentication-Results", "")
    print(f"Subject: {msg['Subject']}")
    print(f"Auth: {auth[:200]}")
    print()

imap.logout()
```

## PASSO 6: Inventário de dados do serviço antigo

O Zoho Workplace inclui muitos serviços além do e-mail: WorkDrive, Cliq, Calendar, Contacts etc. Antes do cancelamento, verifique se há dados restantes em cada serviço.

### Serviços a verificar e critérios de decisão

| Serviço | Ponto de verificação |
| --- | --- |
| Zoho Mail | Os dados foram importados no destino? |
| Zoho WorkDrive | O uso de armazenamento está em 0? Verificar inclusive a lixeira |
| Zoho Contacts | Quantidade de contatos. Exportar em CSV/VCF se necessário |
| Zoho Calendar | Existência de compromissos ou lembretes |
| Zoho Cliq | Necessidade de manter histórico de chat |
| Outros (Notebook, Writer, Sheet etc.) | Existência de documentos criados |

### Armadilha do WorkDrive: a lixeira consome armazenamento

Um ponto fácil de passar despercebido é a lixeira do WorkDrive. Por exemplo, no nosso caso, o painel de administração mostrava uso de armazenamento de ~45 GB, mas ao abrir as pastas, aparecia "não há itens".

A causa era que **todos os dados permaneciam na lixeira da pasta da equipe**. Os dados deletados durante a migração anterior para o Nextcloud continuavam na lixeira.

O indicador de armazenamento do painel inclui dados da lixeira. "Espaço ocupado ≠ dados que precisam ser salvos", então verifique o conteúdo da lixeira antes de decidir.

## PASSO 7: Cancelamento da assinatura do Zoho

Após completar o inventário de dados e confirmar que não há problemas de envio/recebimento no destino, prossiga com o cancelamento.

1. Abra **Painel de administração do Zoho Mail → Gerenciamento de assinatura → Visão geral**
2. Acesse a Zoho Store pelo link **Gerenciamento de assinatura**
3. Clique em **Alterar plano**
4. Clique em **Cancelar assinatura** no final da página
5. Selecione o motivo e confirme **Migrar para plano gratuito**

Se estiver marcado "downgrade automático ao final do período de faturamento atual", as funcionalidades do plano pago ficam disponíveis até o final do período e depois migram automaticamente para o plano gratuito. Como precaução para possível reversão, recomendamos manter o plano gratuito por um período de observação em vez de deletar imediatamente.

## Conclusão

1. **Reduzir o TTL do DNS antecipadamente** minimiza o impacto durante a troca
2. **SPF e DKIM são obrigatórios**. Apenas um deles não é suficiente — há risco de classificação como spam no Gmail etc.
3. **Atenção ao "visível mas desnecessário" no inventário de dados do serviço antigo**. Lixeira e histórico de versões podem estar consumindo armazenamento
4. **Salvar recibos e faturas antes do cancelamento**. Após deletar a conta, não é mais possível obtê-los
5. **Decidir pelo "o que deve ser separado", não pelo "mais barato"**. O e-mail é a linha vital dos negócios, e investir em um ambiente dedicado tem valor

A migração de serviço de e-mail é um trabalho com barreira psicológica alta por envolver DNS e autenticação de e-mail. Porém, o que precisa ser feito é configurar corretamente apenas 4 tipos de registros: MX, SPF, DKIM e DMARC. Use os procedimentos deste artigo como referência e avance verificando cada etapa.
