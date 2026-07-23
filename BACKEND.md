# Backend MVP — Metodo ZAC

## Flusso implementato

1. La home porta direttamente al questionario per sbloccare il programma.
2. Il questionario è utilizzabile soltanto quando un PDF è stato caricato.
3. Il browser invia risposte e consensi; il server valida le opzioni e
   ricalcola punteggio, livello e profilo.
4. Il server salva una submission idempotente e restituisce un token personale.
5. Il download verifica il token e genera un link Supabase firmato di 10 minuti.
6. Luigi gestisce contatti e PDF da `/admin.html`.

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

Tutti i segreti devono essere lunghi, casuali e diversi. Dopo il deploy:

1. visita `/api/config` e verifica `ok: true`;
2. apri il questionario dalla home;
3. accedi a `/admin.html`;
4. carica un PDF di prova sotto 4 MB;
5. compila il questionario e verifica il download;
6. cancella i dati sintetici prima del lancio.

Il limite di upload da dashboard è 4 MB perché le Vercel Functions accettano
payload fino a 4,5 MB. Per PDF più grandi va aggiunto un upload diretto con URL
firmato Supabase.

## Decisioni prima del go-live

- Approvare il testo e il punteggio delle domande con Luigi.
- Completare e approvare `privacy.html`, soprattutto email del titolare e tempi
  definitivi di conservazione.
- Caricare il PDF definitivo.
- Scegliere se attivare Brevo e preparare un consenso marketing separato.
- Impostare dominio, mittente email, ambiente di produzione e account di proprietà
  di Luigi.
- Eseguire un test end-to-end con soli dati sintetici.

## Sicurezza inclusa

- Nessuna secret key nel browser o nel repository.
- Cookie admin `HttpOnly`, `SameSite=Strict` e `Secure` in produzione.
- Confronto password timing-safe.
- Punteggio calcolato solo dal server.
- Token download derivato con HMAC e salvato soltanto come hash.
- PDF privato e link breve.
- Consenso operativo separato dal consenso marketing.
- Honeypot, compilazione minima di 5 secondi, idempotenza e rate limit orario.
- Hash IP ruotato giornalmente; nessun IP salvato in chiaro.

## Non incluso

- Invio email/Brevo: richiede dominio mittente e account di Luigi.
- Recupero password o più amministratori.
- Editor visuale delle domande: le domande v1 restano versionate nel codice.
- Consulenza legale: la privacy è una bozza tecnica da validare.
