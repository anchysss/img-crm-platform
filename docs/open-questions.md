# Otvorena pitanja za Naručioca

Ovde se beleže nejasnoće koje zahtevaju odluku IMG-a (PZ 19).

| # | Pitanje | Kontekst | Predložena pretpostavka |
|---|---------|----------|-------------------------|
| 1 | Tačan format fiskalne fakture po zemlji (XSD, SRB SEF, HR eRačun) | PZ 4.11 | Adapter interfejs, konkretan provider po zemlji dok ne dobijemo XSD. |
| 2 | Redoslijed Stage-ova prilagođen po zemlji ili globalni? | PZ 4.4 | Globalno, Admin može dodati dodatni Stage per pravno lice u M11. |
| 3 | Dužina holda (konfigurabilno default 14 dana) | PZ 4.4 | 14 dana per tenant, konfigurabilno u Admin. |
| 4 | Valuta konverzija za grupni dashboard | PZ 4.13 | Prikaz po valuti; ako Admin traži konsolidaciju → ECB ref kurs na datum. |
| 5 | SSO provider (Azure AD, Google Workspace) | PZ 4.1 | Arhitektura podržava, ali ne aktiviramo u M1. |
| 6 | Retention period za AuditLog | PZ 4.16 | 24 meseca (PZ minimum), konfigurabilno. |
| 7 | Komunikacija sa ERP-om (push/pull/SFTP) | PZ 4.11 | SFTP push + webhook pull ack. |
