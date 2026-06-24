# Weekmenu Planner — PWA

## Hosten op GitHub Pages (eenmalig, daarna automatisch)

### 1. Nieuwe GitHub-repository aanmaken
- Ga naar github.com → **New repository**
- Geef een naam (bv. `weekmenu-planner`) — **deze naam komt terug in de URL**
- Laat hem **public** (nodig voor gratis GitHub Pages)
- Maak hem **leeg** (geen README/license aanvinken)

### 2. Deze bestanden uploaden
Upload de **volledige inhoud van deze map** (inclusief de verborgen `.github`-map en `.gitignore`) naar je nieuwe repository. Dat kan op twee manieren:

**Optie A — via de GitHub-website (geen terminal nodig):**
1. Open je nieuwe repo → "uploading an existing file"
2. Sleep alle bestanden en mappen erin (let op: de `.github`-map moet je apart toevoegen, drag-and-drop van een hele map werkt niet altijd via de browser — zie Optie B als dat lastig gaat)
3. Commit naar `main`

**Optie B — via git op je computer (aanbevolen, behoudt mapstructuur correct):**
```bash
cd weekmenu-planner        # de map met al deze bestanden
git init
git add .
git commit -m "Eerste versie"
git branch -M main
git remote add origin https://github.com/<jouw-gebruikersnaam>/<repo-naam>.git
git push -u origin main
```

### 3. GitHub Pages activeren
1. Ga in je repo naar **Settings → Pages**
2. Bij "Build and deployment" → **Source**: kies **"GitHub Actions"** (niet "Deploy from a branch")
3. Klaar — de workflow in `.github/workflows/deploy.yml` bouwt en publiceert nu automatisch

### 4. Wachten en bekijken
- Ga naar het tabblad **Actions** in je repo — daar zie je de build live lopen (duurt ~1 minuut)
- Zodra hij groen is: je app staat live op `https://<jouw-gebruikersnaam>.github.io/<repo-naam>/`

### 5. Updates uploaden
Elke keer dat je iets aanpast in `src/App.jsx` en dat naar `main` pusht (of opnieuw via de website uploadt), bouwt en publiceert GitHub automatisch de nieuwe versie. Je hoeft zelf nooit `npm run build` te draaien.

---

## Lokaal testen (optioneel)
Als je het eerst zelf wilt bekijken voordat je het online zet:
```bash
npm install
npm run dev
```
Dit start een lokale server (meestal op `http://localhost:5173`).

## Wat zit er in dit project?
- `src/App.jsx` — je weekmenu-app, ongewijzigd
- `src/main.jsx` — start de app op
- `index.html` — basis HTML-pagina
- `vite.config.js` — bouwconfiguratie + PWA-instellingen (manifest, service worker)
- `public/icons/` — de app-iconen die op het startscherm verschijnen na "installeren"
- `.github/workflows/deploy.yml` — bouwt en publiceert automatisch bij elke push

## App-icoon vervangen
De huidige iconen (`public/icons/icon-192.png` en `icon-512.png`) zijn eenvoudige placeholders. Vervang ze gerust door je eigen logo — zelfde bestandsnamen en afmetingen (192×192 en 512×512 pixels) aanhouden, dan werkt het automatisch.

## "Installeren" op telefoon/desktop
Zodra de app online staat, kun je hem op een telefoon of in Chrome/Edge op desktop "installeren" (toevoegen aan beginscherm) — dat is het PWA-effect: hij gedraagt zich dan als een gewone app, met eigen icoon en zonder browser-balk.
