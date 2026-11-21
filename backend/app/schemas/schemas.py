from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


# --- Auth & Usuarios ---

class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: str
    rol: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    barrio_sector: str
    es_piloto: bool
    habilitado_solicitudes: bool
    pendiente_completar_datos: bool = False
    activo: bool
    puntos_acumulados: float = 0.0
    creado_en: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)


class DemoLoginRequest(BaseModel):
    email: EmailStr


class RegisterCitizenRequest(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    rol: Literal["hogar", "unidad_productiva"] = "hogar"
    telefono: str = Field(min_length=7, max_length=30)
    direccion: str = Field(min_length=5, max_length=255)
    barrio_sector: str = Field(default="Villas de San Pablo", max_length=120)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


class DemoAccountOut(BaseModel):
    email: str
    nombre: str
    rol: str
    etiqueta: str
    descripcion: str
    flujo: Optional[str] = None


class UsuarioAdminUpdate(BaseModel):
    es_piloto: Optional[bool] = None
    habilitado_solicitudes: Optional[bool] = None
    activo: Optional[bool] = None


# --- Integrantes del Colectivo (Solo Coordinadores / Admin) ---

class IntegranteCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    flujo: Optional[Literal["organico", "reciclable"]] = None
    rol_interno: str = Field(min_length=2, max_length=80)
    zona_cobertura: Optional[str] = Field(default="Villas de San Pablo", max_length=120)


class IntegranteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    flujo: str
    rol_interno: str
    zona_cobertura: Optional[str] = None
    activo: bool


# --- Historial & Auditoría WhatsApp ---

class HistorialEstadoOut(BaseModel):
    id: int
    estado_anterior: Optional[str] = None
    estado_nuevo: str
    usuario_nombre: str
    usuario_rol: str
    comentario: Optional[str] = None
    creado_en: datetime


class HistorialPublicoOut(BaseModel):
    estado_nuevo: str
    creado_en: datetime


class NotificacionWhatsAppOut(BaseModel):
    id: int
    solicitud_id: Optional[int] = None
    codigo_solicitud: Optional[str] = None
    flujo: str
    destinatario_nombre: str
    destinatario_telefono: str
    tipo_evento: str
    mensaje: str
    modo: str
    estado_envio: str
    respuesta_api: Optional[dict[str, Any]] = None
    creado_en: datetime


# --- Registro de Recolección (Formulario obligatorio en /coordinacion con kg o lb) ---

class RegistroRecoleccionCreate(BaseModel):
    nombre_solicitante_verificado: str = Field(min_length=2, max_length=150)
    peso_ingresado: Decimal = Field(gt=Decimal("0"), le=Decimal("20000"))
    unidad_medida: Literal["kg", "lb"] = "kg"
    nombre_encargado: str = Field(min_length=2, max_length=150)
    encargado_id: Optional[int] = None
    fecha_hora_recoleccion: Optional[datetime] = None
    observaciones: Optional[str] = Field(default=None, max_length=1000)

    @model_validator(mode="before")
    @classmethod
    def support_legacy_peso_kg(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "peso_ingresado" not in data and "peso_kg" in data:
                copied = dict(data)
                copied["peso_ingresado"] = copied["peso_kg"]
                copied.setdefault("unidad_medida", "kg")
                return copied
        return data

    @field_validator("nombre_solicitante_verificado", "nombre_encargado")
    @classmethod
    def strip_required_names(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Este campo es obligatorio y debe tener al menos 2 caracteres.")
        return cleaned


class RegistroRecoleccionOut(BaseModel):
    id: int
    solicitud_id: int
    codigo_solicitud: str
    flujo: str
    tipo_generador: str
    coordinador_id: int
    coordinador_nombre: str
    encargado_id: Optional[int] = None
    nombre_solicitante_verificado: str
    peso_ingresado: float
    unidad_medida: Literal["kg", "lb"]
    peso_kg: float
    nombre_encargado: str
    fecha_hora_recoleccion: datetime
    observaciones: Optional[str] = None
    puntos_calculados: float
    creado_en: datetime


# --- Solicitudes (recibidas vía WhatsApp móvil) ---

class ProgramarSolicitudRequest(BaseModel):
    """RN-02: Para pasar a `programada`, fecha, hora y encargado son obligatorios."""

    fecha_programada: date
    hora_programada: str = Field(min_length=3, max_length=20)
    nombre_encargado: str = Field(min_length=2, max_length=150)
    encargado_id: Optional[int] = None
    comentario: Optional[str] = Field(default=None, max_length=500)

    @field_validator("hora_programada", "nombre_encargado")
    @classmethod
    def strip_non_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Campo obligatorio para programar la recolección.")
        return cleaned


class CambiarEstadoRequest(BaseModel):
    estado_nuevo: Literal["en_revision", "asignada", "cancelada"]
    nombre_encargado: Optional[str] = Field(default=None, max_length=150)
    encargado_id: Optional[int] = None
    comentario: Optional[str] = Field(default=None, max_length=500)


class ReclasificarFlujoRequest(BaseModel):
    """Permite mover una solicitud entre Orgánicos y Reciclables si hubo mezcla o error de IA."""

    nuevo_flujo: Literal["organico", "reciclable"]
    motivo: Optional[str] = Field(default=None, max_length=500)


class ReclasificarFlujoOut(BaseModel):
    id: int
    codigo: str
    flujo_anterior: Literal["organico", "reciclable"]
    flujo_nuevo: Literal["organico", "reciclable"]
    coordinador_nuevo: Optional[str] = None
    mensaje: str


class VerificarDatosUsuarioRequest(BaseModel):
    """Permite al coordinador completar/verificar el perfil de un número nuevo de WhatsApp."""

    nombre_solicitante: str = Field(min_length=2, max_length=150)
    direccion: str = Field(min_length=4, max_length=255)
    tipo_generador: Literal["hogar", "unidad_productiva"] = "hogar"

    @field_validator("nombre_solicitante", "direccion")
    @classmethod
    def strip_required_text(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Este campo es obligatorio.")
        return cleaned


class SolicitudCiudadanoOut(BaseModel):
    """Vista del usuario solicitante: incluye sus propios datos y SOLO el coordinador intermediario.
    Jamás expone datos de contacto del recolector/huertero.
    """

    id: int
    codigo: str
    nombre_solicitante: str
    telefono_contacto: str
    direccion: str
    tipo_generador: str
    flujo: str
    estado: str
    canal_origen: str = "whatsapp"
    tipo_mensaje_origen: str = "texto"
    mensaje_original: Optional[str] = None
    resumen_material: Optional[str] = None
    preferencia_horaria: Optional[str] = None
    observaciones: Optional[str] = None
    fecha_programada: Optional[date] = None
    hora_programada: Optional[str] = None
    coordinador_nombre: Optional[str] = None
    coordinador_rol_label: Optional[str] = None
    peso_ingresado: Optional[float] = None
    unidad_medida: Optional[str] = None
    peso_kg_registrado: Optional[float] = None
    puntos_otorgados: float = 0.0
    creado_en: datetime
    actualizado_en: datetime
    historial_estados: List[HistorialEstadoOut] = []


class SolicitudCoordinadorOut(BaseModel):
    """Vista operativa exclusiva en /coordinacion (RN-01, RN-07)."""

    id: int
    codigo: str
    usuario_id: int
    es_piloto_solicitante: bool
    pendiente_completar_datos: bool = False
    nombre_solicitante: str
    telefono_contacto: str
    direccion: str
    tipo_generador: str
    flujo: str
    estado: str
    canal_origen: str = "whatsapp"
    tipo_mensaje_origen: str = "texto"
    mensaje_original: Optional[str] = None
    resumen_material: Optional[str] = None
    requiere_revision_flujo: bool = False
    clasificacion_ia: Optional[dict[str, Any]] = None
    preferencia_horaria: Optional[str] = None
    observaciones: Optional[str] = None
    coordinador_id: Optional[int] = None
    coordinador_nombre: Optional[str] = None
    encargado_id: Optional[int] = None
    nombre_encargado: Optional[str] = None
    fecha_programada: Optional[date] = None
    hora_programada: Optional[str] = None
    creado_en: datetime
    actualizado_en: datetime
    registro_recoleccion: Optional[RegistroRecoleccionOut] = None
    historial_estados: List[HistorialEstadoOut] = []
    notificaciones: List[NotificacionWhatsAppOut] = []


class SolicitudPublicaTrackOut(BaseModel):
    """RN-07: Consulta pública por código sin exponer teléfono, dirección ni datos personales."""

    codigo: str
    flujo: str
    estado: str
    fecha_programada: Optional[date] = None
    hora_programada: Optional[str] = None
    coordinador_rol_label: str
    peso_ingresado: Optional[float] = None
    unidad_medida: Optional[str] = None
    peso_kg_registrado: Optional[float] = None
    puntos_otorgados: float = 0.0
    creado_en: datetime
    actualizado_en: datetime
    historial_publico: List[HistorialPublicoOut] = []


# --- Reglas de Puntos, Beneficios y Progreso por Niveles (RN-05, RN-06) ---

class ReglaPuntosOut(BaseModel):
    id: int
    flujo: str
    puntos_base: float
    puntos_por_kg: float
    puntos_por_libra: float
    descripcion: Optional[str] = None
    activo: bool
    actualizado_en: datetime
    nota_institucional: str


class ReglaPuntosUpdate(BaseModel):
    puntos_base: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0"), le=Decimal("1000"))
    puntos_por_kg: Decimal = Field(gt=Decimal("0"), le=Decimal("1000"))
    puntos_por_libra: Decimal = Field(gt=Decimal("0"), le=Decimal("1000"))
    descripcion: Optional[str] = Field(default=None, max_length=255)
    activo: bool = True


class BeneficioCreate(BaseModel):
    tipo_destinatario: Literal["usuario", "recolector"]
    nombre: str = Field(min_length=2, max_length=150)
    descripcion: str = Field(min_length=3, max_length=1000)
    puntos_requeridos: Decimal = Field(gt=Decimal("0"), le=Decimal("100000"))
    activo: bool = True


class BeneficioUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=150)
    descripcion: Optional[str] = Field(default=None, min_length=3, max_length=1000)
    puntos_requeridos: Optional[Decimal] = Field(default=None, gt=Decimal("0"), le=Decimal("100000"))
    activo: Optional[bool] = None


class BeneficioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo_destinatario: Literal["usuario", "recolector"]
    nombre: str
    descripcion: str
    puntos_requeridos: float
    activo: bool
    desbloqueado: bool = False
    puntos_faltantes: float = 0.0


class ProgresoNivelOut(BaseModel):
    nivel_actual: str
    siguiente_beneficio_id: Optional[int] = None
    siguiente_nivel_nombre: Optional[str] = None
    puntos_siguiente_nivel: Optional[float] = None
    puntos_faltantes: float = 0.0
    porcentaje_avance: float = 0.0


class CanjeCreate(BaseModel):
    beneficio_id: int
    observaciones: Optional[str] = Field(default=None, max_length=500)


class CanjeOut(BaseModel):
    id: int
    beneficio_id: int
    beneficio_nombre: str
    tipo_destinatario: str
    destinatario_nombre: str
    puntos_canjeados: float
    estado: str
    observaciones: Optional[str] = None
    registrado_por_nombre: str
    creado_en: datetime


class MovimientoPuntosOut(BaseModel):
    id: int
    tipo_destinatario: str
    tipo_movimiento: str
    solicitud_id: Optional[int] = None
    codigo_solicitud: Optional[str] = None
    beneficio_nombre: Optional[str] = None
    flujo: Optional[str] = None
    peso_ingresado: Optional[float] = None
    unidad_medida: Optional[str] = None
    peso_kg: Optional[float] = None
    puntos: float
    regla_aplicada: str
    creado_en: datetime


class MiResumenPuntosOut(BaseModel):
    puntos_disponibles: float
    puntos_totales: float
    puntos_ganados: float
    puntos_canjeados: float
    total_kg: float
    recolecciones_completadas: int
    progreso_nivel: ProgresoNivelOut
    beneficios: List[BeneficioOut]
    canjes: List[CanjeOut]
    nota_institucional: str
    movimientos: List[MovimientoPuntosOut]


class ResumenPuntosRecolectorOut(BaseModel):
    integrante_id: int
    nombre: str
    flujo: str
    rol_interno: str
    zona_cobertura: Optional[str] = None
    recolecciones_realizadas: int
    total_kg_recolectados: float
    puntos_disponibles: float
    puntos_ganados: float
    puntos_canjeados: float
    progreso_nivel: ProgresoNivelOut
    beneficios: List[BeneficioOut]
    canjes_recientes: List[CanjeOut]
    movimientos_recientes: List[MovimientoPuntosOut]


class PanelRecolectoresPuntosOut(BaseModel):
    nota_institucional: str
    catalogo_beneficios: List[BeneficioOut]
    recolectores: List[ResumenPuntosRecolectorOut]


# --- Reportes ---

class ResumenOperativoOut(BaseModel):
    flujo_filtrado: Optional[str] = None
    periodo_desde: Optional[date] = None
    periodo_hasta: Optional[date] = None
    total_solicitudes: int
    por_estado: dict[str, int]
    total_recolecciones_cerradas: int
    total_kg_recolectados: float
    kg_organico: float
    kg_reciclable: float
    total_puntos_otorgados: float
    modo_whatsapp_activo: str
    nota_institucional: str


# --- Portal Público ---

class PublicConfigOut(BaseModel):
    app_name: str
    whatsapp_public_number: str
    whatsapp_default_message: str
    whatsapp_url: str


class GuiaResiduoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    flujo: str
    categoria: str
    icono: str
    descripcion: str
    buenas_practicas: str
    horario_referencia: str


class ImpactoPublicoOut(BaseModel):
    total_kg_aprovechados: float
    kg_organico: float
    kg_reciclable: float
    recolecciones_completadas: int
    participantes_activos: int
    nota_institucional: str
