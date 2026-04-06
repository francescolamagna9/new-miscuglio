# 🐙 Come funziona GitHub Sync — Agency Hub

## Cosa fa esattamente

Il GitHub Sync salva **tutti i tuoi dati** (progetti, interventi, skill,
archivio, roadmap, log attività) come file JSON in una repository GitHub
privata di tua proprietà.

In questo modo puoi:
- Lavorare dal PC di casa e dal portatile vedendo **sempre gli stessi dati**
- Avere un **backup automatico nel cloud** ad ogni salvataggio
- Non perdere nulla anche se svuoti la cache del browser
- I dati sono **tuoi** — nella tua repository, non su server di terzi

---

## Setup: passo dopo passo

### 1. Crea una repository GitHub (privata)

1. Vai su [github.com/new](https://github.com/new)
2. Nome: `agency-hub-data` (o quello che vuoi)
3. Metti **Privata** (Private)
4. Spunta "Add a README file"
5. Clicca **Create repository**

### 2. Crea un Personal Access Token

1. Vai su GitHub → clicca la tua foto → **Settings**
2. Scorri in fondo → **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**
4. Clicca **Generate new token (classic)**
5. Description: `Agency Hub Sync`
6. Scadenza: scegli almeno 1 anno (o "No expiration")
7. Spunta **repo** (dà accesso completo alla repository)
8. Clicca **Generate token**
9. **COPIA SUBITO IL TOKEN** — viene mostrato solo una volta!
   Ha la forma: `ghp_xxxxxxxxxxxxxxxxxxxx`

### 3. Configura Agency Hub

1. Apri Agency Hub → **Impostazioni** (⚙️)
2. Nella sezione **GitHub Sync**:
   - **Token**: incolla il token copiato (`ghp_...`)
   - **Repository**: `tuousername/agency-hub-data`
   - **Branch**: `main`
3. Clicca **💾 Salva**
4. Clicca **🔍 Testa connessione**
5. Se vedi "✓ Connesso" — sei a posto!
6. Clicca **⟳ Sync ora** per fare il primo upload di tutti i dati

---

## Come funziona nella pratica

### Quando salvi qualcosa
Ogni volta che crei/modifichi un progetto, intervento o skill:
1. Viene salvato nel `localStorage` del browser (immediato)
2. Viene inviato a GitHub via API (asincrono, ~1-2 secondi)
3. L'indicatore in sidebar mostra "Salvato · HH:MM"

### Quando apri l'app su un nuovo dispositivo
1. Configura il token GitHub nelle Impostazioni
2. Apri qualsiasi pagina — viene fatto un `pullAll()` automatico
3. I dati vengono scaricati da GitHub e scritti nel localStorage locale
4. Vedi tutto come sul dispositivo originale

### Struttura dei file su GitHub
```
agency-hub-data/
├── README.md
└── data/
    ├── hub_progetti.json
    ├── hub_interventi.json
    ├── hub_skills.json
    ├── hub_archivio.json
    ├── hub_roadmap.json
    ├── hub_activity.json
    ├── hub_stats.json
    └── files/
        └── (file caricati nelle Skill)
```

---

## Domande frequenti

**Il token viene trasmesso a server terzi?**
No. Il token viene salvato solo nel `localStorage` del tuo browser e
viene usato esclusivamente per chiamate dirette all'API di GitHub
(`api.github.com`). Non passa per nessun server intermedio.

**Cosa succede se sono offline?**
I dati vengono salvati normalmente nel localStorage. La sync viene
saltata silenziosamente. Al prossimo avvio online, fai un "Sync ora"
manuale per allineare tutto.

**Il token scade?**
Se hai scelto una scadenza, sì. Quando scade, crea un nuovo token
su GitHub e aggiornalo nelle Impostazioni di Agency Hub.

**Posso avere più browser/dispositivi aperti contemporaneamente?**
Sì, ma se modifichi la stessa cosa su due dispositivi quasi
contemporaneamente, vince l'ultimo salvataggio (last-write-wins).
Consiglio: lavora da un dispositivo alla volta.

**Voglio cambiare repository o resettare il sync?**
Vai in Impostazioni, inserisci la nuova repository e il nuovo token,
poi clicca "Sync ora" per fare un push completo dei dati.

---

## Sicurezza

- Usa **sempre** una repository **privata**
- Non condividere mai il token GitHub
- Il token ha scope `repo` — dà accesso completo a quella repository
- Se il token viene compromesso: revocalo su GitHub e creane uno nuovo
