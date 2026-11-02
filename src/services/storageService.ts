// Servicio central de almacenamiento y gestión de datos de tesorería eclesiástica
// Conectado directamente a Aiven PostgreSQL y Cloudflare R2
import { 
  Transaccion, 
  ProyectoPactado, 
  PactoMiembro, 
  ResumenFinanciero, 
  MiembroFrecuente, 
  MiembroIglesia, 
  TipoCulto, 
  MetodoPago,
  ReporteHistorico,
  SnapshotMovimiento,
  ResultadoAuditoriaReporte,
  ItemAuditoriaMovimiento
} from '../types';
import { identificarDiaSemana, extraerFechaYYYYMMDD } from '../utils/dateUtils';

const STORAGE_KEYS = {
  TRANSACCIONES: 'iglesia_flujo_transacciones_v2',
  PROYECTOS: 'iglesia_flujo_proyectos_v2',
  PACTOS: 'iglesia_flujo_pactos_v2',
  MIEMBROS: 'iglesia_flujo_miembros_v2',
  REPORTES: 'iglesia_flujo_reportes_v1',
};

// Limpieza de residuos seed antiguos en navegador
function purgarSeedAntiguo() {
  try {
    const keys = ['iglesia_flujo_transacciones_v1', 'iglesia_flujo_proyectos_v1', 'iglesia_flujo_pactos_v1', 'iglesia_flujo_miembros_v1'];
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}
purgarSeedAntiguo();

/**
 * Normaliza y sanea cualquier registro de transacción proveniente de PostgreSQL,
 * localStorage o respuestas HTTP para garantizar tipado numérico y fechas válidas YYYY-MM-DD
 */
export function normalizarTransaccion(row: any): Transaccion {
  if (!row) return {} as Transaccion;
  const fechaLimpia = extraerFechaYYYYMMDD(row.fecha);
  const montoNum = typeof row.monto === 'number' ? row.monto : (parseFloat(String(row.monto)) || 0);
  return {
    id: String(row.id || ''),
    tipo: row.tipo === 'gasto' ? 'gasto' : 'ingreso',
    subtipo: row.subtipo || undefined,
    categoria: String(row.categoria || 'Sin categoría'),
    monto: isNaN(montoNum) ? 0 : montoNum,
    fecha: fechaLimpia,
    dia_semana: row.dia_semana || identificarDiaSemana(fechaLimpia),
    tipo_culto: row.tipo_culto || 'no_aplica',
    concepto: String(row.concepto || ''),
    miembro_id: row.miembro_id || undefined,
    miembro_nombre: row.miembro_nombre || undefined,
    proyecto_id: row.proyecto_id || undefined,
    proyecto_nombre: row.proyecto_nombre || undefined,
    pacto_id: row.pacto_id || undefined,
    metodo_pago: (row.metodo_pago as MetodoPago) || 'efectivo',
    evidencia_url: row.evidencia_url || undefined,
    evidencia_nombre: row.evidencia_nombre || undefined,
    evidencia_tipo: row.evidencia_tipo || undefined,
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString()
  };
}

export const storageService = {
  // Transacciones
  getTransacciones(): Transaccion[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACCIONES);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizarTransaccion);
      }
      return [];
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
          const normalizadas: Transaccion[] = json.data.map(normalizarTransaccion);
          localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(normalizadas));
          this.repararYVincularPactos();
          return normalizadas;
        }
      }
    } catch (e) {
      console.warn('Operando con almacenamiento local:', e);
    }
    this.repararYVincularPactos();
    return this.getTransacciones();
  },

  repararYVincularPactos(): void {
    const rawTxs = localStorage.getItem(STORAGE_KEYS.TRANSACCIONES);
    if (!rawTxs) return;
    let txs: Transaccion[] = [];
    try {
      txs = JSON.parse(rawTxs).map(normalizarTransaccion);
    } catch {
      return;
    }

    const pactos = this.getPactos();
    const proyectos = this.getProyectos();
    let huboCambios = false;

    for (const t of txs) {
      // 1. Vincular aportes de pacto huérfanos que tengan proyecto_id pero no pacto_id
      if (t.tipo === 'ingreso' && t.subtipo === 'pacto' && t.proyecto_id && !t.pacto_id) {
        const pactosDelProj = pactos.filter(p => p.proyecto_id === t.proyecto_id);
        let pactoAsignar: PactoMiembro | undefined;

        if (t.miembro_nombre) {
          const cleanNombre = t.miembro_nombre.trim().toLowerCase();
          pactoAsignar = pactosDelProj.find(p => p.miembro_nombre.trim().toLowerCase() === cleanNombre);
        }
        if (!pactoAsignar && pactosDelProj.length === 1) {
          pactoAsignar = pactosDelProj[0];
        }

        if (pactoAsignar) {
          t.pacto_id = pactoAsignar.id;
          huboCambios = true;
          // Actualizar en backend para que persista
          fetch('/api/movimientos', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: t.id, pacto_id: pactoAsignar.id })
          }).catch(err => console.warn('Error vinculando pacto huérfano en backend:', err));
        }
      }

      // 2. Si es egreso de caja por aporte de diezmo a proyecto y tenía proyecto_id, removerlo para no contar como gasto en obra
      if (t.tipo === 'gasto' && t.categoria === 'Aporte de Diezmo a Proyecto' && t.proyecto_id) {
        const idTransaccion = t.id;
        t.proyecto_id = undefined;
        huboCambios = true;
        fetch('/api/movimientos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: idTransaccion, proyecto_id: null })
        }).catch(err => console.warn('Error limpiando proyecto_id de egreso de diezmo:', err));
      }
    }

    // 3. Recalcular acumulados de pactos con base en las transacciones reales
    for (const p of pactos) {
      const aportado = txs
        .filter(t => t.pacto_id === p.id && t.tipo === 'ingreso')
        .reduce((sum, t) => sum + t.monto, 0);
      if (p.total_aportado !== aportado) {
        p.total_aportado = aportado;
        p.saldo_pendiente = Math.max(0, p.monto_total_pactado - aportado);
        p.semanas_pagadas = p.cuota_semanal > 0 ? Math.floor(aportado / p.cuota_semanal) : 0;
        p.estado = p.saldo_pendiente <= 0 ? 'completado' : 'al_dia';
        huboCambios = true;
      }
    }

    // 4. Recalcular gastos y recaudación de proyectos
    for (const proj of proyectos) {
      const recaudado = txs
        .filter(t => t.proyecto_id === proj.id && t.tipo === 'ingreso' && t.subtipo === 'pacto')
        .reduce((sum, t) => sum + t.monto, 0);
      const gastado = txs
        .filter(t => t.proyecto_id === proj.id && t.tipo === 'gasto' && t.categoria !== 'Liquidación / Remanente de Proyecto' && t.categoria !== 'Aporte de Diezmo a Proyecto')
        .reduce((sum, t) => sum + t.monto, 0);
      if (proj.total_recaudado !== recaudado || proj.total_gastado !== gastado) {
        proj.total_recaudado = recaudado;
        proj.total_gastado = gastado;
        huboCambios = true;
      }
    }

    if (huboCambios) {
      localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(txs));
      localStorage.setItem(STORAGE_KEYS.PACTOS, JSON.stringify(pactos));
      localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));
    }
  },

  async guardarTransaccion(transaccion: Omit<Transaccion, 'id' | 'created_at' | 'dia_semana'>): Promise<Transaccion> {
    const lista = this.getTransacciones();
    const fechaLimpia = extraerFechaYYYYMMDD(transaccion.fecha);
    const montoNum = typeof transaccion.monto === 'number' ? transaccion.monto : (parseFloat(String(transaccion.monto)) || 0);
    const dia_semana = identificarDiaSemana(fechaLimpia);
    const tempId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'tx-' + Date.now();
    const nueva: Transaccion = normalizarTransaccion({
      ...transaccion,
      id: tempId,
      fecha: fechaLimpia,
      monto: montoNum,
      dia_semana,
      created_at: new Date().toISOString()
    });

    lista.unshift(nueva);
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(lista));

    // Si es aporte a proyecto pactado, actualizar totales del proyecto y pacto localmente de inmediato
    if (transaccion.tipo === 'ingreso' && transaccion.subtipo === 'pacto' && transaccion.proyecto_id) {
      this.actualizarAportePacto(transaccion.proyecto_id, transaccion.pacto_id, montoNum);
    }
    // Si es gasto asignado a un proyecto, actualizar lo gastado en el proyecto
    if (transaccion.tipo === 'gasto' && transaccion.proyecto_id) {
      this.actualizarGastoProyecto(transaccion.proyecto_id, montoNum);
    }

    // Si incluye nombre de miembro, guardarlo como frecuente
    if (transaccion.miembro_nombre) {
      this.registrarMiembroFrecuente(transaccion.miembro_nombre);
    }

    // Sincronizar con PostgreSQL y esperar respuesta para garantizar persistencia
    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nueva),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.id) {
          nueva.id = json.data.id;
          if (json.data.proyecto_nombre) {
            nueva.proyecto_nombre = json.data.proyecto_nombre;
          }
          const txs = this.getTransacciones();
          const idx = txs.findIndex(t => t.id === tempId);
          if (idx >= 0) {
            txs[idx] = normalizarTransaccion({ ...txs[idx], ...json.data, id: json.data.id });
            localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(txs));
          }
        }
      }
    } catch (err) {
      console.warn('Error al sincronizar transacción con Aiven:', err);
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
    // Revertir gasto de proyecto si aplica
    if (transaccion && transaccion.tipo === 'gasto' && transaccion.proyecto_id) {
      this.revertirGastoProyecto(transaccion.proyecto_id, transaccion.monto);
    }

    const filtrada = lista.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(filtrada));

    // Notificar a la API
    fetch(`/api/movimientos?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(err => console.warn('Error al eliminar en Aiven:', err));
  },

  async editarTransaccion(id: string, cambios: Partial<Transaccion>): Promise<Transaccion | null> {
    const lista = this.getTransacciones();
    const idx = lista.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const txAnterior = { ...lista[idx] };
    const cambiosCompletos: Partial<Transaccion> = { ...cambios };

    // Si se mueve la fecha, recalcular automáticamente el día de la semana y garantizar formato YYYY-MM-DD
    if (cambiosCompletos.fecha) {
      cambiosCompletos.fecha = extraerFechaYYYYMMDD(cambiosCompletos.fecha);
      cambiosCompletos.dia_semana = identificarDiaSemana(cambiosCompletos.fecha);
      if (txAnterior.tipo === 'ingreso' && !cambiosCompletos.tipo_culto) {
        if (cambiosCompletos.dia_semana === 'miercoles') {
          cambiosCompletos.tipo_culto = 'miercoles_general';
        } else if (cambiosCompletos.dia_semana === 'domingo') {
          cambiosCompletos.tipo_culto = txAnterior.tipo_culto === 'miercoles_general' ? 'domingo_manana' : txAnterior.tipo_culto;
        }
      }
    }

    // Asegurar que monto sea un número de punto flotante válido
    if (cambiosCompletos.monto !== undefined) {
      cambiosCompletos.monto = typeof cambiosCompletos.monto === 'number'
        ? cambiosCompletos.monto
        : (parseFloat(String(cambiosCompletos.monto)) || 0);
    }

    const txActualizada: Transaccion = normalizarTransaccion({
      ...txAnterior,
      ...cambiosCompletos,
      id // Garantizar ID original
    });

    // Si es aporte a proyecto pactado y cambió monto o proyecto o pacto, actualizar acumulados
    if (txAnterior.subtipo === 'pacto' && txAnterior.proyecto_id) {
      const nuevoProyectoId = cambiosCompletos.proyecto_id || txAnterior.proyecto_id;
      const nuevoPactoId = cambiosCompletos.pacto_id !== undefined ? cambiosCompletos.pacto_id : txAnterior.pacto_id;
      const nuevoMonto = cambiosCompletos.monto !== undefined ? cambiosCompletos.monto : txAnterior.monto;

      if (nuevoMonto !== txAnterior.monto || nuevoPactoId !== txAnterior.pacto_id || nuevoProyectoId !== txAnterior.proyecto_id) {
        this.revertirAportePacto(txAnterior.proyecto_id, txAnterior.pacto_id, txAnterior.monto);
        this.actualizarAportePacto(nuevoProyectoId, nuevoPactoId, nuevoMonto);
      }
    }

    // Si es gasto y cambió de proyecto o de monto
    if (txAnterior.tipo === 'gasto' && txAnterior.proyecto_id) {
      const nuevoProyectoId = cambiosCompletos.proyecto_id !== undefined ? cambiosCompletos.proyecto_id : txAnterior.proyecto_id;
      const nuevoMonto = cambiosCompletos.monto !== undefined ? cambiosCompletos.monto : txAnterior.monto;
      if (nuevoMonto !== txAnterior.monto || nuevoProyectoId !== txAnterior.proyecto_id) {
        this.revertirGastoProyecto(txAnterior.proyecto_id, txAnterior.monto);
        if (nuevoProyectoId) {
          this.actualizarGastoProyecto(nuevoProyectoId, nuevoMonto);
        }
      }
    } else if (txActualizada.tipo === 'gasto' && txActualizada.proyecto_id && !txAnterior.proyecto_id) {
      this.actualizarGastoProyecto(txActualizada.proyecto_id, txActualizada.monto);
    }

    lista[idx] = txActualizada;
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(lista));

    try {
      const res = await fetch('/api/movimientos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...cambiosCompletos })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const fresh = this.getTransacciones();
          const fIdx = fresh.findIndex(t => t.id === id);
          if (fIdx >= 0) {
            fresh[fIdx] = normalizarTransaccion({ ...fresh[fIdx], ...json.data, id });
            localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(fresh));
            return fresh[fIdx];
          }
        }
      }
    } catch (err) {
      console.warn('Error al editar transacción en API / Aiven:', err);
    }

    return txActualizada;
  },

  async actualizarCategoriaTransaccion(id: string, nuevaCategoria: string): Promise<boolean> {
    const catLimpia = nuevaCategoria.trim();
    if (!catLimpia) return false;
    const res = await this.editarTransaccion(id, { categoria: catLimpia });
    return !!res;
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
            total_gastado: parseFloat(p.total_gastado) || 0,
            activo: p.activo !== false,
            color_acento: p.color_acento || '#4f46e5'
          }));
          localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(projs));
          this.repararYVincularPactos();
          return this.getProyectos();
        }
      }
    } catch (e) {
      console.warn('Operando proyectos localmente:', e);
    }
    this.repararYVincularPactos();
    return this.getProyectos();
  },

  guardarProyecto(proyecto: Omit<ProyectoPactado, 'id' | 'total_recaudado' | 'total_pactado'>): ProyectoPactado {
    const lista = this.getProyectos();
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'proj-' + Date.now();
    const nuevo: ProyectoPactado = {
      ...proyecto,
      id,
      total_recaudado: 0,
      total_pactado: 0,
      total_gastado: 0
    };
    lista.unshift(nuevo);
    localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(lista));

    // Sincronizar con Aiven PostgreSQL
    fetch('/api/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevo)
    }).then(async res => {
      if (res.ok) {
        const json = await res.json();
        if (json.data?.id && json.data.id !== id) {
          const projs = this.getProyectos();
          const idx = projs.findIndex(p => p.id === id);
          if (idx >= 0) {
            projs[idx].id = json.data.id;
            localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(projs));
          }
        }
      }
    }).catch(err => console.warn('Error al guardar proyecto en Aiven:', err));

    return nuevo;
  },

  async editarProyecto(id: string, datos: Partial<ProyectoPactado>): Promise<ProyectoPactado | null> {
    const proyectos = this.getProyectos();
    const idx = proyectos.findIndex(p => p.id === id);
    if (idx < 0) return null;

    const actualizado: ProyectoPactado = {
      ...proyectos[idx],
      ...datos,
      id
    };
    proyectos[idx] = actualizado;
    localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));

    try {
      const res = await fetch('/api/proyectos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...datos })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          proyectos[idx] = {
            ...actualizado,
            ...json.data,
            total_recaudado: parseFloat(json.data.total_recaudado) || actualizado.total_recaudado,
            total_pactado: parseFloat(json.data.total_pactado) || actualizado.total_pactado,
            total_gastado: parseFloat(json.data.total_gastado) || (actualizado.total_gastado || 0)
          };
          localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));
        }
      }
    } catch (err) {
      console.warn('Error al actualizar proyecto en PostgreSQL:', err);
    }

    return proyectos[idx];
  },

  async liquidarYMoverRestoProyecto(params: {
    proyectoId: string;
    montoResto: number;
    fecha?: string;
    tipoCulto?: TipoCulto;
    metodoPago?: MetodoPago;
    cerrarProyecto?: boolean;
  }): Promise<{ transaccionIngreso: Transaccion; transaccionFondeo?: Transaccion }> {
    const proyectos = this.getProyectos();
    const proyecto = proyectos.find(p => p.id === params.proyectoId);
    if (!proyecto) {
      throw new Error('Proyecto no encontrado');
    }

    const fechaFinal = params.fecha || new Date().toISOString().slice(0, 10);
    const metodo = params.metodoPago || 'efectivo';
    const culto = params.tipoCulto || 'domingo_manana';

    // 1. Si el proyecto tuvo gastos y aún no se había transferido el fondo del proyecto a Caja General,
    // se genera el ingreso compensatorio para que la compra no afecte negativamente el saldo operativo.
    let transaccionFondeo: Transaccion | undefined;
    const transacciones = this.getTransacciones();
    const gastosProyecto = transacciones
      .filter(t => t.proyecto_id === proyecto.id && t.tipo === 'gasto' && t.categoria !== 'Liquidación / Remanente de Proyecto')
      .reduce((acc, t) => acc + t.monto, 0);

    const yaFondeado = transacciones
      .filter(t => t.proyecto_id === proyecto.id && t.tipo === 'ingreso' && t.concepto?.includes('Fondo transferido del proyecto'))
      .reduce((acc, t) => acc + t.monto, 0);

    const pendienteFondeo = Math.max(0, gastosProyecto - yaFondeado);
    if (pendienteFondeo > 0) {
      transaccionFondeo = await this.guardarTransaccion({
        tipo: 'ingreso',
        subtipo: 'ofrenda',
        categoria: 'Ofrenda General',
        monto: pendienteFondeo,
        fecha: fechaFinal,
        tipo_culto: 'no_aplica',
        concepto: `Fondo transferido del proyecto: ${proyecto.nombre} para compra`,
        proyecto_id: proyecto.id,
        proyecto_nombre: proyecto.nombre,
        metodo_pago: metodo
      });
    }

    // 2. Crear entrada en Ofrenda General con el saldo o resto no gastado del proyecto
    let transaccionIngreso: Transaccion;
    if (params.montoResto > 0) {
      transaccionIngreso = await this.guardarTransaccion({
        tipo: 'ingreso',
        subtipo: 'ofrenda',
        categoria: 'Ofrenda General',
        monto: params.montoResto,
        fecha: fechaFinal,
        tipo_culto: culto,
        concepto: `Resto del proyecto: ${proyecto.nombre}`,
        proyecto_id: proyecto.id,
        proyecto_nombre: proyecto.nombre,
        metodo_pago: metodo
      });
    } else {
      transaccionIngreso = transaccionFondeo || {
        id: 'no-op',
        tipo: 'ingreso',
        categoria: 'Ofrenda General',
        monto: 0,
        fecha: fechaFinal,
        dia_semana: 'otro',
        tipo_culto: culto,
        concepto: `Cierre del proyecto: ${proyecto.nombre}`,
        metodo_pago: metodo,
        created_at: new Date().toISOString()
      };
    }

    // 3. Si se solicita cerrar/finalizar el proyecto
    if (params.cerrarProyecto !== false) {
      await this.editarProyecto(proyecto.id, {
        activo: false,
        fecha_fin: fechaFinal
      });
    }

    return { transaccionIngreso, transaccionFondeo };
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

  async cargarPactosRemotos(proyectoId?: string): Promise<PactoMiembro[]> {
    try {
      const url = proyectoId ? `/api/pactos?proyecto_id=${encodeURIComponent(proyectoId)}` : '/api/pactos';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const pactos: PactoMiembro[] = json.data;
          if (!proyectoId) {
            localStorage.setItem(STORAGE_KEYS.PACTOS, JSON.stringify(pactos));
          } else {
            const actuales = this.getPactos().filter(p => p.proyecto_id !== proyectoId);
            actuales.push(...pactos);
            localStorage.setItem(STORAGE_KEYS.PACTOS, JSON.stringify(actuales));
          }
          this.repararYVincularPactos();
          return this.getPactos();
        }
      }
    } catch (e) {
      console.warn('Operando pactos localmente:', e);
    }
    this.repararYVincularPactos();
    return this.getPactos();
  },

  guardarPacto(pacto: Omit<PactoMiembro, 'id' | 'total_aportado' | 'saldo_pendiente' | 'semanas_pagadas' | 'estado'>): PactoMiembro {
    const lista = this.getPactos();
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'pacto-' + Date.now();
    const nuevo: PactoMiembro = {
      ...pacto,
      id,
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

    // Sincronizar inmediatamente con PostgreSQL en Aiven / Vercel
    fetch('/api/pactos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevo)
    }).then(async res => {
      if (res.ok) {
        const json = await res.json();
        if (json.data?.id && json.data.id !== id) {
          nuevo.id = json.data.id;
          const pactos = this.getPactos();
          const idx = pactos.findIndex(p => p.id === id);
          if (idx >= 0) {
            pactos[idx].id = json.data.id;
            localStorage.setItem(STORAGE_KEYS.PACTOS, JSON.stringify(pactos));
          }
        }
      }
    }).catch(err => console.warn('Error al guardar pacto en PostgreSQL:', err));

    return nuevo;
  },

  async editarPacto(id: string, datos: Partial<PactoMiembro>): Promise<PactoMiembro | null> {
    const pactos = this.getPactos();
    const idx = pactos.findIndex(p => p.id === id);
    if (idx < 0) return null;

    const anterior = pactos[idx];
    const montoAnterior = anterior.monto_total_pactado;

    const actualizado: PactoMiembro = {
      ...anterior,
      ...datos,
      id
    };

    actualizado.saldo_pendiente = Math.max(0, actualizado.monto_total_pactado - actualizado.total_aportado);
    if (actualizado.cuota_semanal > 0) {
      actualizado.semanas_estimadas = Math.ceil(actualizado.monto_total_pactado / actualizado.cuota_semanal);
      actualizado.semanas_pagadas = Math.floor(actualizado.total_aportado / actualizado.cuota_semanal);
    }
    actualizado.estado = actualizado.saldo_pendiente <= 0 ? 'completado' : (datos.estado || actualizado.estado);

    pactos[idx] = actualizado;
    localStorage.setItem(STORAGE_KEYS.PACTOS, JSON.stringify(pactos));

    if (datos.monto_total_pactado !== undefined && datos.monto_total_pactado !== montoAnterior) {
      const dif = datos.monto_total_pactado - montoAnterior;
      const proyectos = this.getProyectos();
      const projIdx = proyectos.findIndex(p => p.id === actualizado.proyecto_id);
      if (projIdx >= 0) {
        proyectos[projIdx].total_pactado += dif;
        localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));
      }
    }

    if (actualizado.miembro_nombre) {
      this.registrarMiembroFrecuente(actualizado.miembro_nombre, actualizado.miembro_telefono);
    }

    try {
      await fetch('/api/pactos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          miembro_nombre: actualizado.miembro_nombre,
          miembro_telefono: actualizado.miembro_telefono,
          monto_total_pactado: actualizado.monto_total_pactado,
          cuota_semanal: actualizado.cuota_semanal,
          estado: actualizado.estado
        })
      });
    } catch (err) {
      console.warn('Error al editar pacto en PostgreSQL:', err);
    }

    return actualizado;
  },

  async eliminarPacto(id: string): Promise<boolean> {
    const pactos = this.getPactos();
    const pacto = pactos.find(p => p.id === id);
    if (!pacto) return false;

    const filtrados = pactos.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PACTOS, JSON.stringify(filtrados));

    const proyectos = this.getProyectos();
    const projIdx = proyectos.findIndex(p => p.id === pacto.proyecto_id);
    if (projIdx >= 0) {
      proyectos[projIdx].total_pactado = Math.max(0, proyectos[projIdx].total_pactado - pacto.monto_total_pactado);
      localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));
    }

    try {
      await fetch(`/api/pactos?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Error al eliminar pacto en PostgreSQL:', err);
    }
    return true;
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

  actualizarGastoProyecto(proyectoId: string, monto: number = 0): void {
    const proyectos = this.getProyectos();
    const pIndex = proyectos.findIndex(p => p.id === proyectoId);
    if (pIndex >= 0) {
      proyectos[pIndex].total_gastado = (proyectos[pIndex].total_gastado || 0) + monto;
      localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));
    }
  },

  revertirGastoProyecto(proyectoId: string, monto: number = 0): void {
    const proyectos = this.getProyectos();
    const pIndex = proyectos.findIndex(p => p.id === proyectoId);
    if (pIndex >= 0) {
      proyectos[pIndex].total_gastado = Math.max(0, (proyectos[pIndex].total_gastado || 0) - monto);
      localStorage.setItem(STORAGE_KEYS.PROYECTOS, JSON.stringify(proyectos));
    }
  },

  // Directorio de Hermanos de la Iglesia
  getMiembros(): MiembroIglesia[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MIEMBROS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((m: any) => ({
        id: String(m.id || ''),
        nombre: String(m.nombre || ''),
        telefono: m.telefono || undefined,
        email: m.email || undefined,
        notas: m.notas || undefined,
        activo: m.activo !== false,
        created_at: m.created_at || new Date().toISOString(),
        total_aportaciones: typeof m.total_aportaciones === 'number' ? m.total_aportaciones : 0,
        total_aportado: typeof m.total_aportado === 'number' ? m.total_aportado : 0,
        total_diezmos: typeof m.total_diezmos === 'number' ? m.total_diezmos : 0,
        total_pactos: typeof m.total_pactos === 'number' ? m.total_pactos : 0,
      }));
    } catch {
      return [];
    }
  },

  async cargarMiembrosRemotos(): Promise<MiembroIglesia[]> {
    try {
      const res = await fetch('/api/miembros');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const remotos: MiembroIglesia[] = json.data.map((m: any) => ({
            id: String(m.id || ''),
            nombre: String(m.nombre || ''),
            telefono: m.telefono || undefined,
            email: m.email || undefined,
            notas: m.notas || undefined,
            activo: m.activo !== false,
            created_at: m.created_at || new Date().toISOString(),
            total_aportaciones: parseInt(m.total_aportaciones) || 0,
            total_aportado: parseFloat(m.total_aportado) || 0,
            total_diezmos: parseFloat(m.total_diezmos) || 0,
            total_pactos: parseFloat(m.total_pactos) || 0,
          }));
          localStorage.setItem(STORAGE_KEYS.MIEMBROS, JSON.stringify(remotos));
          return remotos;
        }
      }
    } catch (e) {
      console.warn('Operando miembros localmente:', e);
    }
    return this.getMiembros();
  },

  async guardarMiembro(datos: { nombre: string; telefono?: string; email?: string; notas?: string; activo?: boolean }): Promise<MiembroIglesia> {
    const lista = this.getMiembros();
    const tempId = 'm-' + Date.now();
    const nuevo: MiembroIglesia = {
      id: tempId,
      nombre: datos.nombre.trim(),
      telefono: datos.telefono?.trim() || undefined,
      email: datos.email?.trim() || undefined,
      notas: datos.notas?.trim() || undefined,
      activo: datos.activo !== false,
      created_at: new Date().toISOString(),
      total_aportaciones: 0,
      total_aportado: 0,
      total_diezmos: 0,
      total_pactos: 0
    };

    lista.unshift(nuevo);
    localStorage.setItem(STORAGE_KEYS.MIEMBROS, JSON.stringify(lista));

    try {
      const res = await fetch('/api/miembros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.id) {
          nuevo.id = json.data.id;
          const actuales = this.getMiembros();
          const idx = actuales.findIndex(m => m.id === tempId);
          if (idx >= 0) {
            actuales[idx] = { ...actuales[idx], ...json.data };
            localStorage.setItem(STORAGE_KEYS.MIEMBROS, JSON.stringify(actuales));
          }
        }
      }
    } catch (err) {
      console.warn('Error al sincronizar hermano con backend:', err);
    }

    return nuevo;
  },

  async editarMiembro(id: string, datos: Partial<MiembroIglesia>): Promise<MiembroIglesia | null> {
    const lista = this.getMiembros();
    const idx = lista.findIndex(m => m.id === id);
    if (idx < 0) return null;

    const actualizado: MiembroIglesia = {
      ...lista[idx],
      ...datos
    };
    lista[idx] = actualizado;
    localStorage.setItem(STORAGE_KEYS.MIEMBROS, JSON.stringify(lista));

    try {
      await fetch('/api/miembros', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...datos }),
      });
    } catch (err) {
      console.warn('Error al editar hermano en backend:', err);
    }

    return actualizado;
  },

  async eliminarMiembro(id: string): Promise<boolean> {
    const lista = this.getMiembros();
    const filtrada = lista.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MIEMBROS, JSON.stringify(filtrada));

    try {
      const res = await fetch(`/api/miembros?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.archived && json.data) {
          const actuales = this.getMiembros();
          const existIdx = actuales.findIndex(m => m.id === id);
          if (existIdx >= 0) {
            actuales[existIdx].activo = false;
          } else {
            actuales.push({ ...json.data, activo: false });
          }
          localStorage.setItem(STORAGE_KEYS.MIEMBROS, JSON.stringify(actuales));
        }
      }
    } catch (err) {
      console.warn('Error al eliminar hermano en backend:', err);
    }
    return true;
  },

  async obtenerDetalleAportacionesMiembro(miembroId: string): Promise<{
    miembro: MiembroIglesia;
    aportaciones: Transaccion[];
    pactos: PactoMiembro[];
  } | null> {
    const miembro = this.getMiembros().find(m => m.id === miembroId);
    if (!miembro) return null;

    try {
      const res = await fetch(`/api/miembros?id=${encodeURIComponent(miembroId)}&aportaciones=true`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          return {
            miembro: { ...miembro, ...json.data.miembro },
            aportaciones: json.data.aportaciones?.map(normalizarTransaccion) || [],
            pactos: json.data.pactos || []
          };
        }
      }
    } catch (e) {
      console.warn('Cargando aportaciones del miembro localmente:', e);
    }

    // Fallback local
    const nombreLower = miembro.nombre.toLowerCase().trim();
    const txs = this.getTransacciones().filter(t => 
      t.miembro_id === miembroId || 
      (t.miembro_nombre && t.miembro_nombre.toLowerCase().trim() === nombreLower)
    );
    const pactos = this.getPactos().filter(p => 
      p.miembro_nombre && p.miembro_nombre.toLowerCase().trim() === nombreLower
    );

    return { miembro, aportaciones: txs, pactos };
  },

  registrarMiembroFrecuente(nombre: string, telefono?: string): void {
    if (!nombre || nombre.trim().length < 2) return;
    const cleanNombre = nombre.trim();
    if (cleanNombre.toLowerCase() === 'anónimo' || cleanNombre.toLowerCase() === 'anonimo') return;

    const miembros = this.getMiembros();
    const existe = miembros.some(m => m.nombre.toLowerCase().trim() === cleanNombre.toLowerCase());
    if (!existe) {
      this.guardarMiembro({
        nombre: cleanNombre,
        telefono: telefono?.trim(),
        activo: true
      });
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

        const esMiercoles = t.dia_semana === 'miercoles' || t.tipo_culto === 'miercoles_general';
        const esDomingo = !esMiercoles && (t.dia_semana === 'domingo' || t.tipo_culto === 'domingo_manana' || t.tipo_culto === 'domingo_tarde');

        if (esMiercoles) {
          ingresosMiercoles += t.monto;
        } else if (esDomingo) {
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

    // Entradas operativas de Caja General (Ofrendas + Diezmos + Otros, excluyendo pactos)
    const ingresosOperativos = totalOfrendas + totalDiezmos + totalOtrosIngresos;
    // Saldo real de Caja General: entradas operativas menos gastos
    const saldoCaja = ingresosOperativos - totalGastos;
    const saldoConsolidado = totalIngresos - totalGastos;

    return {
      totalIngresos,
      totalGastos,
      saldoNeto: saldoCaja, // El saldo de la caja es el correcto según la regla de mayordomía
      saldoCaja,
      saldoConsolidado,
      ingresosOperativos,
      ingresosMiercoles,
      ingresosDomingo,
      totalDiezmos,
      totalOfrendas,
      totalPactos,
      totalOtrosIngresos,
      totalProyectosMeta,
      totalProyectosRecaudado
    };
  },

  // ==========================================
  // GESTIÓN DE HISTORIAL DE REPORTES EMITIDOS
  // ==========================================
  getReportesHistoricos(): ReporteHistorico[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTES);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async cargarReportesHistoricosRemotos(): Promise<ReporteHistorico[]> {
    try {
      const res = await fetch('/api/reportes');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const list: ReporteHistorico[] = json.data.map((r: any) => ({
            ...r,
            secciones_incluidas: typeof r.secciones_incluidas === 'string' ? JSON.parse(r.secciones_incluidas) : (r.secciones_incluidas || {}),
            totales: typeof r.totales === 'string' ? JSON.parse(r.totales) : (r.totales || {}),
            desglose_categorias_gastos: typeof r.desglose_categorias_gastos === 'string' ? JSON.parse(r.desglose_categorias_gastos) : (r.desglose_categorias_gastos || []),
            movimientos_snapshot: typeof r.movimientos_snapshot === 'string' ? JSON.parse(r.movimientos_snapshot) : (r.movimientos_snapshot || []),
            proyectos_snapshot: typeof r.proyectos_snapshot === 'string' ? JSON.parse(r.proyectos_snapshot) : (r.proyectos_snapshot || [])
          }));
          localStorage.setItem(STORAGE_KEYS.REPORTES, JSON.stringify(list));
          return list;
        }
      }
    } catch (e) {
      console.warn('Operando reportes históricos localmente:', e);
    }
    return this.getReportesHistoricos();
  },

  async guardarReporteHistorico(reporte: ReporteHistorico): Promise<ReporteHistorico> {
    const list = this.getReportesHistoricos();
    const idx = list.findIndex(r => r.id === reporte.id || r.folio === reporte.folio);
    if (idx >= 0) {
      list[idx] = reporte;
    } else {
      list.unshift(reporte);
    }
    localStorage.setItem(STORAGE_KEYS.REPORTES, JSON.stringify(list));

    // Sincronizar con PostgreSQL
    try {
      fetch('/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reporte)
      }).catch(err => console.warn('Error al sincronizar reporte histórico:', err));
    } catch {}

    return reporte;
  },

  async eliminarReporteHistorico(id: string): Promise<boolean> {
    const list = this.getReportesHistoricos().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTES, JSON.stringify(list));

    try {
      fetch(`/api/reportes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }).catch(err => console.warn('Error al eliminar reporte remoto:', err));
    } catch {}

    return true;
  },

  auditarReporteHistorico(reporte: ReporteHistorico, transaccionesActuales: Transaccion[]): ResultadoAuditoriaReporte {
    const items: ItemAuditoriaMovimiento[] = [];
    let diferenciaEntradas = 0;
    let diferenciaGastos = 0;
    let totalModificados = 0;
    let totalEliminados = 0;
    let totalAgregados = 0;

    const mapActuales = new Map<string, Transaccion>();
    transaccionesActuales.forEach(t => mapActuales.set(t.id, t));

    const idsEnSnapshot = new Set<string>();

    // 1. Auditar movimientos presentes en el snapshot original
    for (const snap of (reporte.movimientos_snapshot || [])) {
      idsEnSnapshot.add(snap.id);
      const actual = mapActuales.get(snap.id);

      if (!actual) {
        // El movimiento fue eliminado de la base de datos con posterioridad
        totalEliminados++;
        const dif = -snap.monto;
        if (snap.tipo === 'ingreso') {
          diferenciaEntradas -= snap.monto;
        } else {
          diferenciaGastos -= snap.monto;
        }
        items.push({
          id: snap.id,
          tipoCambio: 'eliminado',
          tipo: snap.tipo,
          subtipo: snap.subtipo,
          conceptoOriginal: snap.concepto,
          categoriaOriginal: snap.categoria,
          fechaOriginal: snap.fecha,
          montoOriginal: snap.monto,
          diferenciaMonto: dif,
          miembroOriginal: snap.miembro_nombre,
          detallesCambio: ['Movimiento eliminado con posterioridad a la emisión del reporte']
        });
      } else {
        // El movimiento existe, verificar si hubo cambios en monto, fecha, categoría, concepto o subtipo
        const detalles: string[] = [];
        const difMonto = actual.monto - snap.monto;

        if (Math.abs(difMonto) > 0.001) {
          detalles.push(`Monto modificado: antes ${snap.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}, ahora ${actual.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`);
        }
        if (actual.concepto !== snap.concepto) {
          detalles.push(`Concepto modificado: antes "${snap.concepto}", ahora "${actual.concepto}"`);
        }
        if (actual.categoria !== snap.categoria) {
          detalles.push(`Categoría modificada: antes "${snap.categoria}", ahora "${actual.categoria}"`);
        }
        if (actual.fecha !== snap.fecha) {
          detalles.push(`Fecha modificada: antes "${snap.fecha}", ahora "${actual.fecha}"`);
        }
        if (actual.subtipo !== snap.subtipo) {
          detalles.push(`Subtipo modificado: antes "${snap.subtipo || 'general'}", ahora "${actual.subtipo || 'general'}"`);
        }
        if (actual.miembro_nombre !== snap.miembro_nombre && (actual.miembro_nombre || snap.miembro_nombre)) {
          detalles.push(`Hermano/Donante modificado: antes "${snap.miembro_nombre || 'N/A'}", ahora "${actual.miembro_nombre || 'N/A'}"`);
        }

        if (detalles.length > 0) {
          totalModificados++;
          if (snap.tipo === 'ingreso') {
            diferenciaEntradas += difMonto;
          } else {
            diferenciaGastos += difMonto;
          }
          items.push({
            id: snap.id,
            tipoCambio: 'modificado',
            tipo: actual.tipo,
            subtipo: actual.subtipo,
            conceptoOriginal: snap.concepto,
            conceptoActual: actual.concepto,
            categoriaOriginal: snap.categoria,
            categoriaActual: actual.categoria,
            fechaOriginal: snap.fecha,
            fechaActual: actual.fecha,
            montoOriginal: snap.monto,
            montoActual: actual.monto,
            diferenciaMonto: difMonto,
            miembroOriginal: snap.miembro_nombre,
            miembroActual: actual.miembro_nombre,
            detallesCambio: detalles
          });
        }
      }
    }

    // 2. Verificar si se agregaron nuevos movimientos con fecha dentro del período que no estaban en el reporte
    const txsRangoActuales = transaccionesActuales.filter(t => {
      if (reporte.periodo_tipo === 'todo') return true;
      return t.fecha >= reporte.fecha_desde && t.fecha <= reporte.fecha_hasta;
    }).filter(t => {
      if (t.subtipo === 'pacto') return false;
      if (t.tipo === 'gasto' && t.categoria === 'Liquidación / Remanente de Proyecto') return false;
      return true;
    });

    for (const actual of txsRangoActuales) {
      if (!idsEnSnapshot.has(actual.id)) {
        totalAgregados++;
        if (actual.tipo === 'ingreso') {
          diferenciaEntradas += actual.monto;
        } else {
          diferenciaGastos += actual.monto;
        }
        items.push({
          id: actual.id,
          tipoCambio: 'agregado_posteriormente',
          tipo: actual.tipo,
          subtipo: actual.subtipo,
          conceptoActual: actual.concepto,
          categoriaActual: actual.categoria,
          fechaActual: actual.fecha,
          montoActual: actual.monto,
          diferenciaMonto: actual.monto,
          miembroActual: actual.miembro_nombre,
          detallesCambio: ['Movimiento registrado posteriormente con fecha contable dentro de este período']
        });
      }
    }

    const diferenciaBalanceNeto = diferenciaEntradas - diferenciaGastos;
    const balanceOriginal = reporte.totales?.balanceNetoCaja !== undefined 
      ? reporte.totales.balanceNetoCaja 
      : ((reporte.totales?.totalEntradasCaja || 0) - (reporte.totales?.totalGastosCaja || 0));
    const balanceActualizado = balanceOriginal + diferenciaBalanceNeto;

    return {
      reporteId: reporte.id,
      folio: reporte.folio,
      fechaEmision: reporte.fecha_emision,
      tieneCambios: items.length > 0,
      totalModificados,
      totalEliminados,
      totalAgregados,
      diferenciaEntradas,
      diferenciaGastos,
      diferenciaBalanceNeto,
      balanceOriginal,
      balanceActualizado,
      items
    };
  }
};
