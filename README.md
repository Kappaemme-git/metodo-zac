# Metodo ZAC — Landing

Sito vetrina del **Metodo ZAC** di Luigi Zaccone (personal trainer).
Disciplina · Struttura · Evoluzione.

Questa repo contiene solo il sito/landing.

- Sito/landing: `Kappaemme-git/metodo-zac`
- App mobile: `Kappaemme-git/metodo-zac-app`

Non mischiare modifiche tra sito e app.

- `index.html` — home (chi siamo, il metodo, Luigi, programma)
- `metodo.html` — pagina dedicata al metodo e alle 5 fasi
- `questionario.html` — questionario lead magnet, non ancora collegato alla home
- `risultati.html` — pagina risultati del questionario
- `style.css` — stile condiviso
- `assets/` — immagini

Pagina statica, nessuna build: si apre direttamente `index.html`.

## Comandi utili

```bash
python3 -m http.server 4500
```

Poi apri:

```text
http://localhost:4500/
```

## Regole di lavoro

- Non toccare la repo app da qui.
- Non inserire segreti o API key nel codice statico.
- Per feature grandi usa branch/worktree dedicati.
- Verifica desktop e mobile prima di pushare.
