# `flynext`

## Development

### First Time Setup

```sh
npm install                              # Install dependencies
npm run env                              # Generate the .env file
docker compose --profile postgres up -d  # Start postgres
npm run db:push                          # Push the Prisma schema to Postgres
docker compose --profile postgres down   # Stop postgres
```

### After Setup

```sh
docker compose --profile dev up
npm run dev
```
