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
  X
} from 'lucide-react';
import { Transaccion } from '../types';
import { storageService } from '../services/storageService';
import { formatearMoneda, formatearFechaCorta, formatearFechaLarga } from '../utils/dateUtils';

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
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ingreso' | 'gasto'>('todos');
  const [filtroCulto, setFiltroCulto] = useState<string>('todos');
  const [filtroSubtipo, setFiltroSubtipo] = useState<string>('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Filtrado de transacciones
  const transaccionesFiltradas = transacciones.filter((t) => {
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

  // Exportar a CSV
  const exportarCSV = () => {
    const headers = ['ID', 'Fecha', 'Día', 'Tipo', 'Subtipo/Categoría', 'Concepto', 'Miembro/Hermano', 'Proyecto', 'Método Pago', 'Monto', 'Evidencia'];
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
      t.monto,
      t.evidencia_url || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_flujo_caja_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado Apple HIG */}
      <div className="no-print bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Auditoría & Mayordomía Eclesiástica</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            Libro Diario de Caja
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-xl">
            Historial cronológico de movimientos financieros con filtros por culto, fecha y evidencias digitales en Cloudflare R2.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportarCSV}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-bold transition-all border border-slate-200"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
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

      {/* Barra de Filtros Apple HIG Inset Grouped */}
      <div className="no-print bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-4">
        
        {/* Controles de Búsqueda y Segmented Controls */}
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

          {/* Segmented Control de Tipo */}
          <div className="apple-segmented-group self-start sm:self-auto">
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
              <option value="pacto">Proyectos Pactados</option>
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
          <div className="text-slate-500 font-medium">
            Mostrando <strong>{transaccionesFiltradas.length}</strong> movimientos
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg font-bold text-xs">
              <span>Entradas:</span>
              <span>{formatearMoneda(totalIngresosFiltrados)}</span>
            </span>

            <span className="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-800 border border-rose-200/80 px-2.5 py-1 rounded-lg font-bold text-xs">
              <span>Gastos:</span>
              <span>{formatearMoneda(totalGastosFiltrados)}</span>
            </span>

            <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg font-black text-xs ${
              flujoNetoFiltrado >= 0 
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20' 
                : 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
            }`}>
              <span>Balance:</span>
              <span>{formatearMoneda(flujoNetoFiltrado)}</span>
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
                <th className="py-3 px-4">Fecha / Culto</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Categoría / Concepto</th>
                <th className="py-3 px-4">Hermano / Donante</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Evidencia R2</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="no-print py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transaccionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    No se encontraron transacciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                transaccionesFiltradas.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Fecha */}
                    <td className="py-3 px-4 whitespace-nowrap">
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
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        t.tipo === 'ingreso'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {t.tipo === 'ingreso' ? '+ Entrada' : '- Gasto'}
                      </span>
                    </td>

                    {/* Categoría & Concepto */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-xs block">{t.categoria}</span>
                      <span className="text-xs text-slate-600 block">{t.concepto}</span>
                      {t.proyecto_nombre && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          Proyecto: {t.proyecto_nombre}
                        </span>
                      )}
                    </td>

                    {/* Hermano */}
                    <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                      {t.miembro_nombre || <span className="text-slate-400 italic">Ofrenda Colectiva</span>}
                    </td>

                    {/* Método de Pago */}
                    <td className="py-3 px-4 text-xs capitalize text-slate-600 whitespace-nowrap">
                      {t.metodo_pago}
                    </td>

                    {/* Evidencia */}
                    <td className="py-3 px-4 whitespace-nowrap">
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
                    <td className={`py-3 px-4 text-right font-black text-sm whitespace-nowrap tabular-nums ${
                      t.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(t.monto)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
