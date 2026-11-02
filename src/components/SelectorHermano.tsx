import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { User, Search, Plus, Check, X, Phone, FileText, ChevronDown } from 'lucide-react';
import { MiembroIglesia } from '../types';
import { storageService } from '../services/storageService';
import { formatearMoneda } from '../utils/dateUtils';

interface SelectorHermanoProps {
  miembros: MiembroIglesia[];
  selectedId?: string;
  selectedNombre?: string;
  onSelect: (miembro: MiembroIglesia | null, nombrePersonalizado?: string) => void;
  permitirAnonimo?: boolean;
  onNuevoMiembroCreado?: (nuevo: MiembroIglesia) => void;
  placeholder?: string;
  label?: string;
  requerido?: boolean;
  className?: string;
}

export const SelectorHermano: React.FC<SelectorHermanoProps> = ({
  miembros,
  selectedId,
  selectedNombre,
  onSelect,
  permitirAnonimo = false,
  onNuevoMiembroCreado,
  placeholder = 'Buscar o seleccionar hermano...',
  label = 'Hermano / Diezmante *',
  requerido = false,
  className = ''
}) => {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);

  // Formulario nuevo hermano
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevasNotas, setNuevasNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cerrar desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener('mousedown', handleClickAfuera);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickAfuera);
    };
  }, [abierto]);

  // Encontrar el miembro seleccionado actualmente
  const miembroSeleccionado = useMemo(() => {
    if (selectedId) {
      return miembros.find(m => m.id === selectedId);
    }
    if (selectedNombre && selectedNombre.toLowerCase() !== 'anónimo' && selectedNombre.toLowerCase() !== 'anonimo') {
      return miembros.find(m => m.nombre.toLowerCase().trim() === selectedNombre.toLowerCase().trim());
    }
    return null;
  }, [miembros, selectedId, selectedNombre]);

  const esAnonimo = (selectedNombre?.toLowerCase() === 'anónimo' || selectedNombre?.toLowerCase() === 'anonimo');

  // Filtrado de miembros en tiempo real
  const miembrosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    const activos = miembros.filter(m => m.activo !== false);
    if (!q) return activos;
    return activos.filter(m => 
      m.nombre.toLowerCase().includes(q) ||
      (m.telefono && m.telefono.includes(q)) ||
      (m.notas && m.notas.toLowerCase().includes(q))
    );
  }, [miembros, busqueda]);

  const handleSeleccionar = (m: MiembroIglesia) => {
    onSelect(m, m.nombre);
    setAbierto(false);
    setBusqueda('');
  };

  const handleSeleccionarAnonimo = () => {
    onSelect(null, 'Anónimo');
    setAbierto(false);
    setBusqueda('');
  };

  const handleLimpiar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null, '');
    setBusqueda('');
  };

  const handleCrearNuevo = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!nuevoNombre.trim()) {
      setErrorCreacion('El nombre es obligatorio.');
      return;
    }

    setGuardando(true);
    setErrorCreacion(null);
    try {
      const nuevo = await storageService.guardarMiembro({
        nombre: nuevoNombre.trim(),
        telefono: nuevoTelefono.trim() || undefined,
        notas: nuevasNotas.trim() || undefined,
        activo: true
      });

      if (onNuevoMiembroCreado) {
        onNuevoMiembroCreado(nuevo);
      }
      onSelect(nuevo, nuevo.nombre);
      setMostrarModalNuevo(false);
      setNuevoNombre('');
      setNuevoTelefono('');
      setNuevasNotas('');
      setAbierto(false);
    } catch (err: any) {
      setErrorCreacion(err.message || 'Error al guardar el nuevo hermano.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center justify-between">
          <span>{label}</span>
          {permitirAnonimo && (
            <span className="text-[10px] text-slate-400 lowercase">o selecciona "Anónimo"</span>
          )}
        </label>
      )}

      {/* Botón / Input disparador estilo Apple HIG */}
      <div
        onClick={() => {
          setAbierto(!abierto);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }}
        className={`w-full min-h-[42px] px-3 py-2 bg-white border rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-sm ${
          abierto 
            ? 'border-indigo-500 ring-2 ring-indigo-500/10' 
            : 'border-slate-200/90 hover:border-slate-300'
        } ${requerido && !miembroSeleccionado && !esAnonimo ? 'border-amber-300/80' : ''}`}
      >
        <div className="flex items-center space-x-2.5 overflow-hidden flex-1 mr-2">
          {miembroSeleccionado ? (
            <>
              <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                {miembroSeleccionado.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {miembroSeleccionado.nombre}
                </span>
                {miembroSeleccionado.telefono && (
                  <span className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5" />
                    {miembroSeleccionado.telefono}
                  </span>
                )}
              </div>
            </>
          ) : esAnonimo ? (
            <>
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                ?
              </div>
              <span className="text-xs font-bold text-slate-600 italic">
                Anónimo / No identificado
              </span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-400 font-medium truncate">
                {placeholder}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {(miembroSeleccionado || esAnonimo) && (
            <button
              type="button"
              onClick={handleLimpiar}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Quitar selección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Menú Desplegable Flotante */}
      {abierto && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-80 flex flex-col">
          
          {/* Barra de búsqueda interna */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/60 flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 ml-1.5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Botón Rápido: + Registrar Hermano */}
          <div className="p-1.5 bg-indigo-50/50 border-b border-indigo-100/60">
            <button
              type="button"
              onClick={() => {
                setNuevoNombre(busqueda);
                setMostrarModalNuevo(true);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200/70 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{busqueda ? `+ Registrar "${busqueda}" como Hermano` : '+ Registrar Nuevo Hermano'}</span>
            </button>
          </div>

          {/* Lista de Resultados */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100/70 p-1">
            {/* Opción Anónimo si está permitida */}
            {permitirAnonimo && (
              <button
                type="button"
                onClick={handleSeleccionarAnonimo}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                  esAnonimo ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-200/70 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                    ?
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Anónimo</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">(Sobre sin nombre)</span>
                  </div>
                </div>
                {esAnonimo && <Check className="w-4 h-4 text-slate-700" />}
              </button>
            )}

            {miembrosFiltrados.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-500 font-medium">No se encontró ningún hermano.</p>
                <button
                  type="button"
                  onClick={() => {
                    setNuevoNombre(busqueda);
                    setMostrarModalNuevo(true);
                  }}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                >
                  Registrar ahora a "{busqueda || 'este hermano'}"
                </button>
              </div>
            ) : (
              miembrosFiltrados.map((m) => {
                const esActivoSeleccionado = miembroSeleccionado?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSeleccionar(m)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      esActivoSeleccionado 
                        ? 'bg-indigo-50 text-indigo-900 font-bold' 
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 mr-2">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 text-indigo-700 font-black flex items-center justify-center text-[11px] border border-indigo-200/40 flex-shrink-0">
                        {m.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{m.nombre}</span>
                          {m.notas && (
                            <span 
                              className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-medium inline-flex items-center" 
                              title={`Nota: ${m.notas}`}
                            >
                              <FileText className="w-2.5 h-2.5 mr-0.5" />
                              Nota
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                          {m.telefono && <span>📞 {m.telefono}</span>}
                          {m.total_aportaciones !== undefined && m.total_aportaciones > 0 && (
                            <span>• {m.total_aportaciones} aportaciones</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {m.total_aportado !== undefined && m.total_aportado > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-200/50">
                          {formatearMoneda(m.total_aportado)}
                        </span>
                      )}
                      {esActivoSeleccionado && (
                        <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Mini Modal para Registrar Nuevo Hermano al Vuelo (Renderizado con Portal fuera del form padre) */}
      {mostrarModalNuevo && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setMostrarModalNuevo(false);
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Registrar Hermano</h3>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMostrarModalNuevo(false);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorCreacion && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorCreacion}
              </div>
            )}

            <div 
              className="space-y-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCrearNuevo(e);
                }
              }}
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Samuel Morales, Hna. Gloria..."
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Teléfono / WhatsApp (Opcional)
                </label>
                <input
                  type="tel"
                  placeholder="Ej. 871-417-3782"
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Notas Pastorales / Anotaciones (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Miembro activo desde 2024, líder de células..."
                  value={nuevasNotas}
                  onChange={(e) => setNuevasNotas(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMostrarModalNuevo(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCrearNuevo}
                  disabled={guardando}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar y Seleccionar'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
