// Servicio central de almacenamiento y gestión de datos de tesorería eclesiástica
// Conectado directamente a Aiven PostgreSQL y Cloudflare R2
import { Transaccion, ProyectoPactado, PactoMiembro, ResumenFinanciero, MiembroFrecuente } from '../types';
import { identificarDiaSemana } from '../utils/dateUtils';

const STORAGE_KEYS = {
  TRANSACCIONES: 'iglesia_flujo_transacciones_v2',
  PROYECTOS: 'iglesia_flujo_proyectos_v2',
  PACTOS: 'iglesia_flujo_pactos_v2',
  MIEMBROS: 'iglesia_flujo_miembros_v2',
  AIVEN_CONFIG: 'iglesia_flujo_aiven_config',
  R2_CONFIG: 'iglesia_flujo_r2_config',
};

// Limpieza de residuos seed antiguos en navegador
function purgarSeedAntiguo() {
  try {
    const keys = ['iglesia_flujo_transacciones_v1', 'iglesia_flujo_proyectos_v1', 'iglesia_flujo_pactos_v1', 'iglesia_flujo_miembros_v1'];
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}
purgarSeedAntiguo();

export const storageService = {
  // Transacciones
  getTransacciones(): Transaccion[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACCIONES);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async cargarTransaccionesRemotas(): Promise<Transaccion[]> {
    try {
      const res = await fetch('/api/movimientos');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const normalizadas: Transaccion[] = json.data.map((row: any) => ({
            id: row.id,
            tipo: row.tipo,
            subtipo: row.subtipo,
            categoria: row.categoria,
            monto: parseFloat(row.monto) || 0,
            fecha: row.fecha ? String(row.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10),
            dia_semana: row.dia_semana || identificarDiaSemana(row.fecha),
            tipo_culto: row.tipo_culto || 'no_aplica',
            concepto: row.concepto,
            miembro_nombre: row.miembro_nombre,
            proyecto_id: row.proyecto_id,
            proyecto_nombre: row.proyecto_nombre,
            pacto_id: row.pacto_id,
            metodo_pago: row.metodo_pago || 'efectivo',
            evidencia_url: row.evidencia_url,
            evidencia_nombre: row.evidencia_nombre,
            created_at: row.created_at || new Date().toISOString()
          }));
          localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(normalizadas));
          return normalizadas;
        }
      }
    } catch (e) {
      console.warn('Operando con almacenamiento local:', e);
    }
    return this.getTransacciones();
  },

  guardarTransaccion(transaccion: Omit<Transaccion, 'id' | 'created_at' | 'dia_semana'>): Transaccion {
    const lista = this.getTransacciones();
    const dia_semana = identificarDiaSemana(transaccion.fecha);
    const nueva: Transaccion = {
      ...transaccion,
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      dia_semana,
      created_at: new Date().toISOString()
    };

    lista.unshift(nueva);
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(lista));

    // Sincronizar asíncronamente con la API de Aiven PostgreSQL
    fetch('/api/movimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nueva),
    }).catch(err => console.warn('Error al sincronizar con Aiven:', err));

    // Si es aporte a proyecto pactado, actualizar totales del proyecto y pacto
    if (transaccion.tipo === 'ingreso' && transaccion.subtipo === 'pacto' && transaccion.proyecto_id) {
      this.actualizarAportePacto(transaccion.proyecto_id, transaccion.pacto_id, transaccion.monto);
    }

    // Si incluye nombre de miembro, guardarlo como frecuente
    if (transaccion.miembro_nombre) {
      this.registrarMiembroFrecuente(transaccion.miembro_nombre);
    }

    return nueva;
  },

  eliminarTransaccion(id: string): void {
    const lista = this.getTransacciones();
    const transaccion = lista.find(t => t.id === id);

    // Revertir aporte de pacto si aplica
    if (transaccion && transaccion.subtipo === 'pacto' && transaccion.proyecto_id) {
      this.revertirAportePacto(transaccion.proyecto_id, transaccion.pacto_id, transaccion.monto);
    }

    const filtrada = lista.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(filtrada));

    // Notificar a la API
    fetch(`/api/movimientos?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(err => console.warn('Error al eliminar en Aiven:', err));
  },

  // Proyectos Pactados
  getProyectos(): ProyectoPactado[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROYECTOS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async cargarProyectosRemotos(): Promise<ProyectoPactado[]> {
    try {
      const res = await fetch('/api/proyectos');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const projs: ProyectoPactado[] = json.data.map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
            descripcion: p.descripcion || '',
            meta_total: parseFloat(p.meta_total) || 0,
            valor_semanal_sugerido: parseFloat(p.valor_semanal_sugerido) || 0,
            fecha_inicio: p.fecha_inicio ? String(p.fecha_inicio).slice(0, 10) : new Date().toISOString().slice(0, 10),
            fecha_fin: p.fecha_fin ? String(p.fecha_fin).slice(0, 10) : undefined,
            total_recaudado: parseFloat(p.total_recaudado) || 0,
            total_pactado: parseFloat(p.total_pactado) || 0,
            activo: p.activo !== false,
            color_acento: p.color_acento || '#4f46e5'
          }));
          localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(projs));
          return projs;
        }
      }
    } catch (e) {
      console.warn('Operando proyectos localmente:', e);
    }
    return this.getProyectos();
  },

  guardarProyecto(proyecto: Omit<ProyectoPactado, 'id' | 'total_recaudado' | 'total_pactado'>): ProyectoPactado {
    const lista = this.getProyectos();
    const nuevo: ProyectoPactado = {
      ...proyecto,
      id: 'proj-' + Date.now(),
      total_recaudado: 0,
      total_pactado: 0
    };
    lista.unshift(nuevo);
    localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(lista));

    // Sincronizar con Aiven PostgreSQL
    fetch('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevo)
    }).catch(err => console.warn('Error al guardar proyecto en Aiven:', err));

    return nuevo;
  },

  // Pactos por Miembro
  getPactos(): PactoMiembro[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PACTOS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  guardarPacto(pacto: Omit<PactoMiembro, 'id' | 'total_aportado' | 'saldo_pendiente' | 'semanas_pagadas' | 'estado'>): PactoMiembro {
    const lista = this.getPactos();
    const nuevo: PactoMiembro = {
      ...pacto,
      id: 'pacto-' + Date.now(),
      total_aportado: 0,
      saldo_pendiente: pacto.monto_total_pactado,
      semanas_pagadas: 0,
      estado: 'al_dia'
    };
    lista.unshift(nuevo);
    localStorage.setItem(STORAGE_KEYS.PACTOS, JSON.stringify(lista));

    // Aumentar total_pactado en el proyecto
    const proyectos = this.getProyectos();
    const projIdx = proyectos.findIndex(p => p.id === pacto.proyecto_id);
    if (projIdx >= 0) {
      proyectos[projIdx].total_pactado += pacto.monto_total_pactado;
      localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));
    }

    this.registrarMiembroFrecuente(pacto.miembro_nombre, pacto.miembro_telefono);

    return nuevo;
  },

  actualizarAportePacto(proyectoId: string, pactoId?: string, monto: number = 0): void {
    // 1. Actualizar Proyecto
    const proyectos = this.getProyectos();
    const pIndex = proyectos.findIndex(p => p.id === proyectoId);
    if (pIndex >= 0) {
      proyectos[pIndex].total_recaudado += monto;
      localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));
    }

    // 2. Actualizar Pacto individual
    if (pactoId) {
      const pactos = this.getPactos();
      const pactoIdx = pactos.findIndex(p => p.id === pactoId);
      if (pactoIdx >= 0) {
        const item = pactos[pactoIdx];
        item.total_aportado += monto;
        item.saldo_pendiente = Math.max(0, item.monto_total_pactado - item.total_aportado);
        item.semanas_pagadas = item.cuota_semanal > 0 ? Math.floor(item.total_aportado / item.cuota_semanal) : 0;
        item.estado = item.saldo_pendiente <= 0 ? 'completado' : 'al_dia';
        localStorage.setItem(STORAGE_KEYS.PACTOS, JSON.stringify(pactos));
      }
    }
  },

  revertirAportePacto(proyectoId: string, pactoId?: string, monto: number = 0): void {
    const proyectos = this.getProyectos();
    const pIndex = proyectos.findIndex(p => p.id === proyectoId);
    if (pIndex >= 0) {
      proyectos[pIndex].total_recaudado = Math.max(0, proyectos[pIndex].total_recaudado - monto);
      localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));
    }

    if (pactoId) {
      const pactos = this.getPactos();
      const pactoIdx = pactos.findIndex(p => p.id === pactoId);
      if (pactoIdx >= 0) {
        const item = pactos[pactoIdx];
        item.total_aportado = Math.max(0, item.total_aportado - monto);
        item.saldo_pendiente = item.monto_total_pactado - item.total_aportado;
        item.semanas_pagadas = item.cuota_semanal > 0 ? Math.floor(item.total_aportado / item.cuota_semanal) : 0;
        item.estado = item.saldo_pendiente <= 0 ? 'completado' : 'al_dia';
        localStorage.setItem(STORAGE_KEYS.PACTOS, JSON.stringify(pactos));
      }
    }
  },

  // Miembros Frecuentes
  getMiembros(): MiembroFrecuente[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MIEMBROS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  registrarMiembroFrecuente(nombre: string, telefono?: string): void {
    if (!nombre || nombre.trim().length < 2) return;
    const miembros = this.getMiembros();
    const existe = miembros.some(m => m.nombre.toLowerCase().trim() === nombre.toLowerCase().trim());
    if (!existe) {
      miembros.push({
        id: 'm-' + Date.now(),
        nombre: nombre.trim(),
        telefono: telefono?.trim()
      });
      localStorage.setItem(STORAGE_KEYS.MIEMBROS, JSON.stringify(miembros));
    }
  },

  // Resumen Financiero
  calcularResumen(): ResumenFinanciero {
    const transacciones = this.getTransacciones();
    const proyectos = this.getProyectos();

    let totalIngresos = 0;
    let totalGastos = 0;
    let ingresosMiercoles = 0;
    let ingresosDomingo = 0;
    let totalDiezmos = 0;
    let totalOfrendas = 0;
    let totalPactos = 0;
    let totalOtrosIngresos = 0;

    for (const t of transacciones) {
      if (t.tipo === 'ingreso') {
        totalIngresos += t.monto;

        if (t.dia_semana === 'miercoles') {
          ingresosMiercoles += t.monto;
        } else if (t.dia_semana === 'domingo') {
          ingresosDomingo += t.monto;
        }

        if (t.subtipo === 'diezmo') totalDiezmos += t.monto;
        else if (t.subtipo === 'ofrenda') totalOfrendas += t.monto;
        else if (t.subtipo === 'pacto') totalPactos += t.monto;
        else totalOtrosIngresos += t.monto;
      } else {
        totalGastos += t.monto;
      }
    }

    const totalProyectosMeta = proyectos.reduce((acc, p) => acc + (p.meta_total || 0), 0);
    const totalProyectosRecaudado = proyectos.reduce((acc, p) => acc + (p.total_recaudado || 0), 0);

    return {
      totalIngresos,
      totalGastos,
      saldoNeto: totalIngresos - totalGastos,
      ingresosMiercoles,
      ingresosDomingo,
      totalDiezmos,
      totalOfrendas,
      totalPactos,
      totalOtrosIngresos,
      totalProyectosMeta,
      totalProyectosRecaudado
    };
  }
};
