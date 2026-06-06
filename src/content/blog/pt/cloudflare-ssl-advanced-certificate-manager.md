---
title: 'O que era a antiga opção SSL paga da Cloudflare — de Dedicated SSL para Advanced Certificate Manager'
description: 'A opção anteriormente paga da Cloudflare, "Dedicated SSL Certificates", foi renomeada e ampliada em 2021 como "Advanced Certificate Manager (ACM)". Veja as diferenças para o Universal SSL gratuito e quando o ACM é necessário.'
date: 2026-03-31T00:00
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ', 'インフラ']
image: /uploads/acecore-generated/security-operations.webp
compareTable:
  title: Universal SSL vs Advanced Certificate Manager
  before:
    label: Universal SSL (Gratuito)
    items:
      - Cobre apenas o domínio raiz + subdomínios de 1º nível
      - Não permite escolher CA, validade ou suíte de criptografia
      - '*.example.com funciona, mas dev.staging.example.com fica fora'
      - A marca Cloudflare pode aparecer no CN do certificado
  after:
    label: Advanced Certificate Manager (Pago, US$ 10/mês/zona)
    items:
      - Suporte a subdomínios multinível, até 50 hostnames
      - Permite escolher CA (Let's Encrypt / Google Trust Services etc.)
      - Validade configurável de 14 a 365 dias
      - 'Seu próprio domínio vira o CN e a marca Cloudflare fica oculta'
callout:
  type: info
  title: Contexto da mudança de nome
  text: 'O antigo "Dedicated SSL Certificates" foi reformulado em 2021 como Advanced Certificate Manager (ACM). Não foi apenas troca de nome: houve grande expansão de recursos, como suporte a subdomínios multinível, escolha de CA e definição de validade.'
faq:
  title: Perguntas frequentes
  items:
    - question: Posso usar certificado wildcard (*.example.com) com Universal SSL?
      answer: Sim, mas ele cobre apenas subdomínios de 1º nível, como www.example.com. Não se aplica a subdomínios de 2º nível ou mais, como dev.staging.example.com, o que pode causar erro de certificado. Nesse caso, é necessário ACM.
    - question: Posso usar Advanced Certificate Manager no plano gratuito?
      answer: Sim. Mesmo no plano gratuito da Cloudflare, é possível usar ACM comprando o add-on ACM (US$ 10/mês/zona). Não é necessário migrar para plano superior.
    - question: Quando o Universal SSL é suficiente?
      answer: Para a maioria dos sites pessoais e de pequenas empresas, o Universal SSL é suficiente. Se você usa apenas domínio raiz e subdomínios de 1º nível como www, o ACM não é necessário.
    - question: O que acontece com o Universal SSL ao ativar o ACM?
      answer: Universal SSL e ACM podem coexistir. Para o mesmo subdomínio, o certificado ACM tem prioridade.
linkCards:
  - href: https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/
    title: Documentação do Advanced Certificate Manager
    description: Guia oficial da Cloudflare para configurar ACM
    icon: i-lucide-file-text
  - href: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
    title: Limitações do Universal SSL
    description: Documentação oficial dos casos não cobertos pelo Universal SSL
    icon: i-lucide-alert-circle
  - href: https://www.cloudflare.com/ja-jp/application-services/products/advanced-certificate-manager/
    title: Página do produto Advanced Certificate Manager
    description: Lista de recursos e forma de compra do ACM (em japonês)
    icon: i-lucide-shield-check
---

“Qual era mesmo aquela opção SSL paga da Cloudflare?” — muita gente já pensou nisso. Neste artigo, organizamos a resposta, o nome atual e os recursos disponíveis.

## Conclusão: “Dedicated SSL” → “Advanced Certificate Manager (ACM)”

A antiga opção SSL paga da Cloudflare era **Dedicated SSL Certificates**. Em **2021, ela foi reformulada e renomeada para “Advanced Certificate Manager (ACM)”**.

O preço continua o mesmo: **US$ 10 por mês por zona (domínio)**.

---

## Por que o nome mudou

Na era “Dedicated SSL”, a proposta era focada em emitir um certificado dedicado para aquele domínio. Enquanto o Universal SSL gratuito compartilhava certificado entre vários sites, o dedicado permitia ter um CN próprio.

Na transição para **Advanced Certificate Manager**, foram adicionados os recursos abaixo, e o nome passou a destacar o aspecto de “gerenciamento”.

- **Suporte a subdomínios multinível**: protege subdomínios de 2º nível ou mais, como `dev.staging.example.com`
- **Escolha de CA**: seleção entre Let's Encrypt, Google Trust Services e outros
- **Definição de validade**: configuração entre 14 e 365 dias
- **Até 50 hostnames**: um certificado pode cobrir vários hostnames
- **Total TLS**: proteção automática para todos os subdomínios com proxy na zona

---

## Diferenças em relação ao Universal SSL

A Cloudflare oferece **Universal SSL** gratuito, e para a maioria dos sites isso já é suficiente para HTTPS. Porém, existem algumas limitações.

### Casos que o Universal SSL não cobre

```
# Cobertos pelo Universal SSL
example.com
www.example.com
blog.example.com

# Fora da cobertura do Universal SSL (ACM necessário)
dev.staging.example.com
api.v2.example.com
deep.sub.domain.example.com
```

O wildcard `*.example.com` funciona, mas **apenas para subdomínios de 1º nível**. Padrões multinível como `*.staging.example.com` não são suportados.

### Presença da marca Cloudflare

No Universal SSL, o CN do certificado pode incluir um domínio da Cloudflare, como `sni.cloudflaressl.com`. Com ACM, o CN passa a ser seu próprio domínio e a marca Cloudflare fica oculta.

---

## Quando o ACM é necessário

Considere ACM se qualquer um dos pontos abaixo se aplicar:

1. **Você usa subdomínios multinível**  
   Precisa de SSL para subdomínios de 2º nível ou mais, como `api.staging.example.com` ou `dev.app.example.com`.

2. **Você quer seu domínio como CN do certificado**  
   Quer remover a marca Cloudflare do certificado (comum em sites corporativos e serviços B2B).

3. **Você quer definir CA ou validade**  
   Sua política de segurança exige uma CA específica, ou você quer certificados de curta duração (como 14 dias).

4. **Você quer proteger todos os subdomínios com Total TLS**  
   Quer proteção automática por certificado para todos os subdomínios com proxy na zona.

---

## Como comprar e ativar

Você pode ativar em poucos passos no painel da Cloudflare:

1. Abra o domínio alvo no painel da Cloudflare
2. Vá em **SSL/TLS** → **Edge Certificates**
3. Na seção **Advanced Certificate Manager**, clique em **Enable**
4. Confirme e compre a assinatura (US$ 10/mês)
5. Crie o certificado e adicione os hostnames que deseja proteger

Se quiser ativar o Total TLS, basta ligar para On na seção **Total TLS** da mesma página.

---

## Resumo

| Item                   | Universal SSL (Gratuito) | Advanced Certificate Manager (US$ 10/mês/zona) |
| ---------------------- | ------------------------ | ---------------------------------------------- |
| Subdomínios multinível | ✗                        | ✓                                              |
| Escolha de CA          | ✗                        | ✓                                              |
| Definição de validade  | ✗                        | ✓                                              |
| CN com domínio próprio | △                        | ✓                                              |
| Total TLS              | ✗                        | ✓                                              |
| Uso recomendado        | Sites pessoais / gerais  | Empresas / estruturas complexas de subdomínios |

A “antiga opção SSL paga” da Cloudflare é o **Advanced Certificate Manager (antigo Dedicated SSL Certificates)**. É uma escolha eficaz quando o Universal SSL gratuito não é suficiente — especialmente para proteger subdomínios multinível e ter controle mais fino do certificado.
