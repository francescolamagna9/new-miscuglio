# Agency Hub v3.0

## Struttura moduli

- **Home** — Dashboard principale con statistiche
- **Progetti** — Gestione completa progetti (hokuto-hub v3): brief AI, checklist fasi, accessi WP, assets, revisioni
- **Interventi** — Tracking interventi tecnici
- **Schede Prodotto AI** — Generatore schede prodotto
- **Archivio Progetti** — Archiviazione progetti completati, template e risorse
- **Impostazioni** — Configurazione API Groq e GitHub Sync

## Moduli rimossi rispetto a v2.x
- ~~Skill & Procedure~~ — eliminato
- ~~Roadmap~~ — eliminato

## Note tecniche
Il modulo Progetti usa il motore hokuto-hub-v3 con CSS bridge per
coerenza visiva con il design system Agency Hub (Inter, palette slate blu).
La Groq API key si configura in Impostazioni, non più nel setup screen.
