---
title: 'Wir haben das Aceserver-Portal veröffentlicht'
description: 'Wir haben das offizielle Portal für Aceserver veröffentlicht, einen kostenlosen öffentlichen Minecraft-Server, dem jede Person beitreten kann. Mit Astro, UnoCSS und Sveltia CMS organisiert es Servervorstellung, Videos, Weltkarten, Wiki und Discord-Einstieg an einem Ort.'
date: 2026-06-07T10:00
author: gui
tags: ['お知らせ', 'Web制作', 'Webサイト', 'CMS', 'Astro', 'インフラ']
image: https://asv.acecore.net/uploads/legacy-scc.png
callout:
  type: info
  title: Veröffentlichte Website
  text: 'Das Aceserver-Portal ist unter https://asv.acecore.net/ verfügbar. Es bündelt Teilnahmeinformationen, Videos, Weltkarten und Wiki-Links für den öffentlichen Minecraft-Server.'
processFigure:
  title: Im Portal organisierte Wege
  steps:
    - title: Servervorstellung
      description: Stellt Aceserver für Erstbesucher klar vor.
      icon: i-lucide-server
    - title: Teilnahmeweg
      description: Platziert den Discord-Button an einer leicht auffindbaren Stelle.
      icon: i-lucide-message-circle
    - title: Kartenweg
      description: Erleichtert den Wechsel zu Hauptwelt, Ressourcenwelt und RPG-Welt.
      icon: i-lucide-map
    - title: CMS-Betrieb
      description: Inhalte und Website-Einstellungen können mit Sveltia CMS aktualisiert werden.
      icon: i-lucide-file-pen-line
insightGrid:
  title: Hauptstruktur des Aceserver-Portals
  items:
    - title: Startseite
      description: Ein kompakter Einstieg für Serverüberblick, Java- und Bedrock-Unterstützung sowie Teilnahmeweg.
      icon: i-lucide-home
      tone: brand
    - title: Weltkarten
      description: Separate Seiten führen zur Hauptwelt, Ressourcenwelt und RPG-Welt.
      icon: i-lucide-map
      tone: emerald
    - title: Wiki und Videos
      description: Besucher können bei Bedarf zu Details oder Eindrücken über Wiki und Videos wechseln.
      icon: i-lucide-book-open
      tone: amber
linkCards:
  - href: https://asv.acecore.net/
    title: Aceserver-Portal
    description: Das veröffentlichte offizielle Portal von Aceserver.
    icon: i-lucide-external-link
  - href: /de/works/#case-aceserver-portal
    title: Fallstudie zum Aceserver-Portal
    description: Auch als Produktionsbeispiel auf Acecores Arbeitsseite gelistet.
    icon: i-lucide-briefcase-business
  - href: /de/works/#case-aceserver
    title: Betrieb des öffentlichen Aceserver-Servers
    description: Fallstudie zu Serverbetrieb und Community.
    icon: i-lucide-server-cog
  - href: /de/services/#web
    title: Website-Erstellung und Betrieb
    description: Beratung für Portale, Inhaltsorganisation und Webbetrieb.
    icon: i-lucide-globe
faq:
  title: Häufige Fragen
  items:
    - question: Was kann man im Aceserver-Portal sehen?
      answer: Man findet den Überblick zu Aceserver, den Teilnahmeweg, Videoseite, Karten der Hauptwelt, Ressourcenwelt und RPG-Welt sowie Links zum Wiki.
    - question: Mit welchen Technologien wurde die Website erstellt?
      answer: Es ist eine statische Website mit Astro, UnoCSS und Sveltia CMS. Die Sitemap wird ebenfalls über eine Astro-Integration erzeugt.
    - question: Worin unterscheidet sich das von der bestehenden Aceserver-Betriebsfallstudie?
      answer: Die bestehende Fallstudie behandelt Betrieb und Community-Management des öffentlichen Servers. Diese Fallstudie konzentriert sich auf das Portal, das Informationen für Teilnehmende organisiert.
---

Wir haben das offizielle Portal für [Aceserver](https://asv.acecore.net/) veröffentlicht, einen kostenlosen öffentlichen Minecraft-Server, dem jede Person beitreten kann.

Aceserver unterstützt Java Edition und Bedrock Edition. Das neue Portal bündelt Serverüberblick, Teilnahmeinformationen, Videos, Weltkarten und Wege zum Wiki in einem Einstieg. Es ist außerdem auf Acecores [Arbeitsseite](/de/works/#case-aceserver-portal) als Fallstudie für Webproduktion und Community-Portal gelistet.

## Hintergrund

Vor dem Beitritt zu Aceserver müssen Besucher verstehen, was für ein Server es ist, wie man beitritt, welche Welten es gibt und wo Regeln und Details gepflegt werden.

Wenn diese Informationen über Discord, Wiki, Videos und Weltkarten verteilt sind, wissen Erstbesucher nicht immer, wo sie beginnen sollen. Deshalb wurde das Portal als Eingang entworfen, der bestehende Informationsquellen verbindet.

## Ein Einstieg vor der Teilnahme

Die Startseite erklärt Aceserver als kostenlosen öffentlichen Minecraft-Server. Danach zeigt sie, dass Java- und Bedrock-Spieler teilnehmen können, dass der Server nahe an einer Vanilla-Erfahrung bleibt und dass der erste Schritt über den offiziellen Discord führt.

Statt alle Details auf die Seite zu laden, hilft das Portal Besuchern dabei, ihre nächste Aktion zu wählen. Regeln und laufende Updates bleiben über Wiki und Discord verbunden.

## Videos, Karten und Wiki verbunden halten

Das Portal enthält klare Wege zu Videos und Weltkarten. Die Karten sind in Hauptwelt, Ressourcenwelt und RPG-Welt getrennt, damit Besucher schnell zur richtigen Seite gelangen.

Das Wiki ist ebenfalls von der Startseite erreichbar. Informationen, die sich laufend ändern, lassen sich im Wiki leichter pflegen, während das Portal einen stabilen Weg dorthin bereitstellt.

## Für laufende CMS-Aktualisierungen gebaut

Die Website wurde mit Astro, UnoCSS und Sveltia CMS erstellt. Astro liefert das Portal als statische Website aus, während UnoCSS die Styles schlank hält. Seiteninhalte und Website-Einstellungen können im CMS bearbeitet werden, sodass Hinweise und Navigation ohne Codeänderungen aktualisiert werden können.

Unsere Sicht auf schlanken CMS-Betrieb erklären wir im [Sveltia CMS Einrichtungsleitfaden](/de/blog/cms-selection-and-turnstile/). Für Performance statischer Websites siehe [Praxisleitfaden zur Verbesserung der Astro-Website-Performance](/de/blog/astro-performance-tuning/).

## Auch als Fallstudie ergänzt

Acecores [Arbeits- und Portfolioseite](/de/works/) enthält dieses Projekt nun als “Produktion des Aceserver-Portals”.

Die bestehende Fallstudie [Betrieb des öffentlichen Aceserver-Servers](/de/works/#case-aceserver) behandelt Betriebsstabilität und Community-Management. Diese neue Fallstudie konzentriert sich auf das Webportal, das Informationen und Einstiegswege für Spieler organisiert.

Für Portale, Community-Websites und Service-Websites mit verteilten Informationen ist ein klarer erster Einstieg oft wertvoller als das Erzwingen aller Inhalte auf einer einzigen Seite.

## Zusammenfassung

Das Aceserver-Portal ist als Einstieg veröffentlicht, der Serverüberblick, Teilnahme, Videos, Karten und Wiki verbindet.

Acecore unterstützt Website-Erstellung, CMS-Aufbau, Serverbetrieb und Informationsarchitektur für Communities. Für Portale oder Inhaltsorganisation kontaktieren Sie uns über [Website-Erstellung und Betrieb](/de/services/#web) oder [Kontakt](/de/contact/).
