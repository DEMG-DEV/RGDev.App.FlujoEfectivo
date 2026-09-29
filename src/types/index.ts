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

