FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL e gravado no bundle pelo Vite em tempo de BUILD.
# No Railway, defina VITE_API_URL como variavel "disponivel em build".
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Porta padrao; em producao o Railway injeta $PORT.
ENV PORT=80
# Usado apenas pelo proxy /api do nginx (evita proxy_pass vazio).
ENV VITE_API_URL=http://localhost:8000
EXPOSE 80

CMD ["/bin/sh", "-c", "envsubst '${PORT} ${VITE_API_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
