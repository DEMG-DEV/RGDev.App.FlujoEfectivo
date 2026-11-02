import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  Coins, 
  HeartHandshake, 
  Landmark, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  ChevronRight,
  ShieldCheck, 
  CheckCircle2, 
  BarChart3, 
  PieChart, 
  Activity, 
  Sparkles,
  Layers,
  ArrowRight,
  HelpCircle,
  Receipt
} from 'lucide-react';
import { ResumenFinanciero, Transaccion, ProyectoPactado, SubtipoIngreso } from '../types';
import { formatearMoneda, formatearFechaCorta } from '../utils/dateUtils';

interface DashboardViewProps {
  resumen: ResumenFinanciero;
  transacciones: Transaccion[];
  proyectos: ProyectoPactado[];
  onIrACaptura: (tipoCulto?: 'miercoles_general' | 'domingo_manana', subtipo?: SubtipoIngreso) => void;
  onIrAGastos: () => void;
  onIrAPactos: () => void;
  onIrALibroCaja: () => void;
  onVerEvidencia?: (url: string, nombre?: string) => void;
  onAbrirReportePDF?: () => void;
}

interface MesEstadistica {
  mesClave: string; // YYYY-MM
  nombreMes: string;
  ingresos: number;
  gastos: number;
  neto: number;
  totalMovimientos: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  resumen,
  transacciones,
  proyectos,
  onIrACaptura,
  onIrAGastos,
  onIrAPactos,
  onIrALibroCaja,
  onVerEvidencia,
  onAbrirReportePDF
}) => {
  // Estado para interactividad en gráficos Apple
  const [segmentoActivoDonut, setSegmentoActivoDonut] = useState<string | null>(null);
  const [mesHover, setMesHover] = useState<MesEstadistica | null>(null);
  const [mostrarAyudaCaja, setMostrarAyudaCaja] = useState<boolean>(false);

  // Cálculos consolidados y métricas principales
  const {
    saldoCajaReal,
    saldoConsolidadoTotal,
    entradasCaja,
    totalOfrendas,
    totalDiezmos,
    totalProyectos,
    totalEntradas,
    totalGastos,
    pctOfrendas,
    pctDiezmos,
    pctProyectos,
    totalMiercoles,
    ofrendasMiercoles,
    diezmosMiercoles,
    proyectosMiercoles,
    pctMiercoles,
    totalDomingo,
    ofrendasDomingo,
    diezmosDomingo,
    proyectosDomingo,
    pctDomingo,
    datosMensuales
  } = useMemo(() => {
    const ofrendas = resumen.totalOfrendas || 0;
    const diezmos = resumen.totalDiezmos || 0;
    const proyectosRec = Math.max(resumen.totalPactos || 0, resumen.totalProyectosRecaudado || 0);
    const entradas = resumen.totalIngresos || (ofrendas + diezmos + proyectosRec);
    const entradasCaja = ofrendas + diezmos + (resumen.totalOtrosIngresos || 0);
    const gastos = resumen.totalGastos || 0;
    const saldoCajaReal = resumen.saldoCaja !== undefined ? resumen.saldoCaja : (entradasCaja - gastos);
    const saldoConsolidadoTotal = resumen.saldoConsolidado !== undefined ? resumen.saldoConsolidado : (entradas - gastos);

    const pctOf = entradas > 0 ? Math.round((ofrendas / entradas) * 100) : 0;
    const pctDi = entradas > 0 ? Math.round((diezmos / entradas) * 100) : 0;
    const pctPr = entradas > 0 ? Math.min(100, Math.max(0, 100 - pctOf - pctDi)) : 0;

    // Clasificación de transacciones por culto
    const txIngresos = transacciones.filter(t => t.tipo === 'ingreso');
    const esMiercoles = (t: Transaccion) => t.dia_semana === 'miercoles' || t.tipo_culto === 'miercoles_general';
    const esDomingo = (t: Transaccion) => !esMiercoles(t) && (t.dia_semana === 'domingo' || t.tipo_culto === 'domingo_manana' || t.tipo_culto === 'domingo_tarde');

    // Miércoles
    const txMiercoles = txIngresos.filter(esMiercoles);
    const ofMiercoles = txMiercoles.filter(t => t.subtipo === 'ofrenda').reduce((acc, t) => acc + t.monto, 0);
    const diMiercoles = txMiercoles.filter(t => t.subtipo === 'diezmo').reduce((acc, t) => acc + t.monto, 0);
    const prMiercoles = txMiercoles.filter(t => t.subtipo === 'pacto').reduce((acc, t) => acc + t.monto, 0);
    const totMiercoles = ofMiercoles + diMiercoles + prMiercoles;

    // Domingo
    const txDomingo = txIngresos.filter(esDomingo);
    const ofDomingo = txDomingo.filter(t => t.subtipo === 'ofrenda').reduce((acc, t) => acc + t.monto, 0);
    const diDomingo = txDomingo.filter(t => t.subtipo === 'diezmo').reduce((acc, t) => acc + t.monto, 0);
    const prDomingo = txDomingo.filter(t => t.subtipo === 'pacto').reduce((acc, t) => acc + t.monto, 0);
    const totDomingo = ofDomingo + diDomingo + prDomingo;

    const pctMi = entradas > 0 ? Math.round((totMiercoles / entradas) * 100) : 0;
    const pctDo = entradas > 0 ? Math.round((totDomingo / entradas) * 100) : 0;

    // Agrupación de datos mensuales para la Gráfica de Barras
    const mapaMeses = new Map<string, { ingresos: number; gastos: number; count: number }>();
    
    transacciones.forEach(t => {
      const mesClave = t.fecha ? t.fecha.slice(0, 7) : new Date().toISOString().slice(0, 7);
      if (!mapaMeses.has(mesClave)) {
        mapaMeses.set(mesClave, { ingresos: 0, gastos: 0, count: 0 });
      }
      const data = mapaMeses.get(mesClave)!;
      if (t.tipo === 'ingreso') {
        data.ingresos += t.monto;
      } else {
        data.gastos += t.monto;
      }
      data.count += 1;
    });

    const nombresMeses: Record<string, string> = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };

    const clavesOrdenadas = Array.from(mapaMeses.keys()).sort();
    const datosMensuales: MesEstadistica[] = clavesOrdenadas.map(clave => {
      const [year, mesNum] = clave.split('-');
      const nombreMes = `${nombresMeses[mesNum] || mesNum} ${year}`;
      const item = mapaMeses.get(clave)!;
      return {
        mesClave: clave,
        nombreMes,
        ingresos: item.ingresos,
        gastos: item.gastos,
        neto: item.ingresos - item.gastos,
        totalMovimientos: item.count
      };
    });

    return {
      saldoCajaReal,
      saldoConsolidadoTotal,
      entradasCaja,
      totalOfrendas: ofrendas,
      totalDiezmos: diezmos,
      totalProyectos: proyectosRec,
      totalEntradas: entradas,
      totalGastos: gastos,
      pctOfrendas: pctOf,
      pctDiezmos: pctDi,
      pctProyectos: pctPr,
      totalMiercoles: totMiercoles > 0 ? totMiercoles : (resumen.ingresosMiercoles || 0),
      ofrendasMiercoles: ofMiercoles,
      diezmosMiercoles: diMiercoles,
      proyectosMiercoles: prMiercoles,
      pctMiercoles: pctMi,
      totalDomingo: totDomingo > 0 ? totDomingo : (resumen.ingresosDomingo || 0),
      ofrendasDomingo: ofDomingo,
      diezmosDomingo: diDomingo,
      proyectosDomingo: prDomingo,
      pctDomingo: pctDo,
      datosMensuales
    };
  }, [resumen, transacciones]);

  // Dimensiones para Apple Donut Ring
  const radioDonut = 52;
  const perimetroDonut = 2 * Math.PI * radioDonut;
  
  // Segmentos del Donut Apple HIG con separación real sin colisiones
  const segmentosDonut = useMemo(() => {
    if (totalEntradas === 0) return [];
    
    const items = [
      {
        id: 'diezmos',
        nombre: 'Diezmos',
        monto: totalDiezmos,
        porcentaje: pctDiezmos,
        ratio: totalEntradas > 0 ? totalDiezmos / totalEntradas : 0,
        color: '#6366F1',
        gradId: 'grad-diezmos',
        colorHover: '#4F46E5',
        colorBg: 'bg-indigo-50/80',
        colorBorder: 'border-indigo-200/80',
        colorText: 'text-indigo-600',
        colorBadge: 'bg-indigo-100/80 text-indigo-800',
        subtitulo: 'Fidelidad congregacional',
        icon: Coins
      },
      {
        id: 'ofrendas',
        nombre: 'Ofrendas',
        monto: totalOfrendas,
        porcentaje: pctOfrendas,
        ratio: totalEntradas > 0 ? totalOfrendas / totalEntradas : 0,
        color: '#10B981',
        gradId: 'grad-ofrendas',
        colorHover: '#059669',
        colorBg: 'bg-emerald-50/80',
        colorBorder: 'border-emerald-200/80',
        colorText: 'text-emerald-600',
        colorBadge: 'bg-emerald-100/80 text-emerald-800',
        subtitulo: 'Cultos y canastas generales',
        icon: Wallet
      },
      {
        id: 'proyectos',
        nombre: 'Proyectos',
        monto: totalProyectos,
        porcentaje: pctProyectos,
        ratio: totalEntradas > 0 ? totalProyectos / totalEntradas : 0,
        color: '#F59E0B',
        gradId: 'grad-proyectos',
        colorHover: '#D97706',
        colorBg: 'bg-amber-50/80',
        colorBorder: 'border-amber-200/80',
        colorText: 'text-amber-600',
        colorBadge: 'bg-amber-100/80 text-amber-800',
        subtitulo: 'Fondos asignados con propósito',
        icon: Landmark
      }
    ];

    let acumulado = 0;
    const gap = totalEntradas > 0 ? 9 : 0; // Separación nítida entre segmentos circulares

    return items.map((item) => {
      const arcLength = item.ratio * perimetroDonut;
      const dashLength = item.ratio > 0.04 ? Math.max(2, arcLength - gap) : (item.ratio > 0 ? arcLength : 0);
      const offset = -acumulado;
      acumulado += arcLength;

      return {
        ...item,
        dash: `${dashLength} ${Math.max(0, perimetroDonut - dashLength)}`,
        offset: offset
      };
    });
  }, [totalEntradas, totalOfrendas, totalDiezmos, totalProyectos, pctOfrendas, pctDiezmos, pctProyectos, perimetroDonut]);

  // Detalle central dinámico del Donut Apple
  const detalleCentroDonut = useMemo(() => {
    if (!segmentoActivoDonut) {
      return {
        titulo: 'Total Captado',
        monto: formatearMoneda(totalEntradas),
        sub: '100% de entradas',
        icon: Sparkles,
        colorBg: 'bg-slate-100 text-slate-700'
      };
    }
    const seg = segmentosDonut.find(s => s.id === segmentoActivoDonut);
    if (!seg) {
      return {
        titulo: 'Total Captado',
        monto: formatearMoneda(totalEntradas),
        sub: '100% de entradas',
        icon: Sparkles,
        colorBg: 'bg-slate-100 text-slate-700'
      };
    }
    return {
      titulo: seg.nombre,
      monto: formatearMoneda(seg.monto),
      sub: `${seg.porcentaje}% del total general`,
      icon: seg.icon,
      colorBg: `${seg.colorBg} ${seg.colorText}`
    };
  }, [segmentoActivoDonut, totalEntradas, segmentosDonut]);

  // Escala máxima para Gráfica de Barras Apple
  const maxValorMensual = useMemo(() => {
    if (datosMensuales.length === 0) return 1000;
    const maxVal = Math.max(...datosMensuales.map(m => Math.max(m.ingresos, m.gastos)));
    return maxVal > 0 ? Math.ceil(maxVal * 1.15) : 1000;
  }, [datosMensuales]);

  return (
    <div className="space-y-5">
      
      {/* 1. HEADER REFINADO APPLE HIG: TÍTULO, ESTADO Y BOTONES DE ACCIÓN RÁPIDA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold tracking-wide">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-600">Tesorería Eclesiástica</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">Resumen Financiero</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            Resumen General
          </h1>
        </div>

        {/* Acciones Rápidas con Botones Tinted Glass Apple HIG */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onIrACaptura('miercoles_general')}
            className="inline-flex items-center justify-center sm:justify-start space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-900 text-xs font-semibold transition-all border border-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            <span>Miércoles</span>
          </button>

          <button
            type="button"
            onClick={() => onIrACaptura('domingo_manana')}
            className="inline-flex items-center justify-center sm:justify-start space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-900 text-xs font-semibold transition-all border border-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Domingo</span>
          </button>

          <button
            type="button"
            onClick={onIrAGastos}
            className="inline-flex items-center justify-center sm:justify-start space-x-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-900 text-xs font-semibold transition-all border border-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-700" />
            <span>Gasto</span>
          </button>

          {onAbrirReportePDF && (
            <button
              type="button"
              onClick={onAbrirReportePDF}
              className="inline-flex items-center justify-center sm:justify-start space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#0066d6] active:scale-95 text-white text-xs font-semibold transition-all shadow-sm shadow-blue-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Reporte PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. LOS 4 PILARES FINANCIEROS (APPLE HIG CARDS UNIFICADAS Y CLARAS) */}
      {/* Reemplaza las 5 tarjetas confusas con 4 pilares financieros que eliminan la redundancia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Pilar 1: Saldo en Caja General (Fondo Operativo Corriente) */}
        <div 
          role="button"
          tabIndex={0}
          onClick={onIrALibroCaja}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onIrALibroCaja();
            }
          }}
          aria-label={`Caja General: ${formatearMoneda(saldoCajaReal)}. Clic para abrir el Libro de Caja.`}
          className="bg-white/90 backdrop-blur-xl border border-black/[0.06] hover:border-blue-400 p-4 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 relative overflow-hidden"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
                  <Wallet className="w-3.5 h-3.5" />
                </span>
                <span>Caja Operativa</span>
              </span>
              <span className="text-[10px] font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5">
                <span>Libro</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div className="mt-2">
              <div className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${saldoCajaReal >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {formatearMoneda(saldoCajaReal)}
              </div>
              <div className="flex items-center space-x-1.5 mt-1">
                {saldoCajaReal >= 0 ? (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Fondo disponible</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full">
                    <span>Déficit operativo</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-emerald-700 font-semibold">+{formatearMoneda(entradasCaja)}</span>
            <span className="text-rose-600 font-semibold">-{formatearMoneda(totalGastos)}</span>
          </div>
        </div>

        {/* Pilar 2: Entradas Globales con desglose visual integrado */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => onIrACaptura()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onIrACaptura();
            }
          }}
          aria-label={`Entradas Totales: ${formatearMoneda(totalEntradas)}. Clic para capturar entrada.`}
          className="bg-white/90 backdrop-blur-xl border border-black/[0.06] hover:border-emerald-400 p-4 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                  <Coins className="w-3.5 h-3.5" />
                </span>
                <span>Ingresos Totales</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5">
                <span>Capturar</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {formatearMoneda(totalEntradas)}
              </div>
              
              {/* Barra de Composición Apple */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 flex overflow-hidden">
                <div style={{ width: `${pctDiezmos}%` }} className="bg-[#5856D6] h-full transition-all" title={`Diezmos: ${pctDiezmos}%`} />
                <div style={{ width: `${pctOfrendas}%` }} className="bg-[#34C759] h-full transition-all" title={`Ofrendas: ${pctOfrendas}%`} />
                <div style={{ width: `${pctProyectos}%` }} className="bg-[#FF9500] h-full transition-all" title={`Proyectos: ${pctProyectos}%`} />
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-indigo-700 font-semibold">🪙 Diezmos {pctDiezmos}%</span>
            <span className="text-emerald-700 font-semibold">🌿 Ofrendas {pctOfrendas}%</span>
            <span className="text-amber-700 font-semibold">🏛️ Proy {pctProyectos}%</span>
          </div>
        </div>

        {/* Pilar 3: Gastos y Salidas */}
        <div 
          role="button"
          tabIndex={0}
          onClick={onIrAGastos}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onIrAGastos();
            }
          }}
          aria-label={`Total Gastos: ${formatearMoneda(totalGastos)}. Clic para registrar o ver gastos.`}
          className="bg-white/90 backdrop-blur-xl border border-black/[0.06] hover:border-rose-400 p-4 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
                <span>Gastos Registrados</span>
              </span>
              <span className="text-[10px] font-semibold text-rose-600 group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5">
                <span>Registrar</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {formatearMoneda(totalGastos)}
              </div>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-slate-500" />
                  <span>Comprobantes R2</span>
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span>Control de salidas</span>
            <span className="text-rose-600 font-bold">100% verificado</span>
          </div>
        </div>

        {/* Pilar 4: Fondos de Proyectos Pactados */}
        <div 
          role="button"
          tabIndex={0}
          onClick={onIrAPactos}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onIrAPactos();
            }
          }}
          aria-label={`Fondos para Proyectos: ${formatearMoneda(totalProyectos)}. Clic para ver proyectos.`}
          className="bg-white/90 backdrop-blur-xl border border-black/[0.06] hover:border-amber-400 p-4 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                  <Landmark className="w-3.5 h-3.5" />
                </span>
                <span>Fondo de Proyectos</span>
              </span>
              <span className="text-[10px] font-semibold text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5">
                <span>Metas</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {formatearMoneda(totalProyectos)}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-[#FF9500] h-full rounded-full transition-all duration-300"
                  style={{ width: `${resumen.totalProyectosMeta > 0 ? Math.min(100, Math.round((totalProyectos / resumen.totalProyectosMeta) * 100)) : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span>Meta: {formatearMoneda(resumen.totalProyectosMeta)}</span>
            <span className="text-amber-700 font-bold">
              {resumen.totalProyectosMeta > 0 ? Math.round((totalProyectos / resumen.totalProyectosMeta) * 100) : 0}% avance
            </span>
          </div>
        </div>

      </div>

      {/* BANNER INFORMATIVO SUTIL APPLE: SALDO CONSOLIDADO TOTAL */}
      <div className="bg-slate-100/80 border border-slate-200/70 rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong className="text-slate-800">Saldo Consolidado Total: </strong>
            <span className={`font-bold tabular-nums ${saldoConsolidadoTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatearMoneda(saldoConsolidadoTotal)}
            </span>
            <span className="text-slate-500 ml-1.5">(Suma de Caja Operativa {formatearMoneda(saldoCajaReal)} + Fondo de Proyectos {formatearMoneda(totalProyectos)})</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMostrarAyudaCaja(!mostrarAyudaCaja)}
          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{mostrarAyudaCaja ? 'Ocultar explicación' : '¿Por qué dos saldos?'}</span>
        </button>
      </div>

      {mostrarAyudaCaja && (
        <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-3.5 text-xs text-blue-900 leading-relaxed animate-in fade-in duration-200">
          <p className="font-bold mb-1">Principio de Mayordomía y Fondos con Propósito:</p>
          <p className="text-blue-800">
            • <strong>Caja Operativa:</strong> Corresponde a los diezmos y ofrendas ordinarios destinados a cubrir gastos corrientes del templo (servicios, honorarios, mantenimiento).
          </p>
          <p className="text-blue-800 mt-1">
            • <strong>Fondo de Proyectos:</strong> Es dinero pactado por los hermanos para obras específicas (ej. compra de bocinas, construcción). Por fidelidad contable, este dinero no se mezcla con el gasto común.
          </p>
        </div>
      )}

      {/* 3. SECCIÓN DE GRÁFICAS APPLE HIG (HERMOSAS, CLARAS Y ENTENDIBLES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* GRÁFICA 1: FLUJO COMPARATIVO TEMPORAL (ENTRADAS VS GASTOS) - 7 COLUMNAS */}
        <div className="lg:col-span-7 bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                <BarChart3 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Flujo de Entradas vs Gastos
                </h3>
                <p className="text-[11px] text-slate-500">Comparativa mensual de solvencia</p>
              </div>
            </div>

            {/* Leyenda Apple Compacta */}
            <div className="flex items-center space-x-3 text-xs font-semibold">
              <span className="flex items-center space-x-1.5 text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] inline-block shadow-xs" />
                <span>Entradas</span>
              </span>
              <span className="flex items-center space-x-1.5 text-rose-800">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30] inline-block shadow-xs" />
                <span>Gastos</span>
              </span>
            </div>
          </div>

          {/* Gráfico SVG de Barras Cápsula Apple HIG */}
          <div 
            role="img"
            aria-label={`Gráfica de barras mensual: Flujo comparativo de entradas versus gastos para ${datosMensuales.length} períodos.`}
            className="relative pt-4 pb-2 h-44 flex flex-col justify-end"
          >
            {/* Líneas guía sutiles horizontales */}
            <div className="absolute inset-x-0 inset-y-4 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
            </div>

            {/* Columnas de los meses con estilo cápsula Apple */}
            <div className="relative z-10 flex items-end justify-around gap-4 sm:gap-8 h-32 px-4">
              {datosMensuales.map((item) => {
                const alturaIngresosPct = Math.max(8, Math.round((item.ingresos / maxValorMensual) * 100));
                const alturaGastosPct = Math.max(8, Math.round((item.gastos / maxValorMensual) * 100));
                const isHovered = mesHover?.mesClave === item.mesClave;

                return (
                  <div 
                    key={item.mesClave}
                    role="graphics-symbol"
                    aria-label={`${item.nombreMes}: Entradas ${formatearMoneda(item.ingresos)}, Gastos ${formatearMoneda(item.gastos)}, Balance Neto ${formatearMoneda(item.neto)}`}
                    tabIndex={0}
                    onFocus={() => setMesHover(item)}
                    onBlur={() => setMesHover(null)}
                    onMouseEnter={() => setMesHover(item)}
                    onMouseLeave={() => setMesHover(null)}
                    className="flex-1 max-w-[100px] flex flex-col items-center h-full justify-end cursor-pointer group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
                  >
                    {/* Tooltip Flotante Apple Glass */}
                    {isHovered && (
                      <div className="absolute -top-16 z-30 bg-slate-900/95 backdrop-blur-xl text-white text-xs py-2 px-3 rounded-2xl shadow-2xl pointer-events-none whitespace-nowrap animate-in fade-in duration-150 border border-slate-800">
                        <div className="font-bold text-slate-300 text-[11px] mb-0.5">{item.nombreMes}</div>
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="text-[#34C759] font-bold">+{formatearMoneda(item.ingresos)}</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-[#FF3B30] font-bold">-{formatearMoneda(item.gastos)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Neto: <strong className={item.neto >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatearMoneda(item.neto)}</strong>
                        </div>
                      </div>
                    )}

                    {/* Barras Gemelas estilo Cápsula Apple */}
                    <div className="w-full flex items-end justify-center space-x-2 sm:space-x-3 h-full">
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <div 
                          className="w-full rounded-t-xl bg-[#34C759] group-hover:bg-[#2EBE51] transition-all duration-300 shadow-sm"
                          style={{ height: `${alturaIngresosPct}%` }}
                        />
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <div 
                          className="w-full rounded-t-xl bg-[#FF3B30] group-hover:bg-[#E5352A] transition-all duration-300 shadow-sm"
                          style={{ height: `${alturaGastosPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Etiqueta del Mes */}
                    <div className="text-xs font-bold text-slate-700 mt-2 truncate group-hover:text-slate-900 transition-colors">
                      {item.nombreMes}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pie de Gráfica Informativo */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{datosMensuales.length} {datosMensuales.length === 1 ? 'período analizado' : 'períodos analizados'}</span>
            <span className="font-semibold text-slate-700">
              Flujo acumulado neto: <strong className={totalEntradas - totalGastos >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {formatearMoneda(totalEntradas - totalGastos)}
              </strong>
            </span>
          </div>
        </div>

        {/* GRÁFICA 2: DISTRIBUCIÓN DE INGRESOS (APPLE RING / DONUT) - 5 COLUMNAS */}
        <div className="lg:col-span-5 bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3.5">
          
          {/* Header de la Tarjeta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60 shadow-2xs">
                <PieChart className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Distribución de Aportes
                </h3>
                <p className="text-[11px] text-slate-500">Composición y destino de los fondos</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100/90 border border-slate-200/70 px-2.5 py-0.5 rounded-full tabular-nums">
              {totalEntradas > 0 ? '100% captado' : '0%'}
            </span>
          </div>

          {/* Barra Proporcional Continua Segmentada estilo Apple Storage / macOS */}
          <div className="w-full bg-slate-100/90 rounded-full h-2 flex overflow-hidden p-0.5 gap-0.5 shadow-inner">
            {segmentosDonut.map((seg) => (
              seg.porcentaje > 0 && (
                <div 
                  key={seg.id}
                  style={{ 
                    width: `${seg.porcentaje}%`,
                    backgroundColor: seg.color 
                  }} 
                  className={`h-full rounded-full transition-all duration-300 ${segmentoActivoDonut === seg.id ? 'brightness-110 shadow-xs' : ''}`}
                  title={`${seg.nombre}: ${seg.porcentaje}%`}
                />
              )
            ))}
          </div>

          {/* Área Central: Donut Ring Apple + Inset List */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
            
            {/* Donut Ring SVG Ultra-Limpio estilo Apple Watch / Activity */}
            <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
              <svg 
                role="img"
                aria-label={`Gráfico de distribución: Diezmos ${pctDiezmos}%, Ofrendas ${pctOfrendas}%, Proyectos ${pctProyectos}%.`}
                className="w-full h-full transform -rotate-90" 
                viewBox="0 0 140 140"
              >
                <defs>
                  <linearGradient id="grad-diezmos" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#4F46E5" />
                  </linearGradient>
                  <linearGradient id="grad-ofrendas" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="grad-proyectos" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                  <filter id="ring-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Pista de fondo */}
                <circle
                  cx="70"
                  cy="70"
                  r={radioDonut}
                  fill="transparent"
                  stroke="#F1F5F9"
                  strokeWidth="11"
                />

                {/* Segmentos de datos con extremos redondeados que no colisionan */}
                {segmentosDonut.map((seg) => {
                  const isActive = segmentoActivoDonut === seg.id;
                  if (seg.monto <= 0) return null;
                  return (
                    <circle
                      key={seg.id}
                      cx="70"
                      cy="70"
                      r={radioDonut}
                      fill="transparent"
                      stroke={`url(#${seg.gradId})`}
                      strokeWidth={isActive ? '14' : '11'}
                      strokeDasharray={seg.dash}
                      strokeDashoffset={seg.offset}
                      strokeLinecap="round"
                      filter={isActive ? 'url(#ring-glow)' : undefined}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setSegmentoActivoDonut(seg.id)}
                      onMouseLeave={() => setSegmentoActivoDonut(null)}
                    />
                  );
                })}
              </svg>

              {/* Centro Dinámico Apple Glass */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1 pointer-events-none transition-all duration-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[85px] mb-0.5">
                  {detalleCentroDonut.titulo}
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight tabular-nums leading-none">
                  {detalleCentroDonut.monto}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  {detalleCentroDonut.sub}
                </span>
              </div>
            </div>

            {/* Inset List Grupal Unificada (Estilo Ajustes macOS / iOS Settings) */}
            <div className="w-full sm:flex-1 bg-slate-50/70 border border-slate-200/70 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {segmentosDonut.map((seg) => {
                const isActive = segmentoActivoDonut === seg.id;
                const Icon = seg.icon;
                return (
                  <div
                    key={seg.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${seg.nombre}: ${formatearMoneda(seg.monto)} (${seg.porcentaje}% del total)`}
                    onFocus={() => setSegmentoActivoDonut(seg.id)}
                    onBlur={() => setSegmentoActivoDonut(null)}
                    onMouseEnter={() => setSegmentoActivoDonut(seg.id)}
                    onMouseLeave={() => setSegmentoActivoDonut(null)}
                    className={`px-3 py-2 transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isActive 
                        ? 'bg-white shadow-xs' 
                        : 'hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg ${seg.colorBg} ${seg.colorBorder} border flex items-center justify-center ${seg.colorText} flex-shrink-0 transition-transform ${isActive ? 'scale-110 shadow-xs' : ''}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 text-xs block leading-tight">
                          {seg.nombre}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {seg.subtitulo}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 text-right">
                      <span className="font-black text-slate-900 text-xs tabular-nums">
                        {formatearMoneda(seg.monto)}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${seg.colorBadge}`}>
                        {seg.porcentaje}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer de Tarjeta */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px] font-medium">Mayor fuente:</span>
            <span className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
              {pctDiezmos >= pctOfrendas && pctDiezmos >= pctProyectos ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  <span>Diezmos de Fidelidad ({pctDiezmos}%)</span>
                </>
              ) : pctOfrendas >= pctDiezmos && pctOfrendas >= pctProyectos ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Ofrendas Generales ({pctOfrendas}%)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span>Fondos de Proyectos ({pctProyectos}%)</span>
                </>
              )}
            </span>
          </div>
        </div>

      </div>

      {/* 4. COMPARATIVA DE CULTOS (MIÉRCOLES VS DOMINGO) - ESTILO APPLE SEGMENTED CARD */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Rendimiento por Día de Culto
              </h3>
              <p className="text-[11px] text-slate-500">Comparativa directa Miércoles vs Domingo</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-semibold">
            <span className="text-amber-800 flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500] inline-block" />
              <span>Miércoles ({pctMiercoles}%)</span>
            </span>
            <span className="text-emerald-800 flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] inline-block" />
              <span>Domingo ({pctDomingo}%)</span>
            </span>
          </div>
        </div>

        {/* Barra Proporcional Continua Apple */}
        <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden shadow-inner">
          <div 
            className="bg-[#FF9500] h-full transition-all duration-300"
            style={{ width: `${pctMiercoles}%` }}
          />
          <div 
            className="bg-[#34C759] h-full transition-all duration-300"
            style={{ width: `${pctDomingo}%` }}
          />
        </div>

        {/* Tarjetas Simétricas de Culto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          
          {/* Card Miércoles */}
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500]" />
                <span className="font-bold text-sm text-slate-800">Culto de Miércoles</span>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                {pctMiercoles}% del total
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-slate-900 tabular-nums">
                {formatearMoneda(totalMiercoles)}
              </div>
              <button
                type="button"
                onClick={() => onIrACaptura('miercoles_general')}
                className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center space-x-0.5"
              >
                <span>Capturar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs pt-1">
              <div className="bg-white/90 rounded-xl py-1.5 px-1 sm:px-2 border border-amber-200/50">
                <span className="text-emerald-700 text-[10px] font-medium block">🌿 Ofrendas</span>
                <span className="font-bold tabular-nums text-slate-900 text-[11px] sm:text-xs truncate block">{formatearMoneda(ofrendasMiercoles)}</span>
              </div>
              <div className="bg-white/90 rounded-xl py-1.5 px-1 sm:px-2 border border-amber-200/50">
                <span className="text-indigo-700 text-[10px] font-medium block">🪙 Diezmos</span>
                <span className="font-bold tabular-nums text-slate-900 text-[11px] sm:text-xs truncate block">{formatearMoneda(diezmosMiercoles)}</span>
              </div>
              <div className="bg-white/90 rounded-xl py-1.5 px-1 sm:px-2 border border-amber-200/50">
                <span className="text-amber-700 text-[10px] font-medium block">🏛️ Proyectos</span>
                <span className="font-bold tabular-nums text-slate-900 text-[11px] sm:text-xs truncate block">{formatearMoneda(proyectosMiercoles)}</span>
              </div>
            </div>
          </div>

          {/* Card Domingo */}
          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
                <span className="font-bold text-sm text-slate-800">Culto de Domingo</span>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                {pctDomingo}% del total
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-slate-900 tabular-nums">
                {formatearMoneda(totalDomingo)}
              </div>
              <button
                type="button"
                onClick={() => onIrACaptura('domingo_manana')}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center space-x-0.5"
              >
                <span>Capturar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs pt-1">
              <div className="bg-white/90 rounded-xl py-1.5 px-1 sm:px-2 border border-emerald-200/50">
                <span className="text-emerald-700 text-[10px] font-medium block">🌿 Ofrendas</span>
                <span className="font-bold tabular-nums text-slate-900 text-[11px] sm:text-xs truncate block">{formatearMoneda(ofrendasDomingo)}</span>
              </div>
              <div className="bg-white/90 rounded-xl py-1.5 px-1 sm:px-2 border border-emerald-200/50">
                <span className="text-indigo-700 text-[10px] font-medium block">🪙 Diezmos</span>
                <span className="font-bold tabular-nums text-slate-900 text-[11px] sm:text-xs truncate block">{formatearMoneda(diezmosDomingo)}</span>
              </div>
              <div className="bg-white/90 rounded-xl py-1.5 px-1 sm:px-2 border border-emerald-200/50">
                <span className="text-amber-700 text-[10px] font-medium block">🏛️ Proyectos</span>
                <span className="font-bold tabular-nums text-slate-900 text-[11px] sm:text-xs truncate block">{formatearMoneda(proyectosDomingo)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 5. PROYECTOS EN CURSO */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
              <Landmark className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">Proyectos con Destino Específico</h4>
              <p className="text-[11px] text-slate-500">Metas y fondos pactados activos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onIrAPactos}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {proyectos.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No hay proyectos pactados activos registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {proyectos.slice(0, 3).map((p) => {
              const pct = Math.min(100, Math.round((p.total_recaudado / (p.meta_total || 1)) * 100));
              return (
                <div key={p.id} className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/60 hover:bg-white transition-all space-y-2.5 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 truncate">{p.nombre}</span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full flex-shrink-0">
                      Sugerido: {formatearMoneda(p.valor_semanal_sugerido)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#FF9500] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Recaudado: <strong className="text-slate-900">{formatearMoneda(p.total_recaudado)}</strong> ({pct}%)</span>
                      <span>Meta: <strong className="text-slate-900">{formatearMoneda(p.meta_total)}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
