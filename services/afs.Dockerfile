# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine

RUN apk add --no-cache libc6-compat git curl
WORKDIR /app
RUN git clone https://github.com/Kianoosh76/afs
WORKDIR /app/afs
RUN git checkout b3eee4edd597bfc0545ff99fbbf4e2c0c065b222
COPY .env .

ARG AFS_PASSWORD
ENV AFS_PASSWORD=${AFS_PASSWORD}

# Patch agencies.js to include the AFS_PASSWORD
RUN cat <<EOF > ./prisma/data/agencies.js
const agencies = [
  "${AFS_PASSWORD}",
];

module.exports = {
  agencies,
};
EOF

# Patch schema.prisma to change DATABASE_URL to AFS_POSTGRES_URL
RUN sed -i 's/DATABASE_URL/AFS_POSTGRES_URL/g' prisma/schema.prisma

# Patch a healthcheck
RUN mkdir -p ./app/api/health
RUN cat <<EOF > ./app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
EOF

RUN npm install --frozen-lockfile
RUN npm run build

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
CMD ["sh", "-c", "npx -y prisma db push && node prisma/data/import_data && node prisma/data/generate_flights && node prisma/data/import_agencies && npm run start"]