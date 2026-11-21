"""Pruebas de integración E2E de EcoConecta – Villas de San Pablo:
- Webhook real GET y POST /api/webhooks/whatsapp (texto y nota de voz .ogg)
- Transcripción en español (OpenAI) y clasificación Structured Outputs (sin PII innecesario)
- Identificación automática de usuario registrado y creación automática de usuario nuevo
- Separación estricta RN-01 + reclasificación de flujo (Mover a Orgánicos / Reciclables)
- Programación obligatoria RN-02 / RN-03 + notificación WhatsApp
- Cierre obligatorio con peso (kg / lb), acreditación dual RN-05 / RN-06 y beneficios
- Eliminación total de formularios web de solicitud y chat interno web
"""

from datetime import date, timedelta
import uuid

from fastapi.testclient import TestClient
import pytest

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine, ensure_schema_compatibility
from app.main import app
from app.routers import webhooks as webhooks_router
from app.seed import DEMO_PASSWORD, run_seed
from app.services.ai_classifier import ClasificacionSolicitudIA, redact_unnecessary_pii
from app.services.whatsapp import whatsapp_service


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    ensure_schema_compatibility(engine)
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()
    with TestClient(app) as c:
        yield c


def auth_headers(client: TestClient, email: str) -> dict[str, str]:
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": DEMO_PASSWORD},
    )
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _meta_text_payload(from_phone: str, profile_name: str, body: str, wamid: str) -> dict:
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "waba_test_01",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "contacts": [
                                {"profile": {"name": profile_name}, "wa_id": from_phone}
                            ],
                            "messages": [
                                {
                                    "from": from_phone,
                                    "id": wamid,
                                    "timestamp": "1760000000",
                                    "type": "text",
                                    "text": {"body": body},
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }


def _meta_audio_payload(from_phone: str, profile_name: str, media_id: str, wamid: str) -> dict:
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "waba_test_01",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "contacts": [
                                {"profile": {"name": profile_name}, "wa_id": from_phone}
                            ],
                            "messages": [
                                {
                                    "from": from_phone,
                                    "id": wamid,
                                    "timestamp": "1760000001",
                                    "type": "audio",
                                    "audio": {
                                        "id": media_id,
                                        "mime_type": "audio/ogg; codecs=opus",
                                        "voice": True,
                                    },
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }


def test_pii_redaction_keeps_address_and_strips_phone_and_email():
    raw = (
        "Hola soy Juan, mi correo es juan.perez@correo.com y mi cel +57 300 987 6543. "
        "Estoy en Manzana 14 Casa 8 con 2 baldes de cáscaras de plátano."
    )
    sanitized = redact_unnecessary_pii(raw)
    assert "juan.perez@correo.com" not in sanitized
    assert "300 987 6543" not in sanitized
    assert "Manzana 14 Casa 8" in sanitized
    assert "cáscaras de plátano" in sanitized


def test_webhook_verification_and_no_web_chat_endpoints(client: TestClient):
    # GET /api/webhooks/whatsapp con verify_token correcto
    ok = client.get(
        "/api/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": settings.WHATSAPP_VERIFY_TOKEN,
            "hub.challenge": "CHALLENGE_ECO_2026",
        },
    )
    assert ok.status_code == 200
    assert ok.text == "CHALLENGE_ECO_2026"

    # GET con token inválido -> 403
    bad = client.get(
        "/api/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "token_incorrecto",
            "hub.challenge": "CHALLENGE_ECO_2026",
        },
    )
    assert bad.status_code == 403

    # Config pública entrega enlace oficial wa.me
    cfg = client.get("/api/v1/public/config")
    assert cfg.status_code == 200
    assert cfg.json()["whatsapp_url"].startswith("https://wa.me/")
    assert "Hola,%20quiero%20pedir%20una%20recolecci%C3%B3n%20en%20Villas%20de%20San%20Pablo" in cfg.json()["whatsapp_url"]

    # Confirmar que NO existen endpoints web para crear solicitudes ni chat interno web
    h_hogar = auth_headers(client, "hogar@villas.demo")
    assert client.post("/api/v1/solicitudes", headers=h_hogar, json={}).status_code in (404, 405)
    assert client.post("/api/v1/solicitudes/1/mensajes", headers=h_hogar, json={"contenido": "hola"}).status_code in (404, 405)
    h_huerta = auth_headers(client, "coord.huerta@villas.demo")
    assert client.post("/api/v1/coordinacion/solicitudes/1/mensajes", headers=h_huerta, json={"contenido": "hola"}).status_code in (404, 405)


def test_whatsapp_webhook_flow_reclassify_schedule_close_and_dual_points(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    h_piloto = auth_headers(client, "piloto@villas.demo")
    h_hogar = auth_headers(client, "hogar@villas.demo")
    h_huerta = auth_headers(client, "coord.huerta@villas.demo")
    h_reciclaje = auth_headers(client, "coord.reciclaje@villas.demo")
    h_admin = auth_headers(client, "admin@villas.demo")

    # 1. Mensaje de TEXTO desde número ya registrado (Comedor Piloto: 573000000101)
    wamid_text = f"wamid.text.{uuid.uuid4().hex}"
    res_wh_org = client.post(
        "/api/webhooks/whatsapp",
        json=_meta_text_payload(
            from_phone="573000000101",
            profile_name="Sabor Caribeño",
            body="Hola, tenemos 3 baldes de cáscaras de plátano, yuca y borra de café en el comedor para mañana temprano.",
            wamid=wamid_text,
        ),
    )
    assert res_wh_org.status_code == 200, res_wh_org.text
    proc_org = res_wh_org.json()["processed"][0]
    assert proc_org["flujo"] == "organico"
    assert proc_org["codigo"].startswith("ECO-")
    assert proc_org["duplicado"] is False
    sol_org_id = proc_org["solicitud_id"]

    # Reenvío del mismo wamid debe ser idempotente (sin duplicar solicitud)
    res_dup = client.post(
        "/api/webhooks/whatsapp",
        json=_meta_text_payload(
            from_phone="573000000101",
            profile_name="Sabor Caribeño",
            body="Mensaje repetido",
            wamid=wamid_text,
        ),
    )
    assert res_dup.status_code == 200
    assert res_dup.json()["processed"][0]["duplicado"] is True
    assert res_dup.json()["processed"][0]["solicitud_id"] == sol_org_id

    # Verificar que vinculó automáticamente al Comedor Piloto (es_piloto_solicitante=True)
    detail_org = client.get(
        f"/api/v1/coordinacion/solicitudes/{sol_org_id}", headers=h_huerta
    )
    assert detail_org.status_code == 200
    org_data = detail_org.json()
    assert org_data["nombre_solicitante"] == "Comedor Comunitario Sabor Caribeño"
    assert org_data["es_piloto_solicitante"] is True
    assert org_data["pendiente_completar_datos"] is False
    assert org_data["tipo_mensaje_origen"] == "texto"
    assert "cáscaras de plátano" in org_data["mensaje_original"]

    # 2. Nota de VOZ (.ogg) desde número NUEVO no registrado -> auto-crea perfil "Pendiente de completar datos"
    def fake_download_media(media_id: str) -> tuple[bytes, str]:
        assert media_id == "MEDIA_AUDIO_OGG_001"
        return b"OggS_fake_opus_audio_bytes", "audio/ogg; codecs=opus"

    def fake_transcribe(audio_bytes: bytes, mime_type: str) -> tuple[str, str]:
        assert audio_bytes.startswith(b"OggS")
        return (
            "Buenas tardes, hablo de la Manzana 9 Casa 12, tengo cajas de cartón limpias y botellas PET para el sábado.",
            "gpt-4o-mini-transcribe",
        )

    def fake_classify(raw_text: str) -> ClasificacionSolicitudIA:
        return ClasificacionSolicitudIA(
            flujo="reciclable",
            tipo_generador="hogar",
            direccion_mencionada="Manzana 9 Casa 12, Villas de San Pablo",
            resumen_material="Cajas de cartón limpias y botellas PET",
            preferencia_horaria="Sábado",
            requiere_revision_flujo=False,
            confianza=0.95,
            fuente="openai_gpt-4o-mini",
        )

    monkeypatch.setattr(whatsapp_service, "download_media", fake_download_media)
    monkeypatch.setattr(webhooks_router, "transcribe_audio_spanish", fake_transcribe)
    monkeypatch.setattr(webhooks_router, "classify_whatsapp_request", fake_classify)

    new_phone = f"57315{uuid.uuid4().int % 10000000:07d}"
    wamid_audio = f"wamid.audio.{uuid.uuid4().hex}"
    res_wh_audio = client.post(
        "/api/webhooks/whatsapp",
        json=_meta_audio_payload(
            from_phone=new_phone,
            profile_name="Luz Marina Villa",
            media_id="MEDIA_AUDIO_OGG_001",
            wamid=wamid_audio,
        ),
    )
    assert res_wh_audio.status_code == 200, res_wh_audio.text
    proc_audio = res_wh_audio.json()["processed"][0]
    assert proc_audio["flujo"] == "reciclable"
    assert proc_audio["tipo_mensaje"] == "audio"
    sol_audio_id = proc_audio["solicitud_id"]

    # RN-01: Coordinador de huerteros NO puede ver pedido reciclable y viceversa
    assert (
        client.get(
            f"/api/v1/coordinacion/solicitudes/{sol_audio_id}", headers=h_huerta
        ).status_code
        == 403
    )
    assert (
        client.get(
            f"/api/v1/coordinacion/solicitudes/{sol_org_id}", headers=h_reciclaje
        ).status_code
        == 403
    )
    assert (
        client.get("/api/v1/coordinacion/solicitudes", headers=h_hogar).status_code
        == 403
    )

    # Coordinador de recicladores ve el pedido de nota de voz y el perfil pendiente
    detail_audio = client.get(
        f"/api/v1/coordinacion/solicitudes/{sol_audio_id}", headers=h_reciclaje
    ).json()
    assert detail_audio["nombre_solicitante"] == "Luz Marina Villa"
    assert detail_audio["pendiente_completar_datos"] is True
    assert detail_audio["tipo_mensaje_origen"] == "audio"
    assert "botellas PET" in detail_audio["mensaje_original"]

    # Coordinador verifica y completa datos del nuevo usuario
    verif = client.patch(
        f"/api/v1/coordinacion/solicitudes/{sol_audio_id}/datos-usuario",
        headers=h_reciclaje,
        json={
            "nombre_solicitante": "Luz Marina Villa Morales",
            "direccion": "Manzana 9, Casa 12, Etapa 1, Villas de San Pablo",
            "tipo_generador": "hogar",
        },
    )
    assert verif.status_code == 200, verif.text
    assert verif.json()["pendiente_completar_datos"] is False

    # Reclasificación de flujo: Mover a Orgánicos y devolver a Reciclables
    move_to_org = client.patch(
        f"/api/v1/coordinacion/solicitudes/{sol_audio_id}/reclasificar-flujo",
        headers=h_reciclaje,
        json={"nuevo_flujo": "organico", "motivo": "Prueba de reclasificación"},
    )
    assert move_to_org.status_code == 200, move_to_org.text
    assert move_to_org.json()["flujo_nuevo"] == "organico"
    # Ya no es accesible por recicladores, sí por huerteros
    assert (
        client.get(
            f"/api/v1/coordinacion/solicitudes/{sol_audio_id}", headers=h_reciclaje
        ).status_code
        == 403
    )
    assert (
        client.get(
            f"/api/v1/coordinacion/solicitudes/{sol_audio_id}", headers=h_huerta
        ).status_code
        == 200
    )
    # Lo devolvemos a Reciclables
    move_back = client.patch(
        f"/api/v1/coordinacion/solicitudes/{sol_audio_id}/reclasificar-flujo",
        headers=h_huerta,
        json={"nuevo_flujo": "reciclable", "motivo": "Confirmado material reciclable"},
    )
    assert move_back.status_code == 200

    # RN-07: Consulta pública sin PII
    pub = client.get(f"/api/v1/public/solicitudes/{org_data['codigo']}").json()
    assert "telefono_contacto" not in pub
    assert "direccion" not in pub

    # RN-02: Programación obligatoria
    assert (
        client.post(
            f"/api/v1/coordinacion/solicitudes/{sol_org_id}/programar",
            headers=h_huerta,
            json={"fecha_programada": str(date.today() + timedelta(days=1))},
        ).status_code
        == 422
    )

    colectivo_huerta = client.get(
        "/api/v1/coordinacion/colectivo", headers=h_huerta
    ).json()
    huertero = colectivo_huerta[0]

    assert (
        client.post(
            f"/api/v1/coordinacion/solicitudes/{sol_org_id}/programar",
            headers=h_huerta,
            json={
                "fecha_programada": str(date.today() + timedelta(days=1)),
                "hora_programada": "09:15",
                "encargado_id": huertero["id"],
                "nombre_encargado": huertero["nombre"],
            },
        ).status_code
        == 200
    )

    # Cierre en KG (2.5 kg -> +2.5 pts usuario y +2.5 pts huertero)
    user_pts_before = client.get(
        "/api/v1/solicitudes/mias/puntos", headers=h_piloto
    ).json()["puntos_disponibles"]
    panel_before = client.get(
        "/api/v1/coordinacion/recolectores/puntos", headers=h_huerta
    ).json()["recolectores"]
    col_pts_before = next(
        r["puntos_disponibles"]
        for r in panel_before
        if r["integrante_id"] == huertero["id"]
    )

    close_kg = client.post(
        f"/api/v1/coordinacion/solicitudes/{sol_org_id}/cerrar",
        headers=h_huerta,
        json={
            "nombre_solicitante_verificado": "Comedor Comunitario Sabor Caribeño",
            "peso_ingresado": 2.5,
            "unidad_medida": "kg",
            "encargado_id": huertero["id"],
            "nombre_encargado": huertero["nombre"],
        },
    )
    assert close_kg.status_code == 200, close_kg.text
    reg_kg = close_kg.json()["registro_recoleccion"]
    assert reg_kg["peso_ingresado"] == 2.5
    assert reg_kg["unidad_medida"] == "kg"
    assert reg_kg["peso_kg"] == 2.5
    assert reg_kg["puntos_calculados"] == 2.5

    user_pts_after = client.get(
        "/api/v1/solicitudes/mias/puntos", headers=h_piloto
    ).json()["puntos_disponibles"]
    panel_after = client.get(
        "/api/v1/coordinacion/recolectores/puntos", headers=h_huerta
    ).json()["recolectores"]
    col_pts_after = next(
        r["puntos_disponibles"]
        for r in panel_after
        if r["integrante_id"] == huertero["id"]
    )
    assert user_pts_after == pytest.approx(user_pts_before + 2.5, abs=0.01)
    assert col_pts_after == pytest.approx(col_pts_before + 2.5, abs=0.01)

    # Cierre en LIBRAS (3.0 lb -> 1.50 kg -> +1.50 pts duales) sobre el pedido de audio
    colectivo_rec = client.get(
        "/api/v1/coordinacion/colectivo", headers=h_reciclaje
    ).json()
    reciclador = colectivo_rec[0]

    rec_panel_before = client.get(
        "/api/v1/coordinacion/recolectores/puntos", headers=h_reciclaje
    ).json()["recolectores"]
    rec_col_before = next(
        r["puntos_disponibles"]
        for r in rec_panel_before
        if r["integrante_id"] == reciclador["id"]
    )

    close_lb = client.post(
        f"/api/v1/coordinacion/solicitudes/{sol_audio_id}/cerrar",
        headers=h_reciclaje,
        json={
            "nombre_solicitante_verificado": "Luz Marina Villa Morales",
            "peso_ingresado": 3.0,
            "unidad_medida": "lb",
            "encargado_id": reciclador["id"],
            "nombre_encargado": reciclador["nombre"],
        },
    )
    assert close_lb.status_code == 200, close_lb.text
    reg_lb = close_lb.json()["registro_recoleccion"]
    assert reg_lb["peso_ingresado"] == 3.0
    assert reg_lb["unidad_medida"] == "lb"
    assert reg_lb["peso_kg"] == 1.5
    assert reg_lb["puntos_calculados"] == 1.5

    rec_panel_after = client.get(
        "/api/v1/coordinacion/recolectores/puntos", headers=h_reciclaje
    ).json()["recolectores"]
    rec_col_after = next(
        r["puntos_disponibles"]
        for r in rec_panel_after
        if r["integrante_id"] == reciclador["id"]
    )
    assert rec_col_after == pytest.approx(rec_col_before + 1.5, abs=0.01)

    # Verificar reglas parametrizables RN-06 en Admin
    reglas = client.get("/api/v1/admin/reglas-puntos", headers=h_admin).json()
    assert reglas[0]["puntos_por_kg"] == 1.0
    assert reglas[0]["puntos_por_libra"] == 0.5
    assert (
        "Valores de puntaje y beneficios referenciales y parametrizables"
        in reglas[0]["nota_institucional"]
    )


def test_citizen_account_endpoints_for_piloto_hogar_and_new_users(client: TestClient):
    """Verifica acceso completo a Mi Cuenta para unidad_productiva y hogar
    (cuentas demo semilla y usuarios nuevos sin solicitudes ni movimientos de puntos).
    """
    for email, expected_rol in (
        ("piloto@villas.demo", "unidad_productiva"),
        ("hogar@villas.demo", "hogar"),
    ):
        demo_res = client.post("/api/v1/auth/demo-login", json={"email": email})
        assert demo_res.status_code == 200, demo_res.text
        demo_data = demo_res.json()
        assert demo_data["usuario"]["rol"] == expected_rol
        assert demo_data["usuario"]["es_piloto"] is True
        hdr = {"Authorization": f"Bearer {demo_data['access_token']}"}

        for endpoint in ("/api/v1/auth/me", "/api/v1/usuarios/me"):
            me = client.get(endpoint, headers=hdr)
            assert me.status_code == 200, me.text
            body = me.json()
            assert body["email"] == email
            assert body["rol"] == expected_rol
            assert body["telefono"]
            assert body["direccion"]
            assert isinstance(body["puntos_acumulados"], (int, float))

        sols = client.get("/api/v1/solicitudes/mias", headers=hdr)
        assert sols.status_code == 200, sols.text
        assert isinstance(sols.json(), list)

        pts = client.get("/api/v1/solicitudes/mias/puntos", headers=hdr)
        assert pts.status_code == 200, pts.text
        assert "progreso_nivel" in pts.json()

    # Usuario nuevo sin solicitudes ni movimientos -> devuelve 0.0 y jamás 500
    for rol in ("hogar", "unidad_productiva"):
        new_email = f"nuevo.{rol}.{uuid.uuid4().hex[:8]}@ejemplo.com"
        reg = client.post(
            "/api/v1/auth/register",
            json={
                "nombre": f"Cuenta Nueva {rol}",
                "email": new_email,
                "password": "ClaveSegura2026!",
                "rol": rol,
                "telefono": "+57 300 111 2233",
                "direccion": "Manzana 7, Casa 2, Villas de San Pablo",
                "barrio_sector": "Villas de San Pablo",
            },
        )
        assert reg.status_code == 201, reg.text
        token = reg.json()["access_token"]
        hdr = {"Authorization": f"Bearer {token}"}

        me = client.get("/api/v1/auth/me", headers=hdr)
        assert me.status_code == 200, me.text
        assert me.json()["rol"] == rol
        assert me.json()["puntos_acumulados"] == 0.0

        sols = client.get("/api/v1/solicitudes/mias", headers=hdr)
        assert sols.status_code == 200
        assert sols.json() == []

        pts = client.get("/api/v1/solicitudes/mias/puntos", headers=hdr)
        assert pts.status_code == 200
        assert pts.json()["puntos_disponibles"] == 0.0
        assert pts.json()["total_kg"] == 0.0
        assert pts.json()["recolecciones_completadas"] == 0


def test_human_tts_normalizer_and_endpoint(client, monkeypatch):
    from app.routers import public as public_router
    from app.services.tts import normalize_text_for_speech

    normalized = normalize_text_for_speech("🔊 Ganas 1.5 pts por 3 kg o 2 lb · ¡Muy bien!")
    assert "puntos" in normalized
    assert "kilos" in normalized
    assert "libras" in normalized
    assert "🔊" not in normalized

    # Texto vacío debe ser rechazado con 422
    res_empty = client.post("/api/v1/public/tts", json={"text": ""})
    assert res_empty.status_code == 422

    # Mock rápido de síntesis MP3 para validar contrato HTTP y cabecera audio/mpeg
    async def fake_synth(text: str) -> bytes:
        assert "Villas de San Pablo" in text
        return b"ID3FAKE_MP3_NEURAL_VOICE_BYTES"

    monkeypatch.setattr(public_router, "synthesize_speech_mp3", fake_synth)

    res_ok = client.post(
        "/api/v1/public/tts",
        json={"text": "Hola, bienvenido a EcoConecta en Villas de San Pablo."},
    )
    assert res_ok.status_code == 200
    assert res_ok.headers["content-type"].startswith("audio/mpeg")
    assert res_ok.content.startswith(b"ID3")


def test_whatsapp_audio_saved_even_when_transcription_unavailable(client):
    """Aunque falten WHATSAPP_TOKEN o OPENAI_API_KEY, un audio entrante al webhook
    jamás debe descartarse: debe guardarse en PostgreSQL y aparecer en /coordinacion y Mis Pedidos.
    """
    h_hogar = auth_headers(client, "hogar@villas.demo")
    h_reciclaje = auth_headers(client, "coord.reciclaje@villas.demo")

    wamid = f"wamid.audio.notoken.{uuid.uuid4().hex}"
    res = client.post(
        "/api/webhooks/whatsapp",
        json=_meta_audio_payload(
            from_phone="573000000102",  # Teléfono registrado de hogar@villas.demo
            profile_name="Familia Mendoza Polo",
            media_id="MEDIA_AUDIO_FALLBACK_001",
            wamid=wamid,
        ),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["processed_count"] == 1
    proc = body["processed"][0]
    assert proc["tipo_mensaje"] == "audio"
    assert proc["pendiente_transcripcion"] is True
    sol_id = proc["solicitud_id"]
    codigo = proc["codigo"]

    # Debe aparecer en Mis Pedidos de hogar@villas.demo
    mias = client.get("/api/v1/solicitudes/mias", headers=h_hogar)
    assert mias.status_code == 200
    assert any(
        s["codigo"] == codigo and s["tipo_mensaje_origen"] == "audio"
        for s in mias.json()
    )

    # Y debe aparecer en /coordinacion marcado para revisar flujo
    coord_det = client.get(
        f"/api/v1/coordinacion/solicitudes/{sol_id}",
        headers=h_reciclaje,
    )
    assert coord_det.status_code == 200
    det = coord_det.json()
    assert det["tipo_mensaje_origen"] == "audio"
    assert det["requiere_revision_flujo"] is True
    assert "pendiente de transcripción" in det["mensaje_original"].lower()


def test_admin_views_both_collectives_readonly_and_cannot_add_member(client):
    """El Administrador Comunitario puede ver Huerteros y Recicladores en solo lectura,
    pero NO puede añadir recolectores (403); esa acción es exclusiva de los coordinadores.
    """
    h_admin = auth_headers(client, "admin@villas.demo")
    h_huerta = auth_headers(client, "coord.huerta@villas.demo")
    h_reciclaje = auth_headers(client, "coord.reciclaje@villas.demo")

    # 1. Admin puede consultar el listado y ver ambos equipos (orgánico + reciclable)
    list_admin = client.get("/api/v1/coordinacion/colectivo", headers=h_admin)
    assert list_admin.status_code == 200, list_admin.text
    flujos_vistos = {m["flujo"] for m in list_admin.json()}
    assert {"organico", "reciclable"}.issubset(flujos_vistos)

    # 2. Admin NO puede añadir integrantes a ningún colectivo -> 403 Forbidden
    for flujo_intento in ("organico", "reciclable"):
        denied = client.post(
            "/api/v1/coordinacion/colectivo",
            headers=h_admin,
            json={
                "nombre": f"Intento Admin {flujo_intento}",
                "rol_interno": "Recolector",
                "zona_cobertura": "Villas de San Pablo",
                "flujo": flujo_intento,
            },
        )
        assert denied.status_code == 403, denied.text

    # 3. Coordinadores SÍ pueden añadir integrantes únicamente en su propio flujo
    ok_huerta = client.post(
        "/api/v1/coordinacion/colectivo",
        headers=h_huerta,
        json={
            "nombre": f"Huertero Prueba {uuid.uuid4().hex[:6]}",
            "rol_interno": "Huertero comunitario",
            "zona_cobertura": "Etapa 1",
        },
    )
    assert ok_huerta.status_code == 201, ok_huerta.text
    assert ok_huerta.json()["flujo"] == "organico"

    ok_rec = client.post(
        "/api/v1/coordinacion/colectivo",
        headers=h_reciclaje,
        json={
            "nombre": f"Reciclador Prueba {uuid.uuid4().hex[:6]}",
            "rol_interno": "Reciclador de oficio",
            "zona_cobertura": "Etapa 2",
        },
    )
    assert ok_rec.status_code == 201, ok_rec.text
    assert ok_rec.json()["flujo"] == "reciclable"




