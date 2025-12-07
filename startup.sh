#!/bin/bash
./scripts/generate-env.sh
docker compose --profile migrate up --build --abort-on-container-exit --exit-code-from migrate