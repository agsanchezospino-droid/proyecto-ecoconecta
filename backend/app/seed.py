"""Seed automático idempotente con datos 100% ficticios para EcoConecta – Villas de San Pablo."""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import (
    Base,
    SessionLocal,
    engine,
    ensure_schema_compatibility,
)
from app.core.security import hash_password
from app.models.entities import (
    Beneficio,
    EstadoSolicitud,
    GuiaResiduo,
    HistorialEstado,
    IntegranteColectivo,
    MovimientoPuntos,
    NotificacionWhatsApp,
    RegistroRecoleccion,
    ReglaPuntos,
    RolUsuario,
    Solicitud,
    Usuario,
)
from app.services.whatsapp import normalize_phone_e164

DEMO_PASSWORD = "EcoDemo2026!"


def run_seed(db: Session) -> dict:
    created_summary = {
        "usuarios": 0,
        "integrantes": 0,
        "reglas_puntos": 0,
        "beneficios": 0,
        "guia_residuos": 0,
        "solicitudes": 0,
    }

    # 1. Usuarios ficticios (cuentas demo + un vecino nuevo recibido vía WhatsApp)
    users_spec = [
        {
            "email": "piloto@villas.demo",
            "nombre": "Comedor Comunitario Sabor Caribeño",
            "rol": RolUsuario.UNIDAD_PRODUCTIVA.value,
            "telefono": "+57 300 000 0101",
            "direccion": "Manzana 14, Casa 8, Sector Las Palmas, Villas de San Pablo",
            "barrio_sector": "Villas de San Pablo - Sector Las Palmas",
            "es_piloto": True,
            "habilitado_solicitudes": True,
            "pendiente_completar_datos": False,
        },
        {
            "email": "hogar@villas.demo",
            "nombre": "Familia Mendoza Polo",
            "rol": RolUsuario.HOGAR.value,
            "telefono": "+57 300 000 0102",
            "direccion": "Manzana 22, Casa 15, Etapa 2, Villas de San Pablo",
            "barrio_sector": "Villas de San Pablo - Etapa 2",
            "es_piloto": True,
            "habilitado_solicitudes": True,
            "pendiente_completar_datos": False,
        },
        {
            "email": "wa.573000000199@whatsapp.ecoconecta.local",
            "nombre": "Carmen Elena Torres",
            "rol": RolUsuario.HOGAR.value,
            "telefono": "+57 300 000 0199",
            "direccion": "Manzana 18, Casa 4, Villas de San Pablo",
            "barrio_sector": "Villas de San Pablo",
            "es_piloto": False,
            "habilitado_solicitudes": True,
            "pendiente_completar_datos": True,
        },
        {
            "email": "coord.huerta@villas.demo",
            "nombre": "Marta Lucía Herrera",
            "rol": RolUsuario.COORDINADOR_HUERTEROS.value,
            "telefono": "+57 300 000 0201",
            "direccion": "Huerta Comunitaria El Sembrador, Villas de San Pablo",
            "barrio_sector": "Villas de San Pablo - Zona Huerta",
            "es_piloto": False,
            "habilitado_solicitudes": True,
            "pendiente_completar_datos": False,
        },
        {
            "email": "coord.reciclaje@villas.demo",
            "nombre": "Carlos Alberto Barrios",
            "rol": RolUsuario.COORDINADOR_RECICLADORES.value,
            "telefono": "+57 300 000 0202",
            "direccion": "Punto de Acopio Comunitario, Villas de San Pablo",
            "barrio_sector": "Villas de San Pablo - Punto Acopio",
            "es_piloto": False,
            "habilitado_solicitudes": True,
            "pendiente_completar_datos": False,
        },
        {
            "email": "admin@villas.demo",
            "nombre": "Andrea Carolina Pacheco",
            "rol": RolUsuario.ADMINISTRADOR.value,
            "telefono": "+57 300 000 0301",
            "direccion": "Centro Comunitario Villas de San Pablo, Barranquilla",
            "barrio_sector": "Villas de San Pablo - Centro",
            "es_piloto": False,
            "habilitado_solicitudes": True,
            "pendiente_completar_datos": False,
        },
    ]

    users_by_email: dict[str, Usuario] = {}
    for spec in users_spec:
        phone_norm = normalize_phone_e164(spec["telefono"])
        existing = db.scalar(select(Usuario).where(Usuario.email == spec["email"]))
        if existing:
            if not existing.telefono_normalizado and phone_norm:
                existing.telefono_normalizado = phone_norm
            users_by_email[spec["email"]] = existing
        else:
            user = Usuario(
                email=spec["email"],
                nombre=spec["nombre"],
                password_hash=hash_password(DEMO_PASSWORD),
                rol=spec["rol"],
                telefono=spec["telefono"],
                telefono_normalizado=phone_norm,
                direccion=spec["direccion"],
                barrio_sector=spec["barrio_sector"],
                es_piloto=spec["es_piloto"],
                habilitado_solicitudes=spec["habilitado_solicitudes"],
                pendiente_completar_datos=spec["pendiente_completar_datos"],
                activo=True,
            )
            db.add(user)
            db.flush()
            users_by_email[spec["email"]] = user
            created_summary["usuarios"] += 1

    coord_huerta = users_by_email["coord.huerta@villas.demo"]
    coord_reciclaje = users_by_email["coord.reciclaje@villas.demo"]
    piloto_user = users_by_email["piloto@villas.demo"]
    hogar_user = users_by_email["hogar@villas.demo"]
    nuevo_wa_user = users_by_email["wa.573000000199@whatsapp.ecoconecta.local"]
    admin_user = users_by_email["admin@villas.demo"]

    # 2. Integrantes de ambos colectivos (internos, gestionados por cada coordinador)
    integrantes_spec = [
        ("Efraín Cantillo", "organico", "Huertero comunitario - Compostaje", "Etapa 1 y Las Palmas", coord_huerta.id),
        ("Yolanda Pertuz", "organico", "Huertera comunitaria - Recolección orgánica", "Etapa 2 y Parque Central", coord_huerta.id),
        ("Jairo Escorcia", "organico", "Huertero comunitario - Ruta comedores", "Zona Comercial y Manzanas 10-18", coord_huerta.id),
        ("Nubia Sarmiento", "organico", "Huertera comunitaria - Vivero", "Etapa 3", coord_huerta.id),
        ("Luis Eduardo Navarro", "reciclable", "Reciclador de oficio - Ruta Norte", "Etapa 1 y Manzanas 1-15", coord_reciclaje.id),
        ("Sandra Milena Ospino", "reciclable", "Recicladora de oficio - Ruta Sur", "Etapa 2 y Manzanas 16-30", coord_reciclaje.id),
        ("Deivis Gutiérrez", "reciclable", "Reciclador de oficio - Cartón y plástico", "Zona Comercial", coord_reciclaje.id),
        ("Katerine Morales", "reciclable", "Recicladora de oficio - Metales y vidrio", "Etapa 3 y Las Palmas", coord_reciclaje.id),
    ]

    integrantes_by_name: dict[str, IntegranteColectivo] = {}
    for nombre, flujo, rol_interno, zona, coord_id in integrantes_spec:
        existing = db.scalar(
            select(IntegranteColectivo).where(
                IntegranteColectivo.nombre == nombre,
                IntegranteColectivo.flujo == flujo,
            )
        )
        if existing:
            integrantes_by_name[nombre] = existing
        else:
            item = IntegranteColectivo(
                nombre=nombre,
                flujo=flujo,
                rol_interno=rol_interno,
                zona_cobertura=zona,
                coordinador_id=coord_id,
                activo=True,
            )
            db.add(item)
            db.flush()
            integrantes_by_name[nombre] = item
            created_summary["integrantes"] += 1

    # 3. Reglas de puntos parametrizables (RN-06): 1 kg = 1.00 pt, 1 libra (500 g) = 0.50 pts
    reglas_spec = [
        {
            "flujo": "organico",
            "puntos_base": Decimal("0.00"),
            "puntos_por_kg": Decimal("1.00"),
            "puntos_por_libra": Decimal("0.50"),
            "descripcion": "1 kg = 1.0 punto | 1 libra (500 g) = 0.5 puntos para residuos orgánicos aprovechables.",
        },
        {
            "flujo": "reciclable",
            "puntos_base": Decimal("0.00"),
            "puntos_por_kg": Decimal("1.00"),
            "puntos_por_libra": Decimal("0.50"),
            "descripcion": "1 kg = 1.0 punto | 1 libra (500 g) = 0.5 puntos para residuos reciclables limpios y secos.",
        },
    ]
    for rspec in reglas_spec:
        existing = db.scalar(select(ReglaPuntos).where(ReglaPuntos.flujo == rspec["flujo"]))
        if not existing:
            db.add(
                ReglaPuntos(
                    flujo=rspec["flujo"],
                    puntos_base=rspec["puntos_base"],
                    puntos_por_kg=rspec["puntos_por_kg"],
                    puntos_por_libra=rspec["puntos_por_libra"],
                    descripcion=rspec["descripcion"],
                    activo=True,
                    actualizado_por_id=admin_user.id,
                )
            )
            created_summary["reglas_puntos"] += 1

    # 4. Catálogo inicial de beneficios diferenciado por tipo_destinatario
    beneficios_spec = [
        {
            "tipo_destinatario": "usuario",
            "nombre": "Semilla – Abono de la huerta",
            "descripcion": "Bolsa de abono orgánico compostado en la huerta comunitaria de Villas de San Pablo.",
            "puntos_requeridos": Decimal("10.00"),
        },
        {
            "tipo_destinatario": "usuario",
            "nombre": "Brote – Descuento en comercio aliado / kit de separación",
            "descripcion": "Descuento referencial en comercio aliado del barrio o kit doméstico de separación en fuente.",
            "puntos_requeridos": Decimal("25.00"),
        },
        {
            "tipo_destinatario": "usuario",
            "nombre": "Árbol – Canasta de huerta / bono comunitario",
            "descripcion": "Canasta de productos frescos de la huerta comunitaria o bono comunitario referencial.",
            "puntos_requeridos": Decimal("50.00"),
        },
        {
            "tipo_destinatario": "recolector",
            "nombre": "Aliado Activo – Kit de protección",
            "descripcion": "Kit de protección personal para recorridos (guantes reforzados, tapabocas y elementos reflectivos).",
            "puntos_requeridos": Decimal("30.00"),
        },
        {
            "tipo_destinatario": "recolector",
            "nombre": "Líder Circular – Bono de alimentación / mantenimiento carretilla",
            "descripcion": "Bono referencial de alimentación comunitaria o apoyo para mantenimiento de carretilla y herramientas.",
            "puntos_requeridos": Decimal("75.00"),
        },
        {
            "tipo_destinatario": "recolector",
            "nombre": "Guardián Verde – Dotación operativa",
            "descripcion": "Dotación operativa completa para fortalecer el trabajo diario del colectivo ambiental.",
            "puntos_requeridos": Decimal("150.00"),
        },
    ]
    for bspec in beneficios_spec:
        existing_b = db.scalar(
            select(Beneficio).where(
                Beneficio.tipo_destinatario == bspec["tipo_destinatario"],
                Beneficio.nombre == bspec["nombre"],
            )
        )
        if not existing_b:
            db.add(
                Beneficio(
                    tipo_destinatario=bspec["tipo_destinatario"],
                    nombre=bspec["nombre"],
                    descripcion=bspec["descripcion"],
                    puntos_requeridos=bspec["puntos_requeridos"],
                    activo=True,
                )
            )
            created_summary["beneficios"] += 1

    # 5. Guía visual interactiva de residuos (estilo Cataki)
    if db.scalar(select(GuiaResiduo.id).limit(1)) is None:
        guia_items = [
            GuiaResiduo(
                nombre="Cáscaras de frutas y verduras",
                flujo="organico",
                categoria="Cocina cruda",
                icono="apple",
                descripcion="Cáscaras de plátano, yuca, papa, mango, patilla, zanahoria, tomate y hojas frescas.",
                buenas_practicas="Guárdalas en un balde con tapa sin bolsas plásticas ni líquidos aceitosos.",
                horario_referencia="Martes y viernes · 7:00 a.m. – 11:00 a.m. (previa coordinación)",
            ),
            GuiaResiduo(
                nombre="Borra de café y bolsitas de aromática",
                flujo="organico",
                categoria="Infusiones",
                icono="coffee",
                descripcion="Residuos del café colado, filtros de papel sin blanquear y hierbas naturales.",
                buenas_practicas="Escurre el exceso de agua; es excelente abono rico en nitrógeno para la huerta.",
                horario_referencia="Martes y viernes · 7:00 a.m. – 11:00 a.m. (previa coordinación)",
            ),
            GuiaResiduo(
                nombre="Cáscaras de huevo trituradas",
                flujo="organico",
                categoria="Cocina cruda",
                icono="sprout",
                descripcion="Cáscaras limpias de huevo que aportan calcio al compost comunitario.",
                buenas_practicas="Enjuágalas suavemente y aplástalas un poco para acelerar su compostaje.",
                horario_referencia="Martes y viernes · 7:00 a.m. – 11:00 a.m. (previa coordinación)",
            ),
            GuiaResiduo(
                nombre="Restos de poda y hojas secas",
                flujo="organico",
                categoria="Jardín y patio",
                icono="leaf",
                descripcion="Hojas secas de patio, ramas pequeñas y flores marchitas sin pesticidas.",
                buenas_practicas="Separa piedras, colillas o basura plástica antes de empacar en costal o balde.",
                horario_referencia="Sábados · 8:00 a.m. – 12:00 m. (previa coordinación)",
            ),
            GuiaResiduo(
                nombre="Botellas plásticas PET y envases rígidos",
                flujo="reciclable",
                categoria="Plásticos",
                icono="milk",
                descripcion="Botellas de agua, gaseosa, jugos, envases de detergente y champú.",
                buenas_practicas="Vacía el contenido, enjuaga rápido, aplasta la botella y deja la tapa puesta.",
                horario_referencia="Lunes, miércoles y sábados · 8:00 a.m. – 4:00 p.m.",
            ),
            GuiaResiduo(
                nombre="Cartón corrugado y cajas limpias",
                flujo="reciclable",
                categoria="Papel y cartón",
                icono="package",
                descripcion="Cajas de mercado, electrodomésticos, empaques de cereal y tubos de cartón.",
                buenas_practicas="Desarma y aplana las cajas; mantenlas secas y libres de grasa o comida.",
                horario_referencia="Lunes, miércoles y sábados · 8:00 a.m. – 4:00 p.m.",
            ),
            GuiaResiduo(
                nombre="Papel, cuadernos y periódicos",
                flujo="reciclable",
                categoria="Papel y cartón",
                icono="file-text",
                descripcion="Hojas impresas, cuadernos escolares usados, revistas, folletos y sobres.",
                buenas_practicas="Guárdalos limpios y secos en una bolsa o caja aparte, sin papel higiénico.",
                horario_referencia="Lunes, miércoles y sábados · 8:00 a.m. – 4:00 p.m.",
            ),
            GuiaResiduo(
                nombre="Latas de aluminio y chatarra liviana",
                flujo="reciclable",
                categoria="Metales",
                icono="cup-soda",
                descripcion="Latas de bebidas, conservas enjuagadas y tapas metálicas.",
                buenas_practicas="Escurre y enjuaga para evitar olores; si puedes, aplasta las latas de bebida.",
                horario_referencia="Lunes, miércoles y sábados · 8:00 a.m. – 4:00 p.m.",
            ),
            GuiaResiduo(
                nombre="Envases y botellas de vidrio",
                flujo="reciclable",
                categoria="Vidrio",
                icono="wine",
                descripcion="Frascos de mermelada, salsas, café y botellas enteras de vidrio.",
                buenas_practicas="Entrégalos limpios y en caja segura. Si hay vidrio roto, envuélvelo bien y avisa al coordinador.",
                horario_referencia="Miércoles y sábados · 8:00 a.m. – 4:00 p.m.",
            ),
            GuiaResiduo(
                nombre="Papel higiénico, pañales y toallas sanitarias",
                flujo="no_aprovechable",
                categoria="Residuo ordinario",
                icono="ban",
                descripcion="Residuos sanitarios que no pueden ir ni a la huerta ni a los recicladores.",
                buenas_practicas="Dispónlos en bolsa negra cerrada para el camión de aseo ordinario del barrio.",
                horario_referencia="Ruta habitual de aseo municipal",
            ),
            GuiaResiduo(
                nombre="Servilletas grasosas y empaques con comida",
                flujo="no_aprovechable",
                categoria="Residuo contaminado",
                icono="ban",
                descripcion="Cartón con aceite de frituras, icopor sucio o servilletas con grasa.",
                buenas_practicas="La grasa contamina el reciclaje y atrae plagas en el compostaje. Van a bolsa negra.",
                horario_referencia="Ruta habitual de aseo municipal",
            ),
            GuiaResiduo(
                nombre="Huesos grandes, carnes cocidas y aceite quemado",
                flujo="no_aprovechable",
                categoria="No compostable en huerta",
                icono="ban",
                descripcion="Restos cárnicos cocidos o aceite de cocina usado que alteran la compostera comunitaria.",
                buenas_practicas="El aceite usado guárdalo frío en botella plástica bien cerrada para puntos especiales.",
                horario_referencia="No incluir en entregas a la huerta comunitaria",
            ),
        ]
        db.add_all(guia_items)
        created_summary["guia_residuos"] = len(guia_items)

    # 6. Solicitudes iniciales recibidas vía WhatsApp con acreditación dual (usuario + recolector)
    if db.scalar(select(Solicitud.id).limit(1)) is None:
        now = datetime.now(timezone.utc)
        year = now.year

        # Solicitud 1: Orgánica en KG (32.00 kg -> 32.00 pts para Comedor Piloto y Efraín Cantillo)
        efrain = integrantes_by_name["Efraín Cantillo"]
        s1 = Solicitud(
            codigo=f"ECO-{year}-0001",
            usuario_id=piloto_user.id,
            coordinador_id=coord_huerta.id,
            encargado_id=efrain.id,
            nombre_solicitante=piloto_user.nombre,
            telefono_contacto=piloto_user.telefono or "+57 300 000 0101",
            direccion=piloto_user.direccion or "Manzana 14, Casa 8, Villas de San Pablo",
            tipo_generador="unidad_productiva",
            flujo="organico",
            estado=EstadoSolicitud.RECOLECTADA.value,
            canal_origen="whatsapp",
            tipo_mensaje_origen="texto",
            mensaje_original="Hola, somos del Comedor Comunitario Sabor Caribeño en Manzana 14 Casa 8. Tenemos residuos vegetales y cáscaras frescas listas para recoger en la mañana.",
            resumen_material="Residuos vegetales frescos y cáscaras del comedor comunitario",
            preferencia_horaria="Mañana (8:00 a.m. – 10:30 a.m.)",
            observaciones="Material detectado: Residuos vegetales frescos del comedor comunitario.",
            fecha_programada=(now - timedelta(days=3)).date(),
            hora_programada="08:30",
            nombre_encargado=efrain.nombre,
            creado_en=now - timedelta(days=4),
            actualizado_en=now - timedelta(days=3),
        )
        db.add(s1)
        db.flush()

        r1 = RegistroRecoleccion(
            solicitud_id=s1.id,
            coordinador_id=coord_huerta.id,
            encargado_id=efrain.id,
            nombre_solicitante_verificado=piloto_user.nombre,
            peso_ingresado=Decimal("32.00"),
            unidad_medida="kg",
            peso_kg=Decimal("32.00"),
            nombre_encargado=efrain.nombre,
            fecha_hora_recoleccion=now - timedelta(days=3),
            observaciones="Material muy bien separado y limpio para camas de compostaje.",
            puntos_calculados=Decimal("32.00"),
            creado_en=now - timedelta(days=3),
        )
        db.add(r1)
        db.flush()
        db.add_all(
            [
                MovimientoPuntos(
                    tipo_destinatario="usuario",
                    tipo_movimiento="credito",
                    usuario_id=piloto_user.id,
                    integrante_colectivo_id=None,
                    solicitud_id=s1.id,
                    registro_recoleccion_id=r1.id,
                    flujo="organico",
                    peso_ingresado=Decimal("32.00"),
                    unidad_medida="kg",
                    peso_kg=Decimal("32.00"),
                    puntos=Decimal("32.00"),
                    regla_aplicada="1.00 pts/kg (32.00 kg) [organico]",
                    creado_en=now - timedelta(days=3),
                ),
                MovimientoPuntos(
                    tipo_destinatario="recolector",
                    tipo_movimiento="credito",
                    usuario_id=None,
                    integrante_colectivo_id=efrain.id,
                    solicitud_id=s1.id,
                    registro_recoleccion_id=r1.id,
                    flujo="organico",
                    peso_ingresado=Decimal("32.00"),
                    unidad_medida="kg",
                    peso_kg=Decimal("32.00"),
                    puntos=Decimal("32.00"),
                    regla_aplicada="1.00 pts/kg (32.00 kg) [organico]",
                    creado_en=now - timedelta(days=3),
                ),
            ]
        )
        db.add_all(
            [
                HistorialEstado(
                    solicitud_id=s1.id,
                    estado_anterior=None,
                    estado_nuevo="recibida",
                    usuario_id=piloto_user.id,
                    comentario="Solicitud recibida vía WhatsApp (texto) y enrutada a Coordinación de Huerteros.",
                    creado_en=now - timedelta(days=4),
                ),
                HistorialEstado(
                    solicitud_id=s1.id,
                    estado_anterior="recibida",
                    estado_nuevo="programada",
                    usuario_id=coord_huerta.id,
                    comentario="Recolección programada con el comedor piloto. Encargado interno asignado: Efraín Cantillo.",
                    creado_en=now - timedelta(days=3, hours=12),
                ),
                HistorialEstado(
                    solicitud_id=s1.id,
                    estado_anterior="programada",
                    estado_nuevo="recolectada",
                    usuario_id=coord_huerta.id,
                    comentario="Recolección cerrada por Marta Lucía Herrera. Peso: 32.00 kg | Encargado: Efraín Cantillo | Acreditación dual: +32.00 pts usuario y +32.00 pts recolector.",
                    creado_en=now - timedelta(days=3),
                ),
            ]
        )
        db.add(
            NotificacionWhatsApp(
                solicitud_id=s1.id,
                flujo="organico",
                destinatario_nombre=piloto_user.nombre,
                destinatario_telefono=s1.telefono_contacto,
                tipo_evento="recoleccion_completada",
                mensaje=(
                    f"¡Gracias {piloto_user.nombre}! Tu entrega {s1.codigo} (organico) fue "
                    "completada con 32.00 kg. Ganaste +32.00 puntos en EcoConecta – Villas de San Pablo."
                ),
                modo="cloud_api",
                estado_envio="enviado",
                respuesta_api={"provider": "Meta WhatsApp Business Cloud API"},
                creado_en=now - timedelta(days=3),
            )
        )

        # Solicitud 2: Reciclable en LIBRAS (23.00 lb = 11.50 kg -> 11.50 pts decimales)
        sandra = integrantes_by_name["Sandra Milena Ospino"]
        s2 = Solicitud(
            codigo=f"ECO-{year}-0002",
            usuario_id=hogar_user.id,
            coordinador_id=coord_reciclaje.id,
            encargado_id=sandra.id,
            nombre_solicitante=hogar_user.nombre,
            telefono_contacto=hogar_user.telefono or "+57 300 000 0102",
            direccion=hogar_user.direccion or "Manzana 22, Casa 15, Villas de San Pablo",
            tipo_generador="hogar",
            flujo="reciclable",
            estado=EstadoSolicitud.RECOLECTADA.value,
            canal_origen="whatsapp",
            tipo_mensaje_origen="audio",
            mensaje_original="Hola buenas tardes, hablo de la Familia Mendoza en Manzana 22 Casa 15. Tenemos botellas PET aplastadas, cajas de cartón secas y latas enjuagadas para que pasen en la tarde.",
            resumen_material="Botellas PET, cajas de cartón secas y latas de aluminio limpias",
            preferencia_horaria="Tarde (2:00 p.m. – 4:30 p.m.)",
            observaciones="Material detectado: Botellas PET aplastadas, cajas de cartón secas y latas enjuagadas.",
            fecha_programada=(now - timedelta(days=2)).date(),
            hora_programada="15:00",
            nombre_encargado=sandra.nombre,
            creado_en=now - timedelta(days=3),
            actualizado_en=now - timedelta(days=2),
        )
        db.add(s2)
        db.flush()

        r2 = RegistroRecoleccion(
            solicitud_id=s2.id,
            coordinador_id=coord_reciclaje.id,
            encargado_id=sandra.id,
            nombre_solicitante_verificado=hogar_user.nombre,
            peso_ingresado=Decimal("23.00"),
            unidad_medida="lb",
            peso_kg=Decimal("11.50"),
            nombre_encargado=sandra.nombre,
            fecha_hora_recoleccion=now - timedelta(days=2),
            observaciones="Material reciclable limpio y seco pesado en báscula de libras (23 lb = 11.5 kg).",
            puntos_calculados=Decimal("11.50"),
            creado_en=now - timedelta(days=2),
        )
        db.add(r2)
        db.flush()
        db.add_all(
            [
                MovimientoPuntos(
                    tipo_destinatario="usuario",
                    tipo_movimiento="credito",
                    usuario_id=hogar_user.id,
                    integrante_colectivo_id=None,
                    solicitud_id=s2.id,
                    registro_recoleccion_id=r2.id,
                    flujo="reciclable",
                    peso_ingresado=Decimal("23.00"),
                    unidad_medida="lb",
                    peso_kg=Decimal("11.50"),
                    puntos=Decimal("11.50"),
                    regla_aplicada="0.50 pts/lb (23.00 lb = 11.50 kg) [reciclable]",
                    creado_en=now - timedelta(days=2),
                ),
                MovimientoPuntos(
                    tipo_destinatario="recolector",
                    tipo_movimiento="credito",
                    usuario_id=None,
                    integrante_colectivo_id=sandra.id,
                    solicitud_id=s2.id,
                    registro_recoleccion_id=r2.id,
                    flujo="reciclable",
                    peso_ingresado=Decimal("23.00"),
                    unidad_medida="lb",
                    peso_kg=Decimal("11.50"),
                    puntos=Decimal("11.50"),
                    regla_aplicada="0.50 pts/lb (23.00 lb = 11.50 kg) [reciclable]",
                    creado_en=now - timedelta(days=2),
                ),
            ]
        )
        db.add_all(
            [
                HistorialEstado(
                    solicitud_id=s2.id,
                    estado_anterior=None,
                    estado_nuevo="recibida",
                    usuario_id=hogar_user.id,
                    comentario="Solicitud recibida vía WhatsApp (nota de voz transcrita) y enrutada a Coordinación de Recicladores.",
                    creado_en=now - timedelta(days=3),
                ),
                HistorialEstado(
                    solicitud_id=s2.id,
                    estado_anterior="recibida",
                    estado_nuevo="programada",
                    usuario_id=coord_reciclaje.id,
                    comentario="Recolección programada con el hogar. Encargado interno asignado: Sandra Milena Ospino.",
                    creado_en=now - timedelta(days=2, hours=8),
                ),
                HistorialEstado(
                    solicitud_id=s2.id,
                    estado_anterior="programada",
                    estado_nuevo="recolectada",
                    usuario_id=coord_reciclaje.id,
                    comentario="Recolección cerrada por Carlos Alberto Barrios. Peso: 23.00 lb (11.50 kg) | Encargado: Sandra Milena Ospino | Acreditación dual: +11.50 pts usuario y +11.50 pts recolector.",
                    creado_en=now - timedelta(days=2),
                ),
            ]
        )
        db.add(
            NotificacionWhatsApp(
                solicitud_id=s2.id,
                flujo="reciclable",
                destinatario_nombre=hogar_user.nombre,
                destinatario_telefono=s2.telefono_contacto,
                tipo_evento="recoleccion_completada",
                mensaje=(
                    f"¡Gracias {hogar_user.nombre}! Tu entrega {s2.codigo} (reciclable) fue "
                    "completada con 23.00 lb (11.50 kg). Ganaste +11.50 puntos en EcoConecta – Villas de San Pablo."
                ),
                modo="cloud_api",
                estado_envio="enviado",
                respuesta_api={"provider": "Meta WhatsApp Business Cloud API"},
                creado_en=now - timedelta(days=2),
            )
        )

        # Solicitud 3: Orgánica programada (lista para probar el Formulario de Cierre en kg o lb)
        jairo = integrantes_by_name["Jairo Escorcia"]
        s3 = Solicitud(
            codigo=f"ECO-{year}-0003",
            usuario_id=piloto_user.id,
            coordinador_id=coord_huerta.id,
            encargado_id=jairo.id,
            nombre_solicitante=piloto_user.nombre,
            telefono_contacto=piloto_user.telefono or "+57 300 000 0101",
            direccion=piloto_user.direccion or "Manzana 14, Casa 8, Villas de San Pablo",
            tipo_generador="unidad_productiva",
            flujo="organico",
            estado=EstadoSolicitud.PROGRAMADA.value,
            canal_origen="whatsapp",
            tipo_mensaje_origen="texto",
            mensaje_original="Hola, queremos pedir recolección orgánica para el comedor en Manzana 14 Casa 8. Ya tenemos dos baldes con cáscaras de verduras y borra de café para mañana a las 8.",
            resumen_material="Dos baldes de cáscaras vegetales y borra de café",
            preferencia_horaria="Mañana (7:30 a.m. – 9:30 a.m.)",
            observaciones="Dos baldes con residuos vegetales frescos listos para pesaje.",
            fecha_programada=date.today() + timedelta(days=1),
            hora_programada="08:00",
            nombre_encargado=jairo.nombre,
            creado_en=now - timedelta(hours=18),
            actualizado_en=now - timedelta(hours=6),
        )
        db.add(s3)
        db.flush()
        db.add_all(
            [
                HistorialEstado(
                    solicitud_id=s3.id,
                    estado_anterior=None,
                    estado_nuevo="recibida",
                    usuario_id=piloto_user.id,
                    comentario="Solicitud orgánica recibida vía WhatsApp (texto) de Unidad Productiva Piloto.",
                    creado_en=now - timedelta(hours=18),
                ),
                HistorialEstado(
                    solicitud_id=s3.id,
                    estado_anterior="recibida",
                    estado_nuevo="programada",
                    usuario_id=coord_huerta.id,
                    comentario="Horario acordado con la unidad productiva. Encargado interno asignado: Jairo Escorcia.",
                    creado_en=now - timedelta(hours=6),
                ),
            ]
        )
        db.add(
            NotificacionWhatsApp(
                solicitud_id=s3.id,
                flujo="organico",
                destinatario_nombre=piloto_user.nombre,
                destinatario_telefono=s3.telefono_contacto,
                tipo_evento="recoleccion_programada",
                mensaje=(
                    f"Hola {piloto_user.nombre}, soy {coord_huerta.nombre} (Coordinación de Huerteros). "
                    f"Tu recolección {s3.codigo} quedó programada para el {s3.fecha_programada.isoformat()} "
                    f"a las {s3.hora_programada}."
                ),
                modo="cloud_api",
                estado_envio="enviado",
                respuesta_api={"provider": "Meta WhatsApp Business Cloud API"},
                creado_en=now - timedelta(hours=6),
            )
        )

        # Solicitud 4: Reciclable recién recibida vía WhatsApp (exclusiva para Coordinador de Recicladores)
        s4 = Solicitud(
            codigo=f"ECO-{year}-0004",
            usuario_id=hogar_user.id,
            coordinador_id=coord_reciclaje.id,
            nombre_solicitante=hogar_user.nombre,
            telefono_contacto=hogar_user.telefono or "+57 300 000 0102",
            direccion=hogar_user.direccion or "Manzana 22, Casa 15, Villas de San Pablo",
            tipo_generador="hogar",
            flujo="reciclable",
            estado=EstadoSolicitud.RECIBIDA.value,
            canal_origen="whatsapp",
            tipo_mensaje_origen="texto",
            mensaje_original="Hola, quiero pedir una recolección en Villas de San Pablo. Tengo dos costales de botellas PET limpias, cartón plegado y cuadernos usados para el sábado en la mañana.",
            resumen_material="Dos costales de botellas PET, cajas de cartón plegadas y cuadernos usados",
            preferencia_horaria="Sábado en la mañana (9:00 a.m. – 12:00 m.)",
            observaciones="Material detectado: Dos costales con botellas PET, cartón plegado y cuadernos.",
            creado_en=now - timedelta(hours=3),
            actualizado_en=now - timedelta(hours=3),
        )
        db.add(s4)
        db.flush()
        db.add(
            HistorialEstado(
                solicitud_id=s4.id,
                estado_anterior=None,
                estado_nuevo="recibida",
                usuario_id=hogar_user.id,
                comentario="Solicitud recibida vía WhatsApp (texto) en flujo 'reciclable' y enrutada a Coordinación de Recicladores.",
                creado_en=now - timedelta(hours=3),
            )
        )
        db.add(
            NotificacionWhatsApp(
                solicitud_id=s4.id,
                flujo="reciclable",
                destinatario_nombre=hogar_user.nombre,
                destinatario_telefono=s4.telefono_contacto,
                tipo_evento="solicitud_recibida",
                mensaje=(
                    f"¡Hola {hogar_user.nombre}! Recibimos tu solicitud {s4.codigo} en EcoConecta "
                    f"(flujo: Reciclables). {coord_reciclaje.nombre} coordinará contigo el día y hora por WhatsApp."
                ),
                modo="cloud_api",
                estado_envio="enviado",
                respuesta_api={"provider": "Meta WhatsApp Business Cloud API"},
                creado_en=now - timedelta(hours=3),
            )
        )

        # Solicitud 5: Nota de voz recibida desde número nuevo (Pendiente de completar datos)
        s5 = Solicitud(
            codigo=f"ECO-{year}-0005",
            usuario_id=nuevo_wa_user.id,
            coordinador_id=coord_huerta.id,
            nombre_solicitante=nuevo_wa_user.nombre,
            telefono_contacto=nuevo_wa_user.telefono or "+57 300 000 0199",
            direccion=nuevo_wa_user.direccion or "Manzana 18, Casa 4, Villas de San Pablo",
            tipo_generador="hogar",
            flujo="organico",
            estado=EstadoSolicitud.RECIBIDA.value,
            canal_origen="whatsapp",
            tipo_mensaje_origen="audio",
            mensaje_original="Hola buenas tardes, hablo desde la Manzana 18 Casa 4 en Villas de San Pablo, tengo un balde con cáscaras de plátano, yuca, huevo y borra de café para que pasen mañana temprano por favor.",
            resumen_material="Balde con cáscaras de plátano, yuca, huevo y borra de café",
            preferencia_horaria="Mañana temprano",
            observaciones="Usuario nuevo desde WhatsApp — Pendiente de completar datos.",
            requiere_revision_flujo=False,
            clasificacion_ia={
                "flujo": "organico",
                "tipo_generador": "hogar",
                "direccion_mencionada": "Manzana 18 Casa 4, Villas de San Pablo",
                "resumen_material": "Balde con cáscaras de plátano, yuca, huevo y borra de café",
                "preferencia_horaria": "Mañana temprano",
                "requiere_revision_flujo": False,
                "confianza": 0.96,
                "fuente": "openai_gpt-4o-mini",
                "modelo_transcripcion": "gpt-4o-mini-transcribe",
            },
            creado_en=now - timedelta(hours=1),
            actualizado_en=now - timedelta(hours=1),
        )
        db.add(s5)
        db.flush()
        db.add(
            HistorialEstado(
                solicitud_id=s5.id,
                estado_anterior=None,
                estado_nuevo="recibida",
                usuario_id=nuevo_wa_user.id,
                comentario="Solicitud recibida vía WhatsApp (nota de voz transcrita). Nuevo perfil creado (Pendiente de completar datos).",
                creado_en=now - timedelta(hours=1),
            )
        )
        db.add(
            NotificacionWhatsApp(
                solicitud_id=s5.id,
                flujo="organico",
                destinatario_nombre=nuevo_wa_user.nombre,
                destinatario_telefono=s5.telefono_contacto,
                tipo_evento="solicitud_recibida",
                mensaje=(
                    f"¡Hola {nuevo_wa_user.nombre}! Recibimos tu solicitud {s5.codigo} en EcoConecta – Villas de San Pablo "
                    f"(Orgánicos - Huerteros). {coord_huerta.nombre} se pondrá en contacto contigo por WhatsApp."
                ),
                modo="cloud_api",
                estado_envio="enviado",
                respuesta_api={"provider": "Meta WhatsApp Business Cloud API"},
                creado_en=now - timedelta(hours=1),
            )
        )

        created_summary["solicitudes"] = 5

    db.commit()
    return created_summary


def main() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_schema_compatibility(engine)
    db = SessionLocal()
    try:
        summary = run_seed(db)
        print(f"[EcoConecta seed] Completado: {summary}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
