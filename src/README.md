# BETZONE — Setup Guide

## 1. Instalare pachete
```bash
npm install
```

## 2. Configurare Supabase (baza de date)

### 2a. Creează un proiect gratuit
1. Mergi la [supabase.com](https://supabase.com) → **New Project**
2. Alege un nume și o parolă pentru baza de date

### 2b. Rulează schema SQL
1. În Supabase → **SQL Editor** → **New Query**
2. Copiază conținutul din `supabase_schema.sql` și rulează

### 2c. Obține credențialele
1. **Settings** → **API**
2. Copiază **Project URL** și **anon public** key

## 3. Variabile de mediu
Creează fișierul `.env` în rădăcina proiectului:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opțional — pentru cote sportive reale
# Obține gratuit de la https://the-odds-api.com (500 req/lună)
VITE_ODDS_API_KEY=
```

## 4. Pornire
```bash
npm run dev
# → http://localhost:3000
```

## Structura aplicației

| Rută | Pagină | Protejat |
|------|--------|----------|
| `/auth` | Login / Înregistrare | ✗ |
| `/live` | Pariuri sportive live | ✓ |
| `/prematch` | Pre-match (în curând) | ✓ |
| `/casino` | Lobby casino + 4 jocuri | ✓ |
| `/profile` | Profil + istoric pariuri | ✓ |

## Jocuri casino
- 🃏 **Blackjack** — 3:2 payout, dealer stă la 17
- 🎰 **Slot Machine** — animații reel reale, jackpot 100×, particule
- 🎡 **Ruletă** — roată SVG animată, pariuri externe
- 🎯 **Plinko** — bile cu fizică reală, multiplicatori 0.5×–10×

## Baza de date
- **`profiles`** — sold, username (sincronizat automat)
- **`bets`** — istoricul complet al pariurilor (sports + casino)
