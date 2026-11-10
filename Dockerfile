
# --- Étape 1 : Construction de l'application (Build Stage) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Déclaration d'argument pour configurer l'URL du backend Spring Boot au build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copie des fichiers de dépendances en premier pour bénéficier du cache Docker
COPY package.json package-lock.json* bun.lock* ./

# Installation des dépendances
RUN npm install --frozen-lockfile || npm install

# Copie de l'intégralité du code source du frontend
COPY . .

# Construction des fichiers statiques optimisés dans le dossier dist/
RUN npm run build

# --- Étape 2 : Image de production légère avec Nginx ---
FROM nginx:alpine

# Suppression de la page d'accueil par défaut de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copie des fichiers compilés depuis l'étape de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copie de la configuration Nginx adaptée au routage SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposition du port 80 (ou port HTTP standard)
EXPOSE 80

# Démarrage de Nginx au premier plan
CMD ["nginx", "-g", "daemon off;"]
