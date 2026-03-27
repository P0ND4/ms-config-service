# Config Service

Servicio de configuracion centralizada para microservicios, con almacenamiento activo en Redis, auditoria de cambios, rollback y recarga de semilla.

## Alcance
- Gestion de variables por microservicio.
- Historial de cambios con actor y razon.
- Rollback del ultimo cambio aplicado.
- Publicacion de eventos por canal Redis.
- Recarga de configuracion semilla al inicio o bajo demanda.

## Stack
- NestJS
- Redis (ioredis)
- Swagger
- Jest (unit y e2e)
- Docker / Docker Compose

## Inicio rapido
1. Instalar dependencias.
```bash
pnpm install
```
2. Preparar entorno.
```bash
cp .env.example .env
cp src/app/bootstrap/bootstrap-config.example.json src/app/bootstrap/bootstrap-config.json
```
3. Levantar en desarrollo.
```bash
pnpm setup:dev
```

## Scripts principales
- `pnpm setup`
- `pnpm setup:dev`
- `pnpm setup:prod`
- `pnpm start:dev`
- `pnpm build`
- `pnpm test`
- `pnpm test:cov`
- `pnpm test:e2e`

## Docker
Arranque del stack:
```bash
docker compose up -d --build
```

Politica de puertos:
- Solo se expone el puerto del servicio principal (`3000`).
- Redis queda accesible solo dentro de la red interna de Docker.

## Endpoints base
- Base API: `/api`
- Recurso principal: `/api/configs`
- Swagger (no produccion): `/api`

## Documentacion operativa
Para procedimientos detallados de despliegue, troubleshooting y checklist:
- [docs/OPERACION_PROYECTO.md](docs/OPERACION_PROYECTO.md)
