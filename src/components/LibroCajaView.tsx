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
  FileCheck
} from 'lucide-react';
import { Transaccion } from '../types';
import { storageService } from '../services/storageService';
import { formatearMoneda, formatearFechaCorta, formatearFechaLarga } from '../utils/dateUtils';

interface LibroCajaProps {
  transacciones: Transaccion[];
  onTransaccionEliminada?: () => void;
  onVerEvidencia: (url: string, nombre?: string) => void;
}

export const LibroCajaView: React.FC<LibroCajaProps> = ({
  transacciones,
  onTransaccionEliminada,
  onVerEvidencia,
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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_flujo_caja_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Imprimir reporte pastoral oficial
  const imprimirReporte = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado Oculto en Impresión */}
      <div className="no-print bg-gradient-to-r from-slate-900 to-church-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Auditoría & Transparencia Eclesiástica</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Libro de Caja y Reportes</h2>
          <p className="text-slate-300 text-sm mt-0.5">
            Historial cronológico de todos los movimientos con filtros por culto, fecha y evidencias R2.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportarCSV}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={imprimirReporte}
            className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Informe Pastoral</span>
          </button>
        </div>
      </div>

      {/* MEMBRETE EXCLUSIVO PARA IMPRESIÓN OFICIAL (ESTADO FINANCIERO PASTORAL) */}
      <div className="hidden print:block p-4 border-b-2 border-slate-800 text-center space-y-1 mb-6">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-900">
          Iglesia Cristiana Evangélica
        </h1>
        <h2 className="text-base font-bold text-slate-700">Informe Oficial de Tesorería & Flujo de Efectivo</h2>
        <p className="text-xs text-slate-500">
          Fecha de Emisión: {formatearFechaLarga(new Date().toISOString().slice(0, 10))} • Cuentas Claras para la Gloria de Dios
        </p>
      </div>

      {/* Barra de Filtros (no-print) */}
      <div className="no-print bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por hermano, concepto o categoría..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-church-500"
            />
          </div>

          {/* Filtro Tipo */}
          <div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-church-500"
            >
              <option value="todos">Todos los Movimientos (+/-)</option>
              <option value="ingreso">Solo Ingresos / Entradas (+)</option>
              <option value="gasto">Solo Gastos / Egresos (-)</option>
            </select>
          </div>

          {/* Filtro Culto */}
          <div>
            <select
              value={filtroCulto}
              onChange={(e) => setFiltroCulto(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-church-500"
            >
              <option value="todos">Todos los Días de Culto</option>
              <option value="miercoles">Solo Cultos de Miércoles</option>
              <option value="domingo">Solo Cultos de Domingo</option>
            </select>
          </div>

          {/* Filtro Subtipo */}
          <div>
            <select
              value={filtroSubtipo}
              onChange={(e) => setFiltroSubtipo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-church-500"
            >
              <option value="todos">Todas las Clasificaciones</option>
              <option value="ofrenda">Ofrendas</option>
              <option value="diezmo">Diezmos</option>
              <option value="pacto">Proyectos Pactados</option>
            </select>
          </div>

        </div>

        {/* Resumen Rápido de Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="text-slate-500 font-medium">
            Mostrando <strong>{transaccionesFiltradas.length}</strong> movimientos
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-emerald-700 font-bold">
              Entradas: {formatearMoneda(totalIngresosFiltrados)}
            </span>
            <span className="text-rose-700 font-bold">
              Gastos: {formatearMoneda(totalGastosFiltrados)}
            </span>
            <span className={`font-extrabold px-2.5 py-1 rounded-md ${
              flujoNetoFiltrado >= 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
            }`}>
              Balance Neto: {formatearMoneda(flujoNetoFiltrado)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Fecha / Culto</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Categoría / Concepto</th>
                <th className="py-3 px-4">Hermano / Diezmante</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Evidencia R2</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="no-print py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transaccionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                    No se encontraron transacciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                transaccionesFiltradas.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Fecha */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800 block text-xs">{formatearFechaCorta(t.fecha)}</span>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        t.dia_semana === 'miercoles' 
                          ? 'bg-amber-100 text-amber-800'
                          : t.dia_semana === 'domingo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {t.dia_semana}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
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
                    <td className="py-3 px-4 text-xs font-medium text-slate-800">
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
                          className="inline-flex items-center space-x-1 text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-600" />
                          <span>Ver Evidencia</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin archivo</span>
                      )}
                    </td>

                    {/* Monto */}
                    <td className={`py-3 px-4 text-right font-extrabold text-sm whitespace-nowrap ${
                      t.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(t.monto)}
                    </td>

                    {/* Acción Eliminar */}
                    <td className="no-print py-3 px-3 text-right">
                      <button
                        onClick={() => handleEliminar(t.id, t.concepto)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
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

      {/* SECCIÓN DE FIRMAS PARA INFORME IMPRESO (print-only) */}
      <div className="hidden print:grid grid-cols-2 gap-12 pt-16 mt-12 border-t-2 border-slate-300 text-center">
        <div className="space-y-12">
          <div className="border-t border-slate-800 w-48 mx-auto" />
          <div>
            <p className="font-bold text-sm text-slate-900">Pastor Principal</p>
            <p className="text-xs text-slate-500">Visto Bueno & Supervisión Pastoral</p>
          </div>
        </div>

        <div className="space-y-12">
          <div className="border-t border-slate-800 w-48 mx-auto" />
          <div>
            <p className="font-bold text-sm text-slate-900">Tesorero / Administrador</p>
            <p className="text-xs text-slate-500">Rendición de Cuentas y Balances</p>
          </div>
        </div>
      </div>

    </div>
  );
};
