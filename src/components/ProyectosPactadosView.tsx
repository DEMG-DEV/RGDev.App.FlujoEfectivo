import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Pencil,
  Trash2,
  X,
  Coins,
  RotateCcw
} from 'lucide-react';
import { ProyectoPactado, PactoMiembro } from '../types';
import { storageService } from '../services/storageService';
import { formatearMoneda, formatearFechaCorta } from '../utils/dateUtils';
import { ModalFinalizarProyecto } from './ModalFinalizarProyecto';

interface ProyectosPactadosProps {
  onAbonarPacto?: (proyectoId: string, pactoId: string) => void;
  onProyectoFinalizado?: () => void;
}

export const ProyectosPactadosView: React.FC<ProyectosPactadosProps> = ({ 
  onAbonarPacto,
  onProyectoFinalizado 
}) => {
  const [proyectos, setProyectos] = useState<ProyectoPactado[]>(() => storageService.getProyectos());
  const [pactos, setPactos] = useState<PactoMiembro[]>(() => storageService.getPactos());
  const [proyectoActivoId, setProyectoActivoId] = useState<string>(() => proyectos[0]?.id || '');
  const [filtroEstado, setFiltroEstado] = useState<'activos' | 'finalizados' | 'todos'>('activos');

  // Modales
  const [mostrarModalNuevoProyecto, setMostrarModalNuevoProyecto] = useState(false);
  const [mostrarModalNuevoPacto, setMostrarModalNuevoPacto] = useState(false);
  const [mostrarModalEditarPacto, setMostrarModalEditarPacto] = useState(false);
  const [mostrarModalFinalizar, setMostrarModalFinalizar] = useState(false);

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

  // Formulario Editar Pacto
  const [pactoAEditar, setPactoAEditar] = useState<PactoMiembro | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editMonto, setEditMonto] = useState('');
  const [editCuota, setEditCuota] = useState('');
  const [editEstado, setEditEstado] = useState<'al_dia' | 'completado' | 'pendiente'>('al_dia');
  const [guardandoPacto, setGuardandoPacto] = useState(false);

  // Sincronización con backend (PostgreSQL)
  const recargar = async () => {
    setProyectos(storageService.getProyectos());
    setPactos(storageService.getPactos());
    try {
      const [projs, pcts] = await Promise.all([
        storageService.cargarProyectosRemotos(),
        storageService.cargarPactosRemotos()
      ]);
      setProyectos(projs);
      setPactos(pcts);
      if (!proyectoActivoId && projs.length > 0) {
        setProyectoActivoId(projs[0].id);
      }
    } catch (e) {
      console.warn('Error al sincronizar proyectos y pactos:', e);
    }
  };

  useEffect(() => {
    let montado = true;
    const inicializar = async () => {
      try {
        const [projs, pcts] = await Promise.all([
          storageService.cargarProyectosRemotos(),
          storageService.cargarPactosRemotos()
        ]);
        if (montado) {
          setProyectos(projs);
          setPactos(pcts);
          if (projs.length > 0) {
            setProyectoActivoId(actual => actual || projs[0].id);
          }
        }
      } catch (e) {
        console.warn('Error al sincronizar datos remotos iniciales:', e);
      }
    };
    inicializar();
    return () => { montado = false; };
  }, []);

  // Filtrado de proyectos por estado
  const proyectosFiltrados = proyectos.filter(p => {
    if (filtroEstado === 'activos') return p.activo !== false;
    if (filtroEstado === 'finalizados') return p.activo === false;
    return true;
  });

  const proyectoSeleccionado = proyectosFiltrados.find(p => p.id === proyectoActivoId) 
    || proyectosFiltrados[0] 
    || proyectos.find(p => p.id === proyectoActivoId) 
    || proyectos[0];

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
  const handleCrearPacto = async (e: React.FormEvent) => {
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

    await recargar();
    setMiembroPacto('');
    setTelefonoPacto('');
    setMontoPactado('');
    setCuotaSemanalPacto('');
    setMostrarModalNuevoPacto(false);
  };

  // Abrir modal de edición de pacto
  const handleAbrirEditarPacto = (p: PactoMiembro) => {
    setPactoAEditar(p);
    setEditNombre(p.miembro_nombre);
    setEditTelefono(p.miembro_telefono || '');
    setEditMonto(String(p.monto_total_pactado));
    setEditCuota(String(p.cuota_semanal));
    setEditEstado(p.estado || 'al_dia');
    setMostrarModalEditarPacto(true);
  };

  // Guardar cambios del pacto
  const handleGuardarEditarPacto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pactoAEditar) return;

    const montoNum = parseFloat(editMonto);
    const cuotaNum = parseFloat(editCuota);

    if (!editNombre.trim() || isNaN(montoNum) || montoNum <= 0 || isNaN(cuotaNum) || cuotaNum <= 0) {
      alert('Por favor completa el nombre, monto total válido y cuota semanal.');
      return;
    }

    setGuardandoPacto(true);
    try {
      await storageService.editarPacto(pactoAEditar.id, {
        miembro_nombre: editNombre.trim(),
        miembro_telefono: editTelefono.trim(),
        monto_total_pactado: montoNum,
        cuota_semanal: cuotaNum,
        estado: editEstado
      });
      await recargar();
      setMostrarModalEditarPacto(false);
      setPactoAEditar(null);
    } catch (err) {
      alert('Error al actualizar los datos del pactante.');
    } finally {
      setGuardandoPacto(false);
    }
  };

  // Eliminar pacto
  const handleEliminarPacto = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el pacto de "${nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    await storageService.eliminarPacto(id);
    await recargar();
    if (pactoAEditar?.id === id) {
      setMostrarModalEditarPacto(false);
      setPactoAEditar(null);
    }
  };

  // Reabrir proyecto
  const handleReabrirProyecto = async (id: string) => {
    if (window.confirm('¿Deseas reactivar este proyecto para continuar capturando pactos?')) {
      await storageService.editarProyecto(id, { activo: true, fecha_fin: undefined });
      await recargar();
    }
  };

  // Cálculos del proyecto activo
  const meta = proyectoSeleccionado?.meta_total || 1;
  const totalAportadoPactos = pactosDelProyecto.reduce((acc, p) => acc + (p.total_aportado || 0), 0);
  const recaudado = Math.max(proyectoSeleccionado?.total_recaudado || 0, totalAportadoPactos);
  const gastado = proyectoSeleccionado?.total_gastado || 0;
  const remanenteNoGastado = Math.max(0, recaudado - gastado);
  const porcentaje = Math.min(100, Math.round((recaudado / meta) * 100));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Encabezado Apple HIG */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-[11px] font-bold uppercase tracking-wider mb-1">
            <Landmark className="w-3.5 h-3.5" />
            <span>Fe & Compromiso Financiero</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
            Proyectos Pactados
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-xl">
            Proyectos de edificación, instrumentos y terreno donde cada miembro pacta una meta personal y una cuota periódica.
          </p>
        </div>

        <button
          onClick={() => setMostrarModalNuevoProyecto(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nuevo Proyecto</span>
        </button>
      </div>

      {/* Barra de Filtro de Estado (Activos / Finalizados) y Selector de Proyectos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="apple-segmented-group">
          <button
            onClick={() => setFiltroEstado('activos')}
            className={`apple-segmented-item px-3.5 py-1.5 text-xs font-semibold ${filtroEstado === 'activos' ? 'apple-segmented-active text-indigo-950' : 'text-slate-600'}`}
          >
            Activos ({proyectos.filter(p => p.activo !== false).length})
          </button>
          <button
            onClick={() => setFiltroEstado('finalizados')}
            className={`apple-segmented-item px-3.5 py-1.5 text-xs font-semibold ${filtroEstado === 'finalizados' ? 'apple-segmented-active text-indigo-950' : 'text-slate-600'}`}
          >
            Finalizados ({proyectos.filter(p => p.activo === false).length})
          </button>
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`apple-segmented-item px-3.5 py-1.5 text-xs font-semibold ${filtroEstado === 'todos' ? 'apple-segmented-active text-indigo-950' : 'text-slate-600'}`}
          >
            Todos ({proyectos.length})
          </button>
        </div>
      </div>

      {/* Selector de Proyecto Activo Apple Segmented Tabs */}
      {proyectosFiltrados.length > 0 ? (
        <div className="apple-segmented-group overflow-x-auto max-w-full">
          {proyectosFiltrados.map((p) => (
            <button
              key={p.id}
              onClick={() => setProyectoActivoId(p.id)}
              className={`apple-segmented-item px-4 py-2 text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 ${
                (proyectoSeleccionado?.id === p.id)
                  ? 'apple-segmented-active text-indigo-950'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{p.nombre}</span>
              {p.activo === false && (
                <span className="text-[9px] uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                  Concluido
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white text-center text-xs text-slate-500 border border-slate-200">
          No hay proyectos en esta vista.
        </div>
      )}

      {/* Tarjeta de Progreso del Proyecto Seleccionado Apple HIG */}
      {proyectoSeleccionado && (
        <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-6">
          
          {/* Encabezado y Acciones del Proyecto */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  proyectoSeleccionado.activo !== false
                    ? 'text-indigo-700 bg-indigo-50 border-indigo-200/60'
                    : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                }`}>
                  {proyectoSeleccionado.activo !== false ? 'Proyecto en Curso' : 'Proyecto Concluido'}
                </span>
                {proyectoSeleccionado.fecha_fin && (
                  <span className="text-[11px] text-slate-400">
                    Finalizado el {formatearFechaCorta(proyectoSeleccionado.fecha_fin)}
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-950 mt-1.5">{proyectoSeleccionado.nombre}</h3>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{proyectoSeleccionado.descripcion}</p>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {proyectoSeleccionado.activo !== false ? (
                <>
                  <button
                    onClick={() => setMostrarModalNuevoPacto(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Registrar Pactante</span>
                  </button>

                  <button
                    onClick={() => setMostrarModalFinalizar(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10"
                    title="Finalizar proyecto y mover resto no gastado a la ofrenda"
                  >
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span>Finalizar Proyecto / Mover Resto</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Proyecto Concluido</span>
                  </span>
                  <button
                    onClick={() => handleReabrirProyecto(proyectoSeleccionado.id)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reabrir</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Banner de Remanente si el proyecto está activo y no se gastó el 100% */}
          {remanenteNoGastado > 0 && proyectoSeleccionado.activo !== false && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <Coins className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="text-xs text-amber-950">
                  <p className="font-bold">
                    Remanente en caja: {formatearMoneda(remanenteNoGastado)} disponible
                  </p>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    Al concluir el proyecto puedes transferir este sobrante a la Ofrenda General con el motivo <strong>"resto del proyecto"</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarModalFinalizar(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap shadow-sm self-start sm:self-auto"
              >
                Mover Resto a Ofrenda
              </button>
            </div>
          )}

          {/* Barra de Progreso y Métricas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Avance de Recaudación:</span>
              <span className="text-indigo-600 font-extrabold text-sm">{porcentaje}% alcanzado</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/80">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>

          {/* Cifras Clave Apple Inset Grouped */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Meta Financiera:</span>
              <span className="text-base sm:text-lg font-black text-slate-950 tabular-nums">{formatearMoneda(proyectoSeleccionado.meta_total)}</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/70 p-4 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Recaudado en Caja:</span>
              <span className="text-base sm:text-lg font-black text-emerald-800 tabular-nums">{formatearMoneda(recaudado)}</span>
            </div>

            <div className="bg-rose-50/60 border border-rose-200/70 p-4 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Gastado en Obra:</span>
              <span className="text-base sm:text-lg font-black text-rose-900 tabular-nums">
                {formatearMoneda(gastado)}
              </span>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-200/70 p-4 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">Remanente No Gastado:</span>
              <span className="text-base sm:text-lg font-black text-indigo-950 tabular-nums">
                {formatearMoneda(remanenteNoGastado)}
              </span>
            </div>
          </div>

          {/* Tabla de Miembros con Pacto */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-500" />
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                  Hermanos y Familias con Pacto ({pactosDelProyecto.length})
                </h4>
              </div>
            </div>

            {pactosDelProyecto.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Aún no hay hermanos con pacto registrado en este proyecto.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Haz clic en "Registrar Hermano Pactante" para comenzar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F9F9FB] text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Hermano / Familia</th>
                      <th className="py-2.5 px-3">Pacto Total</th>
                      <th className="py-2.5 px-3">Cuota Semanal</th>
                      <th className="py-2.5 px-3">Total Aportado</th>
                      <th className="py-2.5 px-3">Saldo Restante</th>
                      <th className="py-2.5 px-3">Avance</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pactosDelProyecto.map((p) => {
                      const pctPacto = Math.min(100, Math.round((p.total_aportado / p.monto_total_pactado) * 100));
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block text-xs">{p.miembro_nombre}</span>
                            {p.miembro_telefono && (
                              <span className="text-[10px] text-slate-400">{p.miembro_telefono}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 text-xs tabular-nums">
                            {formatearMoneda(p.monto_total_pactado)}
                          </td>
                          <td className="py-3 px-3 font-semibold text-indigo-700 text-xs tabular-nums">
                            {formatearMoneda(p.cuota_semanal)}/sem
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-600 text-xs tabular-nums">
                            {formatearMoneda(p.total_aportado)}
                          </td>
                          <td className="py-3 px-3 font-bold text-amber-800 text-xs tabular-nums">
                            {formatearMoneda(p.saldo_pendiente)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-slate-600 block">
                                {p.semanas_pagadas} de {p.semanas_estimadas} sem ({pctPacto}%)
                              </span>
                              <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${p.estado === 'completado' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                  style={{ width: `${pctPacto}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleAbrirEditarPacto(p)}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold px-2.5 py-1 rounded-xl transition-colors inline-flex items-center space-x-1"
                                title="Editar datos"
                              >
                                <Pencil className="w-3 h-3 text-slate-500" />
                                <span>Editar</span>
                              </button>
                              {onAbonarPacto && proyectoSeleccionado.activo !== false && (
                                <button
                                  type="button"
                                  onClick={() => onAbonarPacto(p.proyecto_id, p.id)}
                                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold px-2.5 py-1 rounded-xl transition-colors inline-flex items-center space-x-1"
                                >
                                  <span>Abonar</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
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

      {/* Modal: Crear Nuevo Proyecto Apple HIG */}
      {mostrarModalNuevoProyecto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-950">Nuevo Proyecto Pactado</h3>
              <button onClick={() => setMostrarModalNuevoProyecto(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Define la meta global y el valor semanal sugerido para este proyecto eclesiástico.
            </p>

            <form onSubmit={handleCrearProyecto} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Proyecto *</label>
                <input
                  type="text"
                  placeholder="Ej. Terreno Anexo, Audio y Multimedia..."
                  value={nombreProyecto}
                  onChange={(e) => setNombreProyecto(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción / Propósito</label>
                <textarea
                  rows={2}
                  placeholder="Detalles del proyecto..."
                  value={descProyecto}
                  onChange={(e) => setDescProyecto(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Meta Total ($ MXN) *</label>
                  <input
                    type="number"
                    step="100"
                    placeholder="100000"
                    value={metaProyecto}
                    onChange={(e) => setMetaProyecto(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cuota Semanal ($)</label>
                  <input
                    type="number"
                    step="50"
                    placeholder="500"
                    value={valorSemanalSugerido}
                    onChange={(e) => setValorSemanalSugerido(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevoProyecto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 active:scale-[0.98] shadow-md shadow-indigo-600/20 transition-all"
                >
                  Guardar Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Pacto de Hermano Apple HIG */}
      {mostrarModalNuevoPacto && proyectoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-950">Registrar Hermano Pactante</h3>
              <button onClick={() => setMostrarModalNuevoPacto(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Proyecto: <strong className="text-indigo-600">{proyectoSeleccionado.nombre}</strong>
            </p>

            <form onSubmit={handleCrearPacto} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Hermano o Familia *</label>
                <input
                  type="text"
                  placeholder="Ej. Familia Hernández, Samuel Castillo..."
                  value={miembroPacto}
                  onChange={(e) => setMiembroPacto(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono / WhatsApp (Opcional)</label>
                <input
                  type="tel"
                  placeholder="Ej. 55-1234-5678"
                  value={telefonoPacto}
                  onChange={(e) => setTelefonoPacto(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monto Total Pactado ($) *</label>
                  <input
                    type="number"
                    step="100"
                    placeholder="10000"
                    value={montoPactado}
                    onChange={(e) => setMontoPactado(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cuota Semanal ($) *</label>
                  <input
                    type="number"
                    step="50"
                    placeholder="500"
                    value={cuotaSemanalPacto}
                    onChange={(e) => setCuotaSemanalPacto(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {montoPactado && cuotaSemanalPacto && parseFloat(cuotaSemanalPacto) > 0 && (
                <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900">
                  🗓️ Duración estimada del pacto:{' '}
                  <strong>{Math.ceil(parseFloat(montoPactado) / parseFloat(cuotaSemanalPacto))} semanas</strong>.
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevoPacto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 active:scale-[0.98] shadow-md shadow-amber-500/20 transition-all"
                >
                  Registrar Pacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Datos del Pactante Apple HIG */}
      {mostrarModalEditarPacto && pactoAEditar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">Editar Datos del Pactante</h3>
                  <p className="text-[11px] text-slate-500">
                    Modifica el monto, cuota semanal o contacto del hermano.
                  </p>
                </div>
              </div>
              <button onClick={() => { setMostrarModalEditarPacto(false); setPactoAEditar(null); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarEditarPacto} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Hermano o Familia *</label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono / WhatsApp (Opcional)</label>
                <input
                  type="tel"
                  placeholder="Ej. 55-1234-5678"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monto Total Pactado ($) *</label>
                  <input
                    type="number"
                    step="100"
                    value={editMonto}
                    onChange={(e) => setEditMonto(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cuota Semanal ($) *</label>
                  <input
                    type="number"
                    step="50"
                    value={editCuota}
                    onChange={(e) => setEditCuota(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado del Compromiso</label>
                <select
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="al_dia">🟢 Al Día (Activo)</option>
                  <option value="completado">✅ Completado (Meta Alcanzada)</option>
                  <option value="pendiente">🟡 Pendiente / En pausa</option>
                </select>
              </div>

              {/* Resumen en vivo */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Aportado acumulado:</span>
                  <span className="font-bold text-emerald-600">{formatearMoneda(pactoAEditar.total_aportado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo pendiente:</span>
                  <span className="font-bold text-amber-800">
                    {formatearMoneda(Math.max(0, (parseFloat(editMonto) || 0) - pactoAEditar.total_aportado))}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleEliminarPacto(pactoAEditar.id, pactoAEditar.miembro_nombre)}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl inline-flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalEditarPacto(false);
                      setPactoAEditar(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoPacto}
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 active:scale-[0.98] shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
                  >
                    {guardandoPacto ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Finalizar Proyecto y Mover Resto a Ofrenda Apple HIG */}
      {mostrarModalFinalizar && proyectoSeleccionado && (
        <ModalFinalizarProyecto
          isOpen={mostrarModalFinalizar}
          onClose={() => setMostrarModalFinalizar(false)}
          proyecto={proyectoSeleccionado}
          onProyectoFinalizado={async () => {
            await recargar();
            onProyectoFinalizado?.();
            window.dispatchEvent(new Event('storage'));
          }}
        />
      )}

    </div>
  );
};
