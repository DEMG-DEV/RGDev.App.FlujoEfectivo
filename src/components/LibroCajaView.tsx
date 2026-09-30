import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  Eye, 
  Trash2, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight,
  Church,
  FileCheck,
  FileText,
  X,
  CalendarDays,
  Table,
  ChevronRight,
  ChevronDown,
  Pencil,
  Tag,
  Check,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Transaccion } from '../types';
import { storageService } from '../services/storageService';
import { formatearMoneda, formatearFechaCorta, formatearFechaLarga } from '../utils/dateUtils';

function formatearMesAnio(claveMes: string): string {
  if (!claveMes) return '';
  const [year, month] = claveMes.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const str = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric'
  }).format(date);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const CATEGORIAS_GASTOS_DISPONIBLES = [
  'Mantenimiento y Reparaciones del Templo',
  'Sonido, Multimedia e Instrumentos',
  'Servicios Básicos (Luz, Agua, Gas)',
  'Papelería, Limpieza y Administración',
  'Honorarios Pastorales / Viáticos',
  'Obra Social, Misericordia y Canasta Básica',
  'Material de Evangelismo y Discipulado',
  'Escuela Dominical y Actividades Infantiles',
  'Internet y Telecomunicaciones',
  'Eventos Especiales, Vigilias y Retiros',
  'Aportes Misioneros y Ofrendas a Ministerios'
];

const CATEGORIAS_INGRESOS_DISPONIBLES = [
  'Ofrenda General',
  'Diezmo General',
  'Ofrenda Misionera',
  'Escuela Dominical / Niños',
  'Ofrenda de Acción de Gracias',
  'Ofrenda de Jóvenes',
  'Pro-Templo / Edificación',
  'Aporte a Proyecto Pactado'
];

interface LibroCajaProps {
  transacciones: Transaccion[];
  onTransaccionEliminada?: () => void;
  onTransaccionActualizada?: () => void;
  onVerEvidencia: (url: string, nombre?: string) => void;
  onAbrirReportePDF?: () => void;
}

export const LibroCajaView: React.FC<LibroCajaProps> = ({
  transacciones,
  onTransaccionEliminada,
  onTransaccionActualizada,
  onVerEvidencia,
  onAbrirReportePDF
}) => {
  const [vistaModo, setVistaModo] = useState<'movimientos' | 'mensual'>('movimientos');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ingreso' | 'gasto'>('todos');
  const [filtroCulto, setFiltroCulto] = useState<string>('todos');
  const [filtroSubtipo, setFiltroSubtipo] = useState<string>('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  // Por defecto NO contar proyectos pactados (se manejan en su módulo independiente)
  const [incluirPactos, setIncluirPactos] = useState(false);

  // Estado para cambio rápido de categoría
  const [txEditandoCategoria, setTxEditandoCategoria] = useState<Transaccion | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState<string>('');
  const [guardandoCategoria, setGuardandoCategoria] = useState<boolean>(false);
  const [guardandoCategoriaId, setGuardandoCategoriaId] = useState<string | null>(null);
  const [notificacionExito, setNotificacionExito] = useState<string | null>(null);

  const handleAbrirEdicionCategoria = (t: Transaccion) => {
    setTxEditandoCategoria(t);
    setCategoriaSeleccionada(t.categoria);
    setCategoriaPersonalizada('');
  };

  const handleCambioDirectoCategoria = async (t: Transaccion, nuevaCat: string) => {
    const catFinal = nuevaCat.trim();
    if (!catFinal || catFinal === t.categoria) return;

    // Actualización inmediata en el objeto en memoria
    t.categoria = catFinal;

    setGuardandoCategoriaId(t.id);
    setGuardandoCategoria(true);
    await storageService.actualizarCategoriaTransaccion(t.id, catFinal);
    setGuardandoCategoria(false);
    setGuardandoCategoriaId(null);

    setNotificacionExito(`Categoría cambiada a "${catFinal}"`);
    setTimeout(() => setNotificacionExito(null), 3000);

    if (onTransaccionActualizada) {
      onTransaccionActualizada();
    }
  };

  const handleGuardarCategoria = async (nuevaCat?: string) => {
    if (!txEditandoCategoria) return;
    const catFinal = (nuevaCat || (categoriaSeleccionada === '__custom__' ? categoriaPersonalizada : categoriaSeleccionada)).trim();
    if (!catFinal) return;

    txEditandoCategoria.categoria = catFinal;

    setGuardandoCategoria(true);
    await storageService.actualizarCategoriaTransaccion(txEditandoCategoria.id, catFinal);
    setGuardandoCategoria(false);
    setTxEditandoCategoria(null);

    setNotificacionExito(`Categoría actualizada a "${catFinal}"`);
    setTimeout(() => setNotificacionExito(null), 3000);

    if (onTransaccionActualizada) {
      onTransaccionActualizada();
    }
  };

  // 1. Filtrar transacciones base: excluir proyectos pactados por defecto
  const transaccionesBase = React.useMemo(() => {
    return transacciones.filter(t => {
      if (!incluirPactos) {
        // Excluir ingresos de pactos y egresos internos de liquidación de proyectos
        if (t.subtipo === 'pacto') return false;
        if (t.tipo === 'gasto' && t.categoria === 'Liquidación / Remanente de Proyecto') return false;
      }
      return true;
    });
  }, [transacciones, incluirPactos]);

  // 2. Calcular el saldo acumulado en orden cronológico (del más antiguo al más reciente)
  const mapaSaldos = React.useMemo(() => {
    const cronologicas = [...transaccionesBase].sort((a, b) => {
      const compFecha = a.fecha.localeCompare(b.fecha);
      if (compFecha !== 0) return compFecha;
      const aTime = a.created_at || '';
      const bTime = b.created_at || '';
      return aTime.localeCompare(bTime);
    });

    const mapa = new Map<string, number>();
    let acumulado = 0;

    for (const t of cronologicas) {
      if (t.tipo === 'ingreso') {
        acumulado += t.monto;
      } else if (t.tipo === 'gasto') {
        acumulado -= t.monto;
      }
      mapa.set(t.id, acumulado);
    }

    return mapa;
  }, [transaccionesBase]);

  // 3. Filtrado de transacciones para la tabla
  const transaccionesFiltradas = React.useMemo(() => {
    return transaccionesBase.filter((t) => {
      // Tipo
      if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false;

      // Culto
      if (filtroCulto === 'miercoles' && t.dia_semana !== 'miercoles') return false;
      if (filtroCulto === 'domingo' && t.dia_semana !== 'domingo') return false;

      // Subtipo
      if (filtroSubtipo !== 'todos') {
        if (t.subtipo !== filtroSubtipo) return false;
      }

      // Fechas
      if (fechaDesde && t.fecha < fechaDesde) return false;
      if (fechaHasta && t.fecha > fechaHasta) return false;

      // Búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const matchConcepto = t.concepto?.toLowerCase().includes(q);
        const matchCategoria = t.categoria?.toLowerCase().includes(q);
        const matchMiembro = t.miembro_nombre?.toLowerCase().includes(q);
        const matchProyecto = t.proyecto_nombre?.toLowerCase().includes(q);
        if (!matchConcepto && !matchCategoria && !matchMiembro && !matchProyecto) {
          return false;
        }
      }

      return true;
    });
  }, [transaccionesBase, filtroTipo, filtroCulto, filtroSubtipo, fechaDesde, fechaHasta, busqueda]);

  // 4. Calcular el saldo y balance consolidado por cada mes (cronológico y ordenado)
  const resumenesMensuales = React.useMemo(() => {
    const mesesSet = new Set<string>();
    
    // Incluir mes en curso
    const mesActualClave = new Date().toISOString().slice(0, 7);
    mesesSet.add(mesActualClave);

    for (const t of transaccionesBase) {
      if (t.fecha) {
        mesesSet.add(t.fecha.slice(0, 7));
      }
    }

    // Orden cronológico para acumular el saldo correctamente
    const mesesOrdenados = Array.from(mesesSet).sort();

    const resultado: Array<{
      claveMes: string;
      nombreMes: string;
      fechaInicio: string;
      fechaFin: string;
      saldoInicial: number;
      totalIngresos: number;
      totalGastos: number;
      flujoNeto: number;
      saldoFinal: number;
      cantidadMovimientos: number;
    }> = [];

    let saldoAcumulado = 0;

    for (const claveMes of mesesOrdenados) {
      const [year, month] = claveMes.split('-').map(Number);
      const ultimoDia = new Date(year, month, 0).getDate();
      const fechaInicio = `${claveMes}-01`;
      const fechaFin = `${claveMes}-${String(ultimoDia).padStart(2, '0')}`;

      const txMes = transaccionesBase.filter(t => t.fecha >= fechaInicio && t.fecha <= fechaFin);
      const totalIngresos = txMes
        .filter(t => t.tipo === 'ingreso')
        .reduce((acc, t) => acc + t.monto, 0);

      const totalGastos = txMes
        .filter(t => t.tipo === 'gasto')
        .reduce((acc, t) => acc + t.monto, 0);

      const flujoNeto = totalIngresos - totalGastos;
      const saldoInicial = saldoAcumulado;
      const saldoFinal = saldoInicial + flujoNeto;
      saldoAcumulado = saldoFinal;

      resultado.push({
        claveMes,
        nombreMes: formatearMesAnio(claveMes),
        fechaInicio,
        fechaFin,
        saldoInicial,
        totalIngresos,
        totalGastos,
        flujoNeto,
        saldoFinal,
        cantidadMovimientos: txMes.length
      });
    }

    // Devolver en orden descendente (el más reciente arriba)
    return resultado.reverse();
  }, [transaccionesBase]);

  // Totales de la selección filtrada
  const totalIngresosFiltrados = transaccionesFiltradas
    .filter(t => t.tipo === 'ingreso')
    .reduce((acc, t) => acc + t.monto, 0);

  const totalGastosFiltrados = transaccionesFiltradas
    .filter(t => t.tipo === 'gasto')
    .reduce((acc, t) => acc + t.monto, 0);

  const flujoNetoFiltrado = totalIngresosFiltrados - totalGastosFiltrados;

  const handleEliminar = (id: string, concepto: string) => {
    if (confirm(`¿Estás seguro de eliminar el registro "${concepto}"?`)) {
      storageService.eliminarTransaccion(id);
      onTransaccionEliminada?.();
    }
  };

  // Exportar a CSV movimientos detallados
  const exportarCSV = () => {
    const headers = ['ID', 'Fecha', 'Día', 'Tipo', 'Subtipo/Categoría', 'Concepto', 'Miembro/Hermano', 'Proyecto', 'Método Pago', 'Monto', 'Saldo en Caja', 'Evidencia'];
    const rows = transaccionesFiltradas.map(t => [
      t.id,
      t.fecha,
      t.dia_semana,
      t.tipo.toUpperCase(),
      t.categoria,
      `"${(t.concepto || '').replace(/"/g, '""')}"`,
      `"${(t.miembro_nombre || '').replace(/"/g, '""')}"`,
      `"${(t.proyecto_nombre || '').replace(/"/g, '""')}"`,
      t.metodo_pago,
      t.tipo === 'ingreso' ? t.monto : -t.monto,
      mapaSaldos.get(t.id) ?? 0,
      t.evidencia_url || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `caja_general_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar a CSV resumen mensual de saldos
  const exportarCSVMensual = () => {
    const headers = ['Mes / Período', 'Fecha Inicio', 'Fecha Fin', 'Saldo Inicial', 'Entradas (+)', 'Gastos (-)', 'Flujo Neto (+/-)', 'Saldo al Cierre', 'Movimientos'];
    const rows = resumenesMensuales.map(m => [
      `"${m.nombreMes}"`,
      m.fechaInicio,
      m.fechaFin,
      m.saldoInicial,
      m.totalIngresos,
      m.totalGastos,
      m.flujoNeto,
      m.saldoFinal,
      m.cantidadMovimientos
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `saldos_mensuales_caja_general_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportar = () => {
    if (vistaModo === 'mensual') {
      exportarCSVMensual();
    } else {
      exportarCSV();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Membrete Oficial Exclusivo para Impresión PDF / Papel */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4 print-break-inside-avoid break-inside-avoid">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
              <Church className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                Iglesia Cristiana Evangélica
              </h1>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Libro de Caja General — Auditoría Contable y Control de Fondos
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {!incluirPactos ? 'Caja Operativa (Excluye Proyectos Pactados)' : 'Consolidado General (Incluye Proyectos)'}
              </p>
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-w-[210px]">
            <div className="text-[10px] font-bold uppercase text-slate-400">Libro Oficial de Caja</div>
            <div><strong>Emisión:</strong> {formatearFechaLarga(new Date().toISOString().slice(0, 10))}</div>
            <div><strong>Período:</strong> {fechaDesde && fechaHasta ? `${formatearFechaCorta(fechaDesde)} al ${formatearFechaCorta(fechaHasta)}` : 'Historial Acumulado'}</div>
            <div><strong>Movimientos:</strong> {transaccionesFiltradas.length} registros</div>
          </div>
        </div>

        {/* Resumen Ejecutivo de Totales Impreso */}
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200 text-xs">
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Entradas</span>
            <span className="text-base font-black text-emerald-700">+{formatearMoneda(totalIngresosFiltrados)}</span>
          </div>
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
            <span className="text-[10px] font-bold text-rose-800 uppercase block">Total Gastos</span>
            <span className="text-base font-black text-rose-700">-{formatearMoneda(totalGastosFiltrados)}</span>
          </div>
          <div className={`p-2.5 rounded-xl border ${flujoNetoFiltrado >= 0 ? 'bg-slate-900 text-white border-slate-800' : 'bg-rose-900 text-white border-rose-800'}`}>
            <span className="text-[10px] font-bold uppercase block text-slate-300">Balance en Caja</span>
            <span className={`text-base font-black ${flujoNetoFiltrado >= 0 ? 'text-emerald-400' : 'text-rose-300'}`}>{formatearMoneda(flujoNetoFiltrado)}</span>
          </div>
        </div>
      </div>

      {/* Encabezado Apple HIG (no-print) */}
      {/* 1. ENCABEZADO MINIMALISTA APPLE HIG */}
      <div className="no-print bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Auditoría & Mayordomía</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            Libro de Caja General
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-xl">
            Historial de entradas operativas y egresos con saldo acumulado en cada movimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Segmented Control de Modo: Movimientos vs Saldos por Mes */}
          <div className="apple-segmented-group">
            <button
              type="button"
              onClick={() => setVistaModo('movimientos')}
              className={`apple-segmented-item px-3 py-1.5 text-xs font-bold ${vistaModo === 'movimientos' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Receipt className="w-3.5 h-3.5 inline mr-1" />
              Movimientos
            </button>
            <button
              type="button"
              onClick={() => setVistaModo('mensual')}
              className={`apple-segmented-item px-3 py-1.5 text-xs font-bold ${vistaModo === 'mensual' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
              Saldos por Mes
            </button>
          </div>

          <button
            onClick={handleExportar}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-bold transition-all border border-slate-200"
            title="Exportar a CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-bold transition-all border border-slate-200"
            title="Imprimir vista actual de caja"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={onAbrirReportePDF || (() => window.print())}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
            title="Abrir Reporte Financiero Oficial en PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reporte PDF</span>
          </button>
        </div>
      </div>

      {/* 2. SALDOS Y BALANCES POR MES (APPLE HIG COMPACTO) */}
      <div className="no-print bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Saldos y Balances por Mes
              </h3>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                • Cierre contable periódico ({resumenesMensuales.length} {resumenesMensuales.length === 1 ? 'período' : 'períodos'})
              </span>
            </div>
          </div>

          {fechaDesde && fechaHasta && (
            <div className="flex items-center space-x-1.5 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-lg text-xs">
              <span className="text-[11px] font-semibold text-blue-800">
                Mes filtrado
              </span>
              <button
                type="button"
                onClick={() => {
                  setFechaDesde('');
                  setFechaHasta('');
                }}
                className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white px-1.5 py-0.5 rounded shadow-2xs border border-blue-200"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Tarjetas Compactas de Saldos por Mes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {resumenesMensuales.map((m) => {
            const esMesFiltrado = fechaDesde === m.fechaInicio && fechaHasta === m.fechaFin;
            return (
              <div
                key={m.claveMes}
                onClick={() => {
                  if (esMesFiltrado) {
                    setFechaDesde('');
                    setFechaHasta('');
                  } else {
                    setFechaDesde(m.fechaInicio);
                    setFechaHasta(m.fechaFin);
                    if (vistaModo === 'mensual') {
                      setVistaModo('movimientos');
                    }
                  }
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 select-none active:scale-[0.99] ${
                  esMesFiltrado 
                    ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20 shadow-sm' 
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Cabecera del Mes */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 truncate">{m.nombreMes}</span>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {esMesFiltrado ? (
                      <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                        Filtrado
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {m.cantidadMovimientos} movs
                      </span>
                    )}
                  </div>
                </div>

                {/* Saldo al Cierre Destacado */}
                <div className="flex items-baseline justify-between py-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Saldo al Cierre
                  </span>
                  <span className={`text-base font-black tabular-nums ${m.saldoFinal >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    {formatearMoneda(m.saldoFinal)}
                  </span>
                </div>

                {/* Mini Grilla Compacta: Inicial, Entradas, Gastos, Flujo */}
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Inicial:</span>
                    <span className="font-semibold text-slate-700 tabular-nums">{formatearMoneda(m.saldoInicial)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span className="font-medium">Entradas:</span>
                    <span className="font-bold tabular-nums">+{formatearMoneda(m.totalIngresos)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span className="font-medium">Gastos:</span>
                    <span className="font-bold tabular-nums">-{formatearMoneda(m.totalGastos)}</span>
                  </div>
                  <div className={`flex justify-between font-bold ${m.flujoNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    <span>Neto:</span>
                    <span className="tabular-nums">{m.flujoNeto >= 0 ? '+' : ''}{formatearMoneda(m.flujoNeto)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. VISTA A: TABLA DE SALDOS POR MES */}
      {vistaModo === 'mensual' && (
        <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-black text-slate-900">
                Auditoría Contable de Saldos por Mes
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Resumen de saldo inicial, flujo operativo y saldo al cierre de cada mes en Caja General.
              </p>
            </div>
            <button
              onClick={exportarCSVMensual}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar Saldos Mensuales CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F9F9FB] text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Mes / Período</th>
                  <th className="py-3.5 px-4 text-right">Saldo Inicial</th>
                  <th className="py-3.5 px-4 text-right text-emerald-700">Entradas (+)</th>
                  <th className="py-3.5 px-4 text-right text-rose-700">Gastos (-)</th>
                  <th className="py-3.5 px-4 text-right">Flujo Neto</th>
                  <th className="py-3.5 px-4 text-right font-black">Saldo al Cierre</th>
                  <th className="py-3.5 px-4 text-center">Movimientos</th>
                  <th className="py-3.5 px-4 text-right no-print">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumenesMensuales.map((m) => (
                  <tr key={m.claveMes} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {m.nombreMes}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-slate-600 font-semibold">
                      {formatearMoneda(m.saldoInicial)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-emerald-700 font-bold">
                      +{formatearMoneda(m.totalIngresos)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-rose-700 font-bold">
                      -{formatearMoneda(m.totalGastos)}
                    </td>
                    <td className={`py-3.5 px-4 text-right tabular-nums font-bold ${
                      m.flujoNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {m.flujoNeto >= 0 ? '+' : ''}{formatearMoneda(m.flujoNeto)}
                    </td>
                    <td className={`py-3.5 px-4 text-right tabular-nums font-black text-base ${
                      m.saldoFinal >= 0 ? 'text-slate-950' : 'text-rose-600'
                    }`}>
                      {formatearMoneda(m.saldoFinal)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500 font-semibold text-xs">
                      {m.cantidadMovimientos}
                    </td>
                    <td className="py-3.5 px-4 text-right no-print">
                      <button
                        onClick={() => {
                          setFechaDesde(m.fechaInicio);
                          setFechaHasta(m.fechaFin);
                          setVistaModo('movimientos');
                        }}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <span>Ver Movimientos</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. VISTA B: BARRA DE FILTROS & MOVIMIENTOS DETALLADOS */}
      {vistaModo === 'movimientos' && (
        <>
          {/* Barra de Filtros Apple HIG Compact Toolbar */}
          <div className="no-print bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
            
            {/* Fila 1: Buscador Spotlight + Segmented Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              
              {/* Buscador macOS Style Compacto */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por hermano, concepto o categoría..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Segmented Controls Apple HIG */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {/* Segmented Control de Ámbito: Caja General vs Todos */}
                <div className="apple-segmented-group">
                  <button
                    type="button"
                    onClick={() => setIncluirPactos(false)}
                    className={`apple-segmented-item px-2.5 py-1 text-xs ${!incluirPactos ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                    title="Muestra únicamente las entradas y salidas de la caja general operativa"
                  >
                    Solo Caja General
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncluirPactos(true)}
                    className={`apple-segmented-item px-2.5 py-1 text-xs ${incluirPactos ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                    title="Incluye también los aportes a proyectos pactados"
                  >
                    Incluir Proyectos
                  </button>
                </div>

                {/* Segmented Control de Tipo */}
                <div className="apple-segmented-group">
                  <button
                    onClick={() => setFiltroTipo('todos')}
                    className={`apple-segmented-item px-2.5 py-1 text-xs ${filtroTipo === 'todos' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Todos (+/-)
                  </button>
                  <button
                    onClick={() => setFiltroTipo('ingreso')}
                    className={`apple-segmented-item px-2.5 py-1 text-xs ${filtroTipo === 'ingreso' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Entradas (+)
                  </button>
                  <button
                    onClick={() => setFiltroTipo('gasto')}
                    className={`apple-segmented-item px-2.5 py-1 text-xs ${filtroTipo === 'gasto' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Gastos (-)
                  </button>
                </div>
              </div>

            </div>

            {/* Fila 2: Filtros Compactos en Línea (Culto, Clasificación, Fechas) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
              
              {/* Filtro Culto */}
              <div className="relative">
                <select
                  value={filtroCulto}
                  onChange={(e) => setFiltroCulto(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="todos">Todos los Cultos</option>
                  <option value="miercoles">Cultos de Miércoles</option>
                  <option value="domingo">Cultos de Domingo</option>
                </select>
              </div>

              {/* Filtro Clasificación */}
              <div className="relative">
                <select
                  value={filtroSubtipo}
                  onChange={(e) => setFiltroSubtipo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="todos">Todas las Clasificaciones</option>
                  <option value="ofrenda">Ofrendas Generales</option>
                  <option value="diezmo">Diezmos de Miembros</option>
                  {incluirPactos && <option value="pacto">Proyectos Pactados</option>}
                </select>
              </div>

              {/* Fecha Desde */}
              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Del:</span>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none"
                />
              </div>

              {/* Fecha Hasta */}
              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Al:</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none"
                />
              </div>

            </div>

            {/* Fila 3: Barra de Estado y Balance Financiero (Slim Status Bar) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="text-slate-500 font-medium flex items-center space-x-2 text-[11px]">
                <span>Mostrando <strong>{transaccionesFiltradas.length}</strong> movs</span>
                {!incluirPactos && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                    Solo Caja
                  </span>
                )}
                {(fechaDesde || fechaHasta || filtroCulto !== 'todos' || filtroSubtipo !== 'todos' || busqueda) && (
                  <button
                    onClick={() => {
                      setBusqueda('');
                      setFiltroCulto('todos');
                      setFiltroSubtipo('todos');
                      setFechaDesde('');
                      setFechaHasta('');
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>

              {/* Pills Financieras Compactas */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-800 border border-emerald-200/70 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                  <span className="text-slate-500 font-normal">Entradas:</span>
                  <span className="tabular-nums">+{formatearMoneda(totalIngresosFiltrados)}</span>
                </span>

                <span className="inline-flex items-center space-x-1 bg-rose-50 text-rose-800 border border-rose-200/70 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                  <span className="text-slate-500 font-normal">Gastos:</span>
                  <span className="tabular-nums">-{formatearMoneda(totalGastosFiltrados)}</span>
                </span>

                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg font-black text-xs ${
                  flujoNetoFiltrado >= 0 
                    ? 'bg-emerald-600 text-white shadow-2xs' 
                    : 'bg-rose-600 text-white shadow-2xs'
                }`}>
                  <span className="opacity-90 font-medium text-[11px]">Balance:</span>
                  <span className="tabular-nums">{formatearMoneda(flujoNetoFiltrado)}</span>
                </span>
              </div>
            </div>

          </div>

      {/* Tabla Apple HIG Inset Grouped */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9F9FB] text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 sm:px-4">Fecha / Culto</th>
                <th className="py-3 px-3 sm:px-4">Tipo</th>
                <th className="py-3 px-3 sm:px-4">Categoría / Concepto</th>
                <th className="py-3 px-3 sm:px-4">Hermano / Donante</th>
                <th className="py-3 px-3 sm:px-4">Método</th>
                <th className="no-print py-3 px-4">Evidencia R2</th>
                <th className="py-3 px-3 sm:px-4 text-right">Monto</th>
                <th className="py-3 px-3 sm:px-4 text-right">Saldo en Caja</th>
                <th className="no-print py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transaccionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Filter className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">No se encontraron movimientos</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          No hay registros que coincidan con los filtros de búsqueda o fechas aplicadas.
                        </p>
                      </div>
                      {(busqueda || filtroTipo !== 'todos' || filtroCulto !== 'todos' || filtroSubtipo !== 'todos' || fechaDesde || fechaHasta) && (
                        <button
                          type="button"
                          onClick={() => {
                            setBusqueda('');
                            setFiltroTipo('todos');
                            setFiltroCulto('todos');
                            setFiltroSubtipo('todos');
                            setFechaDesde('');
                            setFechaHasta('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors border border-blue-200 shadow-sm"
                        >
                          Restablecer todos los filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                transaccionesFiltradas.map((t) => {
                  const saldoMovimiento = mapaSaldos.get(t.id) ?? 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Fecha */}
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block text-xs">{formatearFechaCorta(t.fecha)}</span>
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          t.dia_semana === 'miercoles' 
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : t.dia_semana === 'domingo'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.dia_semana}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          t.tipo === 'ingreso'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {t.tipo === 'ingreso' ? '+ Entrada' : '- Gasto'}
                        </span>
                      </td>

                      {/* Categoría & Concepto */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center space-x-1.5 max-w-full">
                          <div className="relative inline-flex items-center max-w-[260px]">
                            <select
                              value={
                                (t.tipo === 'ingreso' ? CATEGORIAS_INGRESOS_DISPONIBLES : CATEGORIAS_GASTOS_DISPONIBLES).includes(t.categoria)
                                  ? t.categoria
                                  : '__custom_actual__'
                              }
                              disabled={guardandoCategoriaId === t.id}
                              aria-label={`Seleccionar categoría de ${t.concepto}`}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__custom__') {
                                  handleAbrirEdicionCategoria(t);
                                } else if (val !== '__custom_actual__') {
                                  handleCambioDirectoCategoria(t, val);
                                }
                              }}
                              className={`font-bold text-slate-900 text-xs bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg py-1 pl-2 pr-6 cursor-pointer transition-all shadow-sm appearance-none truncate max-w-full ${
                                guardandoCategoriaId === t.id ? 'opacity-60 cursor-wait' : ''
                              }`}
                              title="Haz clic para cambiar de categoría inmediatamente"
                            >
                              {!(t.tipo === 'ingreso' ? CATEGORIAS_INGRESOS_DISPONIBLES : CATEGORIAS_GASTOS_DISPONIBLES).includes(t.categoria) && (
                                <option value="__custom_actual__">{t.categoria} (Personalizada)</option>
                              )}
                              <optgroup label={t.tipo === 'ingreso' ? 'Categorías de Ingreso' : 'Categorías de Gasto'}>
                                {(t.tipo === 'ingreso' ? CATEGORIAS_INGRESOS_DISPONIBLES : CATEGORIAS_GASTOS_DISPONIBLES).map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </optgroup>
                              <option value="__custom__">✏️ Otra categoría personalizada...</option>
                            </select>
                            {guardandoCategoriaId === t.id ? (
                              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-1.5 pointer-events-none" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 pointer-events-none" />
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAbrirEdicionCategoria(t)}
                            aria-label={`Abrir panel completo de categorías para ${t.concepto}`}
                            className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                            title="Abrir panel completo de categorías"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-xs text-slate-600 block mt-1">{t.concepto}</span>
                        {t.proyecto_nombre && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                            Proyecto: {t.proyecto_nombre}
                          </span>
                        )}
                      </td>

                      {/* Hermano */}
                      <td className="py-3 px-3 sm:px-4 text-xs font-semibold text-slate-800">
                        {t.miembro_nombre || <span className="text-slate-400 italic">Ofrenda Colectiva</span>}
                      </td>

                      {/* Método de Pago */}
                      <td className="py-3 px-3 sm:px-4 text-xs capitalize text-slate-600 whitespace-nowrap">
                        {t.metodo_pago}
                      </td>

                      {/* Evidencia (no-print) */}
                      <td className="no-print py-3 px-4 whitespace-nowrap">
                        {t.evidencia_url ? (
                          <button
                            type="button"
                            onClick={() => onVerEvidencia(t.evidencia_url!, t.evidencia_nombre)}
                            aria-label={`Ver comprobante de ${t.concepto}`}
                            className="inline-flex items-center space-x-1 text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors min-h-[32px]"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-600" />
                            <span>Ver</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin comprobante</span>
                        )}
                      </td>

                      {/* Monto */}
                      <td className={`py-3 px-3 sm:px-4 text-right font-black text-sm whitespace-nowrap tabular-nums ${
                        t.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {t.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(t.monto)}
                      </td>

                      {/* Saldo en cada movimiento */}
                      <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap tabular-nums">
                        <span className={`text-xs sm:text-sm font-black ${
                          saldoMovimiento >= 0 ? 'text-slate-900' : 'text-rose-600'
                        }`}>
                          {formatearMoneda(saldoMovimiento)}
                        </span>
                      </td>

                      {/* Acciones: Editar Categoría y Eliminar */}
                      <td className="no-print py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => handleAbrirEdicionCategoria(t)}
                            aria-label={`Editar categoría de ${t.concepto}`}
                            className="text-slate-400 hover:text-blue-600 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-blue-50 transition-colors"
                            title="Cambiar categoría de forma sencilla"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(t.id, t.concepto)}
                            aria-label={`Eliminar movimiento ${t.concepto}`}
                            className="text-slate-400 hover:text-rose-600 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-rose-50 transition-colors"
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
              <tr>
                <td colSpan={5} className="py-3 px-4 text-right uppercase text-[10px] text-slate-500">
                  Resumen de Movimientos ({transaccionesFiltradas.length} registros):
                </td>
                <td className="no-print"></td>
                <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                  <div className="text-[10px] text-emerald-700 font-bold">+{formatearMoneda(totalIngresosFiltrados)}</div>
                  <div className="text-[10px] text-rose-700 font-bold">-{formatearMoneda(totalGastosFiltrados)}</div>
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                  <span className={`text-sm font-black ${
                    flujoNetoFiltrado >= 0 ? 'text-slate-900' : 'text-rose-600'
                  }`}>
                    {formatearMoneda(flujoNetoFiltrado)}
                  </span>
                </td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Firmas Oficiales de Certificación para Impresión */}
      <div className="hidden print:block pt-8 mt-6 border-t-2 border-slate-900 print-break-inside-avoid break-inside-avoid">
        <p className="text-[10px] text-slate-500 text-center italic mb-8 max-w-xl mx-auto">
          "Certificamos la veracidad y transparencia de los movimientos registrados en este Libro de Caja General, respaldados en tesorería eclesiástica."
        </p>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="space-y-1">
            <div className="border-t border-slate-900 w-36 mx-auto mb-2" />
            <p className="text-[11px] font-bold text-slate-950 uppercase tracking-tight">Pastor Principal</p>
            <p className="text-[9px] text-slate-500">Supervisión Ministerial</p>
          </div>
          <div className="space-y-1">
            <div className="border-t border-slate-900 w-36 mx-auto mb-2" />
            <p className="text-[11px] font-bold text-slate-950 uppercase tracking-tight">Tesorero General</p>
            <p className="text-[9px] text-slate-500">Elaboración & Control de Fondos</p>
          </div>
          <div className="space-y-1">
            <div className="border-t border-slate-900 w-36 mx-auto mb-2" />
            <p className="text-[11px] font-bold text-slate-950 uppercase tracking-tight">Comité de Auditoría</p>
            <p className="text-[9px] text-slate-500">Revisor Fiscal</p>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Modal Rápido para Cambiar Categoría */}
      {txEditandoCategoria && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header del Modal */}
            <div className="bg-[#F9F9FB] border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-none">
                    Cambiar Categoría
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {txEditandoCategoria.tipo === 'ingreso' ? 'Entrada de Caja' : 'Egreso / Gasto'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTxEditandoCategoria(null)}
                className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-5 space-y-4">
              
              {/* Información del Movimiento */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Concepto</span>
                  <span className="text-xs font-bold text-slate-900 block">{txEditandoCategoria.concepto}</span>
                  <span className="text-[11px] text-slate-500">{formatearFechaCorta(txEditandoCategoria.fecha)} • {txEditandoCategoria.miembro_nombre || 'Ofrenda Colectiva'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Monto</span>
                  <span className={`text-sm font-black tabular-nums ${txEditandoCategoria.tipo === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {txEditandoCategoria.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(txEditandoCategoria.monto)}
                  </span>
                </div>
              </div>

              {/* Categoría actual */}
              <div className="text-xs text-slate-600">
                <span>Categoría actual: </span>
                <strong className="text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-bold">
                  {txEditandoCategoria.categoria}
                </strong>
              </div>

              {/* Lista de Categorías en botones de un solo clic */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Selecciona la nueva categoría con 1 clic:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
                  {(txEditandoCategoria.tipo === 'ingreso' ? CATEGORIAS_INGRESOS_DISPONIBLES : CATEGORIAS_GASTOS_DISPONIBLES).map((cat) => {
                    const esActual = categoriaSeleccionada === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategoriaSeleccionada(cat);
                          handleGuardarCategoria(cat);
                        }}
                        disabled={guardandoCategoria}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center justify-between group ${
                          esActual
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <span className="truncate pr-1">{cat}</span>
                        {esActual && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opción de categoría personalizada */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  O escribe otra categoría personalizada:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Ej. Materiales de Construcción..."
                    value={categoriaPersonalizada}
                    onChange={(e) => {
                      setCategoriaPersonalizada(e.target.value);
                      setCategoriaSeleccionada('__custom__');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && categoriaPersonalizada.trim()) {
                        e.preventDefault();
                        handleGuardarCategoria(categoriaPersonalizada.trim());
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    disabled={!categoriaPersonalizada.trim() || guardandoCategoria}
                    onClick={() => handleGuardarCategoria(categoriaPersonalizada.trim())}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    Guardar
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500">
              <span>Al hacer clic en cualquier categoría, se guarda automáticamente.</span>
              <button
                type="button"
                onClick={() => setTxEditandoCategoria(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Notificación Toast flotante de éxito */}
      {notificacionExito && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center space-x-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold">{notificacionExito}</span>
        </div>
      )}

    </div>
  );
};
