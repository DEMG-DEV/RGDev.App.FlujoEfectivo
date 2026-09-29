import React, { useState, useMemo, useEffect } from 'react';
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
  Check,
  HeartHandshake,
  Coins,
  Wallet,
  BookOpen
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
  // Asegurar que cuando el modal de reporte esté abierto, la app de fondo se oculte completamente al imprimir
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('reporte-modal-activo');
      return () => {
        document.body.classList.remove('reporte-modal-activo');
      };
    }
  }, [isOpen]);

  // Filtros de fecha
  const [periodo, setPeriodo] = useState<RangoPeriodo>('este_mes');
  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [fechaHasta, setFechaHasta] = useState<string>(() => getFechaHoy());

  // Secciones a incluir en la impresión
  const [incluirIngresos, setIncluirIngresos] = useState<boolean>(true);
  const [incluirGastos, setIncluirGastos] = useState<boolean>(true);
  const [incluirProyectos, setIncluirProyectos] = useState<boolean>(true);
  const [incluirLibroCaja, setIncluirLibroCaja] = useState<boolean>(false);

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

  // 1. Transacciones base de Caja General (excluyendo pactos y egresos internos de liquidación)
  const transaccionesBaseCaja = useMemo(() => {
    return transacciones.filter(t => {
      if (t.subtipo === 'pacto') return false;
      if (t.tipo === 'gasto' && t.categoria === 'Liquidación / Remanente de Proyecto') return false;
      return true;
    });
  }, [transacciones]);

  // 2. Mapa cronológico de saldo acumulado en Caja General (id -> saldo)
  const mapaSaldosCaja = useMemo(() => {
    const cronologicas = [...transaccionesBaseCaja].sort((a, b) => {
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
  }, [transaccionesBaseCaja]);

  // 3. Filtrar movimientos según el rango de fechas
  const transaccionesFiltradas = useMemo(() => {
    return transacciones.filter(t => {
      if (periodo === 'todo') return true;
      return t.fecha >= fechaDesde && t.fecha <= fechaHasta;
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [transacciones, periodo, fechaDesde, fechaHasta]);

  // Movimientos de Caja General en el período (Ofrendas, Diezmos y Gastos Operativos)
  const transaccionesCajaFiltradas = useMemo(() => {
    return transaccionesFiltradas.filter(t => {
      if (t.subtipo === 'pacto') return false;
      if (t.tipo === 'gasto' && t.categoria === 'Liquidación / Remanente de Proyecto') return false;
      return true;
    });
  }, [transaccionesFiltradas]);

  // Entradas de Caja General (Ofrendas y Diezmos)
  const entradasCaja = useMemo(() => {
    return transaccionesCajaFiltradas.filter(t => t.tipo === 'ingreso');
  }, [transaccionesCajaFiltradas]);

  // Gastos Operativos de Caja General
  const gastosCaja = useMemo(() => {
    return transaccionesCajaFiltradas.filter(t => t.tipo === 'gasto');
  }, [transaccionesCajaFiltradas]);

  // Aportes de Proyectos Pactados en el período
  const aportesPactosFiltrados = useMemo(() => {
    return transaccionesFiltradas.filter(t => t.tipo === 'ingreso' && t.subtipo === 'pacto');
  }, [transaccionesFiltradas]);

  // 4. Totales Contables alineados con Resumen y Caja General
  const totalEntradasCaja = useMemo(() => {
    return entradasCaja.reduce((acc, t) => acc + (t.monto || 0), 0);
  }, [entradasCaja]);

  const totalGastosCaja = useMemo(() => {
    return gastosCaja.reduce((acc, t) => acc + (t.monto || 0), 0);
  }, [gastosCaja]);

  // Balance Neto de Caja General (idéntico al Libro de Caja y al Resumen)
  const balanceNetoCaja = totalEntradasCaja - totalGastosCaja;

  // Desglose de Entradas de Caja
  const totalOfrendas = useMemo(() => {
    return entradasCaja.filter(t => t.subtipo === 'ofrenda').reduce((acc, t) => acc + t.monto, 0);
  }, [entradasCaja]);

  const totalDiezmos = useMemo(() => {
    return entradasCaja.filter(t => t.subtipo === 'diezmo').reduce((acc, t) => acc + t.monto, 0);
  }, [entradasCaja]);

  const totalOtrosIngresos = useMemo(() => {
    return entradasCaja.filter(t => t.subtipo !== 'ofrenda' && t.subtipo !== 'diezmo').reduce((acc, t) => acc + t.monto, 0);
  }, [entradasCaja]);

  const pctOfrendas = totalEntradasCaja > 0 ? Math.round((totalOfrendas / totalEntradasCaja) * 100) : 0;
  const pctDiezmos = totalEntradasCaja > 0 ? Math.round((totalDiezmos / totalEntradasCaja) * 100) : 0;

  // Recaudación por Cultos (regla estricta Miércoles vs Domingo sin conteo cruzado)
  const esMiercoles = (t: Transaccion) => t.dia_semana === 'miercoles' || t.tipo_culto === 'miercoles_general';
  const esDomingo = (t: Transaccion) => !esMiercoles(t) && (t.dia_semana === 'domingo' || t.tipo_culto === 'domingo_manana' || t.tipo_culto === 'domingo_tarde');

  const entradasMiercoles = useMemo(() => {
    return entradasCaja.filter(esMiercoles).reduce((acc, t) => acc + t.monto, 0);
  }, [entradasCaja]);

  const entradasDomingo = useMemo(() => {
    return entradasCaja.filter(esDomingo).reduce((acc, t) => acc + t.monto, 0);
  }, [entradasCaja]);

  // Totales de proyectos pactados
  const totalAportesPactosPeriodo = useMemo(() => {
    return aportesPactosFiltrados.reduce((acc, t) => acc + (t.monto || 0), 0);
  }, [aportesPactosFiltrados]);

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

  // Exportar a CSV completo y estructurado
  const exportarCSV = () => {
    const rows = [
      ['FOLIO', folioReporte],
      ['FECHA EMISION', fechaEmision.toLocaleString('es-MX')],
      ['PERIODO', periodo === 'todo' ? 'Todo el Historial' : `${fechaDesde} al ${fechaHasta}`],
      ['--- RESUMEN EJECUTIVO (ALINEADO A CAJA GENERAL Y RESUMEN) ---'],
      ['ENTRADAS CAJA GENERAL (OFRENDAS Y DIEZMOS)', totalEntradasCaja],
      ['TOTAL OFRENDAS', totalOfrendas],
      ['TOTAL DIEZMOS', totalDiezmos],
      ['TOTAL EGRESOS OPERATIVOS', totalGastosCaja],
      ['BALANCE NETO EN CAJA GENERAL', balanceNetoCaja],
      ['FONDO PROYECTOS PACTADOS (INDEPENDIENTE)', totalRecaudadoProyectos],
      ['APORTES A PROYECTOS EN PERIODO', totalAportesPactosPeriodo],
      ['RECAUDACION MIERCOLES GENERAL', entradasMiercoles],
      ['RECAUDACION DOMINGOS', entradasDomingo],
      [],
      ['--- DETALLE DE ENTRADAS A CAJA GENERAL ---'],
      ['Fecha', 'Culto', 'Clasificación', 'Miembro/Hermano', 'Concepto', 'Método', 'Monto'],
      ...entradasCaja.map(i => [
        i.fecha,
        i.dia_semana,
        i.subtipo || 'ofrenda',
        `"${(i.miembro_nombre || 'Ofrenda Colectiva').replace(/"/g, '""')}"`,
        `"${(i.concepto || '').replace(/"/g, '""')}"`,
        i.metodo_pago,
        i.monto
      ]),
      [],
      ['--- DETALLE DE EGRESOS & GASTOS OPERATIVOS ---'],
      ['Fecha', 'Categoría', 'Concepto/Proveedor', 'Método', 'Evidencia', 'Monto'],
      ...gastosCaja.map(g => [
        g.fecha,
        g.categoria,
        `"${(g.concepto || '').replace(/"/g, '""')}"`,
        g.metodo_pago,
        g.evidencia_url ? 'SI' : 'NO',
        g.monto
      ]),
      [],
      ['--- APORTES A PROYECTOS PACTADOS EN EL PERIODO ---'],
      ['Fecha', 'Proyecto', 'Hermano/Donante', 'Concepto', 'Método', 'Monto'],
      ...aportesPactosFiltrados.map(p => [
        p.fecha,
        `"${(p.proyecto_nombre || '').replace(/"/g, '""')}"`,
        `"${(p.miembro_nombre || '').replace(/"/g, '""')}"`,
        `"${(p.concepto || '').replace(/"/g, '""')}"`,
        p.metodo_pago,
        p.monto
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
    <div id="modal-reporte-financiero" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      
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
                Informe Financiero Eclesiástico Oficial
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Folio: {folioReporte} • Sincronizado con Resumen y Caja General
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

          {/* Toggles de Secciones a Imprimir */}
          <div className="flex items-center space-x-3 text-slate-600 font-medium">
            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incluirIngresos}
                onChange={(e) => setIncluirIngresos(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Entradas Caja</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incluirGastos}
                onChange={(e) => setIncluirGastos(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Gastos</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incluirProyectos}
                onChange={(e) => setIncluirProyectos(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Proyectos Pactados</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer select-none text-indigo-700 font-semibold">
              <input
                type="checkbox"
                checked={incluirLibroCaja}
                onChange={(e) => setIncluirLibroCaja(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              <span>Libro Diario con Saldos</span>
            </label>
          </div>

        </div>

        {/* CUERPO DEL INFORME OFICIAL (ÁREA IMPRIMIBLE / HOJA BLANCA) */}
        <div id="reporte-imprimible" className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
          
          {/* 1. ENCABEZADO INSTITUCIONAL / MEMBRETE DE HONOR */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6 print-break-inside-avoid break-inside-avoid">
            <div id="reporte-membrete-tabla" className="flex flex-col sm:flex-row print:flex-row sm:items-start print:items-start justify-between gap-4">
              
              <div id="reporte-membrete-col-izq" className="flex items-start space-x-3.5">
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
              <div id="reporte-membrete-col-der" className="text-left sm:text-right bg-slate-50 border border-slate-200 rounded-xl p-3 sm:min-w-[230px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Documento Oficial de Tesorería
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

          {/* 2. RESUMEN EJECUTIVO (4 TARJETAS ALINEADAS CON RESUMEN Y CAJA GENERAL) */}
          <div className="mb-6 print-break-inside-avoid break-inside-avoid">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Resumen Ejecutivo de Tesorería (Sincronizado con Caja General)</span>
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
              
              {/* Card 1: Entradas a Caja General */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span className="text-emerald-800 font-bold">Entradas Caja General</span>
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  +{formatearMoneda(totalEntradasCaja)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  Ofrendas: <strong className="text-emerald-700">{formatearMoneda(totalOfrendas)}</strong> • Diezmos: <strong className="text-indigo-700">{formatearMoneda(totalDiezmos)}</strong>
                </div>
                <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  {entradasCaja.length} ingresos operativos
                </div>
              </div>

              {/* Card 2: Total Egresos */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span className="text-rose-800 font-bold">Total Egresos</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  -{formatearMoneda(totalGastosCaja)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  Gastos de operación eclesiástica
                </div>
                <div className="text-[10px] text-rose-700 font-bold mt-0.5">
                  {gastosCaja.length} pagos realizados
                </div>
              </div>

              {/* Card 3: Fondo en Caja General */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                  <span>Balance Neto en Caja</span>
                  <span className={`w-2 h-2 rounded-full ${balanceNetoCaja >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                </div>
                <div className={`text-xl sm:text-2xl font-black tracking-tight ${balanceNetoCaja >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatearMoneda(balanceNetoCaja)}
                </div>
                <div className="text-[10px] text-slate-300 mt-1 font-medium">
                  {balanceNetoCaja >= 0 ? 'Superávit disponible' : 'Déficit del período'}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Idéntico al Libro de Caja General
                </div>
              </div>

              {/* Card 4: Fondo Proyectos Pactados */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span className="text-indigo-800 font-bold">Fondo Proyectos</span>
                  <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">
                  {formatearMoneda(totalRecaudadoProyectos)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  Meta global: <strong className="text-slate-800">{formatearMoneda(totalMetaProyectos)}</strong>
                </div>
                <div className="text-[10px] text-indigo-700 font-bold mt-0.5">
                  Fondo restringido independiente
                </div>
              </div>

            </div>

            {/* Franja Desglose Resumen General: Proporción y Cultos */}
            <div className="mt-3 bg-slate-50/80 border border-slate-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="border-r border-slate-200 pr-2">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Ofrendas</span>
                <span className="font-extrabold text-slate-900">{formatearMoneda(totalOfrendas)}</span>
                <span className="text-[10px] text-slate-500 block font-medium">{pctOfrendas}% de entradas caja</span>
              </div>
              <div className="border-r border-slate-200 pr-2">
                <span className="text-[10px] uppercase font-bold text-indigo-800 block">Diezmos</span>
                <span className="font-extrabold text-slate-900">{formatearMoneda(totalDiezmos)}</span>
                <span className="text-[10px] text-slate-500 block font-medium">{pctDiezmos}% de entradas caja</span>
              </div>
              <div className="border-r border-slate-200 pr-2">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Miércoles General</span>
                <span className="font-extrabold text-slate-900">{formatearMoneda(entradasMiercoles)}</span>
                <span className="text-[10px] text-slate-500 block font-medium">Cultos de estudio</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Domingos</span>
                <span className="font-extrabold text-slate-900">{formatearMoneda(entradasDomingo)}</span>
                <span className="text-[10px] text-slate-500 block font-medium">Cultos dominicales</span>
              </div>
            </div>

          </div>

          {/* 3. SECCIÓN 1: DETALLE DE ENTRADAS A CAJA GENERAL (OFRENDAS Y DIEZMOS) */}
          {incluirIngresos && (
            <div className="mb-8">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300 print-break-inside-avoid break-inside-avoid">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    1. Detalle Cronológico de Entradas de Caja General (Ofrendas & Diezmos)
                  </h3>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Subtotal: +{formatearMoneda(totalEntradasCaja)}
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
                    {entradasCaja.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                          No se registraron entradas de caja en el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      entradasCaja.map((i) => (
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
                        Total Entradas Caja ({entradasCaja.length} capturas):
                      </td>
                      <td className="py-2 px-2.5 text-right text-emerald-700 font-black text-xs">
                        +{formatearMoneda(totalEntradasCaja)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 4. SECCIÓN 2: DETALLE DE GASTOS OPERATIVOS */}
          {incluirGastos && (
            <div className="mb-8">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300 print-break-inside-avoid break-inside-avoid">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    2. Detalle Cronológico de Egresos & Gastos Operativos
                  </h3>
                </div>
                <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  Subtotal: -{formatearMoneda(totalGastosCaja)}
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
                    {gastosCaja.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                          No se registraron gastos en el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      gastosCaja.map((g) => (
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
                        Total Egresos ({gastosCaja.length} movimientos):
                      </td>
                      <td className="py-2 px-2.5 text-right text-rose-700 font-black text-xs">
                        -{formatearMoneda(totalGastosCaja)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 5. SECCIÓN 3: ESTADO DE PROYECTOS PACTADOS (FONDO INDEPENDIENTE) */}
          {incluirProyectos && (
            <div className="mb-8">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300 print-break-inside-avoid break-inside-avoid">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    3. Rendición y Estado de Proyectos Pactados (Fondo Independiente)
                  </h3>
                </div>
                <span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  Fondo Recaudado: {formatearMoneda(totalRecaudadoProyectos)}
                </span>
              </div>

              {/* Proyectos Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 print-break-inside-avoid break-inside-avoid">
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

              {/* Sub-tabla: Aportes Registrados a Proyectos en el Período */}
              {aportesPactosFiltrados.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-indigo-900 mb-1.5 flex items-center justify-between">
                    <span>Aportes Recaudados para Proyectos en este Período ({aportesPactosFiltrados.length} recibos):</span>
                    <span className="text-emerald-700 font-black text-xs">+{formatearMoneda(totalAportesPactosPeriodo)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 mb-4">
                      <thead className="bg-indigo-50 text-indigo-900 font-bold uppercase tracking-wider text-[10px] border-b border-indigo-200">
                        <tr>
                          <th className="py-1.5 px-2.5">Fecha</th>
                          <th className="py-1.5 px-2.5">Proyecto</th>
                          <th className="py-1.5 px-2.5">Hermano / Donante</th>
                          <th className="py-1.5 px-2.5">Concepto</th>
                          <th className="py-1.5 px-2.5">Método</th>
                          <th className="py-1.5 px-2.5 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {aportesPactosFiltrados.map((ap) => (
                          <tr key={ap.id} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5 whitespace-nowrap font-bold text-slate-900">
                              {formatearFechaCorta(ap.fecha)}
                            </td>
                            <td className="py-1.5 px-2.5 text-indigo-900 font-semibold">
                              {ap.proyecto_nombre || 'Proyecto Especial'}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-800 font-medium">
                              {ap.miembro_nombre}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600">
                              {ap.concepto}
                            </td>
                            <td className="py-1.5 px-2.5 capitalize text-slate-500">
                              {ap.metodo_pago}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-black text-emerald-700 whitespace-nowrap">
                              +{formatearMoneda(ap.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

          {/* 6. SECCIÓN 4 (OPCIONAL): LIBRO DIARIO DE CAJA GENERAL CON SALDO EN CADA MOVIMIENTO */}
          {incluirLibroCaja && (
            <div className="mb-8">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300 print-break-inside-avoid break-inside-avoid">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    4. Libro Diario de Caja General (Movimientos con Saldo en Caja)
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
                  Balance Cierre: {formatearMoneda(balanceNetoCaja)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Fecha</th>
                      <th className="py-2 px-2.5">Tipo</th>
                      <th className="py-2 px-2.5">Categoría / Concepto</th>
                      <th className="py-2 px-2.5">Hermano / Donante / Proveedor</th>
                      <th className="py-2 px-2.5">Método</th>
                      <th className="py-2 px-2.5 text-right">Monto</th>
                      <th className="py-2 px-2.5 text-right font-black">Saldo en Caja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {transaccionesCajaFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                          No se encontraron movimientos en Caja General para el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      transaccionesCajaFiltradas.map((t) => {
                        const saldoMov = mapaSaldosCaja.get(t.id) ?? 0;
                        return (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 whitespace-nowrap font-bold text-slate-900">
                              {formatearFechaCorta(t.fecha)}
                            </td>
                            <td className="py-2 px-2.5 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {t.tipo === 'ingreso' ? '+ Entrada' : '- Gasto'}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-slate-800">
                              <span className="font-semibold block">{t.categoria}</span>
                              <span className="text-slate-500 text-[11px] block">{t.concepto}</span>
                            </td>
                            <td className="py-2 px-2.5 text-slate-700">
                              {t.miembro_nombre || (t.tipo === 'ingreso' ? 'Ofrenda Colectiva' : 'Proveedor')}
                            </td>
                            <td className="py-2 px-2.5 whitespace-nowrap capitalize text-slate-500">
                              {t.metodo_pago}
                            </td>
                            <td className={`py-2 px-2.5 text-right font-bold whitespace-nowrap ${
                              t.tipo === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              {t.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(t.monto)}
                            </td>
                            <td className={`py-2 px-2.5 text-right font-black whitespace-nowrap ${
                              saldoMov >= 0 ? 'text-slate-950' : 'text-rose-600'
                            }`}>
                              {formatearMoneda(saldoMov)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="py-2 px-2.5 text-right uppercase text-[10px] text-slate-600">
                        Total Entradas: +{formatearMoneda(totalEntradasCaja)} | Total Gastos: -{formatearMoneda(totalGastosCaja)}
                      </td>
                      <td className="py-2 px-2.5 text-right text-xs uppercase font-extrabold text-slate-800">
                        Saldo:
                      </td>
                      <td className={`py-2 px-2.5 text-right font-black text-xs ${
                        balanceNetoCaja >= 0 ? 'text-slate-950' : 'text-rose-600'
                      }`}>
                        {formatearMoneda(balanceNetoCaja)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 7. SECCIÓN CERTIFICACIÓN Y FIRMAS OFICIALES DE TESORERÍA */}
          <div className="pt-8 mt-6 border-t-2 border-slate-900 print-break-inside-avoid">
            
            <p className="text-[11px] text-slate-600 text-center italic mb-10 max-w-2xl mx-auto">
              "Damos testimonio y fe de que los fondos detallados en el presente informe financiero corresponden fielmente a los ingresos recibidos en caja general, los gastos efectuados con sus correspondientes comprobantes, y los proyectos pactados bajo mayordomía eclesiástica."
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
