import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  Coins, 
  HeartHandshake, 
  Landmark, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText, 
  Eye, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  Plus
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
  const ultimasTransacciones = transacciones.slice(0, 6);

  // Separación y cálculo detallado de ingresos (Ofrendas, Diezmos y Proyectos)
  const {
    totalOfrendas,
    totalDiezmos,
    totalProyectos,
    totalEntradas,
    pctOfrendas,
    pctDiezmos,
    pctProyectos,
    // Miércoles
    totalMiercoles,
    ofrendasMiercoles,
    diezmosMiercoles,
    proyectosMiercoles,
    // Domingo
    totalDomingo,
    ofrendasDomingo,
    diezmosDomingo,
    proyectosDomingo
  } = React.useMemo(() => {
    const ofrendas = resumen.totalOfrendas || 0;
    const diezmos = resumen.totalDiezmos || 0;
    const proyectosRec = Math.max(resumen.totalPactos || 0, resumen.totalProyectosRecaudado || 0);
    const entradas = resumen.totalIngresos || (ofrendas + diezmos + proyectosRec);

    const pctOf = entradas > 0 ? Math.round((ofrendas / entradas) * 100) : 0;
    const pctDi = entradas > 0 ? Math.round((diezmos / entradas) * 100) : 0;
    const pctPr = entradas > 0 ? Math.min(100, Math.max(0, 100 - pctOf - pctDi)) : 0;

    // Filtrar transacciones por culto/día
    const txIngresos = transacciones.filter(t => t.tipo === 'ingreso');

    // Miércoles
    const txMiercoles = txIngresos.filter(t => t.dia_semana === 'miercoles' || t.tipo_culto === 'miercoles_general');
    const ofMiercoles = txMiercoles.filter(t => t.subtipo === 'ofrenda').reduce((acc, t) => acc + t.monto, 0);
    const diMiercoles = txMiercoles.filter(t => t.subtipo === 'diezmo').reduce((acc, t) => acc + t.monto, 0);
    const prMiercoles = txMiercoles.filter(t => t.subtipo === 'pacto').reduce((acc, t) => acc + t.monto, 0);
    const totMiercoles = ofMiercoles + diMiercoles + prMiercoles;

    // Domingo
    const txDomingo = txIngresos.filter(t => t.dia_semana === 'domingo' || t.tipo_culto === 'domingo_manana' || t.tipo_culto === 'domingo_tarde');
    const ofDomingo = txDomingo.filter(t => t.subtipo === 'ofrenda').reduce((acc, t) => acc + t.monto, 0);
    const diDomingo = txDomingo.filter(t => t.subtipo === 'diezmo').reduce((acc, t) => acc + t.monto, 0);
    const prDomingo = txDomingo.filter(t => t.subtipo === 'pacto').reduce((acc, t) => acc + t.monto, 0);
    const totDomingo = ofDomingo + diDomingo + prDomingo;

    return {
      totalOfrendas: ofrendas,
      totalDiezmos: diezmos,
      totalProyectos: proyectosRec,
      totalEntradas: entradas,
      pctOfrendas: pctOf,
      pctDiezmos: pctDi,
      pctProyectos: pctPr,
      totalMiercoles: totMiercoles > 0 ? totMiercoles : (resumen.ingresosMiercoles || 0),
      ofrendasMiercoles: ofMiercoles,
      diezmosMiercoles: diMiercoles,
      proyectosMiercoles: prMiercoles,
      totalDomingo: totDomingo > 0 ? totDomingo : (resumen.ingresosDomingo || 0),
      ofrendasDomingo: ofDomingo,
      diezmosDomingo: diDomingo,
      proyectosDomingo: prDomingo
    };
  }, [resumen, transacciones]);

  return (
    <div className="space-y-6">
      
      {/* 1. BARRA SUPERIOR DE BIENVENIDA & ACCIONES RÁPIDAS APPLE HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tesorería Eclesiástica
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
            Resumen General
          </h1>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onIrACaptura('miercoles_general')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98] text-amber-800 text-xs font-bold transition-all border border-amber-500/20"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Miércoles</span>
          </button>

          <button
            onClick={() => onIrACaptura('domingo_manana')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] text-emerald-800 text-xs font-bold transition-all border border-emerald-500/20"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Domingo</span>
          </button>

          <button
            onClick={onIrAGastos}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] text-rose-800 text-xs font-bold transition-all border border-rose-500/20"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            <span>Gasto</span>
          </button>

          {onAbrirReportePDF && (
            <button
              onClick={onAbrirReportePDF}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Reporte PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TARJETAS DE SALDO PRINCIPAL SEPARADAS: FONDO, OFRENDAS, DIEZMOS, PROYECTOS Y EGRESOS (APPLE HIG) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Saldo Neto en Caja */}
        <div 
          onClick={onIrALibroCaja}
          className="bg-slate-950 text-white p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-800 relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-slate-700 transition-all active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Fondo en Caja / Bancos</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-2xl font-black tracking-tight tabular-nums ${resumen.saldoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatearMoneda(resumen.saldoNeto)}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Balance neto disponible</span>
            </span>
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Card 2: Ofrendas */}
        <div 
          onClick={() => onIrACaptura(undefined, 'ofrenda')}
          className="bg-white/90 backdrop-blur-xl border border-black/[0.06] hover:border-emerald-300 p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Ofrendas</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                <HeartHandshake className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-950 tracking-tight tabular-nums">
              {formatearMoneda(totalOfrendas)}
            </div>
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span>{pctOfrendas}% de entradas</span>
            <span className="text-slate-400 font-normal">Generales y cultos</span>
          </div>
        </div>

        {/* Card 3: Diezmos */}
        <div 
          onClick={() => onIrACaptura(undefined, 'diezmo')}
          className="bg-white/90 backdrop-blur-xl border border-black/[0.06] hover:border-indigo-300 p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Diezmos</span>
              <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                <Coins className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-950 tracking-tight tabular-nums">
              {formatearMoneda(totalDiezmos)}
            </div>
          </div>
          <div className="text-[10px] text-indigo-700 font-semibold mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span>{pctDiezmos}% de entradas</span>
            <span className="text-slate-400 font-normal">Sobres de miembros</span>
          </div>
        </div>

        {/* Card 4: Proyectos Pactados */}
        <div 
          onClick={onIrAPactos}
          className="bg-white/90 backdrop-blur-xl border border-black/[0.06] hover:border-amber-300 p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Proyectos Pactados</span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                <Landmark className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-950 tracking-tight tabular-nums">
              {formatearMoneda(totalProyectos)}
            </div>
          </div>
          <div className="text-[10px] text-amber-800 font-semibold mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span>{pctProyectos}% de entradas</span>
            <span className="text-slate-400 font-normal">Meta: {formatearMoneda(resumen.totalProyectosMeta)}</span>
          </div>
        </div>

        {/* Card 5: Total Egresos */}
        <div 
          onClick={onIrAGastos}
          className="bg-white/90 backdrop-blur-xl border border-black/[0.06] hover:border-rose-300 p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Total Egresos</span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-950 tracking-tight tabular-nums">
              {formatearMoneda(resumen.totalGastos)}
            </div>
          </div>
          <div className="text-[10px] text-rose-700 font-bold mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span>Comprobantes en R2</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

      </div>

      {/* 2.1 COMPOSICIÓN VISUAL DE ENTRADAS (APPLE HIG) */}
      <div className="bg-white/80 backdrop-blur-xl border border-black/[0.06] rounded-2xl px-5 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Entradas:
          </span>
          <span className="text-base font-black text-slate-900 tabular-nums">
            {formatearMoneda(totalEntradas)}
          </span>
        </div>

        {/* Barra Proporcional Segmentada */}
        <div className="flex-1 max-w-2xl flex flex-col space-y-1.5">
          <div className="w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden">
            {pctOfrendas > 0 && (
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${pctOfrendas}%` }}
                title={`Ofrendas: ${formatearMoneda(totalOfrendas)} (${pctOfrendas}%)`}
              />
            )}
            {pctDiezmos > 0 && (
              <div 
                className="bg-indigo-500 h-full transition-all duration-500" 
                style={{ width: `${pctDiezmos}%` }}
                title={`Diezmos: ${formatearMoneda(totalDiezmos)} (${pctDiezmos}%)`}
              />
            )}
            {pctProyectos > 0 && (
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${pctProyectos}%` }}
                title={`Proyectos: ${formatearMoneda(totalProyectos)} (${pctProyectos}%)`}
              />
            )}
            {totalEntradas === 0 && (
              <div className="bg-slate-200 h-full w-full" />
            )}
          </div>
          
          {/* Leyenda con montos y porcentajes */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Ofrendas: <strong className="text-slate-800 tabular-nums">{formatearMoneda(totalOfrendas)}</strong> ({pctOfrendas}%)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
              <span>Diezmos: <strong className="text-slate-800 tabular-nums">{formatearMoneda(totalDiezmos)}</strong> ({pctDiezmos}%)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>Proyectos: <strong className="text-slate-800 tabular-nums">{formatearMoneda(totalProyectos)}</strong> ({pctProyectos}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. RECAUDACIÓN: CULTO MIÉRCOLES VS DOMINGO APPLE HIG */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
              Comparativa de Días Clave
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              Recaudación: Miércoles vs Domingo
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Desglose de ofrendas, diezmos y proyectos por cada día de servicio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tarjeta Miércoles */}
          <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-bold text-sm text-slate-800">Cultos de Miércoles</span>
                </div>
                <p className="text-xs text-slate-500">Oración y doctrina de mitad de semana</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Proporción</span>
                <span className="text-lg font-black text-amber-800">
                  {totalEntradas > 0 
                    ? Math.round((totalMiercoles / totalEntradas) * 100) 
                    : 0}%
                </span>
              </div>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-amber-900 tabular-nums">
              {formatearMoneda(totalMiercoles)}
            </div>

            {/* Separación de Ofrendas, Diezmos y Proyectos en Miércoles */}
            <div className="pt-2.5 border-t border-amber-200/60 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/80 rounded-xl py-1.5 px-1 border border-amber-200/40">
                <span className="text-[10px] text-emerald-700 font-semibold block">🌿 Ofrendas</span>
                <span className="text-xs font-black text-slate-900 tabular-nums">{formatearMoneda(ofrendasMiercoles)}</span>
              </div>
              <div className="bg-white/80 rounded-xl py-1.5 px-1 border border-amber-200/40">
                <span className="text-[10px] text-indigo-700 font-semibold block">🪙 Diezmos</span>
                <span className="text-xs font-black text-slate-900 tabular-nums">{formatearMoneda(diezmosMiercoles)}</span>
              </div>
              <div className="bg-white/80 rounded-xl py-1.5 px-1 border border-amber-200/40">
                <span className="text-[10px] text-amber-700 font-semibold block">🏛️ Proyectos</span>
                <span className="text-xs font-black text-slate-900 tabular-nums">{formatearMoneda(proyectosMiercoles)}</span>
              </div>
            </div>
          </div>

          {/* Tarjeta Domingo */}
          <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-sm text-slate-800">Cultos de Domingo</span>
                </div>
                <p className="text-xs text-slate-500">Servicios matutinos y vespertinos</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Proporción</span>
                <span className="text-lg font-black text-emerald-800">
                  {totalEntradas > 0 
                    ? Math.round((totalDomingo / totalEntradas) * 100) 
                    : 0}%
                </span>
              </div>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-emerald-900 tabular-nums">
              {formatearMoneda(totalDomingo)}
            </div>

            {/* Separación de Ofrendas, Diezmos y Proyectos en Domingo */}
            <div className="pt-2.5 border-t border-emerald-200/60 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/80 rounded-xl py-1.5 px-1 border border-emerald-200/40">
                <span className="text-[10px] text-emerald-700 font-semibold block">🌿 Ofrendas</span>
                <span className="text-xs font-black text-slate-900 tabular-nums">{formatearMoneda(ofrendasDomingo)}</span>
              </div>
              <div className="bg-white/80 rounded-xl py-1.5 px-1 border border-emerald-200/40">
                <span className="text-[10px] text-indigo-700 font-semibold block">🪙 Diezmos</span>
                <span className="text-xs font-black text-slate-900 tabular-nums">{formatearMoneda(diezmosDomingo)}</span>
              </div>
              <div className="bg-white/80 rounded-xl py-1.5 px-1 border border-emerald-200/40">
                <span className="text-[10px] text-amber-700 font-semibold block">🏛️ Proyectos</span>
                <span className="text-xs font-black text-slate-900 tabular-nums">{formatearMoneda(proyectosDomingo)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. DESGLOSE DE ENTRADAS & PROYECTOS ACTIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Desglose de Tipos de Ingresos */}
        <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">
              Desglose de Entradas
            </h4>
            <Coins className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Ofrendas Generales y Cultos</span>
                </span>
                <span className="text-slate-900 font-bold tabular-nums">{formatearMoneda(totalOfrendas)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalEntradas > 0 ? (totalOfrendas / totalEntradas) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Diezmos de Miembros</span>
                </span>
                <span className="text-slate-900 font-bold tabular-nums">{formatearMoneda(totalDiezmos)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalEntradas > 0 ? (totalDiezmos / totalEntradas) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Pactos y Proyectos</span>
                </span>
                <span className="text-slate-900 font-bold tabular-nums">{formatearMoneda(totalProyectos)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalEntradas > 0 ? (totalProyectos / totalEntradas) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Total recaudado:</span>
            <span className="font-black text-slate-950 tabular-nums">{formatearMoneda(totalEntradas)}</span>
          </div>
        </div>

        {/* Proyectos Pactados Activos */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center space-x-2">
              <Landmark className="w-4 h-4 text-indigo-600" />
              <span>Proyectos Pactados en Curso</span>
            </h4>
            <button
              onClick={onIrAPactos}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {proyectos.slice(0, 3).map((p) => {
              const pct = Math.min(100, Math.round((p.total_recaudado / (p.meta_total || 1)) * 100));
              return (
                <div key={p.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">{p.nombre}</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full self-start sm:self-auto">
                      Cuota sugerida: {formatearMoneda(p.valor_semanal_sugerido)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden my-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Recaudado: <strong className="text-slate-900">{formatearMoneda(p.total_recaudado)}</strong> ({pct}%)</span>
                    <span>Meta: <strong className="text-slate-900">{formatearMoneda(p.meta_total)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 5. ÚLTIMOS MOVIMIENTOS REGISTRADOS */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Últimos Movimientos Registrados</h4>
          </div>

          <button
            onClick={onIrALibroCaja}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-0.5"
          >
            <span>Ver Libro de Caja</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9F9FB] text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Fecha / Día</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Categoría / Concepto</th>
                <th className="py-2.5 px-3">Miembro / Fiel</th>
                <th className="py-2.5 px-3">Evidencia R2</th>
                <th className="py-2.5 px-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ultimasTransacciones.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 whitespace-nowrap">
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

                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.tipo === 'ingreso'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {t.tipo === 'ingreso' ? '+ Entrada' : '- Gasto'}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 text-xs block">{t.categoria}</span>
                    <span className="text-xs text-slate-500 truncate max-w-xs block">{t.concepto}</span>
                  </td>

                  <td className="py-3 px-3 text-xs font-semibold text-slate-800">
                    {t.miembro_nombre || <span className="text-slate-400 italic">N/A</span>}
                  </td>

                  <td className="py-3 px-3">
                    {t.evidencia_url ? (
                      <button
                        type="button"
                        onClick={() => onVerEvidencia(t.evidencia_url!, t.evidencia_nombre)}
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        <Eye className="w-3 h-3 text-sky-600" />
                        <span>Ver Recibo</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>

                  <td className={`py-3 px-3 text-right font-black text-sm whitespace-nowrap tabular-nums ${
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
