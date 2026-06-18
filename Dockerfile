FROM registry.access.redhat.com/ubi9/nodejs-18:latest

USER 0
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY public ./public

RUN chown -R 1001:0 /app && chmod -R g+rwX /app

USER 1001
EXPOSE 8080

ENV PORT=8080
CMD ["node", "server/index.js"]
