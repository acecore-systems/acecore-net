---
title: "J'ai confié ma déclaration fiscale entièrement à GitHub Copilot — De 837 écritures comptables à la soumission de la déclaration"
description: "Classification et vérification de 837 écritures comptables accumulées par synchronisation de données avec une comptabilité cloud, rapprochement des cotisations sociales, saisie des déductions, jusqu'à la soumission de la déclaration. Le récit complet d'une déclaration fiscale où GitHub Copilot Agent Mode × Simple Browser a assuré la quasi-totalité du travail."
date: 2026-03-17
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code']
image: https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop&q=80
processFigure:
  title: Flux global de la déclaration fiscale avec Copilot
  steps:
    - title: Synchronisation et accumulation des données
      description: Synchronisation automatique des banques, cartes et Suica via MF Cloud, accumulant 837 écritures comptables.
      icon: i-lucide-database
    - title: Classification et vérification des écritures
      description: Copilot compare le document de référence et le journal comptable, détectant et corrigeant 8 incohérences.
      icon: i-lucide-search
    - title: Saisie des déductions et de la déclaration
      description: Collecte des montants à travers plusieurs services et saisie dans le formulaire de déclaration.
      icon: i-lucide-file-text
    - title: Vérification et soumission
      description: Vérification croisée des formulaires principaux et soumission via MF Cloud.
      icon: i-lucide-check-circle
compareTable:
  title: Comparaison avant et après l'adoption de Copilot
  before:
    label: Déclaration fiscale traditionnelle
    items:
      - Jongler entre plusieurs services Web dans différents onglets du navigateur
      - Copier manuellement les montants dans une feuille de calcul
      - Vérifier un par un la classification des écritures comptables
      - Chercher les justificatifs de déduction dans des enveloppes papier
      - Détecter les erreurs de saisie par soi-même
  after:
    label: Copilot × Simple Browser
    items:
      - Pilotage centralisé de tous les services via Simple Browser dans VS Code
      - Copilot lit les pages et extrait/totalise automatiquement les montants
      - Détection mécanique des incohérences par comparaison entre document de référence et journal
      - Copilot recherche par mots-clés dans Cloud Box et les e-mails
      - Copilot effectue la vérification croisée des formulaires
callout:
  type: tip
  title: Point clé de cet article
  text: Le principal facteur de succès a été l'accumulation quotidienne des données comptables grâce à la synchronisation de Money Forward. Copilot s'est chargé de « trier, vérifier et saisir les données accumulées », tandis que l'humain s'est concentré sur les décisions stratégiques et l'approbation finale pour mener à bien la déclaration fiscale.
faq:
  title: Questions fréquentes
  items:
    - question: Peut-on vraiment faire sa déclaration fiscale avec GitHub Copilot ?
      answer: Oui, en combinant le Agent Mode et Simple Browser, on peut réaliser la classification des écritures, la saisie des déductions et la création de la déclaration entièrement dans VS Code. Toutefois, la soumission finale nécessite une authentification par carte My Number et doit être effectuée par un humain.
    - question: Quels sont les prérequis pour utiliser Copilot ?
      answer: Le prérequis principal est d'avoir accumulé des données comptables au quotidien via un logiciel de comptabilité cloud comme Money Forward. Copilot se charge du tri et de la vérification des données accumulées, il ne peut pas fonctionner sans données.
    - question: Comment les incohérences dans les écritures ont-elles été détectées ?
      answer: Copilot a comparé le document de référence (règles des comptes comptables) avec le journal comptable pour détecter mécaniquement les écritures non conformes. Sur 837 écritures, 8 incohérences ont été identifiées et corrigées.
---

J'ai confié la totalité du travail pratique de ma déclaration fiscale au Agent Mode de GitHub Copilot. Résultat : de la classification de 837 écritures comptables à la création et vérification de la déclaration, tout s'est fait dans VS Code. La soumission finale a été effectuée depuis l'application smartphone avec authentification par carte My Number, et la déclaration fiscale a été complétée avec succès.

Dans cet article, je documente en toute transparence « jusqu'où Copilot a pu prendre en charge le travail » et « ce que l'humain a fait ».

## Prérequis : la synchronisation des données MF Cloud comme fondation

Commençons par affirmer clairement que la raison principale du succès de cette expérience est **d'avoir configuré au préalable la synchronisation des données de Money Forward Cloud tout au long de l'année**.

Au lieu de collecter les relevés dans la panique à l'approche de la période de déclaration, les services suivants étaient synchronisés automatiquement tout au long de l'année, accumulant les données comptables :

- **Compte bancaire professionnel** — Encaissements de chiffre d'affaires, frais de virement
- **Compte bancaire personnel** — Prêt immobilier, J-Coin Pay, ventilation des dépenses quotidiennes
- **Banque en ligne** — Relevés de prélèvements automatiques des cotisations sociales
- **Carte de crédit professionnelle** — Frais de communication, publicité, déplacements, documentation
- **[Mobile Suica](https://www.jreast.co.jp/suica/)** — Frais de transport en train/bus (méthode d'avance de fonds pour éviter la double comptabilisation)
- **Sites e-commerce** — Achats de fournitures
- **[MynaPortal](https://myna.go.jp/)** — Attestations de déduction pour retraite et assurance vie

Grâce à cette synchronisation, au moment de la clôture, **837 écritures comptables** étaient stockées dans le cloud. Le travail de Copilot consistait à classer correctement ces données brutes et à les transformer en déclaration.

## Environnement utilisé

### Éditeur et IA

- **[VS Code](https://code.visualstudio.com/)** — Éditeur, navigateur, terminal et chat. Tout est centralisé ici
- **[GitHub Copilot](https://github.com/features/copilot) Agent Mode ([Claude Opus 4.6](https://www.anthropic.com/claude))** — Le modèle principal de cette expérience. Il combine de manière autonome l'édition de fichiers (lecture/écriture Markdown), l'exécution de commandes terminal et les interactions Web via Simple Browser
- **[Simple Browser](https://code.visualstudio.com/docs/editor/simple-browser) (navigateur intégré de VS Code)** — Copilot lit le DOM via les outils [MCP (Model Context Protocol)](https://modelcontextprotocol.io/), clique sur les boutons et liens avec `click_element`, saisit dans les formulaires avec `type_in_page` et récupère le texte complet des pages avec `read_page`. C'est « les yeux et les mains » de Copilot

### Services Web

- **[Money Forward Cloud Déclaration fiscale](https://biz.moneyforward.com/tax_return/)** — Gestion du journal comptable, des états financiers et de la déclaration
- **[Money Forward Cloud Box](https://biz.moneyforward.com/box/)** — Gestion documentaire des reçus et justificatifs
- **[Money Forward ME](https://moneyforward.com/)** — Gestion des finances personnelles (consultation croisée des entrées/sorties de plusieurs comptes)

### Pourquoi GitHub Copilot plutôt que Computer Use

Pour confier des interactions d'écran à une IA, il existe des outils basés sur les captures d'écran comme Computer Use d'Anthropic. Cependant, ce qui était nécessaire pour cette déclaration fiscale n'était pas simplement « manipuler l'écran », mais **lire et écrire des fichiers tout en prenant des décisions, et partager ces traces avec l'humain**.

Raisons du choix de GitHub Copilot Agent Mode :

- **Division du travail possible : l'humain se connecte, l'IA travaille** — L'humain se connecte aux banques et logiciels comptables et ouvre les pages. Ensuite, les opérations (recherche, saisie, vérification) sont effectuées par Copilot via Simple Browser. Computer Use est conçu pour confier l'ensemble du bureau à l'IA, rendant impossible cette répartition « connexion humaine, le reste par l'IA » sur le même écran
- **Édition de fichiers et navigation Web dans le même environnement** — Lire policy.md pour évaluer la conformité d'une écriture, écrire les résultats dans inconsistency-check.md, puis corriger directement le journal via Simple Browser. Ce flux ne s'interrompt jamais dans VS Code
- **Les fichiers Markdown comme espace de travail partagé homme-IA** — Computer Use, étant basé sur des captures d'écran, n'est pas adapté pour accumuler et consulter des connaissances structurées. Avec Copilot, on peut communiquer dans les deux sens via des fichiers .md sur « quelle base, quelle décision »
- **L'historique de conversation devient le journal de travail** — Des échanges comme « On met cette déduction ? » « Non, pas de justificatif, on laisse tomber » restent dans l'historique. Pouvoir retracer les décisions est particulièrement important pour une déclaration fiscale

En résumé, d'autres outils pourraient gérer les interactions écran, mais la force de Copilot Agent Mode est de **permettre à l'humain et à l'IA de partager le même écran et les mêmes fichiers pour se répartir le travail**.

### Le cœur du workflow : les fichiers Markdown

L'élément le plus important du travail collaboratif avec Copilot a été la **structuration des connaissances et des tâches en fichiers Markdown**. Voici la structure de fichiers utilisée :

| Fichier | Rôle |
| --- | --- |
| `policy.md` | Règles de correspondance motif de libellé → compte comptable (16 sections). Les critères de jugement utilisés par Copilot pour classer les écritures |
| `tasks.md` | Hub de suivi de l'avancement global de la déclaration. Suivi de l'état d'obtention de 38 justificatifs avec des ✅ |
| `declaration-tasks.md` | Problèmes non résolus et notes d'investigation pour la phase de saisie. Séparation faits/hypothèses |
| `declaration-tasks_done.md` | Éléments terminés/en attente déplacés pour éviter l'inflation du fichier de travail |
| `inconsistency-check.md` | Rapport de comparaison policy vs journal. Références aux sections de policy.md par numéro § |
| `mf-review-report.md` | Revue des chiffres BS/PL. Gestion systématique par ID de problème (A1, B1 etc.) et niveau de criticité |
| `journal-mapping.md` | Registre des 837 écritures du journal MF organisées par catégorie sous forme de tableaux |

Copilot **lit ces fichiers .md pour prendre des décisions et écrit pour documenter**. L'humain lit exactement les mêmes fichiers pour comprendre la situation. Les fichiers Markdown fonctionnent ainsi comme un espace de travail partagé entre l'humain et l'IA.

L'utilisation de base consiste à avoir 5 à 6 onglets Simple Browser ouverts simultanément et à avancer en consultant Copilot.

## Phase 1 : Créer le document de référence des écritures avec Copilot

### Élaboration de la politique de classification

La première étape a été de documenter les règles de classification des écritures dans `policy.md`. « Ce mouvement, on le met dans quel compte ? » « C'est professionnel ou personnel ? » — en consultant Copilot, nous avons compilé les comptes comptables pour chaque schéma de transaction.

La structure de ce document est essentielle. Chaque section est formatée en `### Motif de libellé → Compte comptable`, avec un tableau Markdown définissant le libellé, le contenu et le compte. Pour les cas ambigus, les justifications sont ajoutées en blocs `> Note:`. Comme le champ libellé de MF Cloud utilise des katakana demi-largeur (ex. : `ﾃｽｳﾘｮｳ`), ils ont été transcrits tels quels dans le document pour faciliter la recherche par copier-coller.

Les règles de classification élaborées couvrent 15 sections :

| Catégorie | Compte | Exemples concrets |
| --- | --- | --- |
| Encaissements clients | Chiffre d'affaires | Virements mensuels |
| Prélèvement prêt immobilier | Prélèvement personnel | Prélèvement automatique depuis le compte personnel |
| Rechargement QR code | Prélèvement personnel/apport | Rechargement/remboursement depuis le compte personnel |
| Transfert entre comptes | Dépôt bancaire | Compte pro ↔ Compte perso |
| FAI / SaaS | Frais de communication | GitHub, Cloudflare, ChatGPT, Canva, etc. |
| Publicité Web / Réseaux sociaux | Frais de publicité | Google Ads, X Premium, SocialDog, etc. |
| Transports | Frais de déplacement | Shinkansen, taxi, espace de télétravail |
| Utilisation Suica | Frais de déplacement | Système d'avance de fonds pour les trains/bus |
| Achats e-commerce | Fournitures | Périphériques PC, outils |

## Phase 2 : Classification des 837 écritures et contrôle d'incohérence

### Comparaison exhaustive par Copilot

Une fois le document de référence prêt, on passe naturellement à « Bon, maintenant on compare avec le journal ».

Méthode concrète : Copilot ouvre la page du journal dans MF Cloud via Simple Browser, récupère le contenu avec `read_page`, filtre par mots-clés de libellé et compare avec les tableaux de policy.md. Quand une divergence est trouvée, il ajoute une ligne dans `inconsistency-check.md` tout en modifiant directement la section concernée (ex. `§13`) dans policy.md. La règle « prendre le journal comme source de vérité et corriger policy.md » étant déclarée en en-tête de `inconsistency-check.md`, Copilot corrige le document de référence sans hésitation.

Résultat : **8 incohérences** détectées :

| Libellé | Compte selon la politique | Écriture réelle | Action |
| --- | --- | --- | --- |
| Abonnement premium réseau social | Prélèvement personnel (usage perso) | Frais de publicité | Réseau social professionnel, frais de publicité correct |
| Outil de design | Prélèvement personnel (usage perso) | Frais de communication | Outil professionnel, frais de communication correct |
| Service de chat IA | Prélèvement personnel (usage perso) | Frais de communication | Outil professionnel, frais de communication correct |
| Location de batterie portable | Frais de communication | Prélèvement personnel | Usage personnel, prélèvement personnel correct |
| Achats in-app (mélange d'apps) | Tout en frais de communication | Décomposé par app | Navigation → communication, bloqueur pub → prélèvement perso, etc. |
| Publicité vidéo (facturation au seuil) | Placé dans la section usage personnel | Frais de publicité | Erreur de placement dans le document corrigée |
| Achat e-commerce (périphérique PC) | Documentation | Fournitures | Erreur de compte corrigée |
| Outil de gestion réseaux sociaux | Frais de communication | Frais de publicité | Objectif de gestion de réseaux sociaux, frais de publicité correct |

« Créer un document de référence, le comparer au journal, et corriger le document en cas de divergence » — que Copilot effectue ce travail automatiquement tout en éditant les fichiers représente une efficacité incomparable avec la vérification visuelle de 837 lignes.

### Vue d'ensemble du journal

Les écritures finalement triées se répartissent comme suit :

- **Synchronisation bancaire** (compte pro + compte perso + banque en ligne, 4 banques) — Encaissements, prêt immobilier, transferts entre comptes
- **Synchronisation carte de crédit** (Sumitomo Mitsui Card + Apple Pay séparé) — Frais de communication 116, publicité 21, déplacements 24, documentation 27, usage personnel 29, etc.
- **Synchronisation Mobile Suica** — Train 248, bus 130, rechargements 21, achats 4
- **Synchronisation e-commerce** — Fournitures 5
- **AI-OCR / Factures** — 16

## Phase 3 : Organisation des justificatifs dans Cloud Box

### Téléchargement et lecture automatique

« Organisons aussi les justificatifs » — les reçus et relevés de carte ont été téléchargés via Copilot dans la fonction Box de la comptabilité cloud. L'AI-OCR a extrait automatiquement la date, le fournisseur et le montant, et Copilot a complété manuellement les informations manquantes.

Les justificatifs individuels (reçus un par un) ont vu leur date, fournisseur et montant complétés. Les documents de type relevé (relevé de carte, historique Suica, relevé bancaire, etc.) ont simplement été téléchargés comme documents de référence.

## Phase 4 : Rapprochement des cotisations sociales — L'atout de la navigation multi-services

Ce volet a commencé avec la question « Comment confirme-t-on les montants des cotisations sociales ? ». En discutant avec Copilot, nous avons convergé vers la méthode de **rapprochement en ouvrant 5 services Web simultanément**.

### Cotisation de retraite nationale

La synchronisation MynaPortal ne suffit pas toujours. Par exemple, si les cotisations du conjoint sont payées depuis un autre compte, elles n'apparaissent pas dans les données synchronisées.

Dans ces cas, voici le déroulement que nous avons suivi avec Copilot :

1. « Cherchons les paiements de retraite dans les relevés de carte » → Ouverture dans Simple Browser, recherche « Japan Pension Service », extraction des montants
2. « Peut-être aussi depuis un autre compte ? » → Vérification des débits dans l'application de finances personnelles, découverte de prélèvements non synchronisés
3. « Regardons aussi les mois précédents et suivants » → Identification du schéma de paiement (trimestriel, mensuel, etc.)
4. « Bon, on fait le rapprochement et le total » → Rapprochement des montants de sources multiples pour confirmer le total annuel

L'essentiel est qu'un seul service ne suffit pas. Le schéma de base de cette phase est d'échanger avec Copilot — « Où regarde-t-on ensuite ? » « On vérifie aussi là-bas ? » — tout en naviguant entre les onglets pour recouper.

### Cotisation d'assurance maladie

On ouvre l'onglet Simple Browser de la banque en ligne pour rechercher les prélèvements d'assurance dans les relevés. Selon le régime (association, assurance nationale, etc.), on adapte les mots-clés de recherche et on vérifie le nombre de versements et les montants annuels.

### Paiements aux collectivités locales (piège)

Même si l'application de finances personnelles contient des paiements à la collectivité locale, il est parfois impossible de distinguer entre « assurance maladie nationale », « impôt local » ou « taxe foncière » à partir des seuls enregistrements.

Processus d'investigation avec Copilot :

1. « Vérifions les échéances de la collectivité » → Consultation des dates d'échéance par type d'impôt sur le site municipal
2. « Les mois de paiement correspondent ? » → Rapprochement pour réduire les candidats
3. « D'autres assurances payées à la même période ? » → Vérification de l'absence de chevauchement

Quand le justificatif original est introuvable et qu'on ne peut pas confirmer le type d'impôt, la prudence est de **ne pas l'inclure dans les déductions (jouer la sécurité)**. La décision « inclure ou non » revient à l'humain, tandis que Copilot se charge de rassembler les éléments d'analyse — cette répartition des rôles est essentielle.

### Découverte d'erreurs de classification

La classification automatique des applications de finances n'est pas infaillible. En pratique, une dépense classée automatiquement comme « cotisation retraite » s'est avérée, après vérification par Copilot dans les relevés de carte, être une facture de services publics complètement différente. Sans vérification, les cotisations sociales auraient été surévaluées.

**À faire systématiquement** : ne pas faire confiance à la classification de l'application de finances et vérifier avec Copilot — « Ce montant, c'est vraiment de la retraite ? Vérifions dans le relevé ». Le rapprochement multi-services est la vraie valeur ajoutée de Copilot × Simple Browser.

## Phase 5 : Saisie des différentes déductions

« Passons maintenant aux autres déductions » — les déductions autres que les cotisations sociales ont été saisies via Simple Browser en collaboration avec Copilot.

### Déductions saisies

| Type de déduction | Description | Travail de Copilot |
| --- | --- | --- |
| Déduction assurance vie | Données synchronisées MynaPortal + saisie manuelle | Manipulation des listes déroulantes et saisie élément par élément |
| Déduction assurance tremblement de terre | Assurance mutuelle et dommages sismiques | Saisie des montants dans le formulaire |
| Déduction pour conjoint | Calcul du revenu total du conjoint | Calcul du revenu après déduction salariale, vérification du montant |
| Déduction cotisations sociales | Retraite + assurance maladie (montants confirmés en Phase 4) | Sélection du type et saisie du montant sur l'écran des cotisations |
| Déduction pour personnes à charge (moins de 16 ans) | Sans impact sur la déduction mais lié à l'impôt local | Vérification de l'enregistrement dans Informations de base → Famille |

### Éléments examinés puis reportés

Éléments que nous avons examinés avec Copilot avant de décider de les reporter :

- **Déduction prêt immobilier** — Reportée faute d'attestation de solde de fin d'année
- **Déduction frais médicaux** — Montants synchronisés via MynaPortal vérifiés mais jugés insuffisants pour avoir un impact significatif
- **Répartition des frais d'électricité** — Serveur domestique utilisé à des fins professionnelles, mais la base de répartition n'a pas été finalisée à temps
- **Furusato Nozei / iDeCo** — Non applicable cette année

## Phase 6 : Répartition des frais de FAI

Les frais mensuels de FAI (connexion Internet) étaient entièrement comptabilisés en frais de communication, mais dans le cas d'un bureau à domicile, une utilisation 100% professionnelle n'est pas justifiable.

En demandant à Copilot « Comment fait-on la répartition ? », il a proposé des options et nous avons décidé ensemble :

1. Rechercher toutes les écritures liées au FAI dans le journal → Calculer le total annuel
2. Déterminer le taux de répartition professionnelle (50% est une base courante pour un bureau à domicile)
3. Ne pas modifier les écritures individuelles, mais ajouter une **écriture d'ajustement globale au 31/12** « Prélèvement personnel / Frais de communication »
4. Copilot saisit l'écriture dans le journal

Le fait que Copilot présente des options pratiques — « modifier chaque ligne à 50% ou faire un ajustement global en fin d'année ? » — est un avantage de la conversation avec l'IA.

## Phase 7 : Saisie et vérification de la déclaration

### Interaction avec les formulaires via Simple Browser

On ouvre l'écran de déclaration du logiciel comptable cloud dans Simple Browser et on avance la saisie en discutant avec Copilot.

Les opérations effectuées par Copilot :

1. `read_page` pour récupérer la structure de la page et déterminer quel menu cliquer
2. `click_element` pour cliquer sur les menus latéraux et les liens comme « Cotisations sociales »
3. Pour les listes déroulantes, `click_element` pour ouvrir le menu, puis à nouveau pour sélectionner
4. `type_in_page` pour saisir les montants dans les champs. Copie directe des montants enregistrés dans `declaration-tasks.md`
5. `click_element` sur le bouton « Enregistrer » pour soumettre le formulaire

Côté humain, les interactions se limitent à : « On fait les cotisations sociales », « Commençons par la retraite », « Il y en a une autre », « On vérifie que le total correspond sur le formulaire principal ? ». Pas besoin de spécifier des sélecteurs ou des procédures précises — Copilot lit le DOM et agit de manière autonome.

Au-delà de la simplicité par rapport à une navigation manuelle, le grand avantage est que **ces échanges sont conservés dans le journal de conversation**. On peut retracer ce qui a été saisi et dans quel ordre.

### Vérification croisée des formulaires

« La saisie est terminée, vérifions que les formulaires sont cohérents » — la cohérence a été vérifiée par Copilot :

- **Formulaire principal** — Montants des revenus, total des déductions, revenu imposable, montant de l'impôt
- **Formulaire secondaire** — Détail des cotisations sociales, assurance vie, conjoint, personnes à charge

En faisant lire les deux onglets par Copilot, on vérifie que « le total des détails du formulaire secondaire correspond au montant de déduction du formulaire principal ». Toute incohérence est signalée immédiatement, permettant une détection précoce des erreurs de saisie.

Note : dans Money Forward, l'écran d'impôt local et professionnel ne comporte pas de champ pour les personnes à charge de moins de 16 ans. Les informations de personnes à charge sont gérées dans « Informations de base → Famille ».

## Phase 8 : Soumission de la déclaration

La soumission finale est effectuée depuis l'application smartphone de Money Forward Cloud Déclaration fiscale. L'authentification par lecture NFC de la carte My Number permet de soumettre directement les données. Pas besoin d'ouvrir e-Tax séparément — la soumission se fait directement depuis MF Cloud.

Points de vérification après soumission :

- La date et l'heure de réception sont-elles enregistrées ?
- Un numéro de réception a-t-il été attribué ?
- Le message « Les données envoyées ont été acceptées » s'affiche-t-il ?

Copilot lit l'écran de confirmation de soumission pour vérifier ces points.

### Traitement des informations confidentielles

Les écrans bancaires et comptables affichent naturellement des informations personnelles. Il faut être conscient que l'historique de conversation de Copilot peut les contenir. GitHub Copilot for Business a pour politique de ne pas utiliser les données de complétion de code pour l'entraînement, mais vérifiez avec la politique de sécurité de votre organisation.

## Qu'a fait l'humain ?

Rétrospectivement, le travail humain a été étonnamment réduit :

1. **Décision de politique** — « Cela passe en charge / ou pas », « On met 50% de répartition », « Pas de justificatif, on ne met pas en déduction »
2. **Consultation avec Copilot** — « On fait ça ensuite ? », « On vérifie aussi ça ? », « Comment on procède ? »
3. **Approbation finale** — « Ces chiffres sont bons », « Tu peux soumettre »
4. **Manipulation physique** — Lecture NFC de la carte My Number (uniquement pour la soumission mobile)

Quasiment aucun besoin d'ouvrir des écrans spécifiques ou de donner des instructions détaillées. En indiquant simplement « On fait ça maintenant », Copilot gère de manière autonome la navigation, la recherche, la saisie et la vérification.

Ce qui rend cela possible, ce sont les fichiers Markdown. Parce que policy.md contient les règles de classification, Copilot peut juger la conformité des écritures. Parce que declaration-tasks.md contient les notes d'investigation, il peut retracer l'origine des montants. Si l'humain peut se contenter de dire « maintenant ça », c'est parce que les critères de décision et les journaux de travail sont partagés sous forme de fichiers .md.

## Retour d'expérience : ce que je ferais différemment la prochaine fois

En m'appuyant sur cette expérience, voici les points d'amélioration :

- **Télécharger aussi les attestations de déduction dans Cloud Box** — Cette fois, seule la conservation papier était en place, mais Copilot a pu identifier les montants à partir des relevés. Cependant, avec des données numériques, Copilot pourrait les lire directement, ce qui serait encore plus fluide
- **Annoter les paiements aux collectivités avec le type d'impôt** — Sans justificatif original, impossible de distinguer assurance maladie nationale / impôt local / taxe foncière
- **Maintenir le document de référence à jour** — Plus le document est précis, plus le travail de Copilot est fiable
- **Mieux structurer les fichiers .md dès le départ** — Cette fois, les fichiers se sont multipliés au fil du travail, mais en définissant dès le début les rôles et formats des fichiers, la précision de lecture de Copilot et la compréhension humaine seraient améliorées

## Conclusion

Ce que cette déclaration fiscale m'a fait réaliser, c'est que la **combinaison « accumulation de données » et « exécution du travail par l'IA »** est extrêmement puissante.

La synchronisation de Money Forward accumule automatiquement les données de transactions bancaires, cartes et Suica tout au long de l'année. Au moment de la déclaration, on avance en discutant avec GitHub Copilot Agent Mode — « On fait ça ensuite ? », « On vérifie aussi ça ? ». L'humain se contente de définir les orientations et d'approuver, mais le processus n'est pas une délégation totale — c'est une succession continue de dialogues.

Écrire du code n'est pas la seule utilisation de Copilot. « Naviguer entre plusieurs services Web, collecter des données, les organiser, les saisir et les vérifier » — tout ce travail de bureau peut être accompli en conversant par chat. Agent Mode × Simple Browser est pleinement utilisable au-delà du codage.
