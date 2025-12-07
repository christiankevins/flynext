#!/usr/bin/env bash
set -euo pipefail

if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is not installed" >&2
    exit 1
fi

if [ -f .env ]; then
    echo "the .env file already exists"
    exit 0
fi

echo -n "Enter your GOOGLE_MAPS_API_KEY: "
read -r GOOGLE_MAPS_API_KEY

ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 32)
MINIO_PASSWORD=$(openssl rand -hex 32)
AFS_PASSWORD=$(openssl rand -hex 32)

cat << EOF > .env
ACCESS_TOKEN_SECRET=$ACCESS_TOKEN_SECRET
REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET
BASE_URL=http://localhost:3000
POSTGRES_URL=postgres://postgres:$POSTGRES_PASSWORD@localhost:5432/web
POSTGRES_USER=postgres
POSTGRES_PORT=5432
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
MINIO_ENDPOINT=http://localhost:9000
NEXT_PUBLIC_MINIO_ENDPOINT=http://localhost:9000
MINIO_USER=minioadmin
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_PASSWORD=$MINIO_PASSWORD
NEXT_PUBLIC_MINIO_BUCKET_NAME_PROFILE_PICTURES=profile-pictures
NEXT_PUBLIC_MINIO_BUCKET_HOTEL_IMAGES=hotel-images
NEXT_PUBLIC_MINIO_BUCKET_HOTEL_ROOM_TYPE_IMAGES=hotel-room-type-images
AFS_BASE_URL=http://localhost:3001
AFS_POSTGRES_URL=postgres://postgres:$POSTGRES_PASSWORD@localhost:5432/afs
AFS_PASSWORD=$AFS_PASSWORD
GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY
EOF

echo "generated the .env file"