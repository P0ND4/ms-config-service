# Documentacion Operativa - Config Service

## 1. Resumen
Config Service es el microservicio centralizado para administrar configuraciones activas por microservicio.
Esta implementado con NestJS y Redis, y expone endpoints para alta, consulta, actualizacion, eliminacion, historial, rollback y recarga de configuracion semilla.

Responsabilidades principales:
- Gestion centralizada de variables por microservicio.
- Auditoria de cambios (before/after, actor, razon, timestamp).
- Rollback de ultimo cambio por servicio.
- Publicacion de eventos de sincronizacion por Pub/Sub.
- Recarga de configuracion inicial desde archivo semilla.

Prefijos y rutas importantes:
- API base: /api
- Recurso principal: /api/configs
- Swagger (no produccion): /api

## 2. Requisitos
- Node.js 22+
- pnpm (via Corepack recomendado)
- Redis 7+
- Docker + Docker Compose (opcional para despliegue local/prod)

## 3. Archivos Clave del Proyecto
- Bootstrap de app: src/main.ts
- Variables de entorno: src/config/environment.config.ts
- Modulo Redis: src/database/redis.module.ts
- Controller HTTP: src/contexts/config/infrastructure/http-api/controllers/configs.controller.ts
- Use case principal: src/contexts/config/application/config.use-case.ts
- Repositorio Redis: src/contexts/shared/infrastructure/repositories/config.repository.ts
- Seed de ejemplo: src/app/bootstrap/bootstrap-config.example.json

## 4. Variables de Entorno
Usar .env.example como base.

Variables principales:
- NODE_ENV: entorno de ejecucion (development o production)
- PORT: puerto HTTP del servicio
- REDIS_URL: URL completa de Redis (opcional)
- REDIS_HOST: host Redis (si no se usa REDIS_URL)
- REDIS_PORT: puerto Redis
- REDIS_PASSWORD: password Redis (opcional)
- REDIS_USERNAME: usuario Redis ACL (opcional)
- CONFIG_SEED_FILE_PATH: ruta del archivo semilla JSON
- CONFIG_PUBSUB_CHANNEL: canal Redis para eventos

Notas:
- Si REDIS_URL esta presente, se prioriza sobre REDIS_HOST/REDIS_PORT.
- En contenedor, se usa CONFIG_SEED_FILE_PATH=/app/bootstrap/bootstrap-config.json mediante volumen montado desde el host.

## 5. Ejecucion Local (sin Docker)
1. Instalar dependencias:
```bash
pnpm install
```
2. Crear .env desde .env.example.
3. Asegurar Redis activo.
4. Crear archivo semilla local si no existe:
```bash
cp src/app/bootstrap/bootstrap-config.example.json src/app/bootstrap/bootstrap-config.json
```
5. Ejecutar modo desarrollo:
```bash
pnpm start:dev
```

## 6. Scripts Operativos
Scripts agregados en raiz del proyecto:
- setup.sh: selecciona flujo dev/prod segun variables de entorno.
- setup-dev.sh: prepara .env, semilla local, levanta Redis con Docker Compose y arranca Nest en watch mode.
- setup-prod.sh: prepara .env y levanta stack productivo por Docker Compose.

Variables consideradas por setup.sh:
- ENVIRONMENT
- APP_ENV
- NODE_ENV
- DBOX_ENV

Mapeo:
- production, prod, staging -> setup-prod.sh
- cualquier otro valor -> setup-dev.sh

Tambien disponibles en package.json:
- pnpm setup
- pnpm setup:dev
- pnpm setup:prod

## 7. Docker

### 7.1 Dockerfile
Se usa construccion multistage:
- builder: instala dependencias, compila y reduce dependencias a produccion.
- runner: copia dist y node_modules; la semilla real se inyecta en runtime por volumen.

Imagen final expone puerto 3000 y ejecuta:
```bash
node dist/main
```

### 7.2 Docker Compose
Servicios:
- config-service
- redis

Comando de arranque:
```bash
docker-compose up -d --build
```

Con plugin Docker Compose v2:
```bash
docker compose up -d --build
```

Detener stack:
```bash
docker-compose down
```

Limpiar volumen Redis (destructivo):
```bash
docker-compose down -v
```

## 8. Endpoints Principales
- GET /api/configs
- GET /api/configs/:service
- POST /api/configs/:service
- PATCH /api/configs/:service
- DELETE /api/configs/:service/:key
- GET /api/configs/:service/history
- POST /api/configs/:service/rollback
- POST /api/configs/reload

## 9. Comandos de Calidad
- Build: pnpm build
- Unit tests: pnpm test
- Cobertura: pnpm test:cov
- E2E: pnpm test:e2e

## 10. Que se debe hacer
- Mantener .env actualizado por entorno.
- Definir actor y razon en cambios operativos para trazabilidad.
- Validar build y tests antes de desplegar.
- Restringir acceso de red a Redis.
- Mantener archivo semilla consistente y auditado por version.

## 11. Que no se debe hacer
- No usar credenciales Redis vacias en entornos reales sin red aislada.
- No desplegar en produccion con NODE_ENV=development.
- No ejecutar recarga de semilla sin verificar impacto.
- No exponer Redis a red publica.

## 12. Troubleshooting Rapido

### 12.1 Error de conexion Redis
- Validar REDIS_URL o REDIS_HOST/REDIS_PORT.
- Confirmar contenedor redis en estado healthy.

### 12.2 Error de semilla no encontrada
- Revisar CONFIG_SEED_FILE_PATH.
- En local, confirmar existencia de src/app/bootstrap/bootstrap-config.json.
- En Docker, confirmar volumen de ./src/app/bootstrap/bootstrap-config.json a /app/bootstrap/bootstrap-config.json.

### 12.3 Swagger no aparece
- Swagger se habilita solo cuando NODE_ENV != production.

## 13. Checklist previo a produccion
- [ ] NODE_ENV=production
- [ ] REDIS configurado con credenciales y red privada
- [ ] CONFIG_SEED_FILE_PATH valido en runtime
- [ ] pnpm test en verde
- [ ] pnpm test:e2e en verde
- [ ] pnpm build en verde
- [ ] docker-compose config validado
