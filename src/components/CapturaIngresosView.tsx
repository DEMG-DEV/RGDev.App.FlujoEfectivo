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
  ChevronRight,
  ArrowRightLeft,
  AlertTriangle,
  Info
} from 'lucide-react';
import { SubtipoIngreso, TipoCulto, MetodoPago, ProyectoPactado, PactoMiembro, MiembroIglesia } from '../types';
import { storageService } from '../services/storageService';
import { SelectorHermano } from './SelectorHermano';
import { getFechaHoy, getUltimoDiaSemana, formatearMoneda, formatearFechaLarga, identificarDiaSemana } from '../utils/dateUtils';

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
  const [miembroId, setMiembroId] = useState<string>('');
  const [miembroNombre, setMiembroNombre] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');

  // Para Proyectos Pactados
  const [proyectos, setProyectos] = useState<ProyectoPactado[]>(() => storageService.getProyectos());
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<string>(proyectoIdInicial || '');
  const [pactos, setPactos] = useState<PactoMiembro[]>(() => storageService.getPactos());
  const [pactoSeleccionadoId, setPactoSeleccionadoId] = useState<string>(pactoIdInicial || '');

  // Función: Tomar una cantidad del diezmo para aplicarla a un pacto
  const [aplicarAPactoDesdeDiezmo, setAplicarAPactoDesdeDiezmo] = useState<boolean>(false);
  const [proyectoPactoDiezmoId, setProyectoPactoDiezmoId] = useState<string>('');
  const [pactoDiezmoId, setPactoDiezmoId] = useState<string>('');
  const [montoAPacto, setMontoAPacto] = useState<string>('');

  // Directorio de hermanos registrados de la iglesia
  const [miembros, setMiembros] = useState<MiembroIglesia[]>(() => storageService.getMiembros());

  // Modo continuo de captura (Ideal para contar sobres)
  const [modoSobresContinuo, setModoSobresContinuo] = useState<boolean>(true);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Cargar datos iniciales y sincronizar con PostgreSQL
  useEffect(() => {
    let montado = true;
    const sincronizar = async () => {
      cargarDatosLocales();
      try {
        const [projs, pcts, ms] = await Promise.all([
          storageService.cargarProyectosRemotos(),
          storageService.cargarPactosRemotos(),
          storageService.cargarMiembrosRemotos()
        ]);
        if (montado) {
          const activos = projs.filter(p => p.activo);
          setProyectos(activos);
          setPactos(pcts);
          setMiembros(ms);

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
    setMiembros(ms);
  };

  // Filtrar pactos por el proyecto seleccionado
  const pactosDelProyecto = pactos.filter(p => p.proyecto_id === proyectoSeleccionadoId);
  const pactoActivo = pactos.find(p => p.id === pactoSeleccionadoId);
  const proyectoActivo = proyectos.find(p => p.id === proyectoSeleccionadoId);

  // Pactos y proyecto para la aplicación de diezmo a pacto
  const pactosDelProyectoDiezmo = pactos.filter(p => p.proyecto_id === proyectoPactoDiezmoId);
  const proyectoDiezmoActivo = proyectos.find(p => p.id === proyectoPactoDiezmoId);
  const pactoDiezmoActivo = pactos.find(p => p.id === pactoDiezmoId);

  // Inicializar proyecto de destino y pacto al activar el split de diezmo
  useEffect(() => {
    if (aplicarAPactoDesdeDiezmo) {
      const projId = proyectoPactoDiezmoId || proyectos[0]?.id;
      if (projId && !proyectoPactoDiezmoId) {
        setProyectoPactoDiezmoId(projId);
      }
      if (projId) {
        const pactosDelProj = pactos.filter(p => p.proyecto_id === projId);
        let pactoMatch: PactoMiembro | undefined;
        if (miembroNombre.trim()) {
          const cleanNombre = miembroNombre.trim().toLowerCase();
          pactoMatch = pactosDelProj.find(p => p.miembro_nombre.trim().toLowerCase() === cleanNombre);
        }
        // Si no hay coincidencia por nombre pero el proyecto tiene exactamente 1 pactante (ej. "Iglesia"), seleccionarlo por defecto
        if (!pactoMatch && pactosDelProj.length === 1) {
          pactoMatch = pactosDelProj[0];
        }

        if (pactoMatch && !pactoDiezmoId) {
          setPactoDiezmoId(pactoMatch.id);
          if (!montoAPacto && pactoMatch.cuota_semanal > 0) {
            setMontoAPacto(String(pactoMatch.cuota_semanal));
          }
        }
      }
    }
  }, [aplicarAPactoDesdeDiezmo, proyectos, proyectoPactoDiezmoId, pactos, pactoDiezmoId, miembroNombre, montoAPacto]);

  // Cálculos para la vista previa del desglose de diezmo a pacto
  const montoTotalNum = parseFloat(monto) || 0;
  const montoPactoNum = parseFloat(montoAPacto) || 0;
  const montoDiezmoNeto = Math.max(0, montoTotalNum - montoPactoNum);
  const esSplitInvalido = aplicarAPactoDesdeDiezmo && subtipo === 'diezmo' && (montoPactoNum <= 0 || montoPactoNum >= montoTotalNum);

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

    // CASO ESPECIAL: Tomar una cantidad del diezmo para aplicarla en los pactos (Split)
    if (subtipo === 'diezmo' && aplicarAPactoDesdeDiezmo) {
      const montoTotalNum = montoNumerico;
      const montoPactoNum = parseFloat(montoAPacto);

      if (isNaN(montoPactoNum) || montoPactoNum <= 0) {
        alert('Por favor ingrese una cantidad válida a destinar al pacto mayor a $0');
        return;
      }

      if (montoPactoNum >= montoTotalNum) {
        alert(`La cantidad para el pacto (${formatearMoneda(montoPactoNum)}) debe ser estrictamente menor al importe total del sobre (${formatearMoneda(montoTotalNum)}) para que quede saldo en Diezmo General.`);
        return;
      }

      if (!proyectoPactoDiezmoId) {
        alert('Debe seleccionar el proyecto pactado de destino para aplicar el fondo');
        return;
      }

      const montoDiezmoNeto = montoTotalNum - montoPactoNum;
      const projDestino = proyectos.find(p => p.id === proyectoPactoDiezmoId);

      // Si no se eligió un pacto individual pero el proyecto tiene solo 1 pactante (ej. "Iglesia"), asociarlo automáticamente
      let finalPactoId = pactoDiezmoId;
      if (!finalPactoId && projDestino) {
        const pactosDelProj = pactos.filter(p => p.proyecto_id === projDestino.id);
        if (pactosDelProj.length === 1) {
          finalPactoId = pactosDelProj[0].id;
        }
      }
      const pactoDestino = pactos.find(p => p.id === finalPactoId);
      const nombreMiembroFinal = miembroNombre.trim() || undefined;

      // 1. Guardar Transacción de Diezmo Neto (Caja General)
      await storageService.guardarTransaccion({
        tipo: 'ingreso',
        subtipo: 'diezmo',
        categoria: 'Diezmo General',
        monto: montoDiezmoNeto,
        fecha,
        tipo_culto: tipoCulto,
        concepto: concepto.trim()
          ? `${concepto.trim()} (Sobre: ${formatearMoneda(montoTotalNum)} - Aplicado a pacto: ${formatearMoneda(montoPactoNum)})`
          : `Diezmo General (Sobre: ${formatearMoneda(montoTotalNum)} - Aplicado a pacto: ${formatearMoneda(montoPactoNum)})`,
        miembro_id: miembroId || undefined,
        miembro_nombre: nombreMiembroFinal,
        metodo_pago: metodoPago
      });

      // 2. Guardar Transacción de Aporte a Pacto (Proyecto Pactado)
      await storageService.guardarTransaccion({
        tipo: 'ingreso',
        subtipo: 'pacto',
        categoria: 'Aporte a Proyecto Pactado',
        monto: montoPactoNum,
        fecha,
        tipo_culto: tipoCulto,
        concepto: `Aporte a pacto desde diezmo de ${nombreMiembroFinal || 'hermano'} (${projDestino?.nombre || 'Proyecto'})`,
        miembro_id: miembroId || undefined,
        miembro_nombre: pactoDestino?.miembro_nombre || nombreMiembroFinal,
        proyecto_id: proyectoPactoDiezmoId,
        proyecto_nombre: projDestino?.nombre,
        pacto_id: finalPactoId || undefined,
        metodo_pago: metodoPago
      });

      // Mensaje de éxito
      setMensajeExito(`¡Sobre procesado! ${formatearMoneda(montoDiezmoNeto)} en DIEZMO y ${formatearMoneda(montoPactoNum)} en PACTO (${projDestino?.nombre || 'Proyecto'}).`);
      setTimeout(() => setMensajeExito(null), 4000);

      // Recargar datos internos
      cargarDatosLocales();
      onIngresoGuardado?.();

      // Limpiar para el siguiente sobre si está en modo continuo
      if (modoSobresContinuo) {
        setMonto('');
        setMiembroId('');
        setMiembroNombre('');
        setMontoAPacto('');
        setPactoDiezmoId('');
      } else {
        setMonto('');
        setMiembroId('');
        setMiembroNombre('');
        setMontoAPacto('');
        setPactoDiezmoId('');
        setAplicarAPactoDesdeDiezmo(false);
      }
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
      miembro_id: miembroId || undefined,
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
        setMiembroId('');
        setMiembroNombre('');
        setPactoSeleccionadoId('');
      }
    } else {
      setMonto('');
      setMiembroId('');
      setMiembroNombre('');
    }
  };

  // Calcular totales del culto seleccionado para feedback inmediato
  const transacciones = storageService.getTransacciones();
  const transaccionesDelCulto = transacciones.filter(t => t.fecha === fecha && t.tipo === 'ingreso');
  const totalRecaudadoEnCulto = transaccionesDelCulto.reduce((acc, t) => acc + t.monto, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
      
      {/* 1. HEADER LIMPIO ESTILO APPLE HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Captura de Entradas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5 font-medium">
            <span>{formatearFechaLarga(fecha)}</span>
            <span>·</span>
            <span>{transaccionesDelCulto.length} {transaccionesDelCulto.length === 1 ? 'entrada' : 'entradas'}</span>
            <span>·</span>
            <span className="font-semibold text-emerald-700">{formatearMoneda(totalRecaudadoEnCulto)}</span>
          </p>
        </div>
      </div>

      {/* Alerta de Éxito al Registrar (Toast Minimalista Apple) */}
      {mensajeExito && (
        <div className="bg-emerald-50/90 border border-emerald-200/80 text-emerald-900 px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-xs">{mensajeExito}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
            Listo
          </span>
        </div>
      )}

      {/* 2. TARJETA PRINCIPAL UNIFICADA (APPLE GROUPED INSET STYLE) */}
      <div className="bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 sm:p-7 shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-6">
        
        {/* Selector de Tipo (Ofrenda / Diezmo / Proyecto) - Apple Segmented Bar */}
        <div className="apple-segmented-group w-full p-1 rounded-2xl grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => cambiarSubtipo('ofrenda')}
            className={`apple-segmented-item flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              subtipo === 'ofrenda'
                ? 'apple-segmented-active text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Ofrenda</span>
          </button>

          <button
            type="button"
            onClick={() => cambiarSubtipo('diezmo')}
            className={`apple-segmented-item flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              subtipo === 'diezmo'
                ? 'apple-segmented-active text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Diezmo</span>
          </button>

          <button
            type="button"
            onClick={() => cambiarSubtipo('pacto')}
            className={`apple-segmented-item flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              subtipo === 'pacto'
                ? 'apple-segmented-active text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Proyecto</span>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleGuardar} className="space-y-6">
          
          {/* HERO AMOUNT INPUT (ESTILO APPLE CASH / SEND MONEY) */}
          <div className="py-2 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              {subtipo === 'diezmo' && aplicarAPactoDesdeDiezmo
                ? 'Total del Sobre'
                : 'Importe de Entrada'}
            </span>
            <div className="inline-flex items-baseline justify-center">
              <span className="text-3xl sm:text-4xl font-semibold text-slate-300 mr-1 select-none">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.50"
                min="0"
                placeholder="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                autoFocus
                required
                className="w-48 sm:w-60 text-center text-5xl sm:text-6xl font-bold tracking-tight text-slate-950 bg-transparent border-none outline-none focus:ring-0 p-0 tabular-nums placeholder-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Chips de Montos Rápidos (Pills Discretas) */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              {[50, 100, 200, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMonto(val.toString())}
                  className="px-3 py-1 rounded-full bg-slate-100/80 hover:bg-slate-200/70 text-xs font-medium text-slate-600 hover:text-slate-900 transition-all active:scale-95"
                >
                  +${val}
                </button>
              ))}
            </div>
          </div>

          {/* FILA COMPACTA: FECHA Y MÉTODO DE ENTREGA */}
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => {
                  const nuevaFecha = e.target.value;
                  setFecha(nuevaFecha);
                  const dia = identificarDiaSemana(nuevaFecha);
                  if (dia === 'miercoles') {
                    setTipoCulto('miercoles_general');
                  } else if (dia === 'domingo') {
                    setTipoCulto('domingo_manana');
                  } else {
                    setTipoCulto('no_aplica');
                  }
                }}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                Método de Entrega
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              >
                <option value="efectivo">Efectivo (Sobre / Canasta)</option>
                <option value="transferencia">Transferencia Bancaria / SPEI</option>
                <option value="cheque">Cheque</option>
                <option value="tarjeta">Terminal / Tarjeta</option>
              </select>
            </div>
          </div>

          {/* CASO 1: OFRENDA (PILLS MINIMALISTAS APPLE) */}
          {subtipo === 'ofrenda' && (
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Categoría
              </label>
              <div className="flex flex-wrap gap-1.5">
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
                    className={`py-1.5 px-3 rounded-xl text-xs font-medium transition-all ${
                      categoria === cat
                        ? 'bg-slate-900 text-white shadow-sm font-semibold'
                        : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
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
            <div className="space-y-4">
              <div>
                <SelectorHermano
                  miembros={miembros}
                  selectedId={miembroId}
                  selectedNombre={miembroNombre}
                  permitirAnonimo={true}
                  requerido={true}
                  label="Hermano / Diezmante *"
                  placeholder="Buscar o seleccionar hermano de la iglesia..."
                  onSelect={(m, nombre) => {
                    setMiembroId(m ? m.id : '');
                    setMiembroNombre(nombre || '');

                    // Si el hermano seleccionado tiene un pacto en algún proyecto activo, sugerirlo automáticamente
                    if (m) {
                      const pactosHermano = pactos.filter(p => 
                        p.miembro_nombre.toLowerCase().trim() === m.nombre.toLowerCase().trim()
                      );
                      if (pactosHermano.length > 0) {
                        setProyectoPactoDiezmoId(pactosHermano[0].proyecto_id);
                        setPactoDiezmoId(pactosHermano[0].id);
                        if (pactosHermano[0].cuota_semanal) {
                          setMontoAPacto(String(pactosHermano[0].cuota_semanal));
                        }
                      }
                    }
                  }}
                  onNuevoMiembroCreado={(nuevo) => {
                    setMiembros(prev => [nuevo, ...prev]);
                    setMiembroId(nuevo.id);
                    setMiembroNombre(nuevo.nombre);
                  }}
                />
              </div>

              {/* SWITCH APPLE HIG: APLICAR PARTE A PACTO */}
              <div className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-4 space-y-3.5 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        ¿Abonar parte a un proyecto pactado?
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Divide el sobre entre Diezmo General y el proyecto
                      </p>
                    </div>
                  </div>

                  {/* Switch iOS Nativo */}
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={aplicarAPactoDesdeDiezmo}
                      onChange={(e) => {
                        const activado = e.target.checked;
                        setAplicarAPactoDesdeDiezmo(activado);
                        if (activado && !proyectoPactoDiezmoId && proyectos.length > 0) {
                          setProyectoPactoDiezmoId(proyectos[0].id);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>

                {/* Campos Si el Split Está Activo */}
                {aplicarAPactoDesdeDiezmo && (
                  <div className="pt-3 border-t border-slate-200/60 space-y-3 animate-in fade-in duration-150">
                    {proyectos.length === 0 ? (
                      <p className="text-xs text-amber-800">No hay proyectos pactados activos.</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                              Proyecto de Destino *
                            </label>
                            <select
                              value={proyectoPactoDiezmoId}
                              onChange={(e) => {
                                setProyectoPactoDiezmoId(e.target.value);
                                setPactoDiezmoId('');
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                            >
                              {proyectos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                              Pacto del Hermano
                            </label>
                            <select
                              value={pactoDiezmoId}
                              onChange={(e) => {
                                const pId = e.target.value;
                                setPactoDiezmoId(pId);
                                const sel = pactos.find(item => item.id === pId);
                                if (sel && sel.cuota_semanal > 0 && (!montoAPacto || parseFloat(montoAPacto) === 0)) {
                                  setMontoAPacto(String(sel.cuota_semanal));
                                }
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                            >
                              <option value="">Aporte general al proyecto</option>
                              {pactosDelProyectoDiezmo.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.miembro_nombre} ({formatearMoneda(p.cuota_semanal)}/sem)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center justify-between">
                            <span>Cantidad a tomar para el pacto ($ MXN) *</span>
                            {montoTotalNum > 0 && (
                              <span className="text-[10px] text-slate-400">Total sobre: {formatearMoneda(montoTotalNum)}</span>
                            )}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">$</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.50"
                              min="1"
                              placeholder="0.00"
                              value={montoAPacto}
                              onChange={(e) => setMontoAPacto(e.target.value)}
                              className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>

                          {/* Sugerencias Rápidas */}
                          {montoTotalNum > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {pactoDiezmoActivo && pactoDiezmoActivo.cuota_semanal > 0 && pactoDiezmoActivo.cuota_semanal < montoTotalNum && (
                                <button
                                  type="button"
                                  onClick={() => setMontoAPacto(String(pactoDiezmoActivo.cuota_semanal))}
                                  className="text-[10px] font-medium px-2 py-0.5 bg-amber-100 text-amber-900 rounded-lg transition-colors"
                                >
                                  Cuota ({formatearMoneda(pactoDiezmoActivo.cuota_semanal)})
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setMontoAPacto(String(Math.round(montoTotalNum * 0.25)))}
                                className="text-[10px] font-medium px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-lg transition-colors"
                              >
                                25% ({formatearMoneda(montoTotalNum * 0.25)})
                              </button>
                              <button
                                type="button"
                                onClick={() => setMontoAPacto(String(Math.round(montoTotalNum * 0.5)))}
                                className="text-[10px] font-medium px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-lg transition-colors"
                              >
                                50% ({formatearMoneda(montoTotalNum * 0.5)})
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Desglose En Vivo Limpio */}
                        {montoTotalNum > 0 && montoPactoNum > 0 && (
                          <div className={`p-3 rounded-xl border text-xs transition-all ${
                            montoPactoNum >= montoTotalNum
                              ? 'bg-rose-50 border-rose-200 text-rose-700 font-medium'
                              : 'bg-white border-slate-200/80 text-slate-700'
                          }`}>
                            {montoPactoNum >= montoTotalNum ? (
                              <span>El pacto debe ser menor al importe total ({formatearMoneda(montoTotalNum)}).</span>
                            ) : (
                              <div className="flex items-center justify-between text-xs">
                                <span>Diezmo General: <strong>{formatearMoneda(montoDiezmoNeto)}</strong></span>
                                <span className="text-slate-300">|</span>
                                <span>Aporte a Pacto: <strong>{formatearMoneda(montoPactoNum)}</strong></span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CASO 3: PROYECTO PACTADO */}
          {subtipo === 'pacto' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Proyecto *
                  </label>
                  <select
                    value={proyectoSeleccionadoId}
                    onChange={(e) => {
                      setProyectoSeleccionadoId(e.target.value);
                      setPactoSeleccionadoId('');
                    }}
                    required
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  >
                    {proyectos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (Meta: {formatearMoneda(p.meta_total)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Hermano / Pacto Registrado
                  </label>
                  <select
                    value={pactoSeleccionadoId}
                    onChange={(e) => seleccionarPacto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  >
                    <option value="">-- Seleccionar o escribir abajo --</option>
                    {pactosDelProyecto.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.miembro_nombre} ({formatearMoneda(p.cuota_semanal)}/sem)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!pactoSeleccionadoId && (
                <div>
                  <SelectorHermano
                    miembros={miembros}
                    selectedId={miembroId}
                    selectedNombre={miembroNombre}
                    permitirAnonimo={false}
                    label="Hermano de la Iglesia (Aportante al Proyecto) *"
                    placeholder="Seleccionar hermano de la iglesia..."
                    onSelect={(m, nombre) => {
                      setMiembroId(m ? m.id : '');
                      setMiembroNombre(nombre || '');
                    }}
                    onNuevoMiembroCreado={(nuevo) => {
                      setMiembros(prev => [nuevo, ...prev]);
                      setMiembroId(nuevo.id);
                      setMiembroNombre(nuevo.nombre);
                    }}
                  />
                </div>
              )}

              {/* Ficha Compacta de Estado de Pacto */}
              {pactoActivo && (
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{pactoActivo.miembro_nombre}</span>
                    <span className="text-slate-400 text-[11px] ml-2">({pactoActivo.semanas_pagadas} semanas cubiertas)</span>
                  </div>
                  <div className="flex items-center space-x-3 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Aportado</span>
                      <span className="font-semibold text-slate-800">{formatearMoneda(pactoActivo.total_aportado)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Resta</span>
                      <span className="font-bold text-amber-700">{formatearMoneda(pactoActivo.saldo_pendiente)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONCEPTO / NOTA ADICIONAL */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
              Concepto / Detalle
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Descripción opcional..."
              className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
            />
          </div>

          {/* PIE Y BOTÓN DE REGISTRO (APPLE ACTION STYLE) */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <label className="flex items-center space-x-2 text-xs text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={modoSobresContinuo}
                onChange={(e) => setModoSobresContinuo(e.target.checked)}
                className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
              />
              <span className="font-medium">
                Modo continuo de sobres (captura ágil)
              </span>
            </label>

            <button
              type="submit"
              disabled={esSplitInvalido}
              className={`w-full sm:w-auto px-7 py-3 font-semibold text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center space-x-2 ${
                esSplitInvalido
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.98] text-white shadow-slate-950/10'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {subtipo === 'diezmo' && aplicarAPactoDesdeDiezmo
                  ? 'Registrar Sobre'
                  : 'Registrar Entrada'}
              </span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
