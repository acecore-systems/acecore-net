---
title: 'Rendre en sécurité les liens Markdown dans les réponses de chat IA'
description: 'Note technique sur la conversion sécurisée des liens Markdown dans les réponses IA. En séparant parsing tolérant aux espaces, trim de href, allowlist, rendu DOM, fallback et tests, le même modèle devient réutilisable.'
date: 2026-06-07T14:30
author: gui
tags: ['技術', 'Webサイト', 'AI', 'セキュリティ', 'Astro']
image: https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Point clé
  text: Les réponses IA ne sont pas du HTML fiable. Même avec des liens Markdown, il faut trimmer l URL, la valider avec une allowlist, et garder les liens refusés comme texte.
processFigure:
  title: Flux de rendu des liens
  steps:
    - title: Text
      description: Traiter la réponse du modèle comme du texte brut.
      icon: i-lucide-message-square-text
      accent: brand
    - title: Parse
      description: Détecter uniquement le Markdown réellement supporté par le chat.
      icon: i-lucide-brackets
      accent: amber
    - title: Validate
      description: Trimmer href et accepter seulement les URLs internes ou domaines approuvés.
      icon: i-lucide-shield-check
      accent: emerald
    - title: Render
      description: Créer des éléments sûrs avec DOM API, pas avec innerHTML.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Décisions à séparer
  before:
    label: Rendu trop permissif
    items:
      - Mettre les réponses IA directement dans innerHTML
      - Essayer de couvrir tout Markdown dès le départ
      - Ne pas créer de lien quand l URL contient des espaces
      - 'Traiter URLs externes et javascript: de la même façon'
  after:
    label: Rendu petit et sûr
    items:
      - Recevoir les réponses comme texte et convertir seulement le nécessaire en DOM
      - Supporter uniquement le sous-ensemble Markdown du chat
      - Valider les URLs après trim
      - Garder les URLs refusées comme texte
checklist:
  title: Checklist de mise en œuvre
  items:
    - text: Ne pas faire confiance aux réponses IA comme HTML
    - text: Accepter les espaces autour des URLs Markdown
    - text: Toujours trimmer href avant validation
    - text: Autoriser seulement chemins internes, origin courant et domaines nécessaires
    - text: Définir target et rel sur les liens externes
    - text: Conserver les liens refusés comme texte
    - text: Tester les URLs dangereuses et le Markdown cassé
linkCards:
  - href: /blog/astro-ai-contact-chat/
    title: Design technique du chat de contact IA
    description: Article de base sur réponses IA, frontière API et contrôle de prompt.
    icon: i-lucide-sparkles
  - href: /blog/cloudflare-pages-security/
    title: Sécurité Cloudflare Pages
    description: Article lié sur CSP et en-têtes de sécurité.
    icon: i-lucide-shield
  - href: /contact/
    title: Contact
    description: Page réelle où se trouvent le chat IA et le formulaire.
    icon: i-lucide-message-square
faq:
  title: Questions fréquentes
  items:
    - question: markdown-it ou marked suffit-il ?
      answer: Même avec une bibliothèque, il faut définir le traitement du HTML, les destinations de liens autorisées, target et rel, et le rejet des URLs dangereuses. Pour un chat, un petit renderer dédié peut suffire.
    - question: Autoriser les espaces autour de l URL est-il dangereux ?
      answer: Le risque ne vient pas des espaces, mais de ce qui est autorisé après trim. La validation du href normalisé garde la allowlist stricte.
    - question: Faut-il supprimer les URLs refusées ?
      answer: Les garder comme texte facilite souvent le debug et conserve le contexte. Une politique plus stricte peut aussi supprimer tout le lien.
---

Quand un chat IA répond `Voir [Services]( /services/ )`, le lien peut ne pas être rendu et le Markdown brut peut rester visible.

Acecore a rencontré ce cas dans son chat de contact, puis a ajusté le renderer dans [le PR de correction du rendu des liens Markdown](https://github.com/acecore-systems/acecore-net/pull/99).

Cet article part de cette petite correction pour expliquer comment convertir les réponses IA en DOM de manière sûre.

## Les réponses IA ne sont pas du HTML fiable

La sortie du modèle doit être traitée comme du texte.

Les liens, le gras et les listes sont utiles dans un chat. Mais placer la réponse dans `innerHTML` laisse le navigateur interpréter une chaîne produite par le modèle.

Il ne faut pas forcément implémenter tout Markdown. Il faut détecter les quelques expressions supportées et créer seulement des nœuds DOM sûrs.

## Le problème ne se limite pas aux espaces

Le bug direct était un lien comme :

```md
[Services](/services/)
```

Une regex stricte suppose souvent que l URL ne contient pas d espace :

```js
;/\[([^\]]+)\]\(([^)\s]+)\)/
```

`[^)\s]+` rejette les espaces, donc `( /services/ )` n est pas reconnu. La correction consiste à tolérer les espaces dans les parenthèses puis normaliser.

```js
;/\[([^\]]+)\]\(\s*([^)]+?)\s*\)/
```

Mais assouplir le parser ne suffit pas. La valeur normalisée doit ensuite être validée.

## Trimmer href avant validation

L ordre doit rester clair :

1. Extraire label et raw href
2. Appliquer `trim()` au raw href
3. Valider le href trimé avec une allowlist
4. Créer `<a>` seulement si le href est autorisé

```js
const href = String(rawHref || '').trim()

if (label && isSafeMarkdownHref(href)) {
  const link = document.createElement('a')
  link.href = href
  link.rel = 'noopener noreferrer'

  if (/^https?:\/\//i.test(href)) {
    link.target = '_blank'
  }

  link.textContent = label
  parent.appendChild(link)
}
```

La valeur validée doit être la même que celle rendue dans le DOM.

## La allowlist dépend du produit

Chaque site doit décider quelles URLs son IA peut afficher.

| Type            | Exemple                   | Décision                           |
| --------------- | ------------------------- | ---------------------------------- |
| Chemin interne  | `/services/`              | Autoriser                          |
| Même origin     | `https://acecore.net/...` | Autoriser                          |
| LINE officiel   | `https://lin.ee/...`      | Autoriser si le canal est officiel |
| mailto          | `mailto:info@acecore.net` | Adresse fixe uniquement            |
| tel             | `tel:05088902788`         | Numéro fixe uniquement             |
| Autres externes | Toute URL                 | Ne pas lier par défaut             |

```js
function isSafeMarkdownHref(href) {
  if (href.startsWith('/')) return true

  try {
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin) return true
    if (url.hostname === 'acecore.net') return true
    if (url.hostname === 'lin.ee') return true
  } catch {
    return false
  }

  return href === 'mailto:info@acecore.net' || href === 'tel:05088902788'
}
```

Un site de recrutement peut autoriser des plateformes emploi. Un SaaS peut autoriser documentation et page de statut. La fonction doit refléter le produit.

## Revenir au texte pour les liens refusés

Quand un lien échoue à la validation, le supprimer n est pas toujours le meilleur choix.

Dans un chat de contact, conserver le Markdown comme texte garde le contexte pour l utilisateur et aide les développeurs à voir ce que le modèle a tenté de produire.

Le renderer doit créer des liens sûrs et échouer de façon sûre.

## Tester les mauvais cas

Vérifie au minimum :

| Entrée                             | Résultat attendu                     |
| ---------------------------------- | ------------------------------------ |
| `[Services](/services/)`           | Lien interne                         |
| `[Services]( /services/ )`         | Lien interne après trim              |
| `[LINE]( https://lin.ee/example )` | Lien externe autorisé                |
| `[Mauvais](javascript:alert(1))`   | Pas de lien                          |
| `[Externe](https://example.com/)`  | Pas de lien si le domaine est refusé |
| `[Cassé](/services/`               | Affichage comme texte                |

Dans le PR #99, les variantes avec et sans espaces ont été vérifiées comme pointant vers la même URL attendue.

## Ne pas implémenter tout Markdown par défaut

Pour un chat, le sous-ensemble peut rester simple :

- Paragraphes
- Listes
- Gras
- Code inline
- Liens

Tables, images, HTML brut et notes de bas de page augmentent vite le périmètre. Même avec une bibliothèque, la politique HTML et URL reste à définir séparément.

## Résumé

Le rendu des liens Markdown dans une réponse IA ressemble à un détail d interface, mais il fixe la frontière de confiance envers la sortie du modèle.

La règle pratique : texte d abord, petit sous-ensemble, trim avant validation, allowlist stricte et fallback sûr.
