# POC - MariaDB FinOps Auditor

Ce dossier contient les preuves de concept pour valider la faisabilité technique.

## POCs à réaliser

- [ ] **POC 1** : MCP Server - Connexion à MariaDB
- [ ] **POC 2** : Vector Search - Table VECTOR sur SkySQL
- [ ] **POC 3** : Copilot API - Authentification et question test
- [ ] **POC 4** : Parser slow_query_log

## Prérequis

- Node.js 18+
- Compte SkySQL (pour POC 2)
- Instance MariaDB locale (pour POC 1 & 4)

## Installation

```bash
npm install
```

## Exécution des POCs

```bash
# POC 1 - MCP Server
node poc1-mcp.js

# POC 2 - Vector Search
node poc2-vector.js

# POC 4 - Parser
node poc4-parser.js
```
