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
  Eye, 
  ChevronRight,
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  PieChart, 
  Activity, 
  Sparkles,
  Layers
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
  onVerEvidencia: (url: string, nombre?: string) => void;
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
  // Estado para interactividad en gráficos
  const [segmentoActivoDonut, setSegmentoActivoDonut] = useState<string | null>(null);
  const [mesHover, setMesHover] = useState<MesEstadistica | null>(null);

  const ultimasTransacciones = useMemo(() => transacciones.slice(0, 6), [transacciones]);

  // Cálculos consolidados y métricas principales
  const {
    saldoCajaReal,
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

    const pctOf = entradas > 0 ? Math.round((ofrendas / entradas) * 100) : 0;
    const pctDi = entradas > 0 ? Math.round((diezmos / entradas) * 100) : 0;
    const pctPr = entradas > 0 ? Math.min(100, Math.max(0, 100 - pctOf - pctDi)) : 0;

    // Clasificación de transacciones por culto evitando duplicidad cruzada
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

  // Dimensiones compactas para Donut Chart SVG
  const radioDonut = 54;
  const perimetroDonut = 2 * Math.PI * radioDonut;
  
  // Segmentos del Donut
  const segmentosDonut = useMemo(() => {
    if (totalEntradas === 0) return [];
    
    const ofrendasOffset = 0;
    const ofrendasDash = (totalOfrendas / totalEntradas) * perimetroDonut;

    const diezmosOffset = -ofrendasDash;
    const diezmosDash = (totalDiezmos / totalEntradas) * perimetroDonut;

    const proyectosOffset = -(ofrendasDash + diezmosDash);
    const proyectosDash = (totalProyectos / totalEntradas) * perimetroDonut;

    return [
      {
        id: 'ofrendas',
        nombre: 'Ofrendas',
        monto: totalOfrendas,
        porcentaje: pctOfrendas,
        color: '#10b981', // emerald-500
        colorHover: '#059669',
        dash: `${ofrendasDash} ${perimetroDonut - ofrendasDash}`,
        offset: ofrendasOffset,
        subtitulo: 'Cultos y generales'
      },
      {
        id: 'diezmos',
        nombre: 'Diezmos',
        monto: totalDiezmos,
        porcentaje: pctDiezmos,
        color: '#6366f1', // indigo-500
        colorHover: '#4f46e5',
        dash: `${diezmosDash} ${perimetroDonut - diezmosDash}`,
        offset: diezmosOffset,
        subtitulo: 'Sobres de fidelidad'
      },
      {
        id: 'proyectos',
        nombre: 'Pactos',
        monto: totalProyectos,
        porcentaje: pctProyectos,
        color: '#f59e0b', // amber-500
        colorHover: '#d97706',
        dash: `${proyectosDash} ${perimetroDonut - proyectosDash}`,
        offset: proyectosOffset,
        subtitulo: 'Fondos con propósito'
      }
    ];
  }, [totalEntradas, totalOfrendas, totalDiezmos, totalProyectos, pctOfrendas, pctDiezmos, pctProyectos, perimetroDonut]);

  // Detalle central dinámico del Donut
  const detalleCentroDonut = useMemo(() => {
    if (!segmentoActivoDonut) {
      return {
        titulo: 'Entradas',
        monto: formatearMoneda(totalEntradas),
        sub: 'Total general'
      };
    }
    const seg = segmentosDonut.find(s => s.id === segmentoActivoDonut);
    if (!seg) {
      return {
        titulo: 'Entradas',
        monto: formatearMoneda(totalEntradas),
        sub: 'Total general'
      };
    }
    return {
      titulo: seg.nombre,
      monto: formatearMoneda(seg.monto),
      sub: `${seg.porcentaje}% del total`
    };
  }, [segmentoActivoDonut, totalEntradas, segmentosDonut]);

  // Escala para el Gráfico de Barras Mensual
  const maxValorMensual = useMemo(() => {
    if (datosMensuales.length === 0) return 1000;
    const maxVal = Math.max(...datosMensuales.map(m => Math.max(m.ingresos, m.gastos)));
    return maxVal > 0 ? Math.ceil(maxVal * 1.15) : 1000;
  }, [datosMensuales]);

  return (
    <div className="space-y-3.5">
      
      {/* 1. BARRA SUPERIOR DE BIENVENIDA & ACCIONES RÁPIDAS (APPLE HIG COMPACT) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <Activity className="w-3 h-3 text-emerald-600" />
            <span>Tesorería Eclesiástica</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">Resumen Ejecutivo</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 mt-0.5">
            Resumen General
          </h1>
        </div>

        {/* Acciones Rápidas Compactas */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onIrACaptura('miercoles_general')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98] text-amber-800 text-xs font-bold transition-all border border-amber-500/20"
          >
            <Calendar className="w-3 h-3 text-amber-600" />
            <span>Miércoles</span>
          </button>

          <button
            onClick={() => onIrACaptura('domingo_manana')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] text-emerald-800 text-xs font-bold transition-all border border-emerald-500/20"
          >
            <Calendar className="w-3 h-3 text-emerald-600" />
            <span>Domingo</span>
          </button>

          <button
            onClick={onIrAGastos}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] text-rose-800 text-xs font-bold transition-all border border-rose-500/20"
          >
            <ArrowUpRight className="w-3 h-3 text-rose-600" />
            <span>Gasto</span>
          </button>

          {onAbrirReportePDF && (
            <button
              onClick={onAbrirReportePDF}
              className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs"
            >
              <FileText className="w-3 h-3" />
              <span>Reporte PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPIS PRINCIPALES: GRID COMPACTO DE 5 TARJETAS UNIFORMES (APPLE HIG) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        
        {/* Card 1: Fondo en Caja General (Destacada en Dark Slate) */}
        <div 
          onClick={onIrALibroCaja}
          className="col-span-2 sm:col-span-1 bg-slate-950 text-white p-3.5 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-slate-700 transition-all select-none active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1">
                <Wallet className="w-3 h-3 text-emerald-400" />
                <span>Caja General</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 group-hover:text-white transition-colors">
                Libro ↗
              </span>
            </div>
            <div className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${saldoCajaReal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatearMoneda(saldoCajaReal)}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-emerald-400 font-semibold">+{formatearMoneda(entradasCaja)}</span>
            <span className="text-rose-400 font-semibold">-{formatearMoneda(totalGastos)}</span>
          </div>
        </div>

        {/* Card 2: Total Recaudado */}
        <div 
          onClick={() => onIrACaptura()}
          className="bg-white/95 backdrop-blur-xl border border-black/[0.06] hover:border-emerald-300 p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] group"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                <Coins className="w-3 h-3 text-emerald-600" />
                <span>Recaudado</span>
              </span>
              <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                <TrendingUp className="w-3 h-3" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight tabular-nums">
              {formatearMoneda(totalEntradas)}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Caja: <strong className="text-emerald-700">{formatearMoneda(entradasCaja)}</strong></span>
            <span>Pactos: <strong className="text-indigo-700">{formatearMoneda(totalProyectos)}</strong></span>
          </div>
        </div>

        {/* Card 3: Total Egresos */}
        <div 
          onClick={onIrAGastos}
          className="bg-white/95 backdrop-blur-xl border border-black/[0.06] hover:border-rose-300 p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] group"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                <span>Egresos</span>
              </span>
              <div className="w-5 h-5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
                <TrendingDown className="w-3 h-3" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight tabular-nums">
              {formatearMoneda(totalGastos)}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-rose-700 font-semibold">Comprobantes R2</span>
            <span className="text-slate-400">Salidas ↗</span>
          </div>
        </div>

        {/* Card 4: Diezmos y Ofrendas */}
        <div 
          onClick={() => onIrACaptura(undefined, 'diezmo')}
          className="bg-white/95 backdrop-blur-xl border border-black/[0.06] hover:border-indigo-300 p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] group"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                <HeartHandshake className="w-3 h-3 text-indigo-600" />
                <span>Diezmos & Ofrendas</span>
              </span>
              <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                <Layers className="w-3 h-3" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight tabular-nums">
              {formatearMoneda(totalOfrendas + totalDiezmos)}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>🌿 {formatearMoneda(totalOfrendas)}</span>
            <span>🪙 {formatearMoneda(totalDiezmos)}</span>
          </div>
        </div>

        {/* Card 5: Fondo Proyectos */}
        <div 
          onClick={onIrAPactos}
          className="col-span-2 sm:col-span-1 bg-white/95 backdrop-blur-xl border border-black/[0.06] hover:border-amber-300 p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] group"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1">
                <Landmark className="w-3 h-3 text-amber-600" />
                <span>Proyectos</span>
              </span>
              <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                <Sparkles className="w-3 h-3" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight tabular-nums">
              {formatearMoneda(totalProyectos)}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Meta: {formatearMoneda(resumen.totalProyectosMeta)}</span>
            <span className="text-amber-700 font-bold">
              {resumen.totalProyectosMeta > 0 ? Math.round((totalProyectos / resumen.totalProyectosMeta) * 100) : 0}%
            </span>
          </div>
        </div>

      </div>

      {/* 3. SECCIÓN DE GRÁFICAS ANALÍTICAS COMPACTAS (BARRAS + DONUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* GRÁFICA 1: FLUJO MENSUAL (7 Columnas) */}
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                Flujo Mensual: Entradas vs Gastos
              </h3>
            </div>

            {/* Leyenda Compacta */}
            <div className="flex items-center space-x-2.5 text-[11px] font-semibold">
              <span className="flex items-center space-x-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Entradas</span>
              </span>
              <span className="flex items-center space-x-1 text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                <span>Gastos</span>
              </span>
            </div>
          </div>

          {/* Gráfico de Barras Compacto */}
          <div className="relative pt-3 pb-1 h-32 flex flex-col justify-end">
            {/* Líneas guía sutiles */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
              <div className="border-b border-dashed border-slate-200 w-full" />
            </div>

            {/* Columnas de los meses */}
            <div className="relative z-10 flex items-end justify-around gap-2 sm:gap-6 h-24 px-2">
              {datosMensuales.map((item) => {
                const alturaIngresosPct = Math.max(10, Math.round((item.ingresos / maxValorMensual) * 100));
                const alturaGastosPct = Math.max(10, Math.round((item.gastos / maxValorMensual) * 100));
                const isHovered = mesHover?.mesClave === item.mesClave;

                return (
                  <div 
                    key={item.mesClave}
                    onMouseEnter={() => setMesHover(item)}
                    onMouseLeave={() => setMesHover(null)}
                    className="flex-1 max-w-[70px] flex flex-col items-center h-full justify-end cursor-pointer group relative"
                  >
                    {/* Tooltip flotante Apple */}
                    {isHovered && (
                      <div className="absolute -top-12 z-30 bg-slate-900/95 backdrop-blur-md text-white text-[10px] py-1 px-2.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in duration-100">
                        <span className="font-bold text-slate-300">{item.nombreMes}: </span>
                        <span className="text-emerald-400 font-bold">+{formatearMoneda(item.ingresos)} </span>
                        <span className="text-rose-400 font-bold">-{formatearMoneda(item.gastos)}</span>
                      </div>
                    )}

                    {/* Barras gemelas */}
                    <div className="w-full flex items-end justify-center space-x-1 sm:space-x-1.5 h-full">
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <div 
                          className="w-full rounded-t bg-emerald-500 group-hover:bg-emerald-400 transition-all duration-300"
                          style={{ height: `${alturaIngresosPct}%` }}
                        />
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <div 
                          className="w-full rounded-t bg-rose-500 group-hover:bg-rose-400 transition-all duration-300"
                          style={{ height: `${alturaGastosPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Mes Label */}
                    <div className="text-[10px] font-bold text-slate-600 mt-1.5 truncate group-hover:text-slate-900 transition-colors">
                      {item.nombreMes}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pie de gráfica */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{datosMensuales.length} {datosMensuales.length === 1 ? 'período' : 'períodos analizados'}</span>
            <span className="font-semibold text-slate-700">
              Flujo acumulado: <strong className={totalEntradas - totalGastos >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {formatearMoneda(totalEntradas - totalGastos)}
              </strong>
            </span>
          </div>
        </div>

        {/* GRÁFICA 2: DISTRIBUCIÓN DE APORTES (DONUT COMPACTO) (5 Columnas) */}
        <div className="lg:col-span-5 bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                Distribución de Aportes
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {totalEntradas > 0 ? '100% captado' : '0%'}
            </span>
          </div>

          {/* Gráfico Donut Compacto + Leyendas */}
          <div className="flex items-center justify-around gap-3 py-1">
            {/* Donut SVG */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r={radioDonut}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="14"
                />
                {segmentosDonut.map((seg) => {
                  const isActive = segmentoActivoDonut === seg.id;
                  return (
                    <circle
                      key={seg.id}
                      cx="70"
                      cy="70"
                      r={radioDonut}
                      fill="transparent"
                      stroke={isActive ? seg.colorHover : seg.color}
                      strokeWidth={isActive ? '17' : '14'}
                      strokeDasharray={seg.dash}
                      strokeDashoffset={seg.offset}
                      strokeLinecap="round"
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setSegmentoActivoDonut(seg.id)}
                      onMouseLeave={() => setSegmentoActivoDonut(null)}
                    />
                  );
                })}
              </svg>

              {/* Centro dinámico */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1 pointer-events-none">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[80px]">
                  {detalleCentroDonut.titulo}
                </span>
                <span className="text-sm sm:text-base font-black text-slate-950 tracking-tight tabular-nums">
                  {detalleCentroDonut.monto}
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  {detalleCentroDonut.sub}
                </span>
              </div>
            </div>

            {/* Tarjetas de Leyenda Compactas */}
            <div className="flex-1 space-y-1.5 min-w-[120px]">
              {segmentosDonut.map((seg) => {
                const isActive = segmentoActivoDonut === seg.id;
                return (
                  <div
                    key={seg.id}
                    onMouseEnter={() => setSegmentoActivoDonut(seg.id)}
                    onMouseLeave={() => setSegmentoActivoDonut(null)}
                    className={`px-2.5 py-1 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-[11px] ${
                      isActive 
                        ? 'bg-slate-50 border-slate-300 shadow-2xs' 
                        : 'bg-white/60 border-slate-200/70 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <span 
                        className="w-2 h-2 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: seg.color }} 
                      />
                      <span className="font-bold text-slate-800 truncate">{seg.nombre}</span>
                    </div>
                    <div className="text-right flex items-center space-x-1.5 flex-shrink-0 ml-1">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatearMoneda(seg.monto)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {seg.porcentaje}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Mayor proporción:</span>
            <span className="font-bold text-slate-800">
              {pctProyectos >= pctOfrendas && pctProyectos >= pctDiezmos 
                ? '🏛️ Pactos' 
                : pctOfrendas >= pctDiezmos 
                  ? '🌿 Ofrendas' 
                  : '🪙 Diezmos'}
            </span>
          </div>
        </div>

      </div>

      {/* 4. COMPARATIVA DE CULTOS (MIÉRCOLES VS DOMINGO) (COMPACTO APPLE HIG) */}
      <div className="bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
              Cultos
            </span>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              Recaudación: Miércoles vs Domingo
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-500">
            <span className="text-amber-800 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>Miércoles ({totalEntradas > 0 ? Math.round((totalMiercoles / totalEntradas) * 100) : 0}%)</span>
            </span>
            <span className="text-emerald-800 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Domingo ({totalEntradas > 0 ? Math.round((totalDomingo / totalEntradas) * 100) : 0}%)</span>
            </span>
          </div>
        </div>

        {/* Barra Proporcional Slim */}
        <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden shadow-inner">
          <div 
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${totalEntradas > 0 ? (totalMiercoles / totalEntradas) * 100 : 0}%` }}
          />
          <div 
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${totalEntradas > 0 ? (totalDomingo / totalEntradas) * 100 : 0}%` }}
          />
        </div>

        {/* Comparativa Lado a Lado Compacta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          
          {/* Tile Miércoles */}
          <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-bold text-xs text-slate-800">Miércoles</span>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/70 px-1.5 py-0.2 rounded">
                  {totalEntradas > 0 ? Math.round((totalMiercoles / totalEntradas) * 100) : 0}%
                </span>
              </div>
              <div className="text-lg font-black text-amber-900 tabular-nums">
                {formatearMoneda(totalMiercoles)}
              </div>
            </div>

            <div className="flex items-center space-x-1.5 text-center text-[10px]">
              <div className="bg-white/90 rounded-lg py-1 px-2 border border-amber-200/50">
                <span className="text-emerald-700 font-medium block">🌿 Ofrendas</span>
                <span className="font-bold tabular-nums text-slate-900">{formatearMoneda(ofrendasMiercoles)}</span>
              </div>
              <div className="bg-white/90 rounded-lg py-1 px-2 border border-amber-200/50">
                <span className="text-indigo-700 font-medium block">🪙 Diezmos</span>
                <span className="font-bold tabular-nums text-slate-900">{formatearMoneda(diezmosMiercoles)}</span>
              </div>
              <div className="bg-white/90 rounded-lg py-1 px-2 border border-amber-200/50">
                <span className="text-amber-700 font-medium block">🏛️ Pactos</span>
                <span className="font-bold tabular-nums text-slate-900">{formatearMoneda(proyectosMiercoles)}</span>
              </div>
            </div>
          </div>

          {/* Tile Domingo */}
          <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-xs text-slate-800">Domingo</span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-1.5 py-0.2 rounded">
                  {totalEntradas > 0 ? Math.round((totalDomingo / totalEntradas) * 100) : 0}%
                </span>
              </div>
              <div className="text-lg font-black text-emerald-900 tabular-nums">
                {formatearMoneda(totalDomingo)}
              </div>
            </div>

            <div className="flex items-center space-x-1.5 text-center text-[10px]">
              <div className="bg-white/90 rounded-lg py-1 px-2 border border-emerald-200/50">
                <span className="text-emerald-700 font-medium block">🌿 Ofrendas</span>
                <span className="font-bold tabular-nums text-slate-900">{formatearMoneda(ofrendasDomingo)}</span>
              </div>
              <div className="bg-white/90 rounded-lg py-1 px-2 border border-emerald-200/50">
                <span className="text-indigo-700 font-medium block">🪙 Diezmos</span>
                <span className="font-bold tabular-nums text-slate-900">{formatearMoneda(diezmosDomingo)}</span>
              </div>
              <div className="bg-white/90 rounded-lg py-1 px-2 border border-emerald-200/50">
                <span className="text-amber-700 font-medium block">🏛️ Pactos</span>
                <span className="font-bold tabular-nums text-slate-900">{formatearMoneda(proyectosDomingo)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 5. PROYECTOS PACTADOS EN CURSO (APPLE HIG COMPACTO) */}
      <div className="bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Landmark className="w-4 h-4 text-indigo-600" />
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Proyectos Pactados en Curso</h4>
          </div>
          <button
            onClick={onIrAPactos}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {proyectos.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-xs">
            No hay proyectos pactados activos registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {proyectos.slice(0, 3).map((p) => {
              const pct = Math.min(100, Math.round((p.total_recaudado / (p.meta_total || 1)) * 100));
              return (
                <div key={p.id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white transition-all space-y-2">
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-bold text-xs text-slate-900 truncate">{p.nombre}</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 rounded-full flex-shrink-0">
                      Sugerido: {formatearMoneda(p.valor_semanal_sugerido)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
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

      {/* 6. ÚLTIMOS MOVIMIENTOS REGISTRADOS (COMPACTO APPLE HIG) */}
      <div className="bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-2xl p-3.5 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Últimos Movimientos Registrados</h4>
          </div>

          <button
            onClick={onIrALibroCaja}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-0.5"
          >
            <span>Ver Libro de Caja Completo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9F9FB] text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2 px-2.5">Fecha / Día</th>
                <th className="py-2 px-2.5">Tipo</th>
                <th className="py-2 px-2.5">Categoría / Concepto</th>
                <th className="py-2 px-2.5">Miembro / Fiel</th>
                <th className="py-2 px-2.5">Evidencia R2</th>
                <th className="py-2 px-2.5 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ultimasTransacciones.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-2.5 whitespace-nowrap">
                    <span className="font-bold text-slate-900 block text-xs">{formatearFechaCorta(t.fecha)}</span>
                    <span className={`text-[9px] font-semibold uppercase px-1 py-0.2 rounded ${
                      t.dia_semana === 'miercoles' 
                        ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                        : t.dia_semana === 'domingo' 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.dia_semana}
                    </span>
                  </td>

                  <td className="py-2 px-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      t.tipo === 'ingreso'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {t.tipo === 'ingreso' ? '+ Entrada' : '- Gasto'}
                    </span>
                  </td>

                  <td className="py-2 px-2.5">
                    <span className="font-bold text-slate-900 text-xs block">{t.categoria}</span>
                    <span className="text-[11px] text-slate-500 truncate max-w-xs block">{t.concepto}</span>
                  </td>

                  <td className="py-2 px-2.5 text-xs font-semibold text-slate-800">
                    {t.miembro_nombre || <span className="text-slate-400 italic">N/A</span>}
                  </td>

                  <td className="py-2 px-2.5">
                    {t.evidencia_url ? (
                      <button
                        type="button"
                        onClick={() => onVerEvidencia(t.evidencia_url!, t.evidencia_nombre)}
                        className="inline-flex items-center space-x-1 text-[10px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-1.5 py-0.5 rounded-md transition-colors"
                      >
                        <Eye className="w-3 h-3 text-sky-600" />
                        <span>Recibo</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>

                  <td className={`py-2 px-2.5 text-right font-black text-xs sm:text-sm whitespace-nowrap tabular-nums ${
                    t.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {t.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(t.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
