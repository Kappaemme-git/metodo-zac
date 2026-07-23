# Metodo ZAC — Landing

Sito vetrina del **Metodo ZAC** di Luigi Zaccone (personal trainer).
Disciplina · Struttura · Evoluzione.

Questa repo contiene solo il sito/landing.

- Sito/landing: `Kappaemme-git/metodo-zac`
- App mobile: `Kappaemme-git/metodo-zac-app`

Non mischiare modifiche tra sito e app.

- `index.html` — home (chi siamo, il metodo, Luigi, programma)
- `metodo.html` — pagina dedicata al metodo e alle 5 fasi
- `questionario.html` — questionario collegato al programma gratuito in home
- `risultati.html` — pagina risultati del questionario
- `style.css` — stile condiviso
- `assets/` — immagini

Il frontend resta HTML/CSS/JS senza build. Il funnel dinamico usa funzioni Node
compatibili con Vercel e un adapter Supabase; in locale usa un archivio JSON
ignorato da Git.

## Comandi utili

```bash
npm install
npm run dev
```

Poi apri:

```text
Sito:      http://localhost:4500/
Dashboard: http://localhost:4500/admin.html
Password locale: zac-local
```

Per popolare la dashboard con contatti sintetici:

```bash
npm run seed
```

Controlli completi:

```bash
npm run check
```

## Backend MVP

- Questionario con consenso operativo e consenso marketing facoltativo separati.
- Questionario validato e ricalcolato sul server; il browser non decide il punteggio.
- Profilo `Principiante / Intermedio / Avanzato` con messaggio personalizzato.
- PDF privato, caricato da Luigi e consegnato solo al browser che ha completato
  il questionario.
- Dashboard protetta con statistiche, filtri, dettagli ed export CSV.
- Adapter locale persistente e adapter Supabase per produzione.
- Honeypot, tempo minimo, idempotenza e limite orario su hash IP giornaliero.

La configurazione completa è in [BACKEND.md](BACKEND.md). La migration Supabase
è in `supabase/migrations/202607130001_backend_mvp.sql`.

## Regole di lavoro

- Non toccare la repo app da qui.
- Non inserire segreti o API key nel codice statico.
- Per feature grandi usa branch/worktree dedicati.
- Verifica desktop e mobile prima di pushare.
- Non pubblicare mai `SUPABASE_SECRET_KEY`, password o segreti di sessione.
