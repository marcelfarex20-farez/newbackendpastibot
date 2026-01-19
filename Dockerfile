# Usamos una versión estable de Node que Prisma 6/7 aman
FROM node:20.18-slim

# Instalamos dependencias necesarias para Prisma (openssl)
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalamos TODAS las dependencias (necesitamos devDeps para buildear Nest)
RUN npm install

# Copiamos el resto del código
COPY . .

# Generamos el cliente de Prisma y buildeamos el proyecto
RUN npx prisma generate
RUN npm run build

# Exponemos el puerto
EXPOSE 3000

# Comando de inicio: Migraciones + App
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
