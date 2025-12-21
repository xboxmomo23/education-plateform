FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++
COPY package*.json ./
RUN npm ci

FROM deps AS dev
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

FROM deps AS builder
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "const http=require('http');const port=process.env.PORT||4000;const req=http.request({host:'127.0.0.1',port,path:'/api/health',timeout:5000},res=>{process.exit(res.statusCode===200?0:1);});req.on('error',()=>process.exit(1));req.end();"
CMD ["node", "dist/server.js"]
