import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Coins, 
  HeartHandshake, 
  Landmark, 
  CheckCircle2, 
  DollarSign, 
  User, 
  Sparkles,
  Zap,
  ArrowDownLeft,
  ChevronRight
} from 'lucide-react';
import { SubtipoIngreso, TipoCulto, MetodoPago, ProyectoPactado, PactoMiembro, MiembroFrecuente } from '../types';
import { storageService } from '../services/storageService';
import { getFechaHoy, getUltimoDiaSemana, formatearMoneda, formatearFechaLarga } from '../utils/dateUtils';

interface CapturaIngresosProps {
  tipoCultoInicial?: TipoCulto;
  subtipoInicial?: SubtipoIngreso;
  proyectoIdInicial?: string;
  pactoIdInicial?: string;
  onIngresoGuardado?: () => void;
}

export const CapturaIngresosView: React.FC<CapturaIngresosProps> = ({
  tipoCultoInicial = 'domingo_manana',
  subtipoInicial = 'ofrenda',
  proyectoIdInicial,
  pactoIdInicial,
  onIngresoGuardado
}) => {
  const [tipoCulto, setTipoCulto] = useState<TipoCulto>(tipoCultoInicial);
  const [subtipo, setSubtipo] = useState<SubtipoIngreso>(subtipoInicial);
  
  // Establecer fecha por defecto según el tipo de culto inicial
  const [fecha, setFecha] = useState<string>(() => {
    if (tipoCultoInicial === 'miercoles_general') {
      return getUltimoDiaSemana(3); // Miércoles
    }
    return getUltimoDiaSemana(0); // Domingo
  });
  
  const [monto, setMonto] = useState<string>('');
  const [categoria, setCategoria] = useState<string>(subtipoInicial === 'pacto' ? 'Aporte a Proyecto Pactado' : (subtipoInicial === 'diezmo' ? 'Diezmo General' : 'Ofrenda General'));
  const [concepto, setConcepto] = useState<string>(subtipoInicial === 'pacto' ? 'Aporte a Proyecto Pactado' : 'Ofrenda Culto Domingo Mañana');
  const [miembroNombre, setMiembroNombre] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');

  // Para Proyectos Pactados
  const [proyectos, setProyectos] = useState<ProyectoPactado[]>(() => storageService.getProyectos());
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<string>(proyectoIdInicial || '');
  const [pactos, setPactos] = useState<PactoMiembro[]>(() => storageService.getPactos());
  const [pactoSeleccionadoId, setPactoSeleccionadoId] = useState<string>(pactoIdInicial || '');

  // Miembros frecuentes para autocompletado
  const [miembrosFrecuentes, setMiembrosFrecuentes] = useState<MiembroFrecuente[]>(() => storageService.getMiembros());

  // Modo continuo de captura (Ideal para contar sobres)
  const [modoSobresContinuo, setModoSobresContinuo] = useState<boolean>(true);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Cargar datos iniciales y sincronizar con PostgreSQL
  useEffect(() => {
    let montado = true;
    const sincronizar = async () => {
      cargarDatosLocales();
      try {
        const [projs, pcts] = await Promise.all([
          storageService.cargarProyectosRemotos(),
          storageService.cargarPactosRemotos()
        ]);
        if (montado) {
          const activos = projs.filter(p => p.activo);
          setProyectos(activos);
          setPactos(pcts);

          if (proyectoIdInicial) {
            setProyectoSeleccionadoId(proyectoIdInicial);
          } else if (activos.length > 0 && !proyectoSeleccionadoId) {
            setProyectoSeleccionadoId(activos[0].id);
          }

          if (pactoIdInicial) {
            const p = pcts.find(item => item.id === pactoIdInicial);
            if (p) {
              setPactoSeleccionadoId(p.id);
              setMiembroNombre(p.miembro_nombre);
              setMonto(String(p.cuota_semanal));
              setConcepto(`Cuota semanal: ${p.proyecto_nombre}`);
            }
          }
        }
      } catch (e) {
        console.warn('Error sincronizando en CapturaIngresos:', e);
      }
    };
    sincronizar();
    return () => { montado = false; };
  }, [proyectoIdInicial, pactoIdInicial]);

  const cargarDatosLocales = () => {
    const projs = storageService.getProyectos().filter(p => p.activo);
    setProyectos(projs);
    if (proyectoIdInicial) {
      setProyectoSeleccionadoId(proyectoIdInicial);
    } else if (projs.length > 0 && !proyectoSeleccionadoId) {
      setProyectoSeleccionadoId(projs[0].id);
    }

    const pcts = storageService.getPactos();
    setPactos(pcts);
    if (pactoIdInicial) {
      const p = pcts.find(item => item.id === pactoIdInicial);
      if (p) {
        setPactoSeleccionadoId(p.id);
        setMiembroNombre(p.miembro_nombre);
        setMonto(String(p.cuota_semanal));
        setConcepto(`Cuota semanal: ${p.proyecto_nombre}`);
      }
    }

    const ms = storageService.getMiembros();
    setMiembrosFrecuentes(ms);
  };

  // Filtrar pactos por el proyecto seleccionado
  const pactosDelProyecto = pactos.filter(p => p.proyecto_id === proyectoSeleccionadoId);
  const pactoActivo = pactos.find(p => p.id === pactoSeleccionadoId);
  const proyectoActivo = proyectos.find(p => p.id === proyectoSeleccionadoId);

  // Manejar selector rápido de Miércoles y Domingo
  const seleccionarCultoRapido = (tipo: TipoCulto) => {
    setTipoCulto(tipo);
    if (tipo === 'miercoles_general') {
      const fechaMiercoles = getUltimoDiaSemana(3);
      setFecha(fechaMiercoles);
      if (subtipo === 'ofrenda') {
        setConcepto('Ofrenda Culto Miércoles');
      }
    } else if (tipo === 'domingo_manana') {
      const fechaDomingo = getUltimoDiaSemana(0);
      setFecha(fechaDomingo);
      if (subtipo === 'ofrenda') {
        setConcepto('Ofrenda Culto Domingo Mañana');
      }
    } else if (tipo === 'domingo_tarde') {
      const fechaDomingo = getUltimoDiaSemana(0);
      setFecha(fechaDomingo);
      if (subtipo === 'ofrenda') {
        setConcepto('Ofrenda Culto Domingo Tarde');
      }
    }
  };

  // Cambiar categoría y concepto por defecto según el subtipo
  const cambiarSubtipo = (nuevoSubtipo: SubtipoIngreso) => {
    setSubtipo(nuevoSubtipo);
    if (nuevoSubtipo === 'ofrenda') {
      setCategoria('Ofrenda General');
      setConcepto(
        tipoCulto === 'miercoles_general'
          ? 'Ofrenda Culto Miércoles'
          : 'Ofrenda Culto Domingo Mañana'
      );
    } else if (nuevoSubtipo === 'diezmo') {
      setCategoria('Diezmo General');
      setConcepto('Diezmo de agradecimiento');
    } else if (nuevoSubtipo === 'pacto') {
      setCategoria('Aporte a Proyecto Pactado');
      if (proyectoActivo) {
        setConcepto(`Aporte a pacto: ${proyectoActivo.nombre}`);
      }
    }
  };

  // Al seleccionar un pacto, autollenar nombre y monto sugerido
  const seleccionarPacto = (pactoId: string) => {
    setPactoSeleccionadoId(pactoId);
    const p = pactos.find(item => item.id === pactoId);
    if (p) {
      setMiembroNombre(p.miembro_nombre);
      setMonto(p.cuota_semanal.toString());
      setConcepto(`Cuota semanal: ${p.proyecto_nombre}`);
    }
  };

  // Guardar entrada
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNumerico = parseFloat(monto);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      alert('Por favor ingrese un monto válido mayor a 0');
      return;
    }

    if (subtipo === 'diezmo' && !miembroNombre.trim()) {
      alert('Por favor ingrese el nombre del miembro que entrega el diezmo (o "Anónimo")');
      return;
    }

    if (subtipo === 'pacto' && !proyectoSeleccionadoId) {
      alert('Debe seleccionar el proyecto pactado al que corresponde el aporte');
      return;
    }

    await storageService.guardarTransaccion({
      tipo: 'ingreso',
      subtipo,
      categoria,
      monto: montoNumerico,
      fecha,
      tipo_culto: tipoCulto,
      concepto: concepto.trim() || 'Ingreso de culto',
      miembro_nombre: miembroNombre.trim() || undefined,
      proyecto_id: subtipo === 'pacto' ? proyectoSeleccionadoId : undefined,
      proyecto_nombre: subtipo === 'pacto' ? proyectoActivo?.nombre : undefined,
      pacto_id: subtipo === 'pacto' ? (pactoSeleccionadoId || undefined) : undefined,
      metodo_pago: metodoPago
    });

    // Mensaje de éxito
    setMensajeExito(`¡Registrado con éxito: ${formatearMoneda(montoNumerico)} en ${subtipo.toUpperCase()}!`);
    setTimeout(() => setMensajeExito(null), 3500);

    // Recargar datos internos
    cargarDatosLocales();
    onIngresoGuardado?.();

    // Limpiar para el siguiente sobre si está en modo continuo
    if (modoSobresContinuo) {
      setMonto('');
      if (subtipo === 'diezmo' || subtipo === 'pacto') {
        setMiembroNombre('');
        setPactoSeleccionadoId('');
      }
    } else {
      setMonto('');
      setMiembroNombre('');
    }
  };

  // Calcular totales del culto seleccionado para feedback inmediato
  const transacciones = storageService.getTransacciones();
  const transaccionesDelCulto = transacciones.filter(t => t.fecha === fecha && t.tipo === 'ingreso');
  const totalRecaudadoEnCulto = transaccionesDelCulto.reduce((acc, t) => acc + t.monto, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* 1. SELECCIÓN DE CULTO ESTILO APPLE HIG */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-600 text-[11px] font-bold uppercase tracking-wider mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Servicio Eclesiástico</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Captura de Entradas
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              {formatearFechaLarga(fecha)}
            </p>
          </div>

          {/* Segmented Control de Culto */}
          <div className="apple-segmented-group self-start sm:self-auto">
            <button
              type="button"
              onClick={() => seleccionarCultoRapido('miercoles_general')}
              className={`apple-segmented-item px-3.5 py-1.5 text-xs font-semibold ${
                tipoCulto === 'miercoles_general' ? 'apple-segmented-active text-amber-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Miércoles
            </button>
            <button
              type="button"
              onClick={() => seleccionarCultoRapido('domingo_manana')}
              className={`apple-segmented-item px-3.5 py-1.5 text-xs font-semibold ${
                tipoCulto === 'domingo_manana' ? 'apple-segmented-active text-emerald-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Domingo Mañana
            </button>
            <button
              type="button"
              onClick={() => seleccionarCultoRapido('domingo_tarde')}
              className={`apple-segmented-item px-3.5 py-1.5 text-xs font-semibold ${
                tipoCulto === 'domingo_tarde' ? 'apple-segmented-active text-emerald-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Domingo Noche
            </button>
          </div>
        </div>

        {/* Resumen del Culto Actual */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 font-medium">
            Entradas del día: <strong>{transaccionesDelCulto.length}</strong> registradas
          </span>
          <span className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
            Total en este culto: {formatearMoneda(totalRecaudadoEnCulto)}
          </span>
        </div>
      </div>

      {/* Alerta de Éxito al Registrar */}
      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-bold text-xs sm:text-sm">{mensajeExito}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
            Registrado
          </span>
        </div>
      )}

      {/* 2. CONTENEDOR PRINCIPAL DEL FORMULARIO APPLE HIG */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        
        {/* Pestañas de Subtipo Apple Segmented Control */}
        <div className="p-3 bg-[#F9F9FB] border-b border-slate-200/80">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 rounded-2xl">
            <button
              type="button"
              onClick={() => cambiarSubtipo('ofrenda')}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                subtipo === 'ofrenda'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>1. Ofrenda</span>
            </button>

            <button
              type="button"
              onClick={() => cambiarSubtipo('diezmo')}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                subtipo === 'diezmo'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartHandshake className="w-4 h-4 text-indigo-600" />
              <span>2. Diezmo</span>
            </button>

            <button
              type="button"
              onClick={() => cambiarSubtipo('pacto')}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                subtipo === 'pacto'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-4 h-4 text-amber-600" />
              <span>3. Proyecto Pactado</span>
            </button>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleGuardar} className="p-6 sm:p-8 space-y-6">
          
          {/* HERO AMOUNT INPUT (ESTILO APPLE PAY) */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 text-center space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Importe de la Entrada ($ MXN)
            </span>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-3xl font-extrabold text-slate-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.50"
                min="0"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                autoFocus
                required
                className="w-56 text-center text-4xl sm:text-5xl font-black text-slate-950 bg-transparent border-b-2 border-slate-300 focus:border-emerald-500 focus:outline-none tabular-nums placeholder-slate-300"
              />
            </div>

            {/* Chips de montos rápidos */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {[50, 100, 200, 500, 1000, 2000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMonto(val.toString())}
                  className="min-h-[38px] min-w-[56px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 text-xs font-bold text-slate-700 hover:text-emerald-700 transition-all active:scale-95 shadow-sm"
                >
                  +${val}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha y Método de Entrega */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Fecha del Movimiento
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Método de Entrega
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="efectivo">Efectivo (Sobre / Canasta)</option>
                <option value="transferencia">Transferencia Bancaria / SPEI</option>
                <option value="cheque">Cheque</option>
                <option value="tarjeta">Terminal / Tarjeta</option>
              </select>
            </div>
          </div>

          {/* CASO 1: OFRENDA */}
          {subtipo === 'ofrenda' && (
            <div className="bg-emerald-50/50 border border-emerald-200/70 p-4 sm:p-5 rounded-2xl space-y-3">
              <label className="block text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                Categoría de Ofrenda
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'Ofrenda General',
                  'Ofrenda Misionera',
                  'Escuela Dominical / Niños',
                  'Ofrenda de Acción de Gracias',
                  'Ofrenda de Jóvenes',
                  'Pro-Templo / Edificación'
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategoria(cat);
                      setConcepto(`${cat} - ${tipoCulto === 'miercoles_general' ? 'Miércoles' : 'Domingo'}`);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold text-left transition-all border ${
                      categoria === cat
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CASO 2: DIEZMO */}
          {subtipo === 'diezmo' && (
            <div className="bg-indigo-50/50 border border-indigo-200/70 p-4 sm:p-5 rounded-2xl space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Nombre del Hermano / Diezmante *</span>
                  <span className="text-[10px] font-normal text-slate-500">O escribe "Anónimo"</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Ej. Hno. Carlos Mendoza, Familia Morales..."
                    value={miembroNombre}
                    onChange={(e) => setMiembroNombre(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Sugerencias Rápidas de Miembros Frecuentes */}
              {miembrosFrecuentes.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Miembros Frecuentes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {miembrosFrecuentes.slice(0, 6).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMiembroNombre(m.nombre)}
                        className="text-xs bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 px-2.5 py-1 rounded-xl transition-colors font-medium shadow-sm"
                      >
                        {m.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CASO 3: PROYECTO PACTADO */}
          {subtipo === 'pacto' && (
            <div className="bg-amber-50/50 border border-amber-200/70 p-4 sm:p-5 rounded-2xl space-y-4">
              
              {/* Selección del Proyecto Activo */}
              <div>
                <label className="block text-[11px] font-bold text-amber-950 uppercase tracking-wider mb-1">
                  Proyecto Pactado de la Iglesia *
                </label>
                <select
                  value={proyectoSeleccionadoId}
                  onChange={(e) => {
                    setProyectoSeleccionadoId(e.target.value);
                    setPactoSeleccionadoId('');
                  }}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Meta: {formatearMoneda(p.meta_total)} - Semanal sugerido: {formatearMoneda(p.valor_semanal_sugerido)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selección de Hermano Pactante */}
              <div>
                <label className="block text-[11px] font-bold text-amber-950 uppercase tracking-wider mb-1">
                  Hermano / Familia con Pacto Registrado
                </label>
                <select
                  value={pactoSeleccionadoId}
                  onChange={(e) => seleccionarPacto(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="">-- Seleccionar de la lista de pactantes o escribir abajo --</option>
                  {pactosDelProyecto.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.miembro_nombre} - Pacto: {formatearMoneda(p.monto_total_pactado)} | Cuota: {formatearMoneda(p.cuota_semanal)}/sem | Resta: {formatearMoneda(p.saldo_pendiente)}
                    </option>
                  ))}
                </select>
              </div>

              {!pactoSeleccionadoId && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    O escribe el Nombre del Hermano Aportante:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Familia González"
                    value={miembroNombre}
                    onChange={(e) => setMiembroNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              )}

              {/* Ficha en vivo del Pactante Seleccionado */}
              {pactoActivo && (
                <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-sm space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="text-xs sm:text-sm text-amber-900">{pactoActivo.miembro_nombre}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {pactoActivo.semanas_pagadas} semanas cubiertas
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Pactado</span>
                      <span className="font-bold text-slate-800">{formatearMoneda(pactoActivo.monto_total_pactado)}</span>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg">
                      <span className="text-emerald-700 block text-[10px] uppercase font-bold">Aportado</span>
                      <span className="font-bold text-emerald-800">{formatearMoneda(pactoActivo.total_aportado)}</span>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg">
                      <span className="text-amber-800 block text-[10px] uppercase font-bold">Saldo</span>
                      <span className="font-bold text-amber-900">{formatearMoneda(pactoActivo.saldo_pendiente)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Concepto / Nota adicional */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Concepto / Nota adicional
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Descripción del ingreso..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Opciones y Botón de Envío */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={modoSobresContinuo}
                onChange={(e) => setModoSobresContinuo(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="font-semibold">
                Modo continuo de sobres (mantener fecha para captura rápida)
              </span>
            </label>

            <button
              type="submit"
              className="w-full sm:w-auto px-7 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Registrar Entrada</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
