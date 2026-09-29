// Servicio central de almacenamiento y gestión de datos de tesorería eclesiástica
// Conectado directamente a Aiven PostgreSQL y Cloudflare R2
import { Transaccion, ProyectoPactado, PactoMiembro, ResumenFinanciero, MiembroFrecuente, TipoCulto, MetodoPago } from '../types';
import { identificarDiaSemana } from '../utils/dateUtils';

const STORAGE_KEYS = {
  TRANSACCIONES: 'iglesia_flujo_transacciones_v2',
  PROYECTOS: 'iglesia_flujo_proyectos_v2',
  PACTOS: 'iglesia_flujo_pactos_v2',
  MIEMBROS: 'iglesia_flujo_miembros_v2',
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

  async guardarTransaccion(transaccion: Omit<Transaccion, 'id' | 'created_at' | 'dia_semana'>): Promise<Transaccion> {
    const lista = this.getTransacciones();
    const dia_semana = identificarDiaSemana(transaccion.fecha);
    const tempId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'tx-' + Date.now();
    const nueva: Transaccion = {
      ...transaccion,
      id: tempId,
      dia_semana,
      created_at: new Date().toISOString()
    };

    lista.unshift(nueva);
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(lista));

    // Si es aporte a proyecto pactado, actualizar totales del proyecto y pacto localmente de inmediato
    if (transaccion.tipo === 'ingreso' && transaccion.subtipo === 'pacto' && transaccion.proyecto_id) {
      this.actualizarAportePacto(transaccion.proyecto_id, transaccion.pacto_id, transaccion.monto);
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
            txs[idx] = nueva;
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

    const filtrada = lista.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(filtrada));

    // Notificar a la API
    fetch(`/api/movimientos?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(err => console.warn('Error al eliminar en Aiven:', err));
  },

  async actualizarCategoriaTransaccion(id: string, nuevaCategoria: string): Promise<boolean> {
    const catLimpia = nuevaCategoria.trim();
    if (!catLimpia) return false;

    const lista = this.getTransacciones();
    const idx = lista.findIndex(t => t.id === id);
    if (idx >= 0) {
      lista[idx].categoria = catLimpia;
      localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(lista));
    }

    try {
      const res = await fetch('/api/movimientos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, categoria: catLimpia })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.categoria) {
          const fresh = this.getTransacciones();
          const fIdx = fresh.findIndex(t => t.id === id);
          if (fIdx >= 0) {
            fresh[fIdx].categoria = json.data.categoria;
            localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(fresh));
          }
        }
      }
    } catch (err) {
      console.warn('Error al actualizar categoría en Aiven / API:', err);
    }

    return true;
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
  }): Promise<{ transaccionIngreso: Transaccion; transaccionGasto?: Transaccion }> {
    const proyectos = this.getProyectos();
    const proyecto = proyectos.find(p => p.id === params.proyectoId);
    if (!proyecto) {
      throw new Error('Proyecto no encontrado');
    }

    const fechaFinal = params.fecha || new Date().toISOString().slice(0, 10);
    const metodo = params.metodoPago || 'efectivo';
    const culto = params.tipoCulto || 'domingo_manana';

    // 1. Crear gasto de liquidación del proyecto para balancear sus fondos
    const transaccionGasto = await this.guardarTransaccion({
      tipo: 'gasto',
      categoria: 'Liquidación / Remanente de Proyecto',
      monto: params.montoResto,
      fecha: fechaFinal,
      tipo_culto: 'no_aplica',
      concepto: `Liquidación de resto no gastado: ${proyecto.nombre}`,
      proyecto_id: proyecto.id,
      proyecto_nombre: proyecto.nombre,
      metodo_pago: metodo
    });

    // 2. Crear entrada en Ofrenda General con el motivo exacto "resto del proyecto"
    const transaccionIngreso = await this.guardarTransaccion({
      tipo: 'ingreso',
      subtipo: 'ofrenda',
      categoria: 'Ofrenda General',
      monto: params.montoResto,
      fecha: fechaFinal,
      tipo_culto: culto,
      concepto: `Resto del proyecto: ${proyecto.nombre}`,
      metodo_pago: metodo
    });

    // 3. Si se solicita cerrar/finalizar el proyecto
    if (params.cerrarProyecto !== false) {
      await this.editarProyecto(proyecto.id, {
        activo: false,
        fecha_fin: fechaFinal
      });
    }

    return { transaccionIngreso, transaccionGasto };
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
          return pactos;
        }
      }
    } catch (e) {
      console.warn('Operando pactos localmente:', e);
    }
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
  }
};
