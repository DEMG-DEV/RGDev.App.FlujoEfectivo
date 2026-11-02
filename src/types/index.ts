export type TipoTransaccion = 'ingreso' | 'gasto';

export type SubtipoIngreso = 'ofrenda' | 'diezmo' | 'pacto' | 'otro_ingreso';

export type TipoCulto = 'miercoles_general' | 'domingo_manana' | 'domingo_tarde' | 'especial' | 'no_aplica';

export type MetodoPago = 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta';

export interface Transaccion {
  id: string;
  tipo: TipoTransaccion;
  subtipo?: SubtipoIngreso; // Para ingresos
  categoria: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
  dia_semana: 'miercoles' | 'domingo' | 'otro';
  tipo_culto: TipoCulto;
  concepto: string;
  miembro_id?: string;
  miembro_nombre?: string;
  proyecto_id?: string;
  proyecto_nombre?: string;
  pacto_id?: string;
  metodo_pago: MetodoPago;
  evidencia_url?: string;
  evidencia_nombre?: string;
  evidencia_tipo?: string;
  created_at: string;
}

export interface ProyectoPactado {
  id: string;
  nombre: string;
  descripcion: string;
  meta_total: number;
  valor_semanal_sugerido: number;
  fecha_inicio: string;
  fecha_fin?: string;
  total_recaudado: number;
  total_pactado: number;
  total_gastado?: number;
  activo: boolean;
  color_acento?: string;
}

export interface PactoMiembro {
  id: string;
  proyecto_id: string;
  proyecto_nombre: string;
  miembro_nombre: string;
  miembro_telefono?: string;
  monto_total_pactado: number;
  cuota_semanal: number;
  total_aportado: number;
  saldo_pendiente: number;
  fecha_inicio: string;
  semanas_estimadas: number;
  semanas_pagadas: number;
  estado: 'al_dia' | 'completado' | 'pendiente';
}

export interface MiembroIglesia {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  notas?: string;
  activo: boolean;
  created_at: string;
  total_aportaciones?: number;
  total_aportado?: number;
  total_diezmos?: number;
  total_pactos?: number;
}

export interface MiembroFrecuente {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
}

export interface ResumenFinanciero {
  totalIngresos: number;
  totalGastos: number;
  saldoNeto: number; // Saldo de caja operativa oficial
  saldoCaja?: number; // Saldo real de Caja General (Ofrendas + Diezmos - Gastos)
  saldoConsolidado?: number; // Saldo consolidado total (incluyendo Proyectos)
  ingresosOperativos?: number; // Total ofrendas + diezmos (sin pactos)
  ingresosMiercoles: number;
  ingresosDomingo: number;
  totalDiezmos: number;
  totalOfrendas: number;
  totalPactos: number;
  totalOtrosIngresos: number;
  totalProyectosMeta: number;
  totalProyectosRecaudado: number;
}

export type RolUsuario = 'admin' | 'pastor' | 'tesorero' | 'operador';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: RolUsuario;
}

export interface SnapshotMovimiento {
  id: string;
  tipo: TipoTransaccion;
  subtipo?: SubtipoIngreso;
  categoria: string;
  monto: number;
  fecha: string;
  dia_semana: string;
  tipo_culto: TipoCulto;
  concepto: string;
  miembro_id?: string;
  miembro_nombre?: string;
  metodo_pago: MetodoPago;
  evidencia_url?: string;
  evidencia_nombre?: string;
  created_at?: string;
}

export interface ReporteHistorico {
  id: string;
  folio: string;
  fecha_emision: string; // ISO string
  periodo_tipo: 'por_mes' | 'todo' | 'este_ano' | 'personalizado';
  periodo_descripcion: string;
  mes_seleccionado?: string;
  fecha_desde: string;
  fecha_hasta: string;
  nombre_iglesia: string;
  logo_iglesia?: string;
  secciones_incluidas: {
    incluirResumenMensual: boolean;
    incluirIngresos: boolean;
    incluirGastos: boolean;
    incluirProyectos: boolean;
    incluirLibroCaja: boolean;
    incluirAnexos: boolean;
  };
  totales: {
    totalEntradasCaja: number;
    totalGastosCaja: number;
    balanceNetoCaja: number;
    totalOfrendas: number;
    totalDiezmos: number;
    totalOtros: number;
    totalProyectosRecaudado: number;
    totalProyectosMeta: number;
  };
  desglose_categorias_gastos?: Array<{
    categoria: string;
    total: number;
    porcentaje: number;
  }>;
  movimientos_snapshot: SnapshotMovimiento[];
  proyectos_snapshot?: Array<{
    id: string;
    nombre: string;
    meta_total: number;
    total_recaudado: number;
  }>;
  creado_por?: string;
  created_at?: string;
}

export type TipoCambioAuditoria = 'modificado' | 'eliminado' | 'agregado_posteriormente';

export interface ItemAuditoriaMovimiento {
  id: string;
  tipoCambio: TipoCambioAuditoria;
  tipo: TipoTransaccion;
  subtipo?: SubtipoIngreso;
  conceptoOriginal?: string;
  conceptoActual?: string;
  categoriaOriginal?: string;
  categoriaActual?: string;
  fechaOriginal?: string;
  fechaActual?: string;
  montoOriginal?: number;
  montoActual?: number;
  diferenciaMonto: number; // montoActual - montoOriginal
  miembroOriginal?: string;
  miembroActual?: string;
  detallesCambio: string[];
}

export interface ResultadoAuditoriaReporte {
  reporteId: string;
  folio: string;
  fechaEmision: string;
  tieneCambios: boolean;
  totalModificados: number;
  totalEliminados: number;
  totalAgregados: number;
  diferenciaEntradas: number;
  diferenciaGastos: number;
  diferenciaBalanceNeto: number;
  balanceOriginal: number;
  balanceActualizado: number;
  items: ItemAuditoriaMovimiento[];
}

