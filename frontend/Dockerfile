# Imagen del frontend (TASK-038, ADR-003/ADR-009): Vite en modo dev con HMR.
# El proxy de la API apunta al servicio `backend` del compose mediante
# `VITE_PROXY_TARGET`, de modo que el navegador habla con un único origen.
FROM node:20-slim AS dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
