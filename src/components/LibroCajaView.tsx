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
  ChevronRight
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

interface LibroCajaProps {
  transacciones: Transaccion[];
  onTransaccionEliminada?: () => void;
  onVerEvidencia: (url: string, nombre?: string) => void;
  onAbrirReportePDF?: () => void;
}

export const LibroCajaView: React.FC<LibroCajaProps> = ({
  transacciones,
  onTransaccionEliminada,
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
      <div className="no-print bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Auditoría & Mayordomía Eclesiástica</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
              !incluirPactos 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}>
              {!incluirPactos ? 'Caja Operativa' : 'Consolidado con Proyectos'}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            Libro de Caja General
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-xl">
            Historial de entradas operativas (ofrendas y diezmos) y egresos de la iglesia con saldo acumulado en cada movimiento. Los proyectos pactados se gestionan en su módulo independiente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-bold transition-all border border-slate-200"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{vistaModo === 'mensual' ? 'Exportar Saldos' : 'Exportar CSV'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-bold transition-all border border-slate-200"
            title="Imprimir vista actual de caja o guardar en PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Imprimir Libro</span>
          </button>

          <button
            onClick={onAbrirReportePDF || (() => window.print())}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generar Reporte PDF Oficial</span>
          </button>
        </div>
      </div>

      {/* 2. CARRUSEL / GRID DE SALDOS POR MES (APPLE HIG) */}
      <div className="no-print bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-0.5">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Cierre Periódico de Caja</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Saldos y Balances por Mes
            </h3>
            <p className="text-xs text-slate-500">
              Saldo inicial, entradas, gastos y balance acumulado al cierre de cada período. Haz clic en un mes para filtrar.
            </p>
          </div>

          {fechaDesde && fechaHasta && (
            <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              <span className="text-xs font-bold text-blue-800">
                Filtro activo de mes
              </span>
              <button
                type="button"
                onClick={() => {
                  setFechaDesde('');
                  setFechaHasta('');
                }}
                className="text-xs font-black text-blue-600 hover:text-blue-900 bg-white px-2 py-0.5 rounded-md shadow-sm border border-blue-200"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Tarjetas de Saldos por Mes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
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
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  esMesFiltrado 
                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-md' 
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-black text-slate-900">{m.nombreMes}</span>
                    {esMesFiltrado ? (
                      <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        Filtrado
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {m.cantidadMovimientos} movs
                      </span>
                    )}
                  </div>
                  
                  {/* Saldo al Cierre */}
                  <div className="mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Saldo al Cierre
                    </span>
                    <div className={`text-xl font-black tabular-nums ${m.saldoFinal >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {formatearMoneda(m.saldoFinal)}
                    </div>
                  </div>
                </div>

                {/* Desglose de Entradas, Gastos y Flujo */}
                <div className="pt-2.5 border-t border-slate-200/60 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Saldo inicial:</span>
                    <span className="font-semibold text-slate-700 tabular-nums">{formatearMoneda(m.saldoInicial)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-emerald-700 font-medium">Entradas:</span>
                    <span className="font-bold text-emerald-700 tabular-nums">+{formatearMoneda(m.totalIngresos)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-rose-700 font-medium">Gastos:</span>
                    <span className="font-bold text-rose-700 tabular-nums">-{formatearMoneda(m.totalGastos)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-dashed border-slate-200 font-bold">
                    <span className="text-slate-600">Flujo neto:</span>
                    <span className={`tabular-nums ${m.flujoNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {m.flujoNeto >= 0 ? '+' : ''}{formatearMoneda(m.flujoNeto)}
                    </span>
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
          {/* Barra de Filtros Apple HIG Inset Grouped */}
          <div className="no-print bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-4">
            
            {/* Controles de Búsqueda, Segmented Controls y Selector de Ámbito */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              
              {/* Buscador macOS Style */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por hermano, concepto o categoría..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                {/* Segmented Control de Ámbito: Caja General vs Todos */}
                <div className="apple-segmented-group">
                  <button
                    type="button"
                    onClick={() => setIncluirPactos(false)}
                    className={`apple-segmented-item px-3 py-1.5 text-xs ${!incluirPactos ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                    title="Muestra únicamente las entradas y salidas de la caja general operativa"
                  >
                    Solo Caja General
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncluirPactos(true)}
                    className={`apple-segmented-item px-3 py-1.5 text-xs ${incluirPactos ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                    title="Incluye también los aportes a proyectos pactados"
                  >
                    Incluir Proyectos
                  </button>
                </div>

                {/* Segmented Control de Tipo */}
                <div className="apple-segmented-group">
                  <button
                    onClick={() => setFiltroTipo('todos')}
                    className={`apple-segmented-item px-3 py-1.5 text-xs ${filtroTipo === 'todos' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Todos (+/-)
                  </button>
                  <button
                    onClick={() => setFiltroTipo('ingreso')}
                    className={`apple-segmented-item px-3 py-1.5 text-xs ${filtroTipo === 'ingreso' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Entradas (+)
                  </button>
                  <button
                    onClick={() => setFiltroTipo('gasto')}
                    className={`apple-segmented-item px-3 py-1.5 text-xs ${filtroTipo === 'gasto' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Gastos (-)
                  </button>
                </div>
              </div>

            </div>

            {/* Filtros Secundarios: Culto, Subtipo y Rango de Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Día de Culto
                </label>
                <select
                  value={filtroCulto}
                  onChange={(e) => setFiltroCulto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="todos">Todos los Cultos</option>
                  <option value="miercoles">Cultos de Miércoles</option>
                  <option value="domingo">Cultos de Domingo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Clasificación de Ingreso
                </label>
                <select
                  value={filtroSubtipo}
                  onChange={(e) => setFiltroSubtipo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="todos">Todas las Clasificaciones</option>
                  <option value="ofrenda">Ofrendas Generales</option>
                  <option value="diezmo">Diezmos de Miembros</option>
                  {incluirPactos && <option value="pacto">Proyectos Pactados</option>}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Desde Fecha
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Hasta Fecha
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

            </div>

            {/* Resumen de Filtros KPI Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="text-slate-500 font-medium flex items-center space-x-1.5">
                <span>Mostrando <strong>{transaccionesFiltradas.length}</strong> movimientos</span>
                {!incluirPactos && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                    (Excluyendo pactos)
                  </span>
                )}
                {fechaDesde && fechaHasta && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                    Período: {fechaDesde} al {fechaHasta}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg font-bold text-xs">
                  <span>Entradas:</span>
                  <span className="tabular-nums">{formatearMoneda(totalIngresosFiltrados)}</span>
                </span>

                <span className="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-800 border border-rose-200/80 px-2.5 py-1 rounded-lg font-bold text-xs">
                  <span>Gastos:</span>
                  <span className="tabular-nums">{formatearMoneda(totalGastosFiltrados)}</span>
                </span>

                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg font-black text-xs ${
                  flujoNetoFiltrado >= 0 
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20' 
                    : 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                }`}>
                  <span>Balance:</span>
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
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                    No se encontraron movimientos con los filtros seleccionados.
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
                        <span className="font-bold text-slate-900 text-xs block">{t.categoria}</span>
                        <span className="text-xs text-slate-600 block">{t.concepto}</span>
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
                            className="inline-flex items-center space-x-1 text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors"
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

                      {/* Acción Eliminar */}
                      <td className="no-print py-3 px-3 text-right">
                        <button
                          onClick={() => handleEliminar(t.id, t.concepto)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

    </div>
  );
};
