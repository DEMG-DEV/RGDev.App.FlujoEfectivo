import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Filter, 
  Landmark, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShieldCheck,
  Building,
  UserCheck,
  Check
} from 'lucide-react';
import { Transaccion, ProyectoPactado, PactoMiembro } from '../types';
import { formatearMoneda, formatearFechaCorta, formatearFechaLarga, getFechaHoy } from '../utils/dateUtils';

interface ReporteFinancieroModalProps {
  isOpen: boolean;
  onClose: () => void;
  transacciones: Transaccion[];
  proyectos: ProyectoPactado[];
  pactos: PactoMiembro[];
}

type RangoPeriodo = 'todo' | 'este_mes' | 'mes_anterior' | 'este_ano' | 'personalizado';

export const ReporteFinancieroModal: React.FC<ReporteFinancieroModalProps> = ({
  isOpen,
  onClose,
  transacciones,
  proyectos,
  pactos
}) => {
  // Filtros de fecha
  const [periodo, setPeriodo] = useState<RangoPeriodo>('este_mes');
  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [fechaHasta, setFechaHasta] = useState<string>(() => getFechaHoy());

  // Secciones a incluir
  const [incluirIngresos, setIncluirIngresos] = useState<boolean>(true);
  const [incluirGastos, setIncluirGastos] = useState<boolean>(true);
  const [incluirProyectos, setIncluirProyectos] = useState<boolean>(true);

  // Fecha y folio de emisión
  const fechaEmision = useMemo(() => new Date(), []);
  const folioReporte = useMemo(() => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TES-${fechaEmision.getFullYear()}${(fechaEmision.getMonth() + 1).toString().padStart(2, '0')}-${rand}`;
  }, [fechaEmision]);

  // Manejo de cambio de periodo rápido
  const handleCambioPeriodo = (nuevo: RangoPeriodo) => {
    setPeriodo(nuevo);
    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);

    if (nuevo === 'este_mes') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
      setFechaDesde(inicio);
      setFechaHasta(hoyStr);
    } else if (nuevo === 'mes_anterior') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().slice(0, 10);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString().slice(0, 10);
      setFechaDesde(inicio);
      setFechaHasta(fin);
    } else if (nuevo === 'este_ano') {
      const inicio = `${hoy.getFullYear()}-01-01`;
      setFechaDesde(inicio);
      setFechaHasta(hoyStr);
    } else if (nuevo === 'todo') {
      setFechaDesde('2000-01-01');
      setFechaHasta('2099-12-31');
    }
  };

  // Filtrar movimientos según el rango de fechas
  const transaccionesFiltradas = useMemo(() => {
    return transacciones.filter(t => {
      if (periodo === 'todo') return true;
      return t.fecha >= fechaDesde && t.fecha <= fechaHasta;
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [transacciones, periodo, fechaDesde, fechaHasta]);

  const ingresosFiltrados = useMemo(() => {
    return transaccionesFiltradas.filter(t => t.tipo === 'ingreso');
  }, [transaccionesFiltradas]);

  const gastosFiltrados = useMemo(() => {
    return transaccionesFiltradas.filter(t => t.tipo === 'gasto');
  }, [transaccionesFiltradas]);

  // Totales
  const totalIngresos = useMemo(() => {
    return ingresosFiltrados.reduce((acc, t) => acc + (t.monto || 0), 0);
  }, [ingresosFiltrados]);

  const totalGastos = useMemo(() => {
    return gastosFiltrados.reduce((acc, t) => acc + (t.monto || 0), 0);
  }, [gastosFiltrados]);

  const balanceNeto = totalIngresos - totalGastos;

  // Totales de proyectos
  const totalMetaProyectos = useMemo(() => {
    return proyectos.reduce((acc, p) => acc + (p.meta_total || 0), 0);
  }, [proyectos]);

  const totalRecaudadoProyectos = useMemo(() => {
    return proyectos.reduce((acc, p) => acc + (p.total_recaudado || 0), 0);
  }, [proyectos]);

  const totalPactadoMiembros = useMemo(() => {
    return pactos.reduce((acc, p) => acc + (p.monto_total_pactado || 0), 0);
  }, [pactos]);

  const totalAportadoMiembros = useMemo(() => {
    return pactos.reduce((acc, p) => acc + (p.total_aportado || 0), 0);
  }, [pactos]);

  // Disparar diálogo nativo de impresión / Guardar como PDF
  const handleImprimir = () => {
    window.print();
  };

  // Exportar a CSV completo
  const exportarCSV = () => {
    const rows = [
      ['FOLIO', folioReporte],
      ['FECHA EMISION', fechaEmision.toLocaleString('es-MX')],
      ['PERIODO', periodo === 'todo' ? 'Todo el Historial' : `${fechaDesde} al ${fechaHasta}`],
      ['TOTAL INGRESOS', totalIngresos],
      ['TOTAL GASTOS', totalGastos],
      ['BALANCE NETO', balanceNeto],
      [],
      ['--- DETALLE DE ENTRADAS / INGRESOS ---'],
      ['Fecha', 'Culto', 'Clasificación', 'Miembro/Hermano', 'Concepto', 'Método', 'Monto'],
      ...ingresosFiltrados.map(i => [
        i.fecha,
        i.dia_semana,
        i.subtipo || 'ingreso',
        `"${(i.miembro_nombre || 'Ofrenda Colectiva').replace(/"/g, '""')}"`,
        `"${(i.concepto || '').replace(/"/g, '""')}"`,
        i.metodo_pago,
        i.monto
      ]),
      [],
      ['--- DETALLE DE SALIDAS / GASTOS ---'],
      ['Fecha', 'Categoría', 'Concepto/Proveedor', 'Método', 'Evidencia', 'Monto'],
      ...gastosFiltrados.map(g => [
        g.fecha,
        g.categoria,
        `"${(g.concepto || '').replace(/"/g, '""')}"`,
        g.metodo_pago,
        g.evidencia_url ? 'SI' : 'NO',
        g.monto
      ]),
      [],
      ['--- ESTADO DE PROYECTOS PACTADOS ---'],
      ['Proyecto', 'Meta Total', 'Total Recaudado', 'Saldo Restante', '% Avance'],
      ...proyectos.map(p => [
        `"${p.nombre.replace(/"/g, '""')}"`,
        p.meta_total,
        p.total_recaudado,
        Math.max(0, p.meta_total - p.total_recaudado),
        `${Math.min(100, Math.round((p.total_recaudado / (p.meta_total || 1)) * 100))}%`
      ]),
      [],
      ['--- DETALLE DE HERMANOS PACTANTES ---'],
      ['Hermano/a', 'Proyecto', 'Pactado Total', 'Cuota Semanal', 'Total Aportado', 'Saldo Pendiente', 'Estado'],
      ...pactos.map(pct => [
        `"${pct.miembro_nombre.replace(/"/g, '""')}"`,
        `"${pct.proyecto_nombre.replace(/"/g, '""')}"`,
        pct.monto_total_pactado,
        pct.cuota_semanal,
        pct.total_aportado,
        pct.saldo_pendiente,
        pct.estado
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_financiero_oficial_${fechaEmision.toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Ventana Modal / Contenedor de Hoja */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:h-auto print:shadow-none print:border-none print:rounded-none">
        
        {/* Barra Superior de Control Apple HIG (no-print) */}
        <div className="no-print bg-[#F9F9FB] border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-none">
                Informe Financiero Eclesiástico
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Folio: {folioReporte} • Vista previa de impresión PDF
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportarCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              title="Descargar datos en CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={handleImprimir}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors ml-1"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros Rápida Apple HIG (no-print) */}
        <div className="no-print bg-white px-5 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Segmented Control de Período */}
          <div className="apple-segmented-group">
            <button
              onClick={() => handleCambioPeriodo('este_mes')}
              className={`apple-segmented-item px-3 py-1 text-xs ${periodo === 'este_mes' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Este Mes
            </button>
            <button
              onClick={() => handleCambioPeriodo('mes_anterior')}
              className={`apple-segmented-item px-3 py-1 text-xs ${periodo === 'mes_anterior' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Mes Anterior
            </button>
            <button
              onClick={() => handleCambioPeriodo('este_ano')}
              className={`apple-segmented-item px-3 py-1 text-xs ${periodo === 'este_ano' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Año en Curso
            </button>
            <button
              onClick={() => handleCambioPeriodo('todo')}
              className={`apple-segmented-item px-3 py-1 text-xs ${periodo === 'todo' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Histórico
            </button>
            <button
              onClick={() => setPeriodo('personalizado')}
              className={`apple-segmented-item px-3 py-1 text-xs ${periodo === 'personalizado' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Personalizado
            </button>
          </div>

          {/* Fechas personalizadas si está activo */}
          {periodo === 'personalizado' && (
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500">Del:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-2 py-0.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
              />
              <span className="text-[11px] font-bold text-slate-500">Al:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-2 py-0.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
              />
            </div>
          )}

          {/* Toggles de Secciones */}
          <div className="flex items-center space-x-3 text-slate-600">
            <label className="flex items-center space-x-1.5 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={incluirIngresos}
                onChange={(e) => setIncluirIngresos(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Entradas</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={incluirGastos}
                onChange={(e) => setIncluirGastos(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Gastos</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={incluirProyectos}
                onChange={(e) => setIncluirProyectos(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Pactos</span>
            </label>
          </div>

        </div>

        {/* CUERPO DEL INFORME OFICIAL (ÁREA IMPRIMIBLE / HOJA BLANCA) */}
        <div id="reporte-imprimible" className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
          
          {/* 1. ENCABEZADO INSTITUCIONAL / MEMBRETE DE HONOR */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              
              <div className="flex items-start space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                  <Landmark className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950">
                    Iglesia Cristiana Evangélica
                  </h1>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Departamento de Tesorería, Finanzas & Mayordomía
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    "Cuentas claras y transparentes para la edificación de la obra de Dios" (2 Corintios 8:21)
                  </p>
                </div>
              </div>

              {/* Caja de Folio y Fecha */}
              <div className="text-left sm:text-right bg-slate-50 border border-slate-200 rounded-xl p-3 sm:min-w-[220px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Documento Oficial
                </div>
                <div className="text-sm font-extrabold text-blue-700 tracking-tight">
                  {folioReporte}
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-1">
                  <strong>Emisión:</strong> {formatearFechaLarga(fechaEmision.toISOString().slice(0, 10))}
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  <strong>Período:</strong> {periodo === 'todo' ? 'Historial Acumulado' : `${formatearFechaCorta(fechaDesde)} al ${formatearFechaCorta(fechaHasta)}`}
                </div>
              </div>

            </div>
          </div>

          {/* 2. RESUMEN EJECUTIVO (4 TARJETAS ESTILO APPLE HIG FINANCES) */}
          <div className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Resumen Ejecutivo de Tesorería</span>
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
              
              {/* Entradas */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span>Total Entradas</span>
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {formatearMoneda(totalIngresos)}
                </div>
                <div className="text-[10px] text-emerald-700 font-bold mt-1">
                  {ingresosFiltrados.length} movimientos
                </div>
              </div>

              {/* Salidas */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span>Total Egresos</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {formatearMoneda(totalGastos)}
                </div>
                <div className="text-[10px] text-rose-700 font-bold mt-1">
                  {gastosFiltrados.length} pagos realizados
                </div>
              </div>

              {/* Balance */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                  <span>Balance Neto en Caja</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className={`text-xl sm:text-2xl font-black tracking-tight ${balanceNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatearMoneda(balanceNeto)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {balanceNeto >= 0 ? 'Superávit disponible' : 'Déficit del período'}
                </div>
              </div>

              {/* Fondo Proyectos */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span>Proyectos Pactados</span>
                  <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">
                  {formatearMoneda(totalRecaudadoProyectos)}
                </div>
                <div className="text-[10px] text-indigo-700 font-bold mt-1">
                  Meta: {formatearMoneda(totalMetaProyectos)}
                </div>
              </div>

            </div>
          </div>

          {/* 3. SECCIÓN 1: DETALLE DE ENTRADAS (¿QUÉ INGRESA Y CUÁNDO?) */}
          {incluirIngresos && (
            <div className="mb-8 print-break-inside-avoid">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    1. Detalle Cronológico de Entradas & Ingresos
                  </h3>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Subtotal: {formatearMoneda(totalIngresos)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Fecha</th>
                      <th className="py-2 px-2.5">Culto / Servicio</th>
                      <th className="py-2 px-2.5">Clasificación</th>
                      <th className="py-2 px-2.5">Hermano / Donante</th>
                      <th className="py-2 px-2.5">Concepto / Destino</th>
                      <th className="py-2 px-2.5">Método</th>
                      <th className="py-2 px-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ingresosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                          No se registraron ingresos en el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      ingresosFiltrados.map((i) => (
                        <tr key={i.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2.5 whitespace-nowrap font-bold text-slate-900">
                            {formatearFechaCorta(i.fecha)}
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap capitalize text-slate-600">
                            {i.dia_semana === 'miercoles' ? 'Miércoles General' : i.dia_semana === 'domingo' ? 'Domingo' : 'Especial'}
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              i.subtipo === 'diezmo' 
                                ? 'bg-indigo-100 text-indigo-800' 
                                : i.subtipo === 'pacto' 
                                  ? 'bg-amber-100 text-amber-900' 
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {i.subtipo || 'Ofrenda'}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-slate-800">
                            {i.miembro_nombre || <span className="text-slate-400 italic">Ofrenda Colectiva</span>}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600">
                            {i.concepto}
                            {i.proyecto_nombre && (
                              <span className="block text-[10px] font-bold text-indigo-700">
                                Proy: {i.proyecto_nombre}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap capitalize text-slate-500">
                            {i.metodo_pago}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                            +{formatearMoneda(i.monto)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={6} className="py-2 px-2.5 text-right uppercase text-[10px] text-slate-600">
                        Total Entradas ({ingresosFiltrados.length} capturas):
                      </td>
                      <td className="py-2 px-2.5 text-right text-emerald-700 font-black text-xs">
                        +{formatearMoneda(totalIngresos)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 4. SECCIÓN 2: DETALLE DE GASTOS (¿EN QUÉ SALE Y CUÁNDO?) */}
          {incluirGastos && (
            <div className="mb-8 print-break-inside-avoid">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    2. Detalle Cronológico de Egresos & Gastos Operativos
                  </h3>
                </div>
                <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  Subtotal: {formatearMoneda(totalGastos)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Fecha</th>
                      <th className="py-2 px-2.5">Categoría Operativa</th>
                      <th className="py-2 px-2.5">Concepto / Proveedor / Motivo</th>
                      <th className="py-2 px-2.5">Método</th>
                      <th className="py-2 px-2.5">Evidencia</th>
                      <th className="py-2 px-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {gastosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                          No se registraron gastos en el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      gastosFiltrados.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2.5 whitespace-nowrap font-bold text-slate-900">
                            {formatearFechaCorta(g.fecha)}
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap font-semibold text-slate-700">
                            {g.categoria}
                          </td>
                          <td className="py-2 px-2.5 text-slate-800">
                            {g.concepto}
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap capitalize text-slate-500">
                            {g.metodo_pago}
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap text-[10px]">
                            {g.evidencia_url ? (
                              <span className="font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                                Respaldada en R2
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Sin archivo</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-rose-700 whitespace-nowrap">
                            -{formatearMoneda(g.monto)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="py-2 px-2.5 text-right uppercase text-[10px] text-slate-600">
                        Total Egresos ({gastosFiltrados.length} movimientos):
                      </td>
                      <td className="py-2 px-2.5 text-right text-rose-700 font-black text-xs">
                        -{formatearMoneda(totalGastos)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 5. SECCIÓN 3: ESTADO DE PROYECTOS PACTADOS */}
          {incluirProyectos && (
            <div className="mb-8 print-break-inside-avoid">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    3. Rendición y Estado de Proyectos Pactados
                  </h3>
                </div>
                <span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  Fondo Recaudado: {formatearMoneda(totalRecaudadoProyectos)}
                </span>
              </div>

              {/* Proyectos Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {proyectos.map(p => {
                  const pct = Math.min(100, Math.round((p.total_recaudado / (p.meta_total || 1)) * 100));
                  const saldoRestante = Math.max(0, p.meta_total - p.total_recaudado);
                  return (
                    <div key={p.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-extrabold text-xs text-slate-900">{p.nombre}</span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                          {pct}% cumplido
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="grid grid-cols-3 text-[10px] text-slate-600 font-medium">
                        <div>Meta: <strong className="text-slate-900">{formatearMoneda(p.meta_total)}</strong></div>
                        <div>Recaudado: <strong className="text-emerald-700">{formatearMoneda(p.total_recaudado)}</strong></div>
                        <div>Restante: <strong className="text-rose-700">{formatearMoneda(saldoRestante)}</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detalle Individual de Hermanos Pactantes */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Hermano / Pactante</th>
                      <th className="py-2 px-2.5">Proyecto Asignado</th>
                      <th className="py-2 px-2.5 text-right">Compromiso Total</th>
                      <th className="py-2 px-2.5 text-right">Cuota Semanal</th>
                      <th className="py-2 px-2.5 text-right">Total Aportado</th>
                      <th className="py-2 px-2.5 text-right">Saldo Pendiente</th>
                      <th className="py-2 px-2.5 text-center">Avance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pactos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                          No hay pactantes registrados en el sistema.
                        </td>
                      </tr>
                    ) : (
                      pactos.map((pct) => {
                        const porcentaje = Math.min(100, Math.round(((pct.total_aportado || 0) / (pct.monto_total_pactado || 1)) * 100));
                        return (
                          <tr key={pct.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 font-bold text-slate-900 whitespace-nowrap">
                              {pct.miembro_nombre}
                            </td>
                            <td className="py-2 px-2.5 text-indigo-900 font-semibold">
                              {pct.proyecto_nombre}
                            </td>
                            <td className="py-2 px-2.5 text-right font-medium text-slate-700 whitespace-nowrap">
                              {formatearMoneda(pct.monto_total_pactado)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-medium text-slate-600 whitespace-nowrap">
                              {formatearMoneda(pct.cuota_semanal)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                              {formatearMoneda(pct.total_aportado)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-rose-700 whitespace-nowrap">
                              {formatearMoneda(pct.saldo_pendiente)}
                            </td>
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                porcentaje >= 100 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : porcentaje >= 50 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-amber-100 text-amber-800'
                              }`}>
                                {porcentaje}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-2 px-2.5 text-right uppercase text-[10px] text-slate-600">
                        Totales Pactos ({pactos.length} hermanos):
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-900 font-black text-xs">
                        {formatearMoneda(totalPactadoMiembros)}
                      </td>
                      <td className="py-2 px-2.5"></td>
                      <td className="py-2 px-2.5 text-right text-emerald-700 font-black text-xs">
                        {formatearMoneda(totalAportadoMiembros)}
                      </td>
                      <td className="py-2 px-2.5 text-right text-rose-700 font-black text-xs">
                        {formatearMoneda(Math.max(0, totalPactadoMiembros - totalAportadoMiembros))}
                      </td>
                      <td className="py-2 px-2.5"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 6. SECCIÓN 4: CERTIFICACIÓN Y FIRMAS OFICIALES DE TESORERÍA */}
          <div className="pt-8 mt-6 border-t-2 border-slate-900 print-break-inside-avoid">
            
            <p className="text-[11px] text-slate-600 text-center italic mb-10 max-w-2xl mx-auto">
              "Damos testimonio y fe de que los fondos detallados en el presente informe financiero corresponden fielmente a los ingresos recibidos, los gastos efectuados con sus correspondientes comprobantes, y los proyectos pactados bajo mayordomía eclesiástica."
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              
              {/* Pastor Principal */}
              <div className="space-y-1">
                <div className="border-t border-slate-900 w-44 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-950 uppercase tracking-tight">Pastor Principal</p>
                <p className="text-[10px] text-slate-500">Supervisión & Aprobación Ministerial</p>
              </div>

              {/* Tesorero General */}
              <div className="space-y-1">
                <div className="border-t border-slate-900 w-44 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-950 uppercase tracking-tight">Tesorero General</p>
                <p className="text-[10px] text-slate-500">Elaboración & Control de Fondos</p>
              </div>

              {/* Revisor de Cuentas */}
              <div className="space-y-1">
                <div className="border-t border-slate-900 w-44 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-950 uppercase tracking-tight">Comité de Auditoría</p>
                <p className="text-[10px] text-slate-500">Revisor Fiscal & Verificación</p>
              </div>

            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              Documento Oficial emitido por el Sistema RGDev Flujo de Efectivo • Sello de Integridad Digital • Aiven PostgreSQL & Cloudflare R2
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
