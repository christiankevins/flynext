# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat git curl
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* .npmrc* ./
COPY prisma ./prisma/
RUN npm install --frozen-lockfile

# Build
COPY . .
RUN npm run build

# Run
ENV NODE_ENV=production
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["sh", "-c", "npm run start"]