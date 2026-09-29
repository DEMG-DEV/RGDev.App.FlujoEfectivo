import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  Coins, 
  Landmark, 
  Calendar, 
  Sparkles, 
  DollarSign, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { ProyectoPactado, TipoCulto, MetodoPago } from '../types';
import { storageService } from '../services/storageService';
import { formatearMoneda, getFechaHoy } from '../utils/dateUtils';

interface ModalFinalizarProyectoProps {
  isOpen: boolean;
  onClose: () => void;
  proyecto: ProyectoPactado | null;
  onProyectoFinalizado: () => void;
}

export const ModalFinalizarProyecto: React.FC<ModalFinalizarProyectoProps> = ({
  isOpen,
  onClose,
  proyecto,
  onProyectoFinalizado
}) => {
  if (!isOpen || !proyecto) return null;

  const recaudado = proyecto.total_recaudado || 0;
  const gastado = proyecto.total_gastado || 0;
  const remanenteCalculado = Math.max(0, recaudado - gastado);

  const [montoResto, setMontoResto] = useState<string>(String(remanenteCalculado));
  const [concepto, setConcepto] = useState<string>(`Resto del proyecto: ${proyecto.nombre}`);
  const [fecha, setFecha] = useState<string>(getFechaHoy());
  const [tipoCulto, setTipoCulto] = useState<TipoCulto>('domingo_manana');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [cerrarProyecto, setCerrarProyecto] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const montoNum = parseFloat(montoResto);

    if (isNaN(montoNum) || montoNum < 0) {
      setError('Por favor ingresa un monto válido mayor o igual a $0.00');
      return;
    }

    setSubmitting(true);
    try {
      if (montoNum > 0) {
        await storageService.liquidarYMoverRestoProyecto({
          proyectoId: proyecto.id,
          montoResto: montoNum,
          fecha,
          tipoCulto,
          metodoPago,
          cerrarProyecto
        });
      } else if (cerrarProyecto) {
        await storageService.editarProyecto(proyecto.id, {
          activo: false,
          fecha_fin: fecha
        });
      }

      onProyectoFinalizado();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la liquidación del proyecto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Cabecera Apple HIG */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                Finalizar Proyecto & Traslado de Resto
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Mover fondos no gastados a Ofrenda General
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen Financiero del Proyecto */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Proyecto:</span>
            <span className="font-black text-indigo-950">{proyecto.nombre}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-200/70">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Recaudado</span>
              <span className="font-black text-slate-900 text-xs sm:text-sm tabular-nums">
                {formatearMoneda(recaudado)}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Gastado</span>
              <span className="font-black text-rose-700 text-xs sm:text-sm tabular-nums">
                {formatearMoneda(gastado)}
              </span>
            </div>

            <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Remanente</span>
              <span className="font-black text-emerald-800 text-xs sm:text-sm tabular-nums">
                {formatearMoneda(remanenteCalculado)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-1 flex items-start space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>
              Si el proyecto concluyó sin gastar el 100% de los fondos, el remanente se trasladará automáticamente a la cuenta de <strong>Ofrenda General</strong> bajo el motivo <strong>"resto del proyecto"</strong>.
            </span>
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Monto a mover a Ofrenda */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Monto a Trasladar a la Ofrenda ($ MXN) *</span>
              <span className="text-emerald-700 font-bold text-xs">Fondo Restante</span>
            </label>
            <div className="relative">
              <DollarSign className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={montoResto}
                onChange={(e) => setMontoResto(e.target.value)}
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border-2 border-emerald-500/80 rounded-xl text-lg font-black text-slate-900 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          {/* Motivo de la Entrada en Ofrenda */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Motivo / Concepto en Libro de Caja
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Se registrará como un ingreso de tipo <strong>Ofrenda</strong> con esta descripción.
            </span>
          </div>

          {/* Fecha y Día de Culto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Fecha del Movimiento
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Culto de Aplicación
              </label>
              <select
                value={tipoCulto}
                onChange={(e) => setTipoCulto(e.target.value as TipoCulto)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="domingo_manana">Domingo Mañana</option>
                <option value="domingo_tarde">Domingo Tarde</option>
                <option value="miercoles_general">Miércoles General</option>
                <option value="especial">Culto Especial</option>
              </select>
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Método de Custodia
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="efectivo">Efectivo en Caja General</option>
              <option value="transferencia">Transferencia Bancaria (SPEI)</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Checkbox de Finalización */}
          <div className="pt-2">
            <label className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cerrarProyecto}
                onChange={(e) => setCerrarProyecto(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-xs text-slate-900 block">
                  Marcar proyecto como Finalizado
                </span>
                <span className="text-[10px] text-slate-500 block">
                  El proyecto pasará a la sección de históricos concluidos con fecha de fin registrada.
                </span>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{submitting ? 'Procesando...' : 'Mover Dinero a la Ofrenda'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
