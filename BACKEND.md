# Backend MVP — Metodo ZAC

## Flusso implementato

1. La home porta direttamente al questionario per sbloccare il programma.
2. Il questionario è utilizzabile quando almeno una versione del programma è
   stata caricata.
3. Il browser invia risposte e consensi; il server valida le opzioni e
   ricalcola punteggio, livello e profilo.
4. Il server salva una submission idempotente e autorizza quel browser tramite
   un cookie `HttpOnly`.
5. Se il consenso marketing è stato accettato, il contatto viene sincronizzato
   con Brevo nella lista coerente con il livello calcolato.
6. Il download richiede quel cookie, sceglie il programma dal genere salvato e
   genera un link Supabase firmato di 10 minuti. `Donna` riceve il PDF Donna;
   `Uomo` e `Preferisco non dirlo` ricevono il PDF Uomo.
   Copiare il collegamento su un altro dispositivo riporta al questionario.
7. Luigi gestisce contatti e i due PDF separati da `/admin.html`.

## Esecuzione locale

```bash
npm install
npm run seed
npm run dev
```

L’archivio locale si trova in `.data/dev-store.json` e non viene tracciato.
Il server locale usa la password `zac-local`; non è una credenziale di produzione.

## Configurazione Supabase

1. Crea un progetto Supabase di proprietà di Luigi.
2. Applica `supabase/migrations/202607130001_backend_mvp.sql`.
3. Verifica che il bucket `lead-magnets` sia privato.
4. Non aggiungere policy pubbliche: tabelle e bucket sono usati solo dal backend.
5. Genera/copia una secret key server-side, non la publishable key.

La migration revoca l’accesso ad `anon` e `authenticated`, abilita RLS e concede
l’accesso soltanto a `service_role`. La secret key Supabase va impostata unicamente
nelle variabili protette dell’hosting.

## Configurazione Vercel

GitHub Pages non esegue funzioni server: per attivare il backend, importa questa
repo in Vercel e configura le variabili presenti in `.env.example`:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `DOWNLOAD_TOKEN_SECRET`
- `IP_HASH_SECRET`
- `SITE_ORIGIN`
- `BREVO_API_KEY`

Le liste Brevo attualmente collegate sono:

- `Principiante` → lista `3`
- `Intermedio` → lista `4`
- `Avanzato` → lista `5`

Gli ID possono essere modificati senza cambiare il codice tramite
`BREVO_LIST_PRINCIPIANTE_ID`, `BREVO_LIST_INTERMEDIO_ID` e
`BREVO_LIST_AVANZATO_ID`.

Per ogni contatto vengono aggiornati `NOME`, `COGNOME`, `LIVELLO_ZAC`,
`PUNTEGGIO_ZAC` e `OBIETTIVO_ZAC`. Se il livello cambia, il contatto viene
rimosso dalle altre due liste ZAC. Un errore temporaneo di Brevo non blocca né
il risultato né il download del PDF.

Tutti i segreti devono essere lunghi, casuali e diversi. Dopo il deploy:

1. visita `/api/config` e verifica `ok: true`;
2. apri il questionario dalla home;
3. accedi a `/admin.html`;
4. carica i PDF Uomo e Donna, fino a 50 MB ciascuno;
5. compila il questionario con tutte le opzioni di genere e verifica i download;
6. cancella i dati sintetici prima del lancio.

I due PDF vengono inviati direttamente dal browser allo Storage privato di Supabase
con un’autorizzazione temporanea creata dal backend. Il caricamento è suddiviso
in blocchi da 6 MB, mostra l’avanzamento e riprende automaticamente dopo brevi
interruzioni di rete. Il limite applicativo e del bucket è 50 MB.

Nel progetto Supabase verificare anche `Storage → Settings → Global file size
limit = 50 MB`: il limite globale deve essere almeno uguale a quello del bucket
`lead-magnets`.

## Decisioni prima del go-live

- Approvare il testo e il punteggio delle domande con Luigi.
- Completare e approvare `privacy.html`, soprattutto email del titolare e tempi
  definitivi di conservazione.
- Caricare entrambi i PDF definitivi.
- Preparare e approvare le tre automazioni email Brevo prima di attivarle.
- Impostare dominio, mittente email, ambiente di produzione e account di proprietà
  di Luigi.
- Eseguire un test end-to-end con soli dati sintetici.

## Sicurezza inclusa

- Nessuna secret key nel browser o nel repository.
- Upload PDF diretto e ripristinabile; il browser riceve soltanto un token
  temporaneo limitato al singolo percorso generato dal server.
- Cookie admin `HttpOnly`, `SameSite=Strict` e `Secure` in produzione.
- Confronto password timing-safe.
- Punteggio calcolato solo dal server.
- Token download derivato con HMAC, salvato soltanto come hash e legato al
  browser tramite cookie `HttpOnly`.
- PDF privato e link breve.
- Consenso operativo separato dal consenso marketing.
- Honeypot, compilazione minima di 5 secondi, idempotenza e rate limit orario.
- Hash IP ruotato giornalmente; nessun IP salvato in chiaro.

## Non incluso

- Contenuto e attivazione delle automazioni email Brevo: richiedono
  l’approvazione di Luigi e, per il go-live, un dominio mittente autenticato.
- Recupero password o più amministratori.
- Editor visuale delle domande: le domande v1 restano versionate nel codice.
- Consulenza legale: la privacy è una bozza tecnica da validare.
