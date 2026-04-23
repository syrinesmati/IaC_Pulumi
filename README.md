# 🚀 TP Pulumi IaC — Infrastructure as Code Locale

Projet d'Infrastructure as Code (IaC) utilisant **Pulumi (TypeScript)** pour déployer localement :
- Un conteneur **PostgreSQL** (base de données)
- Un conteneur **Nginx** (application web)
- Un **bucket S3** simulé via **LocalStack**

Tout tourne en local — aucun compte cloud requis.

---

## 📋 Prérequis

Installer les outils suivants avant de commencer :

| Outil | Version | Lien |
|---|---|---|
| Node.js | ≥ 18 | https://nodejs.org |
| Docker Desktop | dernière | https://www.docker.com/products/docker-desktop |
| Pulumi CLI | dernière | https://www.pulumi.com/docs/install/ |
| Git | dernière | https://git-scm.com |

---

## ⚙️ Installation & Configuration

### 1. Cloner le projet

```bash
git clone https://github.com/syrinesmati/IaC_Pulumi
cd IaC_Pulumi
```

### 2. Installer les dépendances Node

```bash
npm install
```

### 3. Démarrer LocalStack (simulateur AWS local)

```bash
docker run --rm -d \
  -p 4566:4566 \
  -p 4510-4559:4510-4559 \
  --name localstack \
  localstack/localstack
```

> ⏳ Attendre ~10 secondes que LocalStack démarre complètement.

### 4. Se connecter à Pulumi

```bash
pulumi login
```

> Créer un compte gratuit sur https://app.pulumi.com si besoin.

### 5. Sélectionner le stack `dev`

```bash
pulumi stack select dev
# Si le stack n'existe pas encore :
pulumi stack init dev
```

### 6. Configurer les variables

```bash
pulumi config set aws:accessKey test
pulumi config set aws:secretKey test
pulumi config set aws:skipCredentialsValidation true
pulumi config set aws:skipRequestingAccountId true
pulumi config set aws:region us-east-1
pulumi config set aws:endpoints '[{"s3":"http://localhost:4566"}]'

pulumi config set tp-pulumi-iac:dbName devops_db
pulumi config set tp-pulumi-iac:dbUser devops_user
pulumi config set --secret tp-pulumi-iac:dbPassword strongpassword123
pulumi config set tp-pulumi-iac:appPortExternal 8080
```

---

## 🔄 Cycle de Vie du Déploiement (DLC)

### Étape 1 — Preview (simulation)

```bash
pulumi preview
```

> Affiche les ressources qui seront créées, sans rien modifier.

### Étape 2 — Déploiement

```bash
pulumi up
```

> Taper `yes` pour confirmer. Crée les 8 ressources.

### Étape 3 — Validation

Vérifier que l'application Nginx tourne :
```bash
curl http://localhost:8080
```

Vérifier que le bucket S3 LocalStack fonctionne :
```bash
curl http://localhost:4566/tp-static-files/index.html
```

### Étape 4 — Destruction (nettoyage)

```bash
pulumi destroy
```

> Taper `yes` pour confirmer. Supprime tous les conteneurs et ressources.

---

## 📁 Structure du Projet

```
tp3-devops/
├── index.ts            # Code Pulumi principal (ressources)
├── Dockerfile_app      # Image Nginx personnalisée
├── Pulumi.yaml         # Métadonnées du projet
├── Pulumi.dev.yaml     # Config du stack dev
├── package.json        # Dépendances Node
└── tsconfig.json       # Config TypeScript
```

---

## 🏗️ Ressources Déployées

| Ressource | Type | Description |
|---|---|---|
| `tp-iac-network` | Docker Network | Réseau partagé entre les conteneurs |
| `tp-db-postgres` | Docker Container | Base de données PostgreSQL |
| `tp-app-web` | Docker Container | Application web Nginx (port 8080) |
| `tp-static-files` | S3 Bucket (LocalStack) | Hébergement de fichiers statiques |

---

## 📤 Outputs

Après `pulumi up`, les informations suivantes sont affichées :

| Output | Valeur |
|---|---|
| `appAccessUrl` | `http://localhost:8080` |
| `dbContainerName` | `tp-db-postgres` |
| `networkName` | `tp-iac-network` |
| `bucketName` | `tp-static-files` |
| `bucketEndpoint` | `http://localhost:4566/tp-static-files/index.html` |

Pour les revoir à tout moment :
```bash
pulumi stack output
```

---

## ❗ Problèmes Fréquents

**Erreur `invalid character` sur aws:endpoints`**
→ Éditer directement `Pulumi.dev.yaml` et s'assurer que la ligne est :
```yaml
aws:endpoints: '[{"s3":"http://localhost:4566"}]'
```

**LocalStack non démarré**
→ Vérifier avec `docker ps` que le container `localstack` tourne sur le port `4566`.

**Port 8080 déjà utilisé**
→ Changer le port : `pulumi config set tp-pulumi-iac:appPortExternal 8081`

---

## 🛠️ Technologies Utilisées

- **Pulumi** — Infrastructure as Code (TypeScript)
- **Docker** — Conteneurisation
- **LocalStack** — Simulation AWS en local
- **PostgreSQL** — Base de données
- **Nginx** — Serveur web
