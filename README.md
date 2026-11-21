# EcoConecta – Villas de San Pablo

Plataforma comunitaria inclusiva estilo Cataki para conectar hogares y unidades productivas de **Villas de San Pablo (Barranquilla, Colombia)** con los colectivos comunitarios de **huerteros** (residuos orgánicos) y **recicladores de oficio** (residuos reciclables).

> **Canal exclusivo de solicitudes — WhatsApp móvil real:** No existe chat interno ni simulador web de WhatsApp ni formularios web de solicitud. Los vecinos piden la recolección directamente desde su **app móvil real de WhatsApp** (por mensaje de texto o **nota de voz `.ogg`**), y la página web recibe, transcribe, clasifica y organiza los pedidos para los coordinadores en `/coordinacion`.

---

## Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Web Speech API (**🔊 Escuchar**) |
| **Backend** | Python 3.12 · FastAPI · SQLAlchemy 2 · Psycopg 3 · Pydantic v2 · PyJWT · HTTPX |
| **Base de datos** | PostgreSQL 16 (`NUMERIC(10,2)` para pesos en kg/lb y puntos decimales) |
| **Canal móvil** | **Meta WhatsApp Business Cloud API** (`GET` y `POST /api/webhooks/whatsapp`) + enlace oficial `https://wa.me/{WHATSAPP_PUBLIC_NUMBER}?text=...` |
| **IA (Audio y Clasificación)** | **OpenAI API** (`gpt-4o-mini-transcribe` / `whisper-1` para transcripción en español y `gpt-4o-mini` Structured Outputs para clasificar flujo y datos del pedido sin enviar PII innecesario) |
| **Contenedores** | Docker & `docker-compose.yml` (PostgreSQL + Backend + Frontend) |

---

## Inicio Rápido con Docker

### 1. Configurar variables de entorno
Copia el archivo de ejemplo y configura tus credenciales de PostgreSQL, Meta WhatsApp Business Cloud API y OpenAI:

```bash
cp .env.example .env
```

*(En PowerShell: `Copy-Item .env.example .env`)*

Variables clave en `.env`:
- `WHATSAPP_PUBLIC_NUMBER`: número público oficial (solo dígitos, ej. `573001234567`) usado en el botón **"Pedir Recolección por WhatsApp"**.
- `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`: credenciales de Meta Cloud API para descargar notas de voz `.ogg` y responder automáticamente al WhatsApp móvil del usuario.
- `WHATSAPP_VERIFY_TOKEN` (y opcional `WHATSAPP_APP_SECRET`): verificación oficial del webhook `GET`/`POST /api/webhooks/whatsapp`.
- `OPENAI_API_KEY`: transcripción de audios (`gpt-4o-mini-transcribe` / `whisper-1`) y clasificación estructurada (`gpt-4o-mini`).

### 2. Levantar la plataforma

```bash
docker compose up --build
```

*(Si actualizas desde una versión anterior de la BD y deseas un volumen limpio: `docker compose down -v && docker compose up --build`.)*

### 3. URLs locales
- **Portal Público (Landing Cataki + botón 🔊 Escuchar + CTA WhatsApp):** `http://localhost:3000`
- **Centro de Ayuda y Reglamentos (`/ayuda`):** `http://localhost:3000/ayuda`
- **Panel Operativo de Coordinadores (`/coordinacion`):** `http://localhost:3000/coordinacion`
- **Mis Puntos y Beneficios (Ciudadano):** `http://localhost:3000/mis-puntos`
- **Acceso Rápido Demo (Login):** `http://localhost:3000/login`
- **Webhook Meta WhatsApp Cloud API:** `GET` y `POST http://localhost:8000/api/webhooks/whatsapp` (también proxy en `http://localhost:3000/api/webhooks/whatsapp`)
- **Documentación interactiva API (Swagger):** `http://localhost:8000/docs`

---

## Flujo Completo (WhatsApp Móvil → PostgreSQL → `/coordinacion`)

1. **Portal Público (`/` y `/ayuda`):** diseño inclusivo con botón **"🔊 Escuchar"** y botón principal **"Pedir Recolección por WhatsApp"** con enlace oficial `https://wa.me/{WHATSAPP_PUBLIC_NUMBER}?text=Hola,%20quiero%20pedir%20una%20recolecci%C3%B3n%20en%20Villas%20de%20San%20Pablo`.
2. **Recepción automática (`GET`/`POST /api/webhooks/whatsapp`):**
   - Recibe mensajes de **texto** y **notas de voz (`.ogg`)** reales desde Meta Cloud API.
   - Si es audio, descarga el `.ogg` desde Meta Graph API con `WHATSAPP_TOKEN` y lo transcribe a español con OpenAI (`gpt-4o-mini-transcribe` / `whisper-1`).
   - Clasifica con `gpt-4o-mini` (Structured Outputs, redactando PII innecesario) el **flujo (`organico` o `reciclable`)**, dirección mencionada, tipo de generador, resumen de material y preferencia horaria.
   - Cruza el teléfono `from` con `usuarios` en PostgreSQL: si existe, vincula el hogar/unidad productiva (y bandera piloto); si es nuevo, crea perfil básico con `profile.name` marcado como *"Pendiente de completar datos"*.
   - Guarda la solicitud (`ECO-2026-XXXX`, estado `recibida`) y responde automáticamente por WhatsApp confirmando el código y el coordinador asignado.
3. **Panel Operativo de Coordinadores (`/coordinacion`):**
   - Bandeja en tiempo real (auto-actualización cada 10s) separada estrictamente por flujo (**RN-01**): `coordinador_huerteros` (orgánicos) y `coordinador_recicladores` (reciclables).
   - Muestra **Código**, **Usuario y Hogar/Unidad Productiva**, **Teléfono**, **Dirección**, **Mensaje o Transcripción del Audio** y estado actual.
   - Botón **`Mover a Orgánicos` / `Mover a Reciclables`** para reclasificar pedidos mezclados o mal clasificados, y verificación rápida de usuarios nuevos.
   - **Programación (RN-02 y RN-03):** asigna huertero/reciclador + día/hora y envía confirmación automática al WhatsApp móvil.
   - **Cierre obligatorio con peso en kg / lb (RN-05 y RN-06):** precarga/edita nombre del solicitante, selecciona encargado y peso en **kg** o **lb**, cambia a `recolectada`, acredita puntos duales (`1 kg = 1.0 pt`, `1 lb = 0.5 pts`) tanto al usuario/hogar como al recolector y envía el mensaje final al WhatsApp móvil del usuario.

> *Nota institucional (RN-06): Valores de puntaje y beneficios referenciales y parametrizables; sujetos a validación oficial de la Fundación Santo Domingo.*

---

## Integración Docker + GitHub (GitHub Actions & GHCR)

El repositorio incluye el workflow [`.github/workflows/docker-ghcr.yml`](.github/workflows/docker-ghcr.yml) que, en cada `push` a `main` / `master`:
1. Levanta PostgreSQL 16 en GitHub Actions y ejecuta `pytest -v`.
2. Construye automáticamente las imágenes Docker de `backend` y `frontend` y las publica en **GitHub Container Registry (GHCR)**:
   - `ghcr.io/agsanchezospino-droid/proyecto-ecoconecta-backend:latest`
   - `ghcr.io/agsanchezospino-droid/proyecto-ecoconecta-frontend:latest`

Para levantar en cualquier servidor usando directamente las imágenes publicadas en tu GitHub:

```bash
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

---

## Despliegue en Render (Blueprint 1-Clic)

El repositorio incluye [`render.yaml`](render.yaml) para desplegar automáticamente en **Render** (PostgreSQL 16 + Backend FastAPI Docker + Frontend Next.js Docker):

1. Abre el Blueprint en Render:
   `https://dashboard.render.com/blueprint/new?repo=https://github.com/agsanchezospino-droid/proyecto-ecoconecta`
2. Haz clic en **Apply** para crear `ecoconecta-db`, `ecoconecta-backend` y `ecoconecta-frontend`.
3. En **Render Dashboard → `ecoconecta-backend` → Environment**, agrega cuando estés listo tus credenciales reales:
   - `WHATSAPP_PUBLIC_NUMBER`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `OPENAI_API_KEY`.
4. Configura el webhook en Meta Developers apuntando a:
   `https://<tu-backend-o-frontend>.onrender.com/api/webhooks/whatsapp`

---

## Pruebas Automatizadas

```bash
docker compose exec backend pytest -v
```

---

## Documentación Técnica

- [Arquitectura del sistema (Mermaid)](docs/arquitectura.md)
- [Modelo relacional de PostgreSQL (Diagrama ER)](docs/modelo_datos.md)
