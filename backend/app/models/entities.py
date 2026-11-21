from datetime import date, datetime, timezone
from decimal import Decimal
import enum
from typing import Any, List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class RolUsuario(str, enum.Enum):
    HOGAR = "hogar"
    UNIDAD_PRODUCTIVA = "unidad_productiva"
    COORDINADOR_HUERTEROS = "coordinador_huerteros"
    COORDINADOR_RECICLADORES = "coordinador_recicladores"
    ADMINISTRADOR = "administrador"


class TipoGenerador(str, enum.Enum):
    HOGAR = "hogar"
    UNIDAD_PRODUCTIVA = "unidad_productiva"


class FlujoResiduo(str, enum.Enum):
    ORGANICO = "organico"
    RECICLABLE = "reciclable"


class EstadoSolicitud(str, enum.Enum):
    RECIBIDA = "recibida"
    EN_REVISION = "en_revision"
    ASIGNADA = "asignada"
    PROGRAMADA = "programada"
    RECOLECTADA = "recolectada"
    CANCELADA = "cancelada"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    telefono_normalizado: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True, index=True
    )
    direccion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    barrio_sector: Mapped[str] = mapped_column(
        String(120), nullable=False, default="Villas de San Pablo"
    )
    es_piloto: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    habilitado_solicitudes: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    pendiente_completar_datos: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    solicitudes_creadas: Mapped[List["Solicitud"]] = relationship(
        "Solicitud",
        foreign_keys="Solicitud.usuario_id",
        back_populates="usuario",
    )
    solicitudes_coordinadas: Mapped[List["Solicitud"]] = relationship(
        "Solicitud",
        foreign_keys="Solicitud.coordinador_id",
        back_populates="coordinador",
    )
    movimientos_puntos: Mapped[List["MovimientoPuntos"]] = relationship(
        "MovimientoPuntos",
        foreign_keys="MovimientoPuntos.usuario_id",
        back_populates="usuario",
    )


class IntegranteColectivo(Base):
    """Equipo interno de huerteros y recicladores.
    Sus datos de contacto NO se exponen al usuario solicitante.
    Cuenta con saldo propio de puntos y beneficios por su labor operativa.
    """

    __tablename__ = "integrantes_colectivo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    flujo: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    rol_interno: Mapped[str] = mapped_column(String(80), nullable=False)
    zona_cobertura: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    coordinador_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    coordinador: Mapped[Optional["Usuario"]] = relationship("Usuario")
    movimientos_puntos: Mapped[List["MovimientoPuntos"]] = relationship(
        "MovimientoPuntos",
        foreign_keys="MovimientoPuntos.integrante_colectivo_id",
        back_populates="integrante_colectivo",
    )


class Solicitud(Base):
    """Solicitudes de recolección recibidas exclusivamente vía WhatsApp móvil (Meta Cloud API)."""

    __tablename__ = "solicitudes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    coordinador_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True
    )
    encargado_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("integrantes_colectivo.id", ondelete="SET NULL"), nullable=True
    )
    nombre_solicitante: Mapped[str] = mapped_column(String(150), nullable=False)
    telefono_contacto: Mapped[str] = mapped_column(String(30), nullable=False)
    direccion: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_generador: Mapped[str] = mapped_column(String(30), nullable=False)
    flujo: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    estado: Mapped[str] = mapped_column(
        String(30), nullable=False, default=EstadoSolicitud.RECIBIDA.value, index=True
    )
    preferencia_horaria: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Origen WhatsApp móvil (texto o nota de voz transcrita + clasificación IA)
    canal_origen: Mapped[str] = mapped_column(String(30), nullable=False, default="whatsapp")
    tipo_mensaje_origen: Mapped[str] = mapped_column(String(20), nullable=False, default="texto")
    mensaje_original: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resumen_material: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    whatsapp_message_id: Mapped[Optional[str]] = mapped_column(
        String(120), unique=True, nullable=True, index=True
    )
    whatsapp_media_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    requiere_revision_flujo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    clasificacion_ia: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"), nullable=True
    )

    # Programación obligatoria (RN-02)
    fecha_programada: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    hora_programada: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    nombre_encargado: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    usuario: Mapped["Usuario"] = relationship(
        "Usuario", foreign_keys=[usuario_id], back_populates="solicitudes_creadas"
    )
    coordinador: Mapped[Optional["Usuario"]] = relationship(
        "Usuario", foreign_keys=[coordinador_id], back_populates="solicitudes_coordinadas"
    )
    encargado: Mapped[Optional["IntegranteColectivo"]] = relationship("IntegranteColectivo")
    registro_recoleccion: Mapped[Optional["RegistroRecoleccion"]] = relationship(
        "RegistroRecoleccion",
        back_populates="solicitud",
        uselist=False,
        cascade="all, delete-orphan",
    )
    historial_estados: Mapped[List["HistorialEstado"]] = relationship(
        "HistorialEstado",
        back_populates="solicitud",
        order_by="HistorialEstado.creado_en.asc()",
        cascade="all, delete-orphan",
    )
    notificaciones: Mapped[List["NotificacionWhatsApp"]] = relationship(
        "NotificacionWhatsApp",
        back_populates="solicitud",
        order_by="NotificacionWhatsApp.creado_en.desc()",
    )


class RegistroRecoleccion(Base):
    """Formulario de Registro y Cierre de Recolección diligenciado por el coordinador (RN-05).
    Guarda el peso ingresado, su unidad original (kg o lb), el equivalente normalizado en kg
    y los puntos decimales generados (NUMERIC(10,2)).
    """

    __tablename__ = "registros_recoleccion"
    __table_args__ = (
        CheckConstraint("peso_ingresado > 0", name="ck_registros_recoleccion_peso_ingresado_pos"),
        CheckConstraint("peso_kg > 0", name="ck_registros_recoleccion_peso_positivo"),
        CheckConstraint("unidad_medida IN ('kg', 'lb')", name="ck_registros_recoleccion_unidad"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    solicitud_id: Mapped[int] = mapped_column(
        ForeignKey("solicitudes.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    coordinador_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    encargado_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("integrantes_colectivo.id", ondelete="SET NULL"), nullable=True
    )
    nombre_solicitante_verificado: Mapped[str] = mapped_column(String(150), nullable=False)
    peso_ingresado: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(10), nullable=False, default="kg")
    peso_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    nombre_encargado: Mapped[str] = mapped_column(String(150), nullable=False)
    fecha_hora_recoleccion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    puntos_calculados: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    solicitud: Mapped["Solicitud"] = relationship(
        "Solicitud", back_populates="registro_recoleccion"
    )
    coordinador: Mapped["Usuario"] = relationship("Usuario")
    encargado: Mapped[Optional["IntegranteColectivo"]] = relationship("IntegranteColectivo")


class HistorialEstado(Base):
    """Trazabilidad obligatoria de cambios de estado (RN-04)."""

    __tablename__ = "historial_estados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    solicitud_id: Mapped[int] = mapped_column(
        ForeignKey("solicitudes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    estado_anterior: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    estado_nuevo: Mapped[str] = mapped_column(String(30), nullable=False)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    comentario: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    solicitud: Mapped["Solicitud"] = relationship("Solicitud", back_populates="historial_estados")
    usuario: Mapped["Usuario"] = relationship("Usuario")


class ReglaPuntos(Base):
    """Reglas parametrizables de puntos por flujo y unidad de peso (RN-06).
    Por defecto: 1 kg = 1.00 punto, 1 libra (500 g) = 0.50 puntos.
    """

    __tablename__ = "reglas_puntos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flujo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    puntos_base: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    puntos_por_kg: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("1.00")
    )
    puntos_por_libra: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.50")
    )
    descripcion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    actualizado_por_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    actualizado_por: Mapped[Optional["Usuario"]] = relationship("Usuario")


class Beneficio(Base):
    """Catálogo de beneficios diferenciado por tipo de destinatario (`usuario` o `recolector`)."""

    __tablename__ = "beneficios"
    __table_args__ = (
        CheckConstraint(
            "tipo_destinatario IN ('usuario', 'recolector')",
            name="ck_beneficios_tipo_destinatario",
        ),
        CheckConstraint("puntos_requeridos > 0", name="ck_beneficios_puntos_positivos"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo_destinatario: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    puntos_requeridos: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class CanjeBeneficio(Base):
    """Registro histórico de canjes de beneficios para usuarios y recolectores."""

    __tablename__ = "canjes_beneficios"
    __table_args__ = (
        CheckConstraint(
            "tipo_destinatario IN ('usuario', 'recolector')",
            name="ck_canjes_tipo_destinatario",
        ),
        CheckConstraint("puntos_canjeados > 0", name="ck_canjes_puntos_positivos"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    beneficio_id: Mapped[int] = mapped_column(
        ForeignKey("beneficios.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    tipo_destinatario: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True, index=True
    )
    integrante_colectivo_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("integrantes_colectivo.id", ondelete="CASCADE"), nullable=True, index=True
    )
    registrado_por_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    puntos_canjeados: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="registrado")
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    beneficio: Mapped["Beneficio"] = relationship("Beneficio")
    usuario: Mapped[Optional["Usuario"]] = relationship("Usuario", foreign_keys=[usuario_id])
    integrante_colectivo: Mapped[Optional["IntegranteColectivo"]] = relationship(
        "IntegranteColectivo", foreign_keys=[integrante_colectivo_id]
    )
    registrado_por: Mapped["Usuario"] = relationship("Usuario", foreign_keys=[registrado_por_id])


class MovimientoPuntos(Base):
    """Libro mayor dual de puntos (créditos por cierre de recolección y débitos por canjes).
    Soporta billeteras independientes para usuarios solicitantes y recolectores/huerteros (RN-05).
    """

    __tablename__ = "movimientos_puntos"
    __table_args__ = (
        CheckConstraint(
            "tipo_destinatario IN ('usuario', 'recolector')",
            name="ck_movimientos_tipo_destinatario",
        ),
        CheckConstraint(
            "tipo_movimiento IN ('credito', 'canje')",
            name="ck_movimientos_tipo_movimiento",
        ),
        UniqueConstraint(
            "registro_recoleccion_id",
            "tipo_destinatario",
            name="uq_movimiento_recoleccion_destinatario",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo_destinatario: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    tipo_movimiento: Mapped[str] = mapped_column(
        String(20), nullable=False, default="credito", index=True
    )
    usuario_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True, index=True
    )
    integrante_colectivo_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("integrantes_colectivo.id", ondelete="CASCADE"), nullable=True, index=True
    )
    solicitud_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("solicitudes.id", ondelete="CASCADE"), nullable=True, index=True
    )
    registro_recoleccion_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("registros_recoleccion.id", ondelete="CASCADE"), nullable=True
    )
    beneficio_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("beneficios.id", ondelete="SET NULL"), nullable=True
    )
    flujo: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    peso_ingresado: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    unidad_medida: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    peso_kg: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    puntos: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    regla_aplicada: Mapped[str] = mapped_column(String(255), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    usuario: Mapped[Optional["Usuario"]] = relationship(
        "Usuario", foreign_keys=[usuario_id], back_populates="movimientos_puntos"
    )
    integrante_colectivo: Mapped[Optional["IntegranteColectivo"]] = relationship(
        "IntegranteColectivo",
        foreign_keys=[integrante_colectivo_id],
        back_populates="movimientos_puntos",
    )
    solicitud: Mapped[Optional["Solicitud"]] = relationship("Solicitud")
    registro_recoleccion: Mapped[Optional["RegistroRecoleccion"]] = relationship(
        "RegistroRecoleccion"
    )
    beneficio: Mapped[Optional["Beneficio"]] = relationship("Beneficio")


class NotificacionWhatsApp(Base):
    """Registro de auditoría de mensajes enviados vía Meta WhatsApp Business Cloud API."""

    __tablename__ = "notificaciones_whatsapp"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    solicitud_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("solicitudes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    flujo: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    destinatario_nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    destinatario_telefono: Mapped[str] = mapped_column(String(30), nullable=False)
    tipo_evento: Mapped[str] = mapped_column(String(60), nullable=False)
    mensaje: Mapped[str] = mapped_column(Text, nullable=False)
    modo: Mapped[str] = mapped_column(String(30), nullable=False)
    estado_envio: Mapped[str] = mapped_column(String(30), nullable=False)
    respuesta_api: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"), nullable=True
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    solicitud: Mapped[Optional["Solicitud"]] = relationship(
        "Solicitud", back_populates="notificaciones"
    )


class GuiaResiduo(Base):
    """Catálogo educativo para el clasificador visual de residuos (Orgánico vs Reciclable)."""

    __tablename__ = "guia_residuos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    flujo: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    categoria: Mapped[str] = mapped_column(String(60), nullable=False)
    icono: Mapped[str] = mapped_column(String(40), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    buenas_practicas: Mapped[str] = mapped_column(Text, nullable=False)
    horario_referencia: Mapped[str] = mapped_column(String(120), nullable=False)
