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
import { ResumenFinanciero, Transaccion, ProyectoPactado } from '../types';
import { formatearMoneda, formatearFechaCorta } from '../utils/dateUtils';

interface DashboardViewProps {
  resumen: ResumenFinanciero;
  transacciones: Transaccion[];
  proyectos: ProyectoPactado[];
  onIrACaptura: (tipoCulto?: 'miercoles_general' | 'domingo_manana') => void;
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

      {/* 2. TARJETAS DE SALDO PRINCIPAL (ESTILO APPLE FINANCE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Saldo Neto */}
        <div className="bg-slate-950 text-white p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Fondo en Caja / Bancos</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${resumen.saldoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatearMoneda(resumen.saldoNeto)}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-4 flex items-center space-x-1.5 pt-3 border-t border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Balance neto disponible</span>
          </div>
        </div>

        {/* Total Ingresos */}
        <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Entradas</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight tabular-nums">
              {formatearMoneda(resumen.totalIngresos)}
            </div>
          </div>
          <div className="text-[11px] text-emerald-700 font-bold mt-4 pt-3 border-t border-slate-100 flex items-center space-x-1">
            <span>Diezmos, ofrendas y pactos</span>
          </div>
        </div>

        {/* Total Gastos */}
        <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Egresos</span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight tabular-nums">
              {formatearMoneda(resumen.totalGastos)}
            </div>
          </div>
          <div className="text-[11px] text-rose-700 font-bold mt-4 pt-3 border-t border-slate-100 flex items-center space-x-1">
            <span>Comprobantes en Cloudflare R2</span>
          </div>
        </div>

        {/* Proyectos Pactados */}
        <div 
          onClick={onIrAPactos}
          className="bg-white/90 backdrop-blur-xl border border-black/[0.06] hover:border-indigo-300 p-5 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99]"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Proyectos Pactados</span>
              <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                <Landmark className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight tabular-nums">
              {formatearMoneda(resumen.totalProyectosRecaudado)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span>Meta: {formatearMoneda(resumen.totalProyectosMeta)}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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
            Comparativa de ofrendas y diezmos según el día del servicio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tarjeta Miércoles */}
          <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-bold text-sm text-slate-800">Cultos de Miércoles</span>
              </div>
              <p className="text-xs text-slate-500">Oración y doctrina de mitad de semana</p>
              <div className="text-2xl font-black text-amber-900 pt-1 tabular-nums">
                {formatearMoneda(resumen.ingresosMiercoles)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Proporción</span>
              <span className="text-xl font-black text-amber-800">
                {resumen.totalIngresos > 0 
                  ? Math.round((resumen.ingresosMiercoles / resumen.totalIngresos) * 100) 
                  : 0}%
              </span>
            </div>
          </div>

          {/* Tarjeta Domingo */}
          <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-sm text-slate-800">Cultos de Domingo</span>
              </div>
              <p className="text-xs text-slate-500">Servicios matutinos y vespertinos</p>
              <div className="text-2xl font-black text-emerald-900 pt-1 tabular-nums">
                {formatearMoneda(resumen.ingresosDomingo)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Proporción</span>
              <span className="text-xl font-black text-emerald-800">
                {resumen.totalIngresos > 0 
                  ? Math.round((resumen.ingresosDomingo / resumen.totalIngresos) * 100) 
                  : 0}%
              </span>
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
                  <span>Ofrendas Generales</span>
                </span>
                <span className="text-slate-900 font-bold tabular-nums">{formatearMoneda(resumen.totalOfrendas)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${resumen.totalIngresos > 0 ? (resumen.totalOfrendas / resumen.totalIngresos) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Diezmos de Miembros</span>
                </span>
                <span className="text-slate-900 font-bold tabular-nums">{formatearMoneda(resumen.totalDiezmos)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${resumen.totalIngresos > 0 ? (resumen.totalDiezmos / resumen.totalIngresos) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Pactos y Proyectos</span>
                </span>
                <span className="text-slate-900 font-bold tabular-nums">{formatearMoneda(resumen.totalPactos)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${resumen.totalIngresos > 0 ? (resumen.totalPactos / resumen.totalIngresos) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Total recaudado:</span>
            <span className="font-black text-slate-950 tabular-nums">{formatearMoneda(resumen.totalIngresos)}</span>
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
