import React, { useState } from 'react';
import { 
  Landmark, 
  PlusCircle, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  UserPlus, 
  Clock, 
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ProyectoPactado, PactoMiembro } from '../types';
import { storageService } from '../services/storageService';
import { formatearMoneda, formatearFechaCorta } from '../utils/dateUtils';

interface ProyectosPactadosProps {
  onAbonarPacto?: (proyectoId: string, pactoId: string) => void;
}

export const ProyectosPactadosView: React.FC<ProyectosPactadosProps> = ({ onAbonarPacto }) => {
  const [proyectos, setProyectos] = useState<ProyectoPactado[]>(() => storageService.getProyectos());
  const [pactos, setPactos] = useState<PactoMiembro[]>(() => storageService.getPactos());
  const [proyectoActivoId, setProyectoActivoId] = useState<string>(() => proyectos[0]?.id || '');

  // Modales
  const [mostrarModalNuevoProyecto, setMostrarModalNuevoProyecto] = useState(false);
  const [mostrarModalNuevoPacto, setMostrarModalNuevoPacto] = useState(false);

  // Formulario Nuevo Proyecto
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [descProyecto, setDescProyecto] = useState('');
  const [metaProyecto, setMetaProyecto] = useState('');
  const [valorSemanalSugerido, setValorSemanalSugerido] = useState('');

  // Formulario Nuevo Pacto
  const [miembroPacto, setMiembroPacto] = useState('');
  const [telefonoPacto, setTelefonoPacto] = useState('');
  const [montoPactado, setMontoPactado] = useState('');
  const [cuotaSemanalPacto, setCuotaSemanalPacto] = useState('');

  const recargar = () => {
    setProyectos(storageService.getProyectos());
    setPactos(storageService.getPactos());
  };

  const proyectoSeleccionado = proyectos.find(p => p.id === proyectoActivoId) || proyectos[0];
  const pactosDelProyecto = pactos.filter(p => p.proyecto_id === proyectoSeleccionado?.id);

  // Crear nuevo Proyecto
  const handleCrearProyecto = (e: React.FormEvent) => {
    e.preventDefault();
    const metaNum = parseFloat(metaProyecto);
    const semanalNum = parseFloat(valorSemanalSugerido);

    if (!nombreProyecto.trim() || isNaN(metaNum) || metaNum <= 0) {
      alert('Ingresa un nombre y meta válida para el proyecto');
      return;
    }

    const nuevo = storageService.guardarProyecto({
      nombre: nombreProyecto.trim(),
      descripcion: descProyecto.trim(),
      meta_total: metaNum,
      valor_semanal_sugerido: isNaN(semanalNum) ? 0 : semanalNum,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      activo: true,
      color_acento: '#4f46e5'
    });

    recargar();
    setProyectoActivoId(nuevo.id);
    setNombreProyecto('');
    setDescProyecto('');
    setMetaProyecto('');
    setValorSemanalSugerido('');
    setMostrarModalNuevoProyecto(false);
  };

  // Registrar Nuevo Pacto
  const handleCrearPacto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proyectoSeleccionado) return;

    const montoNum = parseFloat(montoPactado);
    const cuotaNum = parseFloat(cuotaSemanalPacto);

    if (!miembroPacto.trim() || isNaN(montoNum) || montoNum <= 0 || isNaN(cuotaNum) || cuotaNum <= 0) {
      alert('Ingresa nombre del hermano, monto total y cuota semanal válida');
      return;
    }

    const semanasEstimadas = Math.ceil(montoNum / cuotaNum);

    storageService.guardarPacto({
      proyecto_id: proyectoSeleccionado.id,
      proyecto_nombre: proyectoSeleccionado.nombre,
      miembro_nombre: miembroPacto.trim(),
      miembro_telefono: telefonoPacto.trim(),
      monto_total_pactado: montoNum,
      cuota_semanal: cuotaNum,
      semanas_estimadas: semanasEstimadas,
      fecha_inicio: new Date().toISOString().slice(0, 10)
    });

    recargar();
    setMiembroPacto('');
    setTelefonoPacto('');
    setMontoPactado('');
    setCuotaSemanalPacto('');
    setMostrarModalNuevoPacto(false);
  };

  // Cálculos del proyecto activo
  const meta = proyectoSeleccionado?.meta_total || 1;
  const recaudado = proyectoSeleccionado?.total_recaudado || 0;
  const porcentaje = Math.min(100, Math.round((recaudado / meta) * 100));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Landmark className="w-4 h-4" />
            <span>Fe & Compromiso Financiero</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Proyectos Pactados</h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Gestiona proyectos de edificación, audio y terreno donde cada miembro pacta un monto total y una cuota semanal periódica.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMostrarModalNuevoProyecto(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Selector de Proyecto Activo */}
      {proyectos.length > 1 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {proyectos.map((p) => (
            <button
              key={p.id}
              onClick={() => setProyectoActivoId(p.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                (proyectoSeleccionado?.id === p.id)
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Tarjeta de Progreso del Proyecto Seleccionado */}
      {proyectoSeleccionado && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                Proyecto Activo
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{proyectoSeleccionado.nombre}</h3>
              <p className="text-slate-600 text-sm mt-1">{proyectoSeleccionado.descripcion}</p>
            </div>

            <button
              onClick={() => setMostrarModalNuevoPacto(true)}
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm shadow-md shadow-amber-500/20 transition-all self-start md:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Registrar Pactante</span>
            </button>
          </div>

          {/* Barra de Progreso y Métricas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-slate-600">Avance hacia la meta:</span>
              <span className="text-indigo-600 font-bold text-base">{porcentaje}% alcanzado</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>

          {/* Cifras Clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium block">Meta Financiera:</span>
              <span className="text-lg font-bold text-slate-900">{formatearMoneda(proyectoSeleccionado.meta_total)}</span>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs text-emerald-700 font-medium block">Recaudado en Caja:</span>
              <span className="text-lg font-bold text-emerald-800">{formatearMoneda(proyectoSeleccionado.total_recaudado)}</span>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-100">
              <span className="text-xs text-amber-700 font-medium block">Falta por Recaudar:</span>
              <span className="text-lg font-bold text-amber-900">
                {formatearMoneda(Math.max(0, proyectoSeleccionado.meta_total - proyectoSeleccionado.total_recaudado))}
              </span>
            </div>

            <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100">
              <span className="text-xs text-indigo-700 font-medium block">Cuota Sugerida:</span>
              <span className="text-lg font-bold text-indigo-900">
                {formatearMoneda(proyectoSeleccionado.valor_semanal_sugerido)} / sem
              </span>
            </div>
          </div>

          {/* Tabla de Miembros con Pacto */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-slate-600" />
                <h4 className="font-bold text-slate-900 text-base">Hermanos y Familias Pactantes ({pactosDelProyecto.length})</h4>
              </div>
            </div>

            {pactosDelProyecto.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Aún no hay hermanos con pacto registrado en este proyecto.</p>
                <p className="text-xs text-slate-500 mt-1">Haz clic en "+ Registrar Pactante" para pactar un monto y valor semanal.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Hermano / Familia</th>
                      <th className="py-3 px-4">Pacto Total</th>
                      <th className="py-3 px-4">Cuota Semanal</th>
                      <th className="py-3 px-4">Total Aportado</th>
                      <th className="py-3 px-4">Saldo Restante</th>
                      <th className="py-3 px-4">Avance Semanas</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pactosDelProyecto.map((p) => {
                      const pctPacto = Math.min(100, Math.round((p.total_aportado / p.monto_total_pactado) * 100));
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{p.miembro_nombre}</span>
                            {p.miembro_telefono && (
                              <span className="text-xs text-slate-400">{p.miembro_telefono}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {formatearMoneda(p.monto_total_pactado)}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-indigo-700">
                            {formatearMoneda(p.cuota_semanal)}/sem
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600">
                            {formatearMoneda(p.total_aportado)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-amber-700">
                            {formatearMoneda(p.saldo_pendiente)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-slate-700 block">
                                {p.semanas_pagadas} de {p.semanas_estimadas} semanas ({pctPacto}%)
                              </span>
                              <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${p.estado === 'completado' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                  style={{ width: `${pctPacto}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {onAbonarPacto && (
                              <button
                                type="button"
                                onClick={() => onAbonarPacto(p.proyecto_id, p.id)}
                                className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-3 py-1.5 rounded-lg transition-colors inline-flex items-center space-x-1"
                              >
                                <span>Abonar</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Crear Nuevo Proyecto */}
      {mostrarModalNuevoProyecto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Crear Nuevo Proyecto Pactado</h3>
            <p className="text-xs text-slate-500">
              Define la meta global y el valor semanal sugerido que los miembros se comprometerán a sembrar.
            </p>

            <form onSubmit={handleCrearProyecto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Proyecto *</label>
                <input
                  type="text"
                  placeholder="Ej. Adquisición de Terreno Anexo, Buses de Transporte..."
                  value={nombreProyecto}
                  onChange={(e) => setNombreProyecto(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Propósito</label>
                <textarea
                  rows={2}
                  placeholder="Detalles del proyecto para motivación de la congregación..."
                  value={descProyecto}
                  onChange={(e) => setDescProyecto(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meta Total ($ MXN) *</label>
                  <input
                    type="number"
                    step="100"
                    placeholder="100000"
                    value={metaProyecto}
                    onChange={(e) => setMetaProyecto(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cuota Semanal Sugerida ($)</label>
                  <input
                    type="number"
                    step="50"
                    placeholder="500"
                    value={valorSemanalSugerido}
                    onChange={(e) => setValorSemanalSugerido(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevoProyecto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                >
                  Guardar Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Pacto de Hermano */}
      {mostrarModalNuevoPacto && proyectoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Registrar Pacto de Hermano / Familia</h3>
            <p className="text-xs text-slate-500">
              Proyecto: <strong className="text-indigo-600">{proyectoSeleccionado.nombre}</strong>
            </p>

            <form onSubmit={handleCrearPacto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Hermano o Familia *</label>
                <input
                  type="text"
                  placeholder="Ej. Familia Hernández, Hno. Samuel Castillo..."
                  value={miembroPacto}
                  onChange={(e) => setMiembroPacto(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp (Opcional)</label>
                <input
                  type="tel"
                  placeholder="Ej. 55-1234-5678"
                  value={telefonoPacto}
                  onChange={(e) => setTelefonoPacto(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monto Total Pactado ($) *</label>
                  <input
                    type="number"
                    step="100"
                    placeholder="10000"
                    value={montoPactado}
                    onChange={(e) => setMontoPactado(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cuota Semanal ($) *</label>
                  <input
                    type="number"
                    step="50"
                    placeholder="500"
                    value={cuotaSemanalPacto}
                    onChange={(e) => setCuotaSemanalPacto(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              {montoPactado && cuotaSemanalPacto && parseFloat(cuotaSemanalPacto) > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                  🗓️ Con este acuerdo, el hermano completará su pacto en aprox.{' '}
                  <strong>{Math.ceil(parseFloat(montoPactado) / parseFloat(cuotaSemanalPacto))} semanas</strong>.
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevoPacto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 shadow-md shadow-amber-500/20"
                >
                  Registrar Pacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
