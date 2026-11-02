import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, 
  Plus, 
  Users, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  UserPlus, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Pencil,
  Trash2,
  X,
  Coins,
  RotateCcw,
  ArrowRightLeft,
  CalendarDays,
  Filter,
  Search,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { ProyectoPactado, PactoMiembro, Transaccion, MetodoPago, MiembroIglesia } from '../types';
import { storageService } from '../services/storageService';
import { SelectorHermano } from './SelectorHermano';
import { formatearMoneda, formatearFechaCorta } from '../utils/dateUtils';
import { ModalFinalizarProyecto } from './ModalFinalizarProyecto';
import { ModalConfirmacion } from './ModalConfirmacion';

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
  const [miembros, setMiembros] = useState<MiembroIglesia[]>(() => storageService.getMiembros());
  const [transacciones, setTransacciones] = useState<Transaccion[]>(() => storageService.getTransacciones());
  const [proyectoActivoId, setProyectoActivoId] = useState<string>(() => proyectos[0]?.id || '');
  const [filtroEstado, setFiltroEstado] = useState<'activos' | 'finalizados' | 'todos'>('activos');
  const [filtroPactoHistorial, setFiltroPactoHistorial] = useState<string>('todos');
  
  // Subvista interna del proyecto (Pactantes vs Historial) y búsqueda rápida
  const [subvistaProyecto, setSubvistaProyecto] = useState<'pactantes' | 'entregas'>('pactantes');
  const [busquedaPactante, setBusquedaPactante] = useState<string>('');

  // Modales
  const [mostrarModalNuevoProyecto, setMostrarModalNuevoProyecto] = useState(false);
  const [mostrarModalNuevoPacto, setMostrarModalNuevoPacto] = useState(false);
  const [mostrarModalEditarPacto, setMostrarModalEditarPacto] = useState(false);
  const [mostrarModalFinalizar, setMostrarModalFinalizar] = useState(false);
  const [mostrarModalAporteDiezmo, setMostrarModalAporteDiezmo] = useState(false);

  // Modales de Entrega (Editar y Ver Historial)
  const [mostrarModalEditarEntrega, setMostrarModalEditarEntrega] = useState(false);
  const [entregaAEditar, setEntregaAEditar] = useState<Transaccion | null>(null);
  const [formFechaEntrega, setFormFechaEntrega] = useState('');
  const [formMontoEntrega, setFormMontoEntrega] = useState('');
  const [formConceptoEntrega, setFormConceptoEntrega] = useState('');
  const [formMetodoPagoEntrega, setFormMetodoPagoEntrega] = useState<MetodoPago>('efectivo');
  const [formPactoIdEntrega, setFormPactoIdEntrega] = useState('');
  const [guardandoEntrega, setGuardandoEntrega] = useState(false);

  // Eliminación de Entrega
  const [entregaAEliminar, setEntregaAEliminar] = useState<Transaccion | null>(null);
  const [eliminandoEntrega, setEliminandoEntrega] = useState(false);

  // Modal de Historial de Hermano Específico
  const [pactoParaVerHistorial, setPactoParaVerHistorial] = useState<PactoMiembro | null>(null);

  // Formulario Aportar desde Diezmos
  const [montoAporteDiezmo, setMontoAporteDiezmo] = useState('');
  const [pactoAporteDiezmoId, setPactoAporteDiezmoId] = useState('');
  const [conceptoAporteDiezmo, setConceptoAporteDiezmo] = useState('');
  const [registrarEgresoCaja, setRegistrarEgresoCaja] = useState(true);
  const [fechaAporteDiezmo, setFechaAporteDiezmo] = useState(() => new Date().toISOString().slice(0, 10));

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

  // Estados para modales de confirmación accesibles
  const [pactoAEliminar, setPactoAEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const [eliminandoPacto, setEliminandoPacto] = useState(false);
  const [proyectoAReabrirId, setProyectoAReabrirId] = useState<string | null>(null);
  const [reabriendoProyecto, setReabriendoProyecto] = useState(false);

  // Manejador tecla Escape para modales activos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pactoAEliminar || proyectoAReabrirId) return;

        if (mostrarModalEditarPacto) {
          e.preventDefault();
          setMostrarModalEditarPacto(false);
          setPactoAEditar(null);
        } else if (mostrarModalNuevoPacto) {
          e.preventDefault();
          setMostrarModalNuevoPacto(false);
        } else if (mostrarModalNuevoProyecto) {
          e.preventDefault();
          setMostrarModalNuevoProyecto(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pactoAEliminar, proyectoAReabrirId, mostrarModalEditarPacto, mostrarModalNuevoPacto, mostrarModalNuevoProyecto]);

  // Sincronización con backend (PostgreSQL)
  const recargar = async () => {
    setTransacciones(storageService.getTransacciones());
    setProyectos(storageService.getProyectos());
    setPactos(storageService.getPactos());
    setMiembros(storageService.getMiembros());
    try {
      const [projs, pcts, ms] = await Promise.all([
        storageService.cargarProyectosRemotos(),
        storageService.cargarPactosRemotos(),
        storageService.cargarMiembrosRemotos()
      ]);
      setProyectos(projs);
      setPactos(pcts);
      setMiembros(ms);
      setTransacciones(storageService.getTransacciones());
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
          setTransacciones(storageService.getTransacciones());
          if (projs.length > 0) {
            setProyectoActivoId(actual => actual || projs[0].id);
          }
        }
      } catch (e) {
        console.warn('Error al sincronizar datos remotos iniciales:', e);
      }
    };
    inicializar();

    const handleStorageUpdate = () => {
      if (montado) {
        setTransacciones(storageService.getTransacciones());
        setProyectos(storageService.getProyectos());
        setPactos(storageService.getPactos());
      }
    };
    window.addEventListener('storage', handleStorageUpdate);

    return () => { 
      montado = false; 
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // Filtrado de proyectos por estado
  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter(p => {
      if (filtroEstado === 'activos') return p.activo !== false;
      if (filtroEstado === 'finalizados') return p.activo === false;
      return true;
    });
  }, [proyectos, filtroEstado]);

  const proyectoSeleccionado = useMemo(() => {
    return proyectosFiltrados.find(p => p.id === proyectoActivoId) 
      || proyectosFiltrados[0] 
      || proyectos.find(p => p.id === proyectoActivoId) 
      || proyectos[0];
  }, [proyectosFiltrados, proyectoActivoId, proyectos]);

  const pactosDelProyecto = useMemo(() => {
    return pactos.filter(p => p.proyecto_id === proyectoSeleccionado?.id);
  }, [pactos, proyectoSeleccionado]);

  // Pactantes filtrados por búsqueda
  const pactosFiltradosPorBusqueda = useMemo(() => {
    if (!busquedaPactante.trim()) return pactosDelProyecto;
    const q = busquedaPactante.toLowerCase();
    return pactosDelProyecto.filter(p => 
      p.miembro_nombre.toLowerCase().includes(q) || 
      (p.miembro_telefono && p.miembro_telefono.includes(q))
    );
  }, [pactosDelProyecto, busquedaPactante]);

  // Entregas registradas para el proyecto activo (ordenadas cronológicamente descendente)
  const entregasDelProyecto = useMemo(() => {
    if (!proyectoSeleccionado) return [];
    return transacciones
      .filter(t => t.proyecto_id === proyectoSeleccionado.id && t.tipo === 'ingreso' && t.subtipo === 'pacto')
      .sort((a, b) => {
        const compFecha = b.fecha.localeCompare(a.fecha);
        if (compFecha !== 0) return compFecha;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
  }, [transacciones, proyectoSeleccionado]);

  // Entregas filtradas según selector de pactante
  const entregasFiltradas = useMemo(() => {
    if (filtroPactoHistorial === 'todos') return entregasDelProyecto;
    if (filtroPactoHistorial === 'sin_pacto') return entregasDelProyecto.filter(e => !e.pacto_id);
    return entregasDelProyecto.filter(e => e.pacto_id === filtroPactoHistorial);
  }, [entregasDelProyecto, filtroPactoHistorial]);

  // Iniciales de nombre para avatar Apple HIG
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  };

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

  // Eliminar pacto con ModalConfirmacion
  const handleEliminarPacto = (id: string, nombre: string) => {
    setPactoAEliminar({ id, nombre });
  };

  const confirmarEliminarPacto = async () => {
    if (!pactoAEliminar) return;
    setEliminandoPacto(true);
    try {
      await storageService.eliminarPacto(pactoAEliminar.id);
      await recargar();
      if (pactoAEditar?.id === pactoAEliminar.id) {
        setMostrarModalEditarPacto(false);
        setPactoAEditar(null);
      }
    } finally {
      setEliminandoPacto(false);
      setPactoAEliminar(null);
    }
  };

  // Reabrir proyecto con ModalConfirmacion
  const handleReabrirProyecto = (id: string) => {
    setProyectoAReabrirId(id);
  };

  const confirmarReabrirProyecto = async () => {
    if (!proyectoAReabrirId) return;
    setReabriendoProyecto(true);
    try {
      await storageService.editarProyecto(proyectoAReabrirId, { activo: true, fecha_fin: undefined });
      await recargar();
    } finally {
      setReabriendoProyecto(false);
      setProyectoAReabrirId(null);
    }
  };

  // Aportar fondos desde Diezmos a Proyecto
  const [guardandoAporteDiezmo, setGuardandoAporteDiezmo] = useState(false);

  const handleGuardarAporteDiezmo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proyectoSeleccionado) return;
    const montoNum = parseFloat(montoAporteDiezmo);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert('Por favor ingrese un monto válido mayor a $0');
      return;
    }

    setGuardandoAporteDiezmo(true);
    try {
      let finalPactoId = pactoAporteDiezmoId;
      if (!finalPactoId && pactosDelProyecto.length === 1) {
        finalPactoId = pactosDelProyecto[0].id;
      }

      const pactoSel = pactos.find(p => p.id === finalPactoId);
      const conceptoFinal = conceptoAporteDiezmo.trim() || `Fondo de Diezmos asignado a: ${proyectoSeleccionado.nombre}`;

      await storageService.guardarTransaccion({
        tipo: 'ingreso',
        subtipo: 'pacto',
        categoria: 'Aporte a Proyecto Pactado',
        monto: montoNum,
        fecha: fechaAporteDiezmo,
        tipo_culto: 'no_aplica',
        concepto: conceptoFinal,
        miembro_nombre: pactoSel?.miembro_nombre || 'Fondo General de Diezmos',
        proyecto_id: proyectoSeleccionado.id,
        proyecto_nombre: proyectoSeleccionado.nombre,
        pacto_id: finalPactoId || undefined,
        metodo_pago: 'efectivo'
      });

      if (registrarEgresoCaja) {
        await storageService.guardarTransaccion({
          tipo: 'gasto',
          categoria: 'Aporte de Diezmo a Proyecto',
          monto: montoNum,
          fecha: fechaAporteDiezmo,
          tipo_culto: 'no_aplica',
          concepto: `Egreso de Caja General por aporte a proyecto: ${proyectoSeleccionado.nombre}`,
          metodo_pago: 'efectivo'
        });
      }

      await recargar();
      setMostrarModalAporteDiezmo(false);
      setMontoAporteDiezmo('');
      setPactoAporteDiezmoId('');
      setConceptoAporteDiezmo('');
      alert(`¡Aporte de ${formatearMoneda(montoNum)} registrado con éxito para "${proyectoSeleccionado.nombre}"!`);
    } catch (err) {
      alert('Error al registrar el aporte desde diezmos.');
    } finally {
      setGuardandoAporteDiezmo(false);
    }
  };

  // Abrir modal para editar una entrega
  const handleAbrirEditarEntrega = (entrega: Transaccion) => {
    setEntregaAEditar(entrega);
    setFormFechaEntrega(entrega.fecha);
    setFormMontoEntrega(String(entrega.monto));
    setFormConceptoEntrega(entrega.concepto || '');
    setFormMetodoPagoEntrega(entrega.metodo_pago || 'efectivo');
    setFormPactoIdEntrega(entrega.pacto_id || '');
    setMostrarModalEditarEntrega(true);
  };

  // Guardar cambios de una entrega editada
  const handleGuardarEdicionEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entregaAEditar || !proyectoSeleccionado) return;
    const montoNum = parseFloat(formMontoEntrega);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert('Por favor ingrese un monto válido mayor a $0');
      return;
    }

    setGuardandoEntrega(true);
    try {
      const pactoSel = pactos.find(p => p.id === formPactoIdEntrega);
      const nombreMiembroFinal = pactoSel?.miembro_nombre || entregaAEditar.miembro_nombre || 'Aporte General';

      await storageService.editarTransaccion(entregaAEditar.id, {
        fecha: formFechaEntrega,
        monto: montoNum,
        concepto: formConceptoEntrega.trim() || entregaAEditar.concepto,
        metodo_pago: formMetodoPagoEntrega,
        pacto_id: formPactoIdEntrega || undefined,
        miembro_nombre: nombreMiembroFinal,
        proyecto_id: proyectoSeleccionado.id,
        proyecto_nombre: proyectoSeleccionado.nombre
      });

      await recargar();
      setMostrarModalEditarEntrega(false);
      setEntregaAEditar(null);
      alert('¡Entrega actualizada con éxito!');
    } catch (err) {
      alert('Error al actualizar la entrega.');
    } finally {
      setGuardandoEntrega(false);
    }
  };

  // Confirmar eliminación de una entrega
  const confirmarEliminarEntrega = async () => {
    if (!entregaAEliminar) return;
    setEliminandoEntrega(true);
    try {
      storageService.eliminarTransaccion(entregaAEliminar.id);
      await recargar();
      setEntregaAEliminar(null);
    } finally {
      setEliminandoEntrega(false);
    }
  };

  // Cálculos del proyecto activo
  const meta = proyectoSeleccionado?.meta_total || 1;
  const totalAportadoPactos = pactosDelProyecto.reduce((acc, p) => acc + (p.total_aportado || 0), 0);
  const recaudado = totalAportadoPactos > 0 ? totalAportadoPactos : (proyectoSeleccionado?.total_recaudado || 0);
  const gastado = proyectoSeleccionado?.total_gastado || 0;
  const remanenteNoGastado = Math.max(0, recaudado - gastado);
  const porcentaje = Math.min(100, Math.round((recaudado / meta) * 100));

  return (
    <div className="max-w-6xl mx-auto space-y-3.5 animate-in fade-in duration-200">
      
      {/* Barra de Herramientas Compacta Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-0.5">
        {/* Izquierda: Título y Selector de Proyectos */}
        <div className="flex items-center space-x-2.5 overflow-x-auto min-w-0">
          <h1 className="text-xl font-black text-slate-950 tracking-tight flex-shrink-0">
            Proyectos
          </h1>
          
          {proyectosFiltrados.length > 0 && (
            <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
              {proyectosFiltrados.map((p) => {
                const esActivo = proyectoSeleccionado?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProyectoActivoId(p.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                      esActivo
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${p.activo !== false ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                    <span>{p.nombre}</span>
                    {p.activo === false && (
                      <span className="text-[10px] opacity-70">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Derecha: Filtro de Estado Segmentado + Botón Nuevo Proyecto */}
        <div className="flex items-center space-x-2 flex-shrink-0 self-start sm:self-auto">
          <div className="apple-segmented-group">
            <button
              onClick={() => setFiltroEstado('activos')}
              className={`apple-segmented-item px-2.5 py-1 text-xs font-semibold ${filtroEstado === 'activos' ? 'apple-segmented-active text-slate-950' : 'text-slate-600'}`}
            >
              Activos ({proyectos.filter(p => p.activo !== false).length})
            </button>
            <button
              onClick={() => setFiltroEstado('finalizados')}
              className={`apple-segmented-item px-2.5 py-1 text-xs font-semibold ${filtroEstado === 'finalizados' ? 'apple-segmented-active text-slate-950' : 'text-slate-600'}`}
            >
              Finalizados ({proyectos.filter(p => p.activo === false).length})
            </button>
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`apple-segmented-item px-2.5 py-1 text-xs font-semibold ${filtroEstado === 'todos' ? 'apple-segmented-active text-slate-950' : 'text-slate-600'}`}
            >
              Todos ({proyectos.length})
            </button>
          </div>

          <button
            onClick={() => setMostrarModalNuevoProyecto(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Si no hay proyectos */}
      {proyectosFiltrados.length === 0 && (
        <div className="p-8 rounded-3xl bg-white border border-slate-200/80 text-center space-y-2">
          <Landmark className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No hay proyectos en esta vista</h3>
          <p className="text-xs text-slate-500">Crea un nuevo proyecto para comenzar a registrar participantes y aportes.</p>
          <button
            onClick={() => setMostrarModalNuevoProyecto(true)}
            className="mt-2 inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Primer Proyecto</span>
          </button>
        </div>
      )}

      {/* Vista Principal del Proyecto Activo */}
      {proyectoSeleccionado && (
        <div className="bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
          
          {/* Header del Proyecto Compacto e Inline (Apple HIG) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                proyectoSeleccionado.activo !== false
                  ? 'text-blue-700 bg-blue-50 border border-blue-200/60'
                  : 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
              }`}>
                {proyectoSeleccionado.activo !== false ? 'En Curso' : 'Concluido'}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                {proyectoSeleccionado.nombre}
              </h2>
              {proyectoSeleccionado.fecha_fin && (
                <span className="text-[11px] text-slate-400">
                  (Concluido el {formatearFechaCorta(proyectoSeleccionado.fecha_fin)})
                </span>
              )}
            </div>

            {/* Botones de Acción Estilo Apple HIG Compactos */}
            <div className="flex items-center space-x-1.5 flex-wrap self-start sm:self-auto">
              {proyectoSeleccionado.activo !== false ? (
                <>
                  <button
                    onClick={() => setMostrarModalNuevoPacto(true)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs shadow-blue-600/20"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Registrar Hermano</span>
                  </button>

                  <button
                    onClick={() => {
                      setMontoAporteDiezmo('');
                      const unicoPacto = pactosDelProyecto.length === 1 ? pactosDelProyecto[0].id : '';
                      setPactoAporteDiezmoId(unicoPacto);
                      setConceptoAporteDiezmo(`Fondo institucional aportado de Diezmos a: ${proyectoSeleccionado.nombre}`);
                      setMostrarModalAporteDiezmo(true);
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-slate-200 text-xs font-semibold transition-all"
                    title="Tomar fondos de diezmos e ingresarlos al proyecto"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                    <span>Aportar de Diezmos</span>
                  </button>

                  <button
                    onClick={() => setMostrarModalFinalizar(true)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-medium transition-all"
                    title="Finalizar proyecto y transferir remanente"
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>Finalizar / Mover Resto</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Proyecto Concluido</span>
                  </span>
                  <button
                    onClick={() => handleReabrirProyecto(proyectoSeleccionado.id)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reabrir</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta de Progreso & Cifras Clave Compacta Apple HIG */}
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3 sm:p-3.5 space-y-2">
            {/* Avance y Barra en una sola línea */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-1.5 text-slate-600 font-semibold min-w-0">
                <span className="text-xs font-bold text-slate-800">Avance</span>
                <span className="text-[11px] text-slate-400">({pactosDelProyecto.length} participantes)</span>
              </div>
              <div className="flex items-center space-x-2.5 flex-1 max-w-sm">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
                <span className="text-blue-600 font-black text-xs tabular-nums whitespace-nowrap">
                  {porcentaje}%
                </span>
              </div>
            </div>

            {/* 4 Cifras Clave Compactas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60">
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Meta Total</span>
                <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums">
                  {formatearMoneda(proyectoSeleccionado.meta_total)}
                </span>
              </div>

              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">Recaudado</span>
                <span className="text-sm sm:text-base font-black text-emerald-700 tabular-nums">
                  {formatearMoneda(recaudado)}
                </span>
              </div>

              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-rose-500 block tracking-wider">Gastado</span>
                <span className="text-sm sm:text-base font-black text-rose-700 tabular-nums">
                  {formatearMoneda(gastado)}
                </span>
              </div>

              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-blue-600 block tracking-wider">Remanente</span>
                  {remanenteNoGastado > 0 && proyectoSeleccionado.activo !== false && (
                    <button
                      onClick={() => setMostrarModalFinalizar(true)}
                      className="text-[10px] text-amber-700 font-bold hover:underline inline-flex items-center"
                      title="Mover remanente a ofrenda general"
                    >
                      Mover →
                    </button>
                  )}
                </div>
                <span className="text-sm sm:text-base font-black text-slate-950 tabular-nums">
                  {formatearMoneda(remanenteNoGastado)}
                </span>
              </div>
            </div>
          </div>

          {/* Segmented Control Interno Apple HIG: Pactantes vs Historial de Entregas */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="apple-segmented-group">
                <button
                  type="button"
                  onClick={() => setSubvistaProyecto('pactantes')}
                  className={`apple-segmented-item px-3.5 py-1.5 text-xs font-bold flex items-center space-x-1.5 ${
                    subvistaProyecto === 'pactantes'
                      ? 'apple-segmented-active text-slate-950'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Hermanos en el Proyecto ({pactosDelProyecto.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubvistaProyecto('entregas')}
                  className={`apple-segmented-item px-3.5 py-1.5 text-xs font-bold flex items-center space-x-1.5 ${
                    subvistaProyecto === 'entregas'
                      ? 'apple-segmented-active text-slate-950'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Historial de Entregas ({entregasDelProyecto.length})</span>
                </button>
              </div>

              {/* Búsqueda o filtros según la subvista activa */}
              {subvistaProyecto === 'pactantes' ? (
                pactosDelProyecto.length > 0 && (
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar hermano o teléfono..."
                      value={busquedaPactante}
                      onChange={(e) => setBusquedaPactante(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                    {busquedaPactante && (
                      <button
                        onClick={() => setBusquedaPactante('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              ) : (
                pactosDelProyecto.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={filtroPactoHistorial}
                      onChange={(e) => setFiltroPactoHistorial(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="todos">Todos los aportes ({entregasDelProyecto.length})</option>
                      {pactosDelProyecto.map(p => {
                        const count = entregasDelProyecto.filter(e => e.pacto_id === p.id).length;
                        return (
                          <option key={p.id} value={p.id}>
                            {p.miembro_nombre} ({count})
                          </option>
                        );
                      })}
                      <option value="sin_pacto">Aportes de Diezmos / Institucionales</option>
                    </select>
                  </div>
                )
              )}
            </div>

            {/* CONTENIDO SUBVISTA 1: PACTANTES */}
            {subvistaProyecto === 'pactantes' && (
              <div className="pt-2">
                {pactosDelProyecto.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">Aún no hay hermanos registrados en este proyecto</p>
                    <p className="text-[11px] text-slate-400">Registra un hermano con su meta personal y cuota periódica.</p>
                    <button
                      onClick={() => setMostrarModalNuevoPacto(true)}
                      className="mt-1 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-sm"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Registrar Primer Hermano</span>
                    </button>
                  </div>
                ) : pactosFiltradosPorBusqueda.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No se encontraron hermanos con el término "{busquedaPactante}".
                  </div>
                ) : (
                  <>
                    {/* Tabla Desktop (md en adelante) - SIN MODIFICAR NADA EN DESKTOP */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F8F9FA] text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Hermano / Familia</th>
                            <th className="py-2.5 px-3">Meta Asignada</th>
                            <th className="py-2.5 px-3">Cuota</th>
                            <th className="py-2.5 px-3">Aportado</th>
                            <th className="py-2.5 px-3">Resta</th>
                            <th className="py-2.5 px-3">Progreso</th>
                            <th className="py-2.5 px-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80">
                          {pactosFiltradosPorBusqueda.map((p) => {
                            const pctPacto = Math.min(100, Math.round((p.total_aportado / p.monto_total_pactado) * 100));
                            const entregasCount = entregasDelProyecto.filter(e => e.pacto_id === p.id).length;
                            const iniciales = getInitials(p.miembro_nombre);

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center space-x-2.5">
                                    <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-black text-[11px] flex items-center justify-center flex-shrink-0">
                                      {iniciales}
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-900 block text-xs leading-snug">
                                        {p.miembro_nombre}
                                      </span>
                                      {p.miembro_telefono && (
                                        <span className="text-[10px] text-slate-400 block">
                                          {p.miembro_telefono}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800 text-xs tabular-nums">
                                  {formatearMoneda(p.monto_total_pactado)}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 text-xs tabular-nums">
                                  <span className="font-semibold text-blue-700">{formatearMoneda(p.cuota_semanal)}</span>
                                  <span className="text-[10px] text-slate-400">/sem</span>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-emerald-600 text-xs tabular-nums">
                                  {formatearMoneda(p.total_aportado)}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-amber-700 text-xs tabular-nums">
                                  {formatearMoneda(p.saldo_pendiente)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="space-y-1 w-28">
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                      <span>{p.semanas_pagadas}/{p.semanas_estimadas} sem</span>
                                      <span className="font-bold text-slate-700">{pctPacto}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${p.estado === 'completado' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                        style={{ width: `${pctPacto}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end space-x-1">
                                    {/* Botón rápido de Abonar */}
                                    {onAbonarPacto && proyectoSeleccionado.activo !== false && (
                                      <button
                                        type="button"
                                        onClick={() => onAbonarPacto(p.proyecto_id, p.id)}
                                        className="text-xs bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold px-2.5 py-1 rounded-lg transition-all inline-flex items-center space-x-1 shadow-sm shadow-emerald-600/20"
                                        title="Registrar una entrega de cuota a este pacto"
                                      >
                                        <span>Abonar</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    )}

                                    {/* Ver historial de entregas de este pacto */}
                                    <button
                                      type="button"
                                      onClick={() => setPactoParaVerHistorial(p)}
                                      className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 font-medium px-2 py-1 rounded-lg transition-colors inline-flex items-center space-x-1"
                                      title="Consultar fechas y recibos de este hermano"
                                    >
                                      <CalendarDays className="w-3 h-3 text-blue-600" />
                                      <span>{entregasCount}</span>
                                    </button>

                                    {/* Editar datos del pacto */}
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirEditarPacto(p)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                      title="Editar datos del pactante"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Vista Móvil Nativa de Pactantes (md:hidden) */}
                    <div className="md:hidden space-y-3">
                      {pactosFiltradosPorBusqueda.map((p) => {
                        const pctPacto = Math.min(100, Math.round((p.total_aportado / p.monto_total_pactado) * 100));
                        const entregasCount = entregasDelProyecto.filter(e => e.pacto_id === p.id).length;
                        const iniciales = getInitials(p.miembro_nombre);

                        return (
                          <div key={p.id} className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3 shadow-2xs">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                                  {iniciales}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block text-xs">
                                    {p.miembro_nombre}
                                  </span>
                                  {p.miembro_telefono && (
                                    <span className="text-[10px] text-slate-500 block">
                                      {p.miembro_telefono}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full flex-shrink-0">
                                {formatearMoneda(p.cuota_semanal)}/sem
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 font-medium">
                                  {p.semanas_pagadas}/{p.semanas_estimadas} sem cubiertas
                                </span>
                                <span className="font-extrabold text-slate-900">{pctPacto}%</span>
                              </div>
                              <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${p.estado === 'completado' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                  style={{ width: `${pctPacto}%` }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-center bg-white p-2 rounded-xl border border-slate-200/60 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Meta</span>
                                <span className="font-bold text-slate-800 tabular-nums">{formatearMoneda(p.monto_total_pactado)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Aportado</span>
                                <span className="font-bold text-emerald-600 tabular-nums">{formatearMoneda(p.total_aportado)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Resta</span>
                                <span className="font-bold text-amber-700 tabular-nums">{formatearMoneda(p.saldo_pendiente)}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                onClick={() => setPactoParaVerHistorial(p)}
                                className="inline-flex items-center space-x-1.5 text-xs text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 px-2.5 py-1.5 rounded-xl min-h-[36px]"
                              >
                                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                                <span>{entregasCount} {entregasCount === 1 ? 'entrega' : 'entregas'}</span>
                              </button>

                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleAbrirEditarPacto(p)}
                                  aria-label="Editar pacto"
                                  className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-slate-800 bg-white border border-slate-200/80 rounded-xl"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

                                {onAbonarPacto && proyectoSeleccionado.activo !== false && (
                                  <button
                                    type="button"
                                    onClick={() => onAbonarPacto(p.proyecto_id, p.id)}
                                    className="inline-flex items-center space-x-1 text-xs bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs min-h-[36px]"
                                  >
                                    <span>+ Abonar</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CONTENIDO SUBVISTA 2: HISTORIAL DE ENTREGAS */}
            {subvistaProyecto === 'entregas' && (
              <div className="pt-2">
                {entregasFiltradas.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                    <Calendar className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-700">No hay entregas registradas para este filtro</p>
                    <p className="text-[11px] text-slate-400">
                      Al capturar ingresos o abonar al proyecto, aquí se listarán todas las entregas con fecha y recibo.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Tabla Desktop (md en adelante) - SIN MODIFICAR NADA EN DESKTOP */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F8F9FA] text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Fecha</th>
                            <th className="py-2.5 px-3">Hermano / Aportante</th>
                            <th className="py-2.5 px-3">Concepto</th>
                            <th className="py-2.5 px-3">Método</th>
                            <th className="py-2.5 px-3 text-right">Monto</th>
                            <th className="py-2.5 px-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80">
                          {entregasFiltradas.map((entrega) => (
                            <tr key={entrega.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-900 block text-xs">
                                  {formatearFechaCorta(entrega.fecha)}
                                </span>
                                <span className="text-[10px] text-slate-400 capitalize">
                                  {entrega.dia_semana || 'Movimiento'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-slate-800 text-xs block">
                                  {entrega.miembro_nombre || 'Aporte General'}
                                </span>
                                {entrega.pacto_id ? (
                                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded font-medium inline-block mt-0.5">
                                    Pacto
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 block">
                                    Institucional / Fondo
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-600 max-w-[240px] truncate" title={entrega.concepto}>
                                {entrega.concepto || '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md capitalize">
                                  {entrega.metodo_pago}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 text-xs tabular-nums">
                                {formatearMoneda(entrega.monto)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirEditarEntrega(entrega)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                    title="Editar entrega"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEntregaAEliminar(entrega)}
                                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Eliminar entrega"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Vista Móvil Nativa de Entregas (md:hidden) */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {entregasFiltradas.map((entrega) => (
                        <div key={entrega.id} className="p-3.5 space-y-2 hover:bg-slate-50/70 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-900 text-xs">
                                {formatearFechaCorta(entrega.fecha)}
                              </span>
                              <span className="text-[10px] text-slate-400 capitalize ml-1.5">
                                ({entrega.dia_semana || 'Movimiento'})
                              </span>
                            </div>
                            <span className="font-extrabold text-emerald-600 text-sm tabular-nums">
                              +{formatearMoneda(entrega.monto)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-800 block">
                                {entrega.miembro_nombre || 'Aporte General'}
                              </span>
                              {entrega.concepto && (
                                <p className="text-[11px] text-slate-500 line-clamp-1">{entrega.concepto}</p>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded capitalize">
                              {entrega.metodo_pago}
                            </span>
                          </div>

                          <div className="flex items-center justify-end space-x-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleAbrirEditarEntrega(entrega)}
                              className="px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium inline-flex items-center space-x-1"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEntregaAEliminar(entrega)}
                              className="px-2.5 py-1 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg font-medium inline-flex items-center space-x-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Crear Nuevo Proyecto Apple HIG */}
      {mostrarModalNuevoProyecto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMostrarModalNuevoProyecto(false);
            }
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-nuevo-proyecto-titulo"
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 id="modal-nuevo-proyecto-titulo" className="text-base font-black text-slate-950">Nuevo Proyecto</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define la meta global y el valor sugerido de la congregación.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setMostrarModalNuevoProyecto(false)} 
                aria-label="Cerrar modal"
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrearProyecto} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Proyecto *</label>
                <input
                  type="text"
                  placeholder="Ej. Terreno Anexo, Audio y Multimedia..."
                  value={nombreProyecto}
                  onChange={(e) => setNombreProyecto(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción / Propósito</label>
                <textarea
                  rows={2}
                  placeholder="Detalles del proyecto..."
                  value={descProyecto}
                  onChange={(e) => setDescProyecto(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                  className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 active:scale-[0.98] shadow-sm shadow-blue-600/20 transition-all"
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
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMostrarModalNuevoPacto(false);
            }
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-nuevo-pacto-titulo"
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 id="modal-nuevo-pacto-titulo" className="text-base font-black text-slate-950">Registrar Hermano Pactante</h3>
                <p className="text-xs text-slate-500">
                  Para el proyecto: <strong className="text-blue-600">{proyectoSeleccionado.nombre}</strong>
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setMostrarModalNuevoPacto(false)} 
                aria-label="Cerrar modal"
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrearPacto} className="space-y-4">
              <div>
                <SelectorHermano
                  miembros={miembros}
                  selectedNombre={miembroPacto}
                  permitirAnonimo={false}
                  requerido={true}
                  label="Hermano de la Iglesia *"
                  placeholder="Seleccionar hermano de la iglesia..."
                  onSelect={(m, nombre) => {
                    setMiembroPacto(nombre || '');
                    if (m?.telefono) {
                      setTelefonoPacto(m.telefono);
                    }
                  }}
                  onNuevoMiembroCreado={(nuevo) => {
                    setMiembros(prev => [nuevo, ...prev]);
                    setMiembroPacto(nuevo.nombre);
                    if (nuevo.telefono) {
                      setTelefonoPacto(nuevo.telefono);
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono / WhatsApp (Opcional)</label>
                <input
                  type="tel"
                  placeholder="Ej. 55-1234-5678"
                  value={telefonoPacto}
                  onChange={(e) => setTelefonoPacto(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {montoPactado && cuotaSemanalPacto && parseFloat(cuotaSemanalPacto) > 0 && (
                <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/60 text-[11px] text-blue-900">
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
                  className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 active:scale-[0.98] shadow-sm shadow-blue-600/20 transition-all"
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
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMostrarModalEditarPacto(false);
              setPactoAEditar(null);
            }
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-editar-pacto-titulo"
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 id="modal-editar-pacto-titulo" className="text-base font-black text-slate-950">Editar Datos del Pactante</h3>
                  <p className="text-[11px] text-slate-500">
                    Modifica el monto, cuota semanal o contacto del hermano.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { setMostrarModalEditarPacto(false); setPactoAEditar(null); }} 
                aria-label="Cerrar modal"
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono / WhatsApp (Opcional)</label>
                <input
                  type="tel"
                  placeholder="Ej. 55-1234-5678"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado del Compromiso</label>
                <select
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="al_dia">🟢 Al Día (Activo)</option>
                  <option value="completado">✅ Completado (Meta Alcanzada)</option>
                  <option value="pendiente">🟡 Pendiente / En pausa</option>
                </select>
              </div>

              {/* Resumen dinámico */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px] space-y-1 text-slate-700">
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
                    className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 active:scale-[0.98] shadow-sm shadow-blue-600/20 disabled:opacity-50 transition-all"
                  >
                    {guardandoPacto ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aportar desde Diezmos a Proyecto Apple HIG */}
      {mostrarModalAporteDiezmo && proyectoSeleccionado && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMostrarModalAporteDiezmo(false);
            }
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-aporte-diezmo-titulo"
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="modal-aporte-diezmo-titulo" className="text-base font-black text-slate-950">
                    Aportar desde Diezmos al Proyecto
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proyecto: <strong className="text-blue-600">{proyectoSeleccionado.nombre}</strong>
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setMostrarModalAporteDiezmo(false)} 
                aria-label="Cerrar modal"
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarAporteDiezmo} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Monto a tomar de Diezmos ($ MXN) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="1"
                    placeholder="0.00"
                    value={montoAporteDiezmo}
                    onChange={(e) => setMontoAporteDiezmo(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fecha del Movimiento *
                </label>
                <input
                  type="date"
                  value={fechaAporteDiezmo}
                  onChange={(e) => setFechaAporteDiezmo(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Asignar a un Hermano con Pacto</span>
                  <span className="text-[10px] font-normal text-slate-400">Opcional</span>
                </label>
                <select
                  value={pactoAporteDiezmoId}
                  onChange={(e) => setPactoAporteDiezmoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Aporte institucional al proyecto (sin pacto individual)</option>
                  {pactosDelProyecto.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.miembro_nombre} - Saldo pendiente: {formatearMoneda(p.saldo_pendiente)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Si seleccionas un hermano, este importe amortizará su saldo pactado pendiente.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Concepto / Nota explicativa
                </label>
                <input
                  type="text"
                  value={conceptoAporteDiezmo}
                  onChange={(e) => setConceptoAporteDiezmo(e.target.value)}
                  placeholder={`Fondo institucional de diezmos a: ${proyectoSeleccionado.nombre}`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Registrar egreso contable en Caja General
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                    Disminuye el saldo disponible de Caja General para reflejar que el dinero físico pasa al fondo del proyecto.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    checked={registrarEgresoCaja}
                    onChange={(e) => setRegistrarEgresoCaja(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalAporteDiezmo(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAporteDiezmo}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50"
                >
                  {guardandoAporteDiezmo ? 'Aplicando...' : 'Aplicar Aporte al Proyecto'}
                </button>
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

      {/* Modal: Editar Entrega / Aporte al Proyecto Apple HIG */}
      {mostrarModalEditarEntrega && entregaAEditar && proyectoSeleccionado && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMostrarModalEditarEntrega(false);
              setEntregaAEditar(null);
            }
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-editar-entrega-titulo"
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="modal-editar-entrega-titulo" className="text-base font-black text-slate-950">
                    Editar Entrega al Proyecto
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proyecto: <strong className="text-blue-600">{proyectoSeleccionado.nombre}</strong>
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setMostrarModalEditarEntrega(false);
                  setEntregaAEditar(null);
                }} 
                aria-label="Cerrar modal"
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicionEntrega} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha de Entrega *
                  </label>
                  <input
                    type="date"
                    value={formFechaEntrega}
                    onChange={(e) => setFormFechaEntrega(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Monto Entregado ($ MXN) *
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="1"
                    value={formMontoEntrega}
                    onChange={(e) => setFormMontoEntrega(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pacto del Hermano Asignado
                </label>
                <select
                  value={formPactoIdEntrega}
                  onChange={(e) => setFormPactoIdEntrega(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Aporte general al proyecto (sin hermano específico)</option>
                  {pactosDelProyecto.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.miembro_nombre} - Cuota: {formatearMoneda(p.cuota_semanal)}/sem (Resta: {formatearMoneda(p.saldo_pendiente)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Concepto / Motivo de la Entrega
                </label>
                <input
                  type="text"
                  value={formConceptoEntrega}
                  onChange={(e) => setFormConceptoEntrega(e.target.value)}
                  placeholder="Ej. Aporte a pacto semanal"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Método de Entrega
                </label>
                <select
                  value={formMetodoPagoEntrega}
                  onChange={(e) => setFormMetodoPagoEntrega(e.target.value as MetodoPago)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia Bancaria / SPEI</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Terminal / Tarjeta</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalEditarEntrega(false);
                    setEntregaAEditar(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEntrega}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50"
                >
                  {guardandoEntrega ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Historial Detallado de Entregas por Hermano Apple HIG */}
      {pactoParaVerHistorial && proyectoSeleccionado && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPactoParaVerHistorial(null);
            }
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-historial-pacto-titulo"
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-4 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                  {getInitials(pactoParaVerHistorial.miembro_nombre)}
                </div>
                <div>
                  <h3 id="modal-historial-pacto-titulo" className="text-base font-black text-slate-950">
                    {pactoParaVerHistorial.miembro_nombre}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Entregas registradas en: <strong className="text-blue-600">{proyectoSeleccionado.nombre}</strong>
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setPactoParaVerHistorial(null)} 
                aria-label="Cerrar modal"
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumen del Pacto */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl text-center border border-slate-200/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Pacto Total:</span>
                <span className="text-xs font-bold text-slate-900 tabular-nums">{formatearMoneda(pactoParaVerHistorial.monto_total_pactado)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Aportado:</span>
                <span className="text-xs font-bold text-emerald-600 tabular-nums">{formatearMoneda(pactoParaVerHistorial.total_aportado)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Resta:</span>
                <span className="text-xs font-bold text-amber-800 tabular-nums">{formatearMoneda(pactoParaVerHistorial.saldo_pendiente)}</span>
              </div>
            </div>

            {/* Lista de Entregas */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {entregasDelProyecto.filter(e => e.pacto_id === pactoParaVerHistorial.id).length === 0 ? (
                <div className="text-center py-10 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  <Clock className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Aún no hay entregas registradas para este hermano.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Haz clic en "Abonar" para registrar una entrega de cuota.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {entregasDelProyecto.filter(e => e.pacto_id === pactoParaVerHistorial.id).map((entrega) => (
                    <div 
                      key={entrega.id}
                      className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/70 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">
                            {formatearFechaCorta(entrega.fecha)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold bg-white border border-slate-200 px-1.5 py-0.2 rounded-md capitalize">
                            {entrega.metodo_pago}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {entrega.concepto || 'Aporte a pacto'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-black text-emerald-600 tabular-nums">
                          {formatearMoneda(entrega.monto)}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPactoParaVerHistorial(null);
                              handleAbrirEditarEntrega(entrega);
                            }}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Editar entrega"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPactoParaVerHistorial(null);
                              setEntregaAEliminar(entrega);
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 border border-rose-200/60 hover:bg-rose-100 text-rose-600 transition-colors"
                            title="Borrar entrega"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPactoParaVerHistorial(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Entrega */}
      <ModalConfirmacion
        isOpen={!!entregaAEliminar}
        titulo="Eliminar Entrega del Proyecto"
        mensaje={`¿Estás seguro de que deseas eliminar la entrega de ${formatearMoneda(entregaAEliminar?.monto || 0)} registrada el ${entregaAEliminar ? formatearFechaCorta(entregaAEliminar.fecha) : ''} por "${entregaAEliminar?.miembro_nombre || 'Hermano'}"? El total recaudado del proyecto y el saldo del pacto se actualizarán automáticamente.`}
        textoConfirmar="Eliminar Entrega"
        textoCancelar="Cancelar"
        variante="peligro"
        cargando={eliminandoEntrega}
        onConfirm={confirmarEliminarEntrega}
        onCancel={() => setEntregaAEliminar(null)}
      />

      {/* Modal de Confirmación Accesible para Eliminar Pacto */}
      <ModalConfirmacion
        isOpen={!!pactoAEliminar}
        titulo="Eliminar Pacto"
        mensaje={`¿Estás seguro de que deseas eliminar permanentemente el pacto de "${pactoAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar Pacto"
        textoCancelar="Cancelar"
        variante="peligro"
        cargando={eliminandoPacto}
        onConfirm={confirmarEliminarPacto}
        onCancel={() => setPactoAEliminar(null)}
      />

      {/* Modal de Confirmación Accesible para Reactivar Proyecto */}
      <ModalConfirmacion
        isOpen={!!proyectoAReabrirId}
        titulo="Reactivar Proyecto"
        mensaje="¿Deseas reactivar este proyecto para continuar capturando pactos y aportaciones de los hermanos?"
        textoConfirmar="Reactivar Proyecto"
        textoCancelar="Cancelar"
        variante="primario"
        cargando={reabriendoProyecto}
        onConfirm={confirmarReabrirProyecto}
        onCancel={() => setProyectoAReabrirId(null)}
      />

    </div>
  );
};
