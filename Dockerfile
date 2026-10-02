FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
ENV NODE_ENV=production
EXPOSE 5000
USER node
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "server.js"]