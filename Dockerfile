# Dev container for Next.js frontend
FROM node:20-alpine

WORKDIR /app

# Install minimal build tooling for Next.js native deps
RUN apk add --no-cache libc6-compat

# Install dependencies separately to leverage Docker cache
COPY package*.json ./
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]


# Copy application sources
COPY . .

EXPOSE 3000

# Run Next.js in dev mode on all interfaces
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
