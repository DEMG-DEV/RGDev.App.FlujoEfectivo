import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  FileText, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  TrendingUp, 
  Landmark, 
  HeartHandshake, 
  MessageCircle,
  Calendar,
  Eye,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  UserX,
  AlertCircle,
  ChevronRight,
  LayoutGrid,
  List,
  Sparkles
} from 'lucide-react';
import { MiembroIglesia, Transaccion, PactoMiembro } from '../types';
import { storageService } from '../services/storageService';
import { formatearMoneda, formatearFechaLarga, formatearFechaCorta } from '../utils/dateUtils';
import { ModalConfirmacion } from './ModalConfirmacion';

interface HermanosViewProps {
  onVerEvidencia?: (url: string, nombre?: string) => void;
  onIrACapturaDiezmo?: (miembroId: string, miembroNombre: string) => void;
}

export const HermanosView: React.FC<HermanosViewProps> = ({
  onVerEvidencia,
  onIrACapturaDiezmo
}) => {
  const [miembros, setMiembros] = useState<MiembroIglesia[]>(() => storageService.getMiembros());
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTab, setFiltroTab] = useState<'activos' | 'con_aportes' | 'todos' | 'inactivos'>('activos');
  const [modoVista, setModoVista] = useState<'grid' | 'lista'>('grid');

  // Modal Crear / Editar
  const [mostrarModalFormulario, setMostrarModalFormulario] = useState(false);
  const [miembroAEditar, setMiembroAEditar] = useState<MiembroIglesia | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formNotas, setFormNotas] = useState('');
  const [formActivo, setFormActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Modal Detalle de Aportaciones
  const [miembroSeleccionadoDetalle, setMiembroSeleccionadoDetalle] = useState<MiembroIglesia | null>(null);
  const [aportacionesMiembro, setAportacionesMiembro] = useState<Transaccion[]>([]);
  const [pactosMiembro, setPactosMiembro] = useState<PactoMiembro[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [filtroTipoDetalle, setFiltroTipoDetalle] = useState<'todos' | 'diezmo' | 'pacto'>('todos');

  // Modal Confirmación Eliminar
  const [miembroAEliminar, setMiembroAEliminar] = useState<MiembroIglesia | null>(null);

  // Estandarización de nombres
  const [estandarizando, setEstandarizando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const handleEstandarizar = async () => {
    setEstandarizando(true);
    setMensajeExito(null);
    try {
      const res = await storageService.estandarizarNombresHermanos();
      setMiembros(res.data);
      setMensajeExito('¡Nombres e historial estandarizados exitosamente!');
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (e) {
      console.error('Error al estandarizar:', e);
    } finally {
      setEstandarizando(false);
    }
  };

  const recargar = async () => {
    setCargando(true);
    try {
      const datos = await storageService.cargarMiembrosRemotos();
      setMiembros(datos);
    } catch (e) {
      console.warn('Error al recargar hermanos:', e);
      setMiembros(storageService.getMiembros());
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    recargar();
  }, []);

  // Abrir Modal para Crear
  const handleAbrirCrear = () => {
    setMiembroAEditar(null);
    setFormNombre('');
    setFormTelefono('');
    setFormNotas('');
    setFormActivo(true);
    setErrorForm(null);
    setMostrarModalFormulario(true);
  };

  // Abrir Modal para Editar
  const handleAbrirEditar = (m: MiembroIglesia, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMiembroAEditar(m);
    setFormNombre(m.nombre);
    setFormTelefono(m.telefono || '');
    setFormNotas(m.notas || '');
    setFormActivo(m.activo !== false);
    setErrorForm(null);
    setMostrarModalFormulario(true);
  };

  // Guardar (Crear o Actualizar)
  const handleGuardarMiembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      setErrorForm('El nombre es obligatorio.');
      return;
    }

    setGuardando(true);
    setErrorForm(null);
    try {
      if (miembroAEditar) {
        await storageService.editarMiembro(miembroAEditar.id, {
          nombre: formNombre.trim(),
          telefono: formTelefono.trim() || undefined,
          notas: formNotas.trim() || undefined,
          activo: formActivo
        });
      } else {
        await storageService.guardarMiembro({
          nombre: formNombre.trim(),
          telefono: formTelefono.trim() || undefined,
          notas: formNotas.trim() || undefined,
          activo: formActivo
        });
      }
      setMostrarModalFormulario(false);
      await recargar();
    } catch (err: any) {
      setErrorForm(err.message || 'Error al guardar el hermano');
    } finally {
      setGuardando(false);
    }
  };

  // Abrir Modal de Confirmación de Eliminación
  const handleSolicitarEliminar = (m: MiembroIglesia, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMiembroAEliminar(m);
  };

  const handleConfirmarEliminar = async () => {
    if (!miembroAEliminar) return;
    try {
      await storageService.eliminarMiembro(miembroAEliminar.id);
      setMiembroAEliminar(null);
      if (miembroSeleccionadoDetalle?.id === miembroAEliminar.id) {
        setMiembroSeleccionadoDetalle(null);
      }
      await recargar();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  // Cargar Detalle de Aportaciones
  const handleVerDetalle = async (m: MiembroIglesia) => {
    setMiembroSeleccionadoDetalle(m);
    setCargandoDetalle(true);
    try {
      const detalle = await storageService.obtenerDetalleAportacionesMiembro(m.id);
      if (detalle) {
        setAportacionesMiembro(detalle.aportaciones);
        setPactosMiembro(detalle.pactos);
      } else {
        setAportacionesMiembro([]);
        setPactosMiembro([]);
      }
    } catch (err) {
      console.error('Error al cargar detalle de aportaciones:', err);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // Filtrado y Búsqueda
  const miembrosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return miembros.filter(m => {
      // Filtro de Tabs Apple
      if (filtroTab === 'activos' && m.activo === false) return false;
      if (filtroTab === 'inactivos' && m.activo !== false) return false;
      if (filtroTab === 'con_aportes') {
        const total = (Number(m.total_diezmos) || 0) + (Number(m.total_pactos) || 0);
        if (total <= 0) return false;
      }

      // Filtro de búsqueda
      if (!q) return true;
      const matchNombre = m.nombre.toLowerCase().includes(q);
      const matchTel = m.telefono ? m.telefono.toLowerCase().includes(q) : false;
      const matchNotas = m.notas ? m.notas.toLowerCase().includes(q) : false;
      return matchNombre || matchTel || matchNotas;
    });
  }, [miembros, busqueda, filtroTab]);

  // Métricas Consolidadas (Totales Globales)
  const metricas = useMemo(() => {
    const totalRegistrados = miembros.length;
    const activos = miembros.filter(m => m.activo !== false).length;
    const totalDiezmos = miembros.reduce((acc, m) => acc + (Number(m.total_diezmos) || 0), 0);
    const totalPactos = miembros.reduce((acc, m) => acc + (Number(m.total_pactos) || 0), 0);
    const totalRecaudado = totalDiezmos + totalPactos;
    const miembrosConAportes = miembros.filter(m => ((Number(m.total_diezmos) || 0) + (Number(m.total_pactos) || 0)) > 0).length;

    return {
      totalRegistrados,
      activos,
      totalDiezmos,
      totalPactos,
      totalRecaudado,
      miembrosConAportes
    };
  }, [miembros]);

  // Transacciones filtradas para el modal de detalle
  const aportacionesFiltradasModal = useMemo(() => {
    if (filtroTipoDetalle === 'diezmo') {
      return aportacionesMiembro.filter(t => t.subtipo === 'diezmo');
    }
    if (filtroTipoDetalle === 'pacto') {
      return aportacionesMiembro.filter(t => t.subtipo === 'pacto');
    }
    return aportacionesMiembro;
  }, [aportacionesMiembro, filtroTipoDetalle]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 animate-in fade-in duration-300">
      
      {/* 1. HEADER APPLE HIG - Ultra limpio, jerárquico y compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Directorio de Hermanos</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {metricas.totalRegistrados} {metricas.totalRegistrados === 1 ? 'hermano registrado' : 'hermanos registrados'} · {metricas.activos} activos · {formatearMoneda(metricas.totalRecaudado)} aportado en total
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEstandarizar}
            disabled={estandarizando}
            title="Estandariza los nombres con base en el directorio canónico y vincula todo el historial contable"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-60"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${estandarizando ? 'animate-spin' : ''}`} />
            <span>{estandarizando ? 'Estandarizando...' : 'Estandarizar Nombres'}</span>
          </button>

          <button
            onClick={handleAbrirCrear}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Hermano</span>
          </button>
        </div>
      </div>

      {/* Banner de confirmación de estandarización */}
      {mensajeExito && (
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. BARRA DE MÉTRICAS INSET GROUPED (Estilo Apple macOS / iOS Settings) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          
          {/* Métrica 1: Miembros */}
          <div className="p-3.5 sm:px-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Hermanos</span>
              <div className="text-xl font-bold text-slate-900 tracking-tight tabular-nums mt-0.5">
                {metricas.totalRegistrados}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">
                {metricas.activos} activos ({metricas.miembrosConAportes} con aportes)
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
              <Users className="w-4 h-4" />
            </div>
          </div>

          {/* Métrica 2: Diezmos */}
          <div className="p-3.5 sm:px-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Total Diezmos</span>
              <div className="text-xl font-bold text-blue-600 tracking-tight tabular-nums mt-0.5">
                {formatearMoneda(metricas.totalDiezmos)}
              </div>
              <span className="text-[11px] text-slate-600 font-normal">
                Fondo general diezmos
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50/70 flex items-center justify-center text-blue-600 border border-blue-100/50">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* Métrica 3: Proyectos */}
          <div className="p-3.5 sm:px-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Total Proyectos</span>
              <div className="text-xl font-bold text-amber-600 tracking-tight tabular-nums mt-0.5">
                {formatearMoneda(metricas.totalPactos)}
              </div>
              <span className="text-[11px] text-slate-600 font-normal">
                Proyectos y edificación
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50/70 flex items-center justify-center text-amber-600 border border-amber-100/50">
              <Landmark className="w-4 h-4" />
            </div>
          </div>

          {/* Métrica 4: Total Histórico */}
          <div className="p-3.5 sm:px-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Total Recaudado</span>
              <div className="text-xl font-bold text-emerald-600 tracking-tight tabular-nums mt-0.5">
                {formatearMoneda(metricas.totalRecaudado)}
              </div>
              <span className="text-[11px] text-slate-600 font-normal">
                Suma de diezmos + pactos
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50/70 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>

        </div>
      </div>

      {/* 3. BARRA DE CONTROL APPLE (Búsqueda + Segmented Control + Vista Switcher) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Buscador estilo Spotlight */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono o notas..."
            className="w-full pl-9 pr-8 py-2 bg-white hover:bg-slate-50/70 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-xs"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controles de la derecha: Segmented Control + View Mode */}
        <div className="flex items-center gap-2 justify-between sm:justify-end overflow-x-auto no-scrollbar py-0.5 max-w-full">
          {/* Segmented Control nativo Apple */}
          <div className="inline-flex items-center p-0.5 bg-slate-200/60 rounded-xl text-xs font-medium border border-slate-200/40 whitespace-nowrap flex-shrink-0">
            <button
              onClick={() => setFiltroTab('activos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filtroTab === 'activos'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFiltroTab('con_aportes')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filtroTab === 'con_aportes'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Con Aportes
            </button>
            <button
              onClick={() => setFiltroTab('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filtroTab === 'todos'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroTab('inactivos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filtroTab === 'inactivos'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactivos
            </button>
          </div>

          {/* Selector de Vista: Cuadrícula vs Lista */}
          <div className="inline-flex items-center p-0.5 bg-slate-200/60 rounded-xl border border-slate-200/40">
            <button
              onClick={() => setModoVista('grid')}
              title="Vista en tarjetas"
              className={`p-1.5 rounded-lg transition-all ${
                modoVista === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setModoVista('lista')}
              title="Vista en lista compacta"
              className={`p-1.5 rounded-lg transition-all ${
                modoVista === 'lista'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 4. CONTENIDO PRINCIPAL: GRID O LISTA */}
      {miembrosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No se encontraron hermanos</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {busqueda ? 'No hay coincidencias con los términos de búsqueda.' : 'Aún no hay hermanos registrados en esta categoría.'}
          </p>
          {!busqueda && (
            <button
              onClick={handleAbrirCrear}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar primer hermano</span>
            </button>
          )}
        </div>
      ) : modoVista === 'grid' ? (
        
        /* MODO TARJETAS (Grid compacto interactivo - Toda la tarjeta es clickeable) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {miembrosFiltrados.map((m) => {
            const diezmos = Number(m.total_diezmos) || 0;
            const pactos = Number(m.total_pactos) || 0;
            const totalAportado = diezmos + pactos;
            const cantAportes = Number(m.total_aportaciones) || 0;
            const inicial = m.nombre.charAt(0).toUpperCase();

            return (
              <div
                key={m.id}
                onClick={() => handleVerDetalle(m)}
                className="group relative bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-200/80 hover:border-slate-300 p-4 transition-all duration-200 shadow-xs hover:shadow cursor-pointer flex flex-col justify-between"
              >
                {/* Cabecera de la Tarjeta */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar Monograma Apple */}
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {inicial}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {m.nombre}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-semibold ${
                            m.activo !== false 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {m.activo !== false ? 'Activo' : 'Inactivo'}
                          </span>
                          <span className="text-[11px] text-slate-400">·</span>
                          <span className="text-[11px] text-slate-500 font-medium tabular-nums">
                            {cantAportes} {cantAportes === 1 ? 'aporte' : 'aportes'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones contextuales (Editar / Eliminar) */}
                    <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleAbrirEditar(m, e)}
                        title="Editar hermano"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleSolicitarEliminar(m, e)}
                        title="Eliminar hermano"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Teléfono & WhatsApp (si existe) */}
                  {m.telefono && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1 w-fit" onClick={(e) => e.stopPropagation()}>
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="tabular-nums font-medium">{m.telefono}</span>
                      <a
                        href={`https://wa.me/${m.telefono.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Enviar WhatsApp"
                        className="ml-1 text-emerald-600 hover:text-emerald-700 p-0.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Notas pastorales (si existen) */}
                  {m.notas && (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-1 italic">
                      "{m.notas}"
                    </p>
                  )}
                </div>

                {/* Pie de Tarjeta: Resumen de Aportes con Indicador de Tap/Click */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Total Aportado
                    </div>
                    <div className="text-base font-bold text-slate-900 tabular-nums">
                      {formatearMoneda(totalAportado)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-600 tabular-nums">
                        D: <span className="font-semibold text-blue-600">{formatearMoneda(diezmos)}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 tabular-nums">
                        P: <span className="font-semibold text-amber-600">{formatearMoneda(pactos)}</span>
                      </div>
                    </div>
                    
                    <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-400 flex items-center justify-center transition-all">
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      ) : (

        /* MODO LISTA COMPACTA (Estilo Apple Contacts / Settings Table) */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {miembrosFiltrados.map((m) => {
              const diezmos = Number(m.total_diezmos) || 0;
              const pactos = Number(m.total_pactos) || 0;
              const totalAportado = diezmos + pactos;
              const cantAportes = Number(m.total_aportaciones) || 0;
              const inicial = m.nombre.charAt(0).toUpperCase();

              return (
                <div
                  key={m.id}
                  onClick={() => handleVerDetalle(m)}
                  className="group flex items-center justify-between p-3 sm:px-4 hover:bg-slate-50 transition-colors cursor-pointer gap-3"
                >
                  {/* Info izquierda: Avatar + Nombre + Teléfono */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {inicial}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {m.nombre}
                        </span>
                        {m.activo === false && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                            Inactivo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {m.telefono ? (
                          <span className="tabular-nums">{m.telefono}</span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin teléfono</span>
                        )}
                        {m.notas && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-[11px] text-slate-400 truncate max-w-[200px]">{m.notas}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info derecha: Totales + Acciones */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                        {formatearMoneda(totalAportado)}
                      </div>
                      <div className="text-[11px] text-slate-600 tabular-nums space-x-1.5">
                        <span>D: <strong className="font-semibold text-blue-600">{formatearMoneda(diezmos)}</strong></span>
                        <span>P: <strong className="font-semibold text-amber-600">{formatearMoneda(pactos)}</strong></span>
                      </div>
                    </div>

                    {/* Botones de acción contextual */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleAbrirEditar(m, e)}
                        title="Editar"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleSolicitarEliminar(m, e)}
                        title="Eliminar"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. MODAL FORMULARIO: REGISTRAR / EDITAR HERMANO (Apple Sheet Style) */}
      {mostrarModalFormulario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {miembroAEditar ? 'Editar Hermano' : 'Registrar Hermano'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {miembroAEditar ? 'Actualiza los datos del hermano' : 'Agrega un nuevo miembro a la congregación'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarModalFormulario(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleGuardarMiembro} className="p-6 space-y-4">
              {errorForm && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorForm}</span>
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej. Samuel Morales, David Méndez"
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white text-xs text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono / WhatsApp <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="tel"
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  placeholder="Ej. 8714173782"
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white text-xs text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all tabular-nums"
                />
              </div>

              {/* Notas Pastorales */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas Pastorales / Anotaciones <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  placeholder="Ej. Miembro activo desde 2024, familia numerosa, peticiones especiales..."
                  className="w-full px-3.5 py-2 bg-slate-50/70 focus:bg-white text-xs text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all resize-none"
                />
              </div>

              {/* Switch Activo / Inactivo */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Estado en la Congregación</div>
                  <div className="text-[11px] text-slate-500">
                    {formActivo ? 'Aparece en las sugerencias de conteo' : 'Oculto en las listas de conteo'}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formActivo}
                  onClick={() => setFormActivo(!formActivo)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none shrink-0 cursor-pointer ${
                    formActivo ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`block w-5 h-5 rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      formActivo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarModalFormulario(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : miembroAEditar ? 'Guardar Cambios' : 'Registrar Hermano'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 6. MODAL DETALLE DE APORTACIONES DEL HERMANO (Apple Sheet Style) */}
      {miembroSeleccionadoDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header del Detalle */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                    {miembroSeleccionadoDetalle.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        {miembroSeleccionadoDetalle.nombre}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        miembroSeleccionadoDetalle.activo !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {miembroSeleccionadoDetalle.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {miembroSeleccionadoDetalle.telefono && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="tabular-nums">{miembroSeleccionadoDetalle.telefono}</span>
                        <a
                          href={`https://wa.me/${miembroSeleccionadoDetalle.telefono.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAbrirEditar(miembroSeleccionadoDetalle)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
                    title="Editar datos"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setMiembroSeleccionadoDetalle(null)}
                    className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Resumen Inset de Aportaciones del Hermano */}
              <div className="grid grid-cols-3 gap-2.5 mt-4">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Total Diezmos</div>
                  <div className="text-sm sm:text-base font-bold text-blue-600 tabular-nums mt-0.5">
                    {formatearMoneda(Number(miembroSeleccionadoDetalle.total_diezmos) || 0)}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Total Proyectos</div>
                  <div className="text-sm sm:text-base font-bold text-amber-600 tabular-nums mt-0.5">
                    {formatearMoneda(Number(miembroSeleccionadoDetalle.total_pactos) || 0)}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Aporte Histórico</div>
                  <div className="text-sm sm:text-base font-bold text-emerald-600 tabular-nums mt-0.5">
                    {formatearMoneda((Number(miembroSeleccionadoDetalle.total_diezmos) || 0) + (Number(miembroSeleccionadoDetalle.total_pactos) || 0))}
                  </div>
                </div>
              </div>

              {/* Segmented Control de Filtrado */}
              <div className="flex items-center justify-between mt-4">
                <div className="inline-flex items-center p-0.5 bg-slate-200/60 rounded-xl text-xs font-medium border border-slate-200/40">
                  <button
                    onClick={() => setFiltroTipoDetalle('todos')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filtroTipoDetalle === 'todos' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Todos ({aportacionesMiembro.length})
                  </button>
                  <button
                    onClick={() => setFiltroTipoDetalle('diezmo')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filtroTipoDetalle === 'diezmo' ? 'bg-white text-blue-700 font-semibold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Diezmos
                  </button>
                  <button
                    onClick={() => setFiltroTipoDetalle('pacto')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filtroTipoDetalle === 'pacto' ? 'bg-white text-amber-700 font-semibold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Proyectos
                  </button>
                </div>

                <div className="text-xs text-slate-400 font-medium">
                  {aportacionesFiltradasModal.length} registros
                </div>
              </div>
            </div>

            {/* Lista Scrollable de Aportaciones */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 divide-y divide-slate-100">
              {cargandoDetalle ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Cargando aportaciones del hermano...
                </div>
              ) : aportacionesFiltradasModal.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-600">No hay aportaciones registradas en este filtro.</p>
                </div>
              ) : (
                aportacionesFiltradasModal.map((t) => {
                  const esDiezmo = t.subtipo === 'diezmo';
                  return (
                    <div key={t.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          esDiezmo ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {esDiezmo ? <TrendingUp className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {t.concepto || (esDiezmo ? 'Diezmo General' : 'Aporte a Proyecto')}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="tabular-nums">{formatearFechaCorta(t.fecha)}</span>
                            <span>·</span>
                            <span className="capitalize">{t.metodo_pago || 'efectivo'}</span>
                            {t.evidencia_url && (
                              <>
                                <span>·</span>
                                <button
                                  onClick={() => onVerEvidencia?.(t.evidencia_url!, t.concepto)}
                                  className="text-blue-600 hover:underline font-medium inline-flex items-center gap-0.5"
                                >
                                  <Eye className="w-3 h-3" /> Evidencia
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-sm font-bold tabular-nums ${esDiezmo ? 'text-blue-600' : 'text-amber-600'}`}>
                          +{formatearMoneda(Number(t.monto) || 0)}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {esDiezmo ? 'Diezmo' : 'Pacto'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Historial auditado y respaldado en la base de datos
              </span>
              <button
                onClick={() => setMiembroSeleccionadoDetalle(null)}
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <ModalConfirmacion
        isOpen={!!miembroAEliminar}
        titulo="¿Eliminar a este hermano?"
        mensaje={`¿Estás seguro de que deseas eliminar a ${miembroAEliminar?.nombre || ''} del directorio? Si tiene transacciones históricas registradas, estas se mantendrán para auditoría contable.`}
        textoConfirmar="Eliminar Hermano"
        textoCancelar="Cancelar"
        variante="peligro"
        onConfirm={handleConfirmarEliminar}
        onCancel={() => setMiembroAEliminar(null)}
      />

    </div>
  );
};
