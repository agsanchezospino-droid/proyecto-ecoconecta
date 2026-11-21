export type RolUsuario =
  | "hogar"
  | "unidad_productiva"
  | "coordinador_huerteros"
  | "coordinador_recicladores"
  | "administrador";

export type FlujoResiduo = "organico" | "reciclable";

export type UnidadMedida = "kg" | "lb";

export type TipoDestinatario = "usuario" | "recolector";

export type EstadoSolicitud =
  | "recibida"
  | "en_revision"
  | "asignada"
  | "programada"
  | "recolectada"
  | "cancelada";

export interface PublicConfig {
  app_name: string;
  whatsapp_public_number: string;
  whatsapp_default_message: string;
  whatsapp_url: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  telefono?: string | null;
  direccion?: string | null;
  barrio_sector: string;
  es_piloto: boolean;
  habilitado_solicitudes: boolean;
  pendiente_completar_datos: boolean;
  activo: boolean;
  puntos_acumulados: number;
  creado_en: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}

export interface DemoAccount {
  email: string;
  nombre: string;
  rol: RolUsuario;
  etiqueta: string;
  descripcion: string;
  flujo?: FlujoResiduo | null;
}

export interface GuiaResiduo {
  id: number;
  nombre: string;
  flujo: "organico" | "reciclable" | "no_aprovechable";
  categoria: string;
  icono: string;
  descripcion: string;
  buenas_practicas: string;
  horario_referencia: string;
}

export interface ImpactoPublico {
  total_kg_aprovechados: number;
  kg_organico: number;
  kg_reciclable: number;
  recolecciones_completadas: number;
  participantes_activos: number;
  nota_institucional: string;
}

export interface ReglaPuntos {
  id: number;
  flujo: FlujoResiduo;
  puntos_base: number;
  puntos_por_kg: number;
  puntos_por_libra: number;
  descripcion?: string | null;
  activo: boolean;
  actualizado_en: string;
  nota_institucional: string;
}

export interface Beneficio {
  id: number;
  tipo_destinatario: TipoDestinatario;
  nombre: string;
  descripcion: string;
  puntos_requeridos: number;
  activo: boolean;
  desbloqueado: boolean;
  puntos_faltantes: number;
}

export interface ProgresoNivel {
  nivel_actual: string;
  siguiente_beneficio_id?: number | null;
  siguiente_nivel_nombre?: string | null;
  puntos_siguiente_nivel?: number | null;
  puntos_faltantes: number;
  porcentaje_avance: number;
}

export interface CanjeBeneficio {
  id: number;
  beneficio_id: number;
  beneficio_nombre: string;
  tipo_destinatario: TipoDestinatario;
  destinatario_nombre: string;
  puntos_canjeados: number;
  estado: string;
  observaciones?: string | null;
  registrado_por_nombre: string;
  creado_en: string;
}

export interface HistorialEstado {
  id: number;
  estado_anterior?: string | null;
  estado_nuevo: EstadoSolicitud;
  usuario_nombre: string;
  usuario_rol: string;
  comentario?: string | null;
  creado_en: string;
}

export interface RegistroRecoleccion {
  id: number;
  solicitud_id: number;
  codigo_solicitud: string;
  flujo: FlujoResiduo;
  tipo_generador: string;
  coordinador_id: number;
  coordinador_nombre: string;
  encargado_id?: number | null;
  nombre_solicitante_verificado: string;
  peso_ingresado: number;
  unidad_medida: UnidadMedida;
  peso_kg: number;
  nombre_encargado: string;
  fecha_hora_recoleccion: string;
  observaciones?: string | null;
  puntos_calculados: number;
  creado_en: string;
}

export interface NotificacionWhatsApp {
  id: number;
  solicitud_id?: number | null;
  codigo_solicitud?: string | null;
  flujo: FlujoResiduo;
  destinatario_nombre: string;
  destinatario_telefono: string;
  tipo_evento: string;
  mensaje: string;
  modo: string;
  estado_envio: string;
  respuesta_api?: Record<string, unknown> | null;
  creado_en: string;
}

export interface SolicitudCiudadano {
  id: number;
  codigo: string;
  nombre_solicitante: string;
  telefono_contacto: string;
  direccion: string;
  tipo_generador: "hogar" | "unidad_productiva";
  flujo: FlujoResiduo;
  estado: EstadoSolicitud;
  canal_origen: string;
  tipo_mensaje_origen: "texto" | "audio" | string;
  mensaje_original?: string | null;
  resumen_material?: string | null;
  preferencia_horaria?: string | null;
  observaciones?: string | null;
  fecha_programada?: string | null;
  hora_programada?: string | null;
  coordinador_nombre?: string | null;
  coordinador_rol_label?: string | null;
  peso_ingresado?: number | null;
  unidad_medida?: UnidadMedida | null;
  peso_kg_registrado?: number | null;
  puntos_otorgados: number;
  creado_en: string;
  actualizado_en: string;
  historial_estados: HistorialEstado[];
}

export interface SolicitudCoordinador {
  id: number;
  codigo: string;
  usuario_id: number;
  es_piloto_solicitante: boolean;
  pendiente_completar_datos: boolean;
  nombre_solicitante: string;
  telefono_contacto: string;
  direccion: string;
  tipo_generador: "hogar" | "unidad_productiva";
  flujo: FlujoResiduo;
  estado: EstadoSolicitud;
  canal_origen: string;
  tipo_mensaje_origen: "texto" | "audio" | string;
  mensaje_original?: string | null;
  resumen_material?: string | null;
  requiere_revision_flujo: boolean;
  clasificacion_ia?: Record<string, unknown> | null;
  preferencia_horaria?: string | null;
  observaciones?: string | null;
  coordinador_id?: number | null;
  coordinador_nombre?: string | null;
  encargado_id?: number | null;
  nombre_encargado?: string | null;
  fecha_programada?: string | null;
  hora_programada?: string | null;
  creado_en: string;
  actualizado_en: string;
  registro_recoleccion?: RegistroRecoleccion | null;
  historial_estados: HistorialEstado[];
  notificaciones: NotificacionWhatsApp[];
}

export interface ReclasificarFlujoResponse {
  id: number;
  codigo: string;
  flujo_anterior: FlujoResiduo;
  flujo_nuevo: FlujoResiduo;
  coordinador_nuevo?: string | null;
  mensaje: string;
}

export interface SolicitudPublicaTrack {
  codigo: string;
  flujo: FlujoResiduo;
  estado: EstadoSolicitud;
  fecha_programada?: string | null;
  hora_programada?: string | null;
  coordinador_rol_label: string;
  peso_ingresado?: number | null;
  unidad_medida?: UnidadMedida | null;
  peso_kg_registrado?: number | null;
  puntos_otorgados: number;
  creado_en: string;
  actualizado_en: string;
  historial_publico: { estado_nuevo: EstadoSolicitud; creado_en: string }[];
}

export interface MovimientoPuntos {
  id: number;
  tipo_destinatario: TipoDestinatario;
  tipo_movimiento: "credito" | "canje";
  solicitud_id?: number | null;
  codigo_solicitud?: string | null;
  beneficio_nombre?: string | null;
  flujo?: FlujoResiduo | null;
  peso_ingresado?: number | null;
  unidad_medida?: UnidadMedida | null;
  peso_kg?: number | null;
  puntos: number;
  regla_aplicada: string;
  creado_en: string;
}

export interface MiResumenPuntos {
  puntos_disponibles: number;
  puntos_totales: number;
  puntos_ganados: number;
  puntos_canjeados: number;
  total_kg: number;
  recolecciones_completadas: number;
  progreso_nivel: ProgresoNivel;
  beneficios: Beneficio[];
  canjes: CanjeBeneficio[];
  nota_institucional: string;
  movimientos: MovimientoPuntos[];
}

export interface ResumenPuntosRecolector {
  integrante_id: number;
  nombre: string;
  flujo: FlujoResiduo;
  rol_interno: string;
  zona_cobertura?: string | null;
  recolecciones_realizadas: number;
  total_kg_recolectados: number;
  puntos_disponibles: number;
  puntos_ganados: number;
  puntos_canjeados: number;
  progreso_nivel: ProgresoNivel;
  beneficios: Beneficio[];
  canjes_recientes: CanjeBeneficio[];
  movimientos_recientes: MovimientoPuntos[];
}

export interface PanelRecolectoresPuntos {
  nota_institucional: string;
  catalogo_beneficios: Beneficio[];
  recolectores: ResumenPuntosRecolector[];
}

export interface IntegranteColectivo {
  id: number;
  nombre: string;
  flujo: FlujoResiduo;
  rol_interno: string;
  zona_cobertura?: string | null;
  activo: boolean;
}

export interface ResumenOperativo {
  flujo_filtrado?: FlujoResiduo | null;
  periodo_desde?: string | null;
  periodo_hasta?: string | null;
  total_solicitudes: number;
  por_estado: Record<string, number>;
  total_recolecciones_cerradas: number;
  total_kg_recolectados: number;
  kg_organico: number;
  kg_reciclable: number;
  total_puntos_otorgados: number;
  modo_whatsapp_activo: string;
  nota_institucional: string;
}

export function formatPts(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  return Number.isInteger(num) ? num.toFixed(1) : num.toFixed(2).replace(/0$/, "");
}
