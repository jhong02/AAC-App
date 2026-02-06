# AAC-App-CPSC-491

An **AAC (Augmentative and Alternative Communication)** desktop-friendly web app prototype built for **CPSC 491**.  
The goal of this project is to explore a clean, user-friendly AAC interface that helps people with speech difficulties communicate more easily.

## What it does (so far)
- Working **Vite + React** project
- **Home screen** with navigation
- **Placeholder pages** for main sections (Search, Favorites, Talk, Therapy, Profile, Settings)

## Tech Stack
- **React + TypeScript**
- **Vite**
- **React Router**
- CSS (simple styling for now)

## Pages / Routes
- `/` Home
- `/search`
- `/favorites`
- `/talk`
- `/therapy`
- `/profile`
- `/settings`

Planned Features

AAC “talking interface” page with selectable word/phrase tiles

Favorites system for commonly used phrases

Search for phrases/tiles

Profiles (user preferences, saved phrases)

Text-to-speech integration (TTS)

Keyboard + accessibility-friendly UI (large targets, clear contrast)


==FOR GROUPMATES==
1) Install prerequisites (one-time)
- Install **Node.js (LTS)**: https://nodejs.org
- Install **Git**: https://git-scm.com
- Install **VS Code**: https://code.visualstudio.com

Verify installs:
```bash
node -v
npm -v
git --version

2) Clone the repo
Choose a folder (like Desktop), then run:
git clone https://github.com/jhong02/AAC-App-CPSC-491.git
cd AAC-App-CPSC-491
code .

3) Install dependencies + run the app

Inside the project folder:
npm install
npm run dev

Stop the dev server anytime:
Ctrl + C
