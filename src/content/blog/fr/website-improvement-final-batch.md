---
title: "Guide d'amélioration de la qualité d'un site Astro, suite - Ajustements finaux pour atteindre 100 sur tous les critères de PageSpeed Insights"
description: "Compte rendu des derniers ajustements effectués après l'article précédent : désactivation de Cloudflare Web Analytics, chargement différé de GA4 et de l'interface de recherche, obtention de 100 sur les quatre critères de PageSpeed Insights en mobile et en desktop, nettoyage des breadcrumbs et des règles d'indexation dans Search Console, migration vers des icônes SVG partagées et explication des optimisations supplémentaires testées mais non retenues."
date: 2026-03-29T02:30
author: gui
tags:
  ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: /uploads/acecore-generated/performance-seo-dashboard.webp
callout:
  type: tip
  title: "Suite de l'article précédent"
  text: "Dans le prolongement du précédent Guide d'amélioration de la qualité d'un site Astro, cet article documente les derniers ajustements qui ont permis d'atteindre 100 sur tous les critères de PageSpeed Insights. Il couvre aussi le chargement différé de GA4 et de la recherche, le nettoyage Search Console, l'interprétation des diagnostics restants et les optimisations supplémentaires finalement écartées."
insightGrid:
  eyebrow: Pourquoi c'est important
  title: Pourquoi 100 sur tous les critères PageSpeed reste un niveau élevé
  description: 100 ne signifie pas que tout est parfait sur le site réel, mais cela montre qu'il ne reste pas de manque majeur dans les audits principaux observés par Lighthouse.
  variant: card
  items:
    - title: Testé en slow 4G
      description: La mesure mobile est réalisée en slow 4G avec ralentissement CPU. Même un site statique léger ne monte pas facilement à 100.
      icon: i-lucide-gauge
      tone: brand
    - title: Plein score sur 4 catégories
      description: Il ne suffit pas d'optimiser Performance. Accessibility, Best Practices et SEO doivent eux aussi atteindre le maximum en même temps.
      icon: i-lucide-shield-check
      tone: emerald
    - title: Les éléments tiers ont dû être triés
      description: Il faut réduire les beacons externes et les dépendances inutiles, tout en conservant les éléments vraiment nécessaires comme GA4 et les publicités.
      icon: i-lucide-sparkles
      tone: amber
    - title: Les diagnostics doivent être interprétés
      description: L'objectif n'est pas de faire disparaître tous les insights, mais de juger si les diagnostics restants sont acceptables.
      icon: i-lucide-search
      tone: slate
processFigure:
  title: Étapes des derniers ajustements
  steps:
    - title: Mesurer
      description: Vérifier à la fois PageSpeed Insights et Search Console afin de distinguer les vrais problèmes des simples informations de diagnostic.
      icon: i-lucide-gauge
    - title: Réorganiser
      description: Réévaluer le rôle de Cloudflare Web Analytics et décider ce qui doit rester parmi GA4, les publicités et la recherche.
      icon: i-lucide-shield-check
    - title: Différer
      description: Sortir GA4 et la recherche basée sur Pagefind du chargement initial et les reporter au moment où ils sont réellement nécessaires.
      icon: i-lucide-timer-reset
    - title: Corriger
      description: Aligner breadcrumbs, canonical, règles noindex, sitemap et rendu des icônes.
      icon: i-lucide-wrench
    - title: Décider
      description: Comparer plus de découpage CSS et plus de réduction des tiers, puis écarter les options dont le gain ne compense pas le coût.
      icon: i-lucide-scale-3d
compareTable:
  title: Ce que les derniers ajustements ont changé
  before:
    label: Avant
    items:
      - Le score mobile était déjà élevé, mais le beacon de Cloudflare Web Analytics était encore présent
      - GA4 et l'interface de recherche restaient trop proches du chargement initial, si bien que la frontière entre fonctions nécessaires et moment de chargement était floue
      - Le sens des diagnostics restants de PageSpeed restait flou, sans vrai critère pour savoir quand s'arrêter
      - Certains articles pouvaient afficher des cercles vides à cause de classes d'icônes UnoCSS restées en place
      - Search Console montrait encore des breadcrumbs invalides et du bruit d'indexation sur des pages de listing
  after:
    label: Après
    items:
      - Les quatre critères sont à 100 en mobile comme en desktop
      - Cloudflare Web Analytics a été désactivé, tandis que GA4 a été conservé avec chargement différé
      - La recherche et Pagefind sont passés à un chargement à la demande, ce qui a allégé le chargement initial
      - Le rendu a été unifié sur le SVG partagé Icon, et les anciens noms d'icônes sont absorbés par des aliases
      - Breadcrumb, noindex, sitemap et canonical ont été alignés pour Search Console
      - Les optimisations supplémentaires à faible rendement ont été écartées, et le bon point d'arrêt est désormais clair
checklist:
  title: Points traités
  items:
    - text: Cloudflare Web Analytics a été désactivé et l'injection du beacon a été arrêtée
      checked: true
    - text: GA4 a été conservé, mais déplacé vers un chargement différé via requestIdleCallback et interaction utilisateur
      checked: true
    - text: L'interface de recherche et les ressources de Pagefind ont été retirées du chemin de chargement initial
      checked: true
    - text: Les 100 sur tous les critères PageSpeed Insights ont été confirmés en mobile et en desktop
      checked: true
    - text: L'arbre des dépendances réseau a été interprété et BaseLayout.css a été identifié comme le seul goulot majeur restant
      checked: true
    - text: Les erreurs de breadcrumbs dans Search Console ont été corrigées et l'alignement breadcrumb, canonical et trailing slash a été revu
      checked: true
    - text: La stratégie d'indexation des pages tag, archive, auteur et pagination a été clarifiée avec noindex et exclusion du sitemap
      checked: true
    - text: Les classes d'icônes dynamiques de ProcessFigure et StatBar ont été migrées vers le composant partagé Icon
      checked: true
    - text: Une compatibilité par alias a été ajoutée pour l'ancien nom check-circle
      checked: true
    - text: Des découpages CSS supplémentaires et des réductions plus poussées des tiers ont été comparés, puis écartés car la complexité dépassait le gain
      checked: true
linkCards:
  - href: /blog/website-improvement-batches/
    title: "Article précédent : vue d'ensemble des améliorations"
    description: Commencez par l'article hub précédent pour comprendre l'ensemble des plus de 150 améliorations.
    icon: i-lucide-book-open
  - href: /blog/astro-performance-tuning/
    title: Article sur l'optimisation des performances
    description: Détaille la stratégie de diffusion CSS, les polices, les images et l'optimisation des scripts tiers.
    icon: i-lucide-gauge
  - href: /blog/astro-accessibility-guide/
    title: Article sur l'accessibilité
    description: Rassemble les mesures concrètes utilisées pour atteindre la conformité WCAG AA et Accessibility 100.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: Article sur l'UX et la qualité du code
    description: Résume les améliorations de qualité autour de View Transitions, de la recherche et de la sûreté de type.
    icon: i-lucide-sparkles
faq:
  title: Questions fréquentes
  items:
    - question: Si un site obtient 100 sur PageSpeed Insights, peut-on dire que c'est le site le plus rapide possible ?
      answer: 'Pas au sens absolu. PageSpeed Insights est une mesure de laboratoire fondée sur Lighthouse et ne reproduit pas complètement les réseaux réels des utilisateurs, leurs appareils ni la congestion côté serveur. Malgré cela, 100 signifie que le site se trouve dans un état de très haute qualité, avec très peu de manques dans les audits principaux de Lighthouse.'
    - question: Pourquoi l'arbre des dépendances réseau ou le CSS render-blocking peuvent-ils encore apparaître malgré un score de 100 ?
      answer: 'Ces éléments ne correspondent pas toujours à des audits en échec. Ils peuvent aussi apparaître comme informations de diagnostic. Dans ce cas, seul BaseLayout.css reste sur le chemin critique, mais le 100 mobile est toujours maintenu, donc le compromis coût-bénéfice reste acceptable.'
    - question: Pourquoi avoir désactivé Cloudflare Web Analytics ?
      answer: "GA4 couvrait déjà suffisamment la mesure des événements comme les CTA, la recherche et les prises de contact, tandis que la partie Cloudflare était surtout devenue un outil d'observation des performances. Cette fois, l'effet du beacon sur PageSpeed a aussi été pris en compte, d'où la réorganisation autour de GA4."
    - question: Qu'est-ce qui a été ajusté exactement pour Search Console ?
      answer: "La sortie de BreadcrumbList a été revue pour que les pages de listing publient des éléments explicites avec des item valides. En parallèle, les trailing slash, canonical, règles noindex et sitemap ont été alignés pour que les pages de tags, archives, auteurs et pagination aient un rôle d'indexation plus clair."
    - question: Y a-t-il eu des optimisations testées mais non retenues ?
      answer: "Oui. J'ai comparé, entre autres, un découpage plus fin de BaseLayout.css, des ajustements visant uniquement à faire disparaître l'affichage du network dependency tree, et même une réduction plus poussée des tiers jusqu'à GA4. Avec un mobile déjà stable à 100, ces variantes auraient apporté plus de complexité ou de perte de mesure que de bénéfice réel, elles ont donc été écartées."
---

## Introduction

Dans le précédent [Guide d'amélioration de la qualité d'un site Astro](/blog/website-improvement-batches/), j'ai résumé l'ensemble des améliorations majeures apportées au site Acecore après sa refonte. Cet article en est la suite directe.

Cet article clôt les derniers points restés ouverts après la publication du précédent billet et amène le site à un état où **les quatre critères de PageSpeed Insights sont à 100 sur mobile comme sur desktop**. Il ne s'est pas agi uniquement d'un travail sur le score : GA4 et la recherche ont aussi été sortis du chargement initial, les breadcrumbs et règles d'indexation de Search Console ont été remis en ordre, le rendu des icônes a été stabilisé et la limite au-delà de laquelle l'optimisation ne valait plus la peine a été explicitée.

## Résultat : 100 sur tous les critères de PageSpeed Insights

Au 29 mars 2026, la page d'accueil d'Acecore affichait les résultats suivants.

| Surface | Performance | Accessibility | Best Practices | SEO     |
| ------- | ----------- | ------------- | -------------- | ------- |
| Mobile  | **100**     | **100**       | **100**        | **100** |
| Desktop | **100**     | **100**       | **100**        | **100** |

Vous trouverez ci-dessous les captures réelles de PageSpeed Insights ainsi que les URLs des rapports. Lors de la phase précédente, je considérais que « mobile 99 / tout le reste 100 » constituait le plafond réaliste. Cette fois, en retirant les beacons tiers inutiles et en relisant soigneusement la signification des diagnostics restants, il a été possible d'atteindre 100.

### URLs des rapports

Pour conserver ensemble les captures et une preuve qu'il est possible de rouvrir ensuite, je laisse ici aussi les URLs directes des rapports utilisés pour cette mesure.

- [Rapport mobile](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile)
- [Rapport desktop](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop)

<figure class="not-prose my-8">
  <figcaption class="text-base font-700 text-slate-800 mb-3">Captures mesurées</figcaption>
  <p class="text-sm text-slate-500 mb-4">Cliquez sur chaque image pour ouvrir directement le rapport PageSpeed Insights correspondant.</p>
  <div class="grid gap-4 md:grid-cols-2">
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-mobile-summary-20260329.webp" alt="Résultat mobile PageSpeed Insights de la page d'accueil Acecore au 29 mars 2026. Performance, Accessibility, Best Practices et SEO sont tous à 100." class="w-full rounded-lg border border-slate-200" width="1160" height="340" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">Mobile</span>
    </a>
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-desktop-summary-20260329.webp" alt="Résultat desktop PageSpeed Insights de la page d'accueil Acecore au 29 mars 2026. Performance, Accessibility, Best Practices et SEO sont tous à 100." class="w-full rounded-lg border border-slate-200" width="1190" height="270" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">Desktop</span>
    </a>
  </div>
</figure>

## À quel point un 100 est-il remarquable ?

Quand on entend « 100 », on peut penser que la performance montera toujours si l'on retire encore des fonctionnalités, si l'on simplifie l'interface et si l'on coupe davantage d'éléments externes. Ce n'est pas totalement faux : un site statique devient souvent plus rapide à mesure qu'on enlève des choses.

Mais ici, l'objectif n'était pas de fabriquer une page de démonstration vidée de tout. Il fallait conserver GA4, les publicités, la recherche, ClientRouter et le CSS partagé, tout en alignant mobile et desktop à 100 sur les quatre critères. Le travail n'a donc pas consisté uniquement à alléger la page, mais à décider ce qui devait rester, ce qui pouvait partir et ce qu'il ne valait plus la peine de toucher.

Bien entendu, 100 ne signifie pas qu'il s'agit dans l'absolu du site le plus rapide au monde réel. L'expérience des utilisateurs dépend du réseau, des appareils, de la région et de l'état du cache. Malgré cela, on peut dire que le site a atteint un niveau très élevé au sens où **les audits principaux de Lighthouse ne montrent plus de manque majeur alors que les éléments d'exploitation nécessaires sont toujours là**.

## Les derniers ajustements avant les 100

### 1. Désactivation de Cloudflare Web Analytics et réorganisation du rôle de la mesure

Cloudflare Web Analytics reste utile comme solution RUM légère et privacy-first, mais côté Acecore, GA4 était déjà largement instrumenté pour les clics sur CTA, la recherche, les prises de contact, la génération de leads et d'autres événements.

Après avoir réévalué les rôles respectifs, j'ai conclu que, côté Cloudflare, le coût de l'injection d'un beacon inutile dans PageSpeed dépassait désormais sa valeur. J'ai donc désactivé le RUM dans le tableau de bord et confirmé que `static.cloudflareinsights.com/beacon.min.js` n'apparaissait plus dans le HTML de production.

Cela ne voulait cependant pas dire qu'il fallait abandonner la mesure. Les clics sur CTA, les liens externes, la recherche et les conversions de contact devaient rester mesurables. L'étape suivante a donc consisté à garder GA4, tout en changeant le moment où il se charge.

### 2. Conserver GA4, mais le sortir du chargement initial

La distinction importante ici ne portait pas seulement sur le fait de garder ou non GA4, mais sur la question de savoir s'il devait faire partie du tout premier chemin de chargement.

Concrètement, le point d'entrée `gtag` reste disponible immédiatement afin que les événements puissent être reçus, mais le script réel `gtag/js` est repoussé vers `requestIdleCallback` et l'interaction utilisateur. Des délais de secours différents selon les pages sont aussi conservés afin que l'analytics finisse malgré tout par se charger même sans interaction immédiate.

Cela a permis de conserver la mesure des CTA, des liens externes, de la recherche et du contact, sans imposer l'exécution d'un script tiers dans la toute première phase de rendu. Les 100 points ne viennent donc pas seulement de la suppression du beacon Cloudflare, mais aussi d'un chargement plus intelligent de GA4.

### 3. Passage de la recherche et de Pagefind au chargement à la demande

La recherche est une autre fonctionnalité qui peut alourdir silencieusement le chargement initial, même si l'utilisateur ne l'ouvre pas tout de suite. Acecore utilise Pagefind pour la recherche plein texte, et j'ai appliqué ici la même logique : conserver la fonctionnalité, mais ne plus payer son coût d'avance.

La modale de recherche ne charge désormais `pagefind-ui.js` et son CSS qu'au moment où la recherche est réellement ouverte. La promesse est mise en cache pour éviter tout double chargement, et les raccourcis clavier ou l'ouverture via query string continuent de fonctionner normalement.

Cela ne profite pas seulement au score Lighthouse. Le premier rendu courant du site devient lui aussi plus léger. La recherche reste disponible, mais n'a plus besoin d'occuper le chemin critique de chaque affichage de page.

### 4. Interprétation des diagnostics PageSpeed restants

Même une fois le score monté à 100, PageSpeed peut encore afficher des diagnostics comme `Network dependency tree` ou `render-blocking resources`. Si on les lit comme des alertes qui doivent absolument disparaître, on finit vite par poursuivre des optimisations de faible valeur.

La chaîne critique était ici approximativement la suivante :

1. `/en/`
2. `ClientRouter.js`
3. `BaseLayout.css`
4. `BaseLayout.js`

Parmi ces éléments, le seul qui restait réellement render-blocking était `BaseLayout.css`. Toutefois, sa taille est déjà suffisamment réduite et le 100 mobile reste stable ; je l'ai donc classé comme un « diagnostic résiduel acceptable ». Le fait d'avoir formulé clairement ce jugement constitue à lui seul un gain important, car cela donne une règle d'arrêt explicite pour les optimisations futures.

### 5. Nettoyage des breadcrumbs Search Console et des règles d'indexation

Une fois PageSpeed stabilisé à 100, j'ai réexaminé le site sous l'angle de la recherche. C'est là qu'il restait encore une incohérence réelle : Search Console affichait toujours des breadcrumbs invalides, alors même que le balisage FAQ était déjà correct.

Pour corriger cela, la sortie `BreadcrumbList` des pages de listing a été revue afin d'accepter des éléments explicites au lieu de dépendre d'une déduction trop lâche depuis l'URL. En parallèle, la gestion des trailing slash a été alignée pour que canonical, hreflang et breadcrumbs ne divergent plus.

Le rôle d'indexation des pages de tags, d'archives, d'auteurs et de pagination a également été clarifié. Ces pages sont utiles pour la navigation, mais elles deviennent facilement des cibles d'indexation minces ou redondantes. C'est pourquoi elles ont été alignées avec `noindex, follow` et exclues du sitemap. Cela ne supprime pas instantanément chaque rapport « explorée - actuellement non indexée », mais cela signifie que la politique d'indexation souhaitée est désormais exprimée directement dans le code.

### 6. Uniformisation du rendu des icônes via un composant SVG partagé

Dans les derniers ajustements, le projet était déjà en train de migrer des utilities d'icônes UnoCSS vers le composant `Icon`, basé sur un SVG partagé. Dans cette transition, certaines classes d'icônes dynamiques restées dans `ProcessFigure` et `StatBar` n'avaient pas été supprimées, ce qui faisait apparaître des cercles vides dans certains articles.

J'ai uniformisé le rendu côté composant via `Icon` et ajouté un alias afin d'absorber l'ancien nom `check-circle` vers `circle-check`.

Trois bénéfices pratiques en sont sortis :

- Il devient beaucoup plus difficile qu'une icône disparaisse à cause d'une classe dynamique oubliée
- Les attributs d'accessibilité comme `aria-hidden` peuvent être standardisés côté SVG
- L'exploitation devient plus stable parce que le rendu ne dépend plus de l'analyse statique de UnoCSS

En parallèle, l'analyse et l'affichage des dates du blog ont aussi été alignés sur le fuseau JST. Ce n'est pas le sujet central de cet article, mais cela stabilise l'ordre des publications du même jour et améliore la précision temporelle des données structurées.

### 7. Ce qui a été testé mais non retenu

Une fois le score à 100, la tentation naturelle est de continuer à poursuivre chaque diagnostic restant jusqu'à ce qu'il ne reste plus rien à l'écran. J'ai comparé plusieurs options dans ce sens, mais je n'ai pas retenu les suivantes.

- Découper encore davantage `BaseLayout.css` : cela aurait pu rendre les diagnostics un peu plus propres en apparence, mais le 100 mobile est déjà stable et le gain concret ne justifiait pas la complexité supplémentaire.
- Prendre pour objectif la disparition de la seule présence du `network dependency tree` : le fait qu'un diagnostic s'affiche n'est pas automatiquement synonyme de problème réel côté utilisateur.
- Réduire encore les tiers jusqu'à toucher à GA4 : la page deviendrait peut-être un peu plus légère, mais au prix d'une perte de mesure métier importante.

Cette comparaison a compté. Les derniers ajustements n'ont pas été considérés comme terminés parce que tout avait été retiré, mais parce que les compromis restants pouvaient enfin être expliqués clairement.

## Enseignements pratiques tirés des derniers ajustements

Le principal gain cette fois n'a pas été simplement d'obtenir 100. Il a été d'arriver à un état où **je peux expliquer ce qu'il faut retirer et ce qu'il est raisonnable de laisser en place**.

Par exemple, Cloudflare Web Analytics mérite d'être supprimé s'il n'est plus là que par inertie, tandis que GA4 doit rester parce qu'il constitue le cœur de la mesure des événements métier. Mais si GA4 reste, cela ne signifie pas qu'il doit rester dans le chargement initial. Le meilleur choix consiste à conserver la mesure tout en déplaçant le moment où le script arrive.

La même logique vaut pour la recherche et le SEO. La recherche doit rester, mais elle n'a pas besoin d'être embarquée dans le payload initial. Les pages de listing restent utiles pour naviguer, mais elles n'ont pas à devenir des cibles d'indexation principales. Et `network dependency tree` n'est pas un échec en soi ; il faut regarder son contenu et décider si la chaîne restante reste cohérente.

J'ai aussi utilisé l'IA pour élargir l'éventail des changements possibles, mais les critères finaux sont restés trois questions très concrètes : les mesures s'améliorent-elles réellement, le coût d'exploitation reste-t-il raisonnable, et les capacités de mesure nécessaires demeurent-elles intactes ? L'IA a aidé à ouvrir les options ; la décision finale a continué de dépendre de la mesure et du jugement.

Lorsqu'on optimise uniquement pour le score, on dépasse vite la bonne limite. Cette fois, j'ai pu structurer non seulement les corrections, mais aussi la ligne à partir de laquelle il devient pertinent de s'arrêter. On peut donc dire que les améliorations du site Acecore ont, pour l'instant, atteint un état complet.

## Résumé

Dans la continuité de l'article précédent, les derniers ajustements ont permis de finaliser les points suivants :

- Confirmation des 100 sur tous les critères PageSpeed Insights en mobile et en desktop
- Désactivation de Cloudflare Web Analytics tout en conservant GA4 avec chargement différé
- Passage de la recherche et de Pagefind au chargement à la demande afin d'alléger le chargement initial
- Interprétation des diagnostics réseau restants et clarification des résidus acceptables
- Nettoyage de la sortie des breadcrumbs Search Console et des règles d'indexation des pages de listing
- Suppression des problèmes d'affichage des icônes grâce à l'unification sur le SVG partagé `Icon`
- Abandon d'optimisations supplémentaires à faible rendement et clarification du bon point d'arrêt

Au moins du point de vue de Lighthouse et de PageSpeed Insights, le site Acecore a été poussé jusqu'à un niveau où il peut légitimement viser le très haut de gamme en matière de vitesse. En même temps, le score n'est pas le but, seulement le résultat. À partir de maintenant, je continuerai à maintenir à la fois l'exploitation et les améliorations afin que cet état ne régresse pas.
