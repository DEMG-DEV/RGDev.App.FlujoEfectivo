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
  Clock
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
}) => {
  const ultimasTransacciones = transacciones.slice(0, 6);

  return (
    <div className="space-y-8">
      
      {/* 1. TARJETAS DE SALDO PRINCIPAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Saldo Neto */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fondo en Caja / Bancos</span>
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${resumen.saldoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatearMoneda(resumen.saldoNeto)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Balance neto de tesorería eclesiástica</span>
          </div>
        </div>

        {/* Total Ingresos */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Entradas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatearMoneda(resumen.totalIngresos)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center space-x-1">
            <span>Diezmos, ofrendas y pactos</span>
          </div>
        </div>

        {/* Total Gastos */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Gastos</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatearMoneda(resumen.totalGastos)}
          </div>
          <div className="text-[11px] text-rose-700 font-semibold mt-2 flex items-center space-x-1">
            <span>Con evidencias en Cloudflare R2</span>
          </div>
        </div>

        {/* Proyectos Pactados */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors" onClick={onIrAPactos}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Proyectos Pactados</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-900 tracking-tight">
            {formatearMoneda(resumen.totalProyectosRecaudado)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Meta Global: {formatearMoneda(resumen.totalProyectosMeta)}
          </div>
        </div>

      </div>

      {/* 2. RECAUDACIÓN ESPECIAL: CULTO MIÉRCOLES VS DOMINGO */}
      <div className="bg-gradient-to-r from-slate-900 via-church-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full">
              Días Clave de Culto
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-2">Recaudación: Miércoles vs Domingo</h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Comparativa de capturas acumuladas por día de servicio eclesiástico.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onIrACaptura('miercoles_general')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all flex items-center space-x-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Capturar Miércoles</span>
            </button>

            <button
              onClick={() => onIrACaptura('domingo_manana')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all flex items-center space-x-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Capturar Domingo</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tarjeta Miércoles */}
          <div className="bg-slate-800/80 rounded-2xl p-5 border border-amber-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="font-bold text-sm text-slate-200">Cultos de Miércoles</span>
              </div>
              <p className="text-xs text-slate-400">Oración, doctrina y vigilias de mitad de semana</p>
              <div className="text-2xl font-extrabold text-amber-300 pt-1">
                {formatearMoneda(resumen.ingresosMiercoles)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Porcentaje</span>
              <span className="text-lg font-bold text-white">
                {resumen.totalIngresos > 0 
                  ? Math.round((resumen.ingresosMiercoles / resumen.totalIngresos) * 100) 
                  : 0}%
              </span>
            </div>
          </div>

          {/* Tarjeta Domingo */}
          <div className="bg-slate-800/80 rounded-2xl p-5 border border-emerald-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="font-bold text-sm text-slate-200">Cultos de Domingo</span>
              </div>
              <p className="text-xs text-slate-400">Servicios generales matutinos y vespertinos</p>
              <div className="text-2xl font-extrabold text-emerald-300 pt-1">
                {formatearMoneda(resumen.ingresosDomingo)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Porcentaje</span>
              <span className="text-lg font-bold text-white">
                {resumen.totalIngresos > 0 
                  ? Math.round((resumen.ingresosDomingo / resumen.totalIngresos) * 100) 
                  : 0}%
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. DESGLOSE DE ENTRADAS & PROYECTOS ACTIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Desglose de Tipos de Ingresos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h4 className="font-bold text-slate-900 text-base flex items-center justify-between">
            <span>Desglose de Entradas</span>
            <Coins className="w-4 h-4 text-slate-400" />
          </h4>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Ofrendas Generales</span>
                </span>
                <span className="text-slate-900 font-bold">{formatearMoneda(resumen.totalOfrendas)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${resumen.totalIngresos > 0 ? (resumen.totalOfrendas / resumen.totalIngresos) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Diezmos de Miembros</span>
                </span>
                <span className="text-slate-900 font-bold">{formatearMoneda(resumen.totalDiezmos)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-indigo-500 h-2 rounded-full"
                  style={{ width: `${resumen.totalIngresos > 0 ? (resumen.totalDiezmos / resumen.totalIngresos) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600 flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Pactos y Proyectos</span>
                </span>
                <span className="text-slate-900 font-bold">{formatearMoneda(resumen.totalPactos)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${resumen.totalIngresos > 0 ? (resumen.totalPactos / resumen.totalIngresos) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Total capturado:</span>
            <span className="font-extrabold text-slate-900">{formatearMoneda(resumen.totalIngresos)}</span>
          </div>
        </div>

        {/* Proyectos Pactados Activos */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <Landmark className="w-4 h-4 text-indigo-600" />
              <span>Proyectos Pactados en Marcha</span>
            </h4>
            <button
              onClick={onIrAPactos}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {proyectos.map((p) => {
              const pct = Math.min(100, Math.round((p.total_recaudado / (p.meta_total || 1)) * 100));
              return (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <span className="font-bold text-sm text-slate-900">{p.nombre}</span>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                      Cuota semanal: {formatearMoneda(p.valor_semanal_sugerido)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden my-2">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Recaudado: <strong className="text-slate-800">{formatearMoneda(p.total_recaudado)}</strong> ({pct}%)</span>
                    <span>Meta: <strong className="text-slate-800">{formatearMoneda(p.meta_total)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. ÚLTIMOS MOVIMIENTOS REGISTRADOS */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h4 className="font-bold text-slate-900 text-base">Últimos Movimientos del Flujo</h4>
          </div>

          <button
            onClick={onIrALibroCaja}
            className="text-xs font-bold text-church-600 hover:text-church-800 flex items-center space-x-1"
          >
            <span>Ver Libro de Caja Completo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
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

                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
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

                  <td className="py-3 px-3 text-xs text-slate-700">
                    {t.miembro_nombre || <span className="text-slate-400 italic">N/A</span>}
                  </td>

                  <td className="py-3 px-3">
                    {t.evidencia_url ? (
                      <button
                        type="button"
                        onClick={() => onVerEvidencia(t.evidencia_url!, t.evidencia_nombre)}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1 rounded-md transition-colors"
                      >
                        <Eye className="w-3 h-3 text-sky-600" />
                        <span>Ver Recibo</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>

                  <td className={`py-3 px-3 text-right font-extrabold text-sm whitespace-nowrap ${
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
