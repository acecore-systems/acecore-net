---
title: 'Guide de migration de Zoho Mail vers KAGOYA MAIL — DNS, authentification et inventaire des données en pratique'
description: 'Procédure pratique de migration de Zoho Workplace vers KAGOYA MAIL : configuration DNS, authentification SPF/DKIM et inventaire complet des données Zoho Workplace.'
date: 2026-03-16
author: gui
tags: ['技術', 'メール', 'DNS', 'インフラ']
image: https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&h=400&fit=crop&q=80
processFigure:
  title: Flux global de la migration
  steps:
    - title: Préparation KAGOYA
      description: Ajout du domaine et création des comptes mail.
      icon: i-lucide-server
    - title: Migration des données mail
      description: Export depuis Zoho → Import IMAP vers KAGOYA.
      icon: i-lucide-hard-drive-download
    - title: Basculement DNS
      description: Modification des enregistrements MX, SPF et DKIM vers KAGOYA.
      icon: i-lucide-globe
    - title: Test d'authentification
      description: Vérification du PASS SPF/DKIM et tests d'envoi/réception.
      icon: i-lucide-shield-check
    - title: Inventaire des données Zoho
      description: Tri des données résiduelles de tous les services Workplace.
      icon: i-lucide-clipboard-check
    - title: Résiliation Zoho
      description: Annulation de l'abonnement.
      icon: i-lucide-log-out
callout:
  type: warning
  title: Précautions lors du basculement DNS
  text: Après la modification des enregistrements MX, les e-mails peuvent continuer à arriver sur l'ancien serveur pendant quelques heures à 48 heures maximum. Si vous gérez votre DNS sur Cloudflare, réduisez le TTL à 2 minutes avant le basculement pour minimiser l'impact.
compareTable:
  title: Comparaison des configurations avant et après migration
  before:
    label: Zoho Workplace Standard
    items:
      - Zoho Mail (forfait 30 Go)
      - WorkDrive / Cliq / Calendar, etc. inclus (inutilisés après migration vers Nextcloud)
      - 1 440 ¥/mois (3 utilisateurs, facturation par utilisateur)
      - SPF avec include:zoho.jp
      - DKIM avec zmail._domainkey
  after:
    label: KAGOYA MAIL Bronze
    items:
      - KAGOYA MAIL (serveur virtuel dédié, IP dédiée)
      - Serveur dédié au mail, nombre d'utilisateurs illimité
      - 3 300 ¥/mois (2 640 ¥ en paiement annuel)
      - SPF avec include:kagoya.net
      - DKIM avec kagoya._domainkey
checklist:
  title: Checklist de migration
  items:
    - text: Ajout du domaine et création des comptes sur KAGOYA
      checked: true
    - text: Export des données mail Zoho au format ZIP
      checked: true
    - text: Import IMAP vers KAGOYA
      checked: true
    - text: Basculement des enregistrements MX dans le DNS Cloudflare
      checked: true
    - text: Modification de l'enregistrement SPF vers kagoya.net
      checked: true
    - text: Modification de l'enregistrement DKIM vers kagoya._domainkey
      checked: true
    - text: Configuration de la politique DMARC
      checked: true
    - text: Tests d'envoi/réception et vérification SPF/DKIM PASS
      checked: true
    - text: Inventaire des données de tous les services Zoho Workplace
      checked: true
    - text: Résiliation de l'abonnement Zoho
      checked: true
faq:
  title: Questions fréquentes
  items:
    - question: Y a-t-il une période pendant laquelle les e-mails ne sont pas reçus pendant la migration ?
      answer: Si le TTL DNS est configuré court, cela ne dure que quelques minutes à quelques heures. Avec Cloudflare, réglez le TTL à 2 minutes avant le basculement. Continuez également à vérifier l'ancien serveur pendant quelques jours.
    - question: Comment exporter les données mail de Zoho ?
      answer: Depuis la console d'administration Zoho Mail → Gestion des données → Export des boîtes mail. L'export se fait au format ZIP par compte, contenant des fichiers au format EML.
    - question: Que se passe-t-il si SPF et DKIM ne sont pas tous les deux configurés ?
      answer: La probabilité que le serveur de réception classe le message comme spam augmente. Gmail en particulier est strict et exige de plus en plus le PASS des deux, SPF et DKIM.
    - question: Que deviennent les données si l'on résilie Zoho Workplace ?
      answer: À l'expiration du forfait payant, le compte passe au forfait gratuit. Le forfait gratuit a aussi des limites de stockage, il est donc recommandé d'exporter les données nécessaires au préalable. La suppression du compte entraîne la perte définitive de toutes les données.
---

Vous souhaitez migrer de Zoho Workplace vers un autre service de messagerie, mais vous êtes inquiet au sujet de la configuration DNS et de l'authentification mail ? Ce guide pratique est fait pour vous. Avec l'exemple de la migration de Zoho Mail vers KAGOYA MAIL, nous détaillons les étapes de basculement DNS, d'authentification SPF/DKIM et d'inventaire des données de l'ancien service.

## Vous reconnaissez-vous dans cette situation ?

Zoho Workplace est une suite collaborative regroupant Mail, WorkDrive, Cliq, Calendar et bien d'autres services. Cependant, vous trouvez-vous dans l'une de ces situations ?

- Vous n'utilisez que la messagerie mais payez pour la suite collaborative complète
- Votre stockage de fichiers a déjà été migré vers un autre service (Nextcloud, Google Drive, etc.)
- Le modèle de facturation par utilisateur devient pesant à chaque nouvel ajout

Dans ces cas, la migration vers un service dédié à la messagerie devient une option pertinente.

## Pourquoi KAGOYA MAIL ?

KAGOYA MAIL est un service de messagerie dédié aux entreprises. Voici les points à considérer pour le choix d'une solution de migration :

- **Serveur virtuel dédié avec IP dédiée** — Sans cohabitation avec WordPress ou autre serveur Web, le taux de délivrabilité et la stabilité sont meilleurs
- **Tarification forfaitaire avec utilisateurs illimités** — Contrairement à la facturation par utilisateur de Zoho, vous pouvez ajouter des comptes sans contrainte
- **Serveurs au Japon** avec une solide expérience en utilisation professionnelle, support standard SPF/DKIM/DMARC
- Compatible IMAP/SMTP, vos clients de messagerie existants fonctionnent tels quels

Le forfait Bronze est à 3 300 ¥/mois (2 640 ¥ en paiement annuel). Comparé à Zoho Workplace Standard (1 440 ¥/mois pour 3 utilisateurs), le coût brut augmente, mais compte tenu de l'environnement dédié au mail, de l'IP dédiée et des utilisateurs illimités, c'est un investissement dans la fiabilité de la messagerie qui mérite considération.

## ÉTAPE 1 : Préparation du serveur de destination

Ajoutez votre domaine personnalisé et créez les comptes mail dans le panneau de contrôle KAGOYA.

1. **Configuration du domaine → Ajout de domaine personnalisé** pour enregistrer le domaine
2. Configuration par défaut de livraison sur « Traiter comme erreur » (pour les adresses inexistantes)
3. Création des comptes mail nécessaires

## ÉTAPE 2 : Export des données mail Zoho

Exportez les données mail par compte depuis la console d'administration Zoho Mail.

1. Accédez à **Console d'administration → Gestion des données → Export des boîtes mail**
2. Sélectionnez le compte cible et lancez l'export
3. Téléchargez le fichier ZIP une fois généré

Le ZIP contient les fichiers mail au format EML. Selon le nombre de comptes et le volume de mails, l'opération peut prendre plusieurs dizaines de minutes — prévoyez du temps.

## ÉTAPE 3 : Import IMAP

Importez les fichiers EML exportés sur le serveur IMAP de destination. L'import manuel étant fastidieux, l'automatisation par script Python est recommandée.

```python
import imaplib
import email
import glob

# Connexion IMAP KAGOYA
imap = imaplib.IMAP4_SSL("nom_du_serveur_mail", 993)
imap.login("nom_du_compte", "mot_de_passe")
imap.select("INBOX")

# Upload groupé des fichiers EML
for eml_path in glob.glob("export/**/*.eml", recursive=True):
    with open(eml_path, "rb") as f:
        msg = f.read()
    imap.append("INBOX", None, None, msg)

imap.logout()
```

## ÉTAPE 4 : Basculement DNS

Pour rediriger la livraison des e-mails, modifiez les enregistrements DNS. L'exemple utilise Cloudflare, mais le contenu à configurer est identique quel que soit le service DNS.

### Enregistrement MX

Supprimez les enregistrements MX de Zoho (`mx.zoho.jp` / `mx2.zoho.jp` / `mx3.zoho.jp`) et enregistrez le serveur de destination. Pour KAGOYA MAIL :

| Type | Nom | Valeur | Priorité |
| --- | --- | --- | --- |
| MX | (votre domaine) | dmail.kagoya.net | 10 |

### Enregistrement SPF

```
v=spf1 include:kagoya.net ~all
```

Remplacez l'ancien `include:zoho.jp` par `include:kagoya.net`.

### Enregistrement DKIM

Récupérez la clé publique depuis la **configuration DKIM** du panneau de contrôle KAGOYA et enregistrez-la en tant qu'enregistrement TXT.

| Type | Nom | Valeur |
| --- | --- | --- |
| TXT | kagoya.\_domainkey.(votre domaine) | v=DKIM1;k=rsa;p=(clé publique) |

Supprimez l'ancien `zmail._domainkey` (Zoho).

### Enregistrement DMARC

```
v=DMARC1; p=quarantine; rua=mailto:(adresse de rapport)
```

Passer la politique de `none` à `quarantine` renforce la protection contre l'usurpation d'identité.

## ÉTAPE 5 : Tests d'envoi et de réception

Après le basculement DNS, vérifiez impérativement ces 4 points :

1. **Réception depuis l'extérieur** — Envoyez un mail depuis Gmail, etc.
2. **Envoi vers l'extérieur** — Envoyez un mail depuis KAGOYA vers Gmail, etc.
3. **SPF PASS** — Vérifiez `spf=pass` dans les en-têtes du mail reçu
4. **DKIM PASS** — Vérifiez `dkim=pass` dans les en-têtes du mail reçu

La vérification des en-têtes peut être automatisée en Python. La vérification visuelle du SPF/DKIM PASS est sujette aux oublis — un script d'extraction est plus fiable.

```python
import imaplib
import email

imap = imaplib.IMAP4_SSL("nom_du_serveur_mail", 993)
imap.login("nom_du_compte", "mot_de_passe")
imap.select("INBOX")
_, data = imap.search(None, "ALL")

for num in data[0].split()[-3:]:  # 3 derniers mails
    _, msg_data = imap.fetch(num, "(RFC822)")
    msg = email.message_from_bytes(msg_data[0][1])
    auth = msg.get("Authentication-Results", "")
    print(f"Subject: {msg['Subject']}")
    print(f"Auth: {auth[:200]}")
    print()

imap.logout()
```

## ÉTAPE 6 : Inventaire des données de l'ancien service

Zoho Workplace comprend de nombreux services au-delà de la messagerie : WorkDrive, Cliq, Calendar, Contacts, etc. Avant la résiliation, vérifiez qu'il ne reste pas de données dans chaque service.

### Services à vérifier et critères de décision

| Service | Points de vérification |
| --- | --- |
| Zoho Mail | Les données ont-elles été importées dans le nouveau service ? |
| Zoho WorkDrive | L'espace de stockage utilisé est-il à 0 ? Vérifiez aussi la corbeille |
| Zoho Contacts | Nombre de contacts. Si nécessaire, exportez en CSV/VCF |
| Zoho Calendar | Présence d'événements ou de rappels |
| Zoho Cliq | Nécessité de l'historique de chat |
| Autres (Notebook, Writer, Sheet, etc.) | Présence de documents créés |

### Le piège de WorkDrive : la corbeille qui consomme du stockage

Un point souvent négligé est la corbeille de WorkDrive. Par exemple, dans notre cas, la console d'administration affichait environ 45 Go d'espace utilisé, alors que l'ouverture des dossiers montrait « Aucun élément ».

La cause : **toutes les données restaient dans la corbeille du dossier d'équipe**. Les fichiers supprimés lors de la migration précédente vers Nextcloud étaient restés dans la corbeille.

L'affichage du stockage dans la console inclut les données de la corbeille. « De l'espace est utilisé ≠ des données doivent être sauvegardées » — vérifiez le contenu de la corbeille avant de juger.

## ÉTAPE 7 : Résiliation de l'abonnement Zoho

Une fois l'inventaire des données terminé et les envois/réceptions fonctionnels sur le nouveau service, procédez à la résiliation.

1. Ouvrez **Console d'administration Zoho Mail → Gestion des abonnements → Aperçu**
2. Suivez le lien **Gestion des abonnements** vers le Zoho Store
3. Cliquez sur **Modifier le plan**
4. En bas de page, cliquez sur **Annuler l'abonnement**
5. Sélectionnez le motif et confirmez **Passer au plan gratuit**

Si la case « Downgrade automatique à la fin de la période de facturation en cours » est cochée, le plan payant reste actif jusqu'à son terme, puis passe automatiquement au plan gratuit. Par précaution, en cas de rollback nécessaire, il est recommandé de conserver une période d'observation en plan gratuit avant la suppression définitive.

## Conclusion

1. **Réduire le TTL DNS au préalable** minimise l'impact lors du basculement
2. **SPF et DKIM sont tous deux indispensables**. Un seul ne suffit pas — risque de classification en spam chez Gmail, etc.
3. **Attention aux « données visibles mais inutiles »** lors de l'inventaire — la corbeille et l'historique des versions peuvent consommer du stockage
4. **Sauvegarder les factures et reçus avant la résiliation** — ils ne seront plus accessibles après suppression du compte
5. **Décider non pas « parce que c'est moins cher » mais « ce qu'il faut isoler »** — la messagerie est le nerf vital de l'entreprise, investir dans un environnement dédié en vaut la peine

La migration d'un service mail touche un large périmètre (DNS, authentification mail) et constitue une opération intimidante. Cependant, il s'agit essentiellement de configurer correctement 4 types d'enregistrements : MX, SPF, DKIM et DMARC. Suivez les étapes de ce guide en vérifiant chaque point.
