# Arquitectura del Sistema — EcoConecta · Villas de San Pablo

## 1. Diagrama de Componentes y Flujos (Canal Exclusivo WhatsApp Móvil)

```mermaid
flowchart TB
    subgraph Usuarios["Actores"]
        CIT["Hogar / Unidad Productiva\n(App móvil real de WhatsApp: texto o nota de voz .ogg)"]
        CH["Coordinador de Huerteros\n(Flujo Orgánico en /coordinacion)"]
        CR["Coordinador de Recicladores\n(Flujo Reciclable en /coordinacion)"]
        ADM["Administrador\n(Supervisión, Reglas kg/lb, Beneficios, RN-08)"]
    end

    subgraph External["Servicios Externos"]
        META["Meta WhatsApp Business\nCloud API (Graph API)"]
        OAI["OpenAI API\n(gpt-4o-mini-transcribe / whisper-1\n+ gpt-4o-mini Structured Outputs)"]
    end

    subgraph Frontend["Contenedor Frontend — Next.js 15 (App Router + Tailwind CSS)"]
        UI_PUB["Portal Público Inclusivo (Cataki + 🔊 Escuchar)\n/, /ayuda (Enlace directo https://wa.me/...)"]
        UI_CIT["Consulta Ciudadana (sin chat web)\n/mi-cuenta, /mis-puntos, /login"]
        UI_COORD["Panel Central de Control\n/coordinacion (Bandeja tiempo real, Reclasificación, Cierre kg/lb)"]
        PROXY["Route Handler Proxies\n/api/v1/[...path] y /api/webhooks/whatsapp"]
    end

    subgraph Backend["Contenedor Backend — Python + FastAPI"]
        WH["Webhook Meta WhatsApp\n(GET/POST /api/webhooks/whatsapp)"]
        AI["Servicio IA\n(Transcripción + Clasificación sin PII)"]
        AUTH["Router Auth & JWT RBAC\n(/api/v1/auth/*)"]
        PUB["Router Público\n(/api/v1/public/*)"]
        SOL["Router Consulta & Puntos\n(/api/v1/solicitudes/*)"]
        CRD["Router Coordinación & Recolectores\n(/api/v1/coordinacion/*)"]
        ADMIN["Router Administración\n(/api/v1/admin/*)"]
        SVC_SOL["Servicio de Dominio Solicitudes,\nReclasificación, Puntos Duales (kg/lb) y Canjes"]
        SVC_WA["Cliente Meta WhatsApp Cloud API\n(Descarga .ogg + Envíos automáticos)"]
    end

    subgraph Data["Contenedor Base de Datos"]
        PG[("PostgreSQL 16\nSQLAlchemy 2 + Psycopg 3\n(NUMERIC(10,2) para pesos y puntos)")]
    end

    CIT -->|Toca CTA wa.me en / o /ayuda| UI_PUB
    CIT -->|Envía texto o nota de voz .ogg| META
    META -->|Webhook POST /api/webhooks/whatsapp| WH
    WH -->|Descarga audio .ogg con WHATSAPP_TOKEN| SVC_WA
    SVC_WA --> META
    WH -->|Transcripción + Structured Outputs sin PII| AI
    AI --> OAI
    WH --> SVC_SOL

    CH --> UI_COORD
    CR --> UI_COORD
    ADM --> UI_COORD
    UI_PUB --> PROXY
    UI_CIT --> PROXY
    UI_COORD --> PROXY
    PROXY --> AUTH
    PROXY --> PUB
    PROXY --> SOL
    PROXY --> CRD
    PROXY --> ADMIN

    SVC_SOL --> PG
    SVC_SOL -->|Confirmaciones automáticas| SVC_WA
```

---

## 2. Secuencia Completa: WhatsApp Móvil → IA → `/coordinacion` → Puntos Duales

```mermaid
sequenceDiagram
    actor U as Vecino (App Móvil WhatsApp)
    participant META as Meta WhatsApp Cloud API
    participant API as FastAPI (/api/webhooks/whatsapp)
    participant OAI as OpenAI API (Audio + gpt-4o-mini)
    participant DB as PostgreSQL
    actor C as Coordinador (/coordinacion)

    U->>META: Envía texto o nota de voz (.ogg) desde su celular
    META->>API: POST /api/webhooks/whatsapp
    opt Si es nota de voz (type=audio)
        API->>META: Descarga .ogg con WHATSAPP_TOKEN
        API->>OAI: Transcribe a español (gpt-4o-mini-transcribe / whisper-1)
    end
    API->>OAI: Clasifica texto sin PII con gpt-4o-mini (Structured Outputs)
    API->>DB: Cruza teléfono `from` en `usuarios` (vincula o crea perfil Pendiente)
    API->>DB: Guarda solicitud ECO-2026-XXXX (recibida, flujo, transcripción)
    API->>META: Responde al WhatsApp del usuario confirmando código y coordinador

    C->>API: Ve pedido en tiempo real en /coordinacion (separado por RN-01)
    opt Si hubo mezcla o error de clasificación
        C->>API: PATCH /reclasificar-flujo (Mover a Orgánicos / Reciclables)
        API->>DB: Cambia flujo y reasigna coordinador
        API->>META: Notifica cambio de flujo al usuario
    end

    C->>API: POST /programar (recolector + día y hora — RN-02 / RN-03)
    API->>DB: Actualiza a `programada` + historial_estados
    API->>META: Envía confirmación de fecha y hora al WhatsApp móvil

    C->>API: POST /cerrar (solicitante, encargado, peso en kg o lb — RN-05 / RN-06)
    API->>DB: Normaliza peso, cambia a `recolectada`, acredita puntos duales (usuario + recolector)
    API->>META: Envía mensaje final con peso registrado y puntos ganados
```

---

## 3. Reglas de Negocio Implementadas

| Regla | Mecanismo de cumplimiento |
| :--- | :--- |
| **RN-01** | Clasificación automática (`organico` / `reciclable`), separación estricta en `get_coordinator_flow()` / `assert_coordinator_flow_access()`, y botón de reclasificación (`Mover a Orgánicos` / `Mover a Reciclables`). |
| **RN-02** | `ProgramarSolicitudRequest` exige `fecha_programada`, `hora_programada` y `nombre_encargado`, enviando confirmación automática al WhatsApp móvil. |
| **RN-03** | Registro obligatorio de `coordinador_id`, `encargado_id` y `nombre_encargado` del colectivo en `solicitudes` y `registros_recoleccion`. |
| **RN-04** | Código único `ECO-YYYY-NNNN`, deduplicación por `whatsapp_message_id` y bitácora inmutable `historial_estados`. |
| **RN-05** | Cierre obligatorio con peso (`kg` o `lb`) que acredita puntos simultáneamente al **usuario/hogar** y al **recolector/huertero encargado** en `movimientos_puntos`. |
| **RN-06** | Reglas parametrizables (`1 kg = 1.0 pt`, `1 lb = 0.5 pts`) y catálogo editable por `administrador` con nota institucional de la Fundación Santo Domingo. |
| **RN-07** | Privacidad e intermediación: consulta pública por código sin PII y redacción de PII innecesario antes de llamar a OpenAI. |
| **RN-08** | Identificación automática por teléfono (`usuarios.telefono_normalizado`), bandera `es_piloto` y marca `pendiente_completar_datos` para nuevos vecinos desde WhatsApp. |
