import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Coins, 
  HeartHandshake, 
  Landmark, 
  CheckCircle2, 
  Zap, 
  User, 
  DollarSign, 
  Sparkles,
  ArrowRight,
  PlusCircle,
  Receipt
} from 'lucide-react';
import { SubtipoIngreso, TipoCulto, MetodoPago, ProyectoPactado, PactoMiembro, MiembroFrecuente } from '../types';
import { storageService } from '../services/storageService';
import { getUltimoDiaSemana, getFechaHoy, formatearMoneda, formatearFechaLarga } from '../utils/dateUtils';

interface CapturaIngresosProps {
  onIngresoGuardado?: () => void;
  tipoCultoInicial?: TipoCulto;
}

export const CapturaIngresosView: React.FC<CapturaIngresosProps> = ({ 
  onIngresoGuardado,
  tipoCultoInicial = 'domingo_manana'
}) => {
  // Estado del formulario
  const [subtipo, setSubtipo] = useState<SubtipoIngreso>('ofrenda');
  const [tipoCulto, setTipoCulto] = useState<TipoCulto>(tipoCultoInicial);
  const [fecha, setFecha] = useState<string>(() => {
    if (tipoCultoInicial === 'miercoles_general') return getUltimoDiaSemana(3);
    return getUltimoDiaSemana(0); // Domingo
  });
  
  const [monto, setMonto] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('Ofrenda General');
  const [concepto, setConcepto] = useState<string>('Ofrenda Culto Domingo Mañana');
  const [miembroNombre, setMiembroNombre] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');

  // Para Proyectos Pactados
  const [proyectos, setProyectos] = useState<ProyectoPactado[]>([]);
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<string>('');
  const [pactos, setPactos] = useState<PactoMiembro[]>([]);
  const [pactoSeleccionadoId, setPactoSeleccionadoId] = useState<string>('');

  // Miembros frecuentes para autocompletado
  const [miembrosFrecuentes, setMiembrosFrecuentes] = useState<MiembroFrecuente[]>([]);

  // Modo continuo de captura (Ideal para contar sobres)
  const [modoSobresContinuo, setModoSobresContinuo] = useState<boolean>(true);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    const projs = storageService.getProyectos().filter(p => p.activo);
    setProyectos(projs);
    if (projs.length > 0 && !proyectoSeleccionadoId) {
      setProyectoSeleccionadoId(projs[0].id);
    }

    const pcts = storageService.getPactos();
    setPactos(pcts);

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
        setConcepto('Ofrenda Culto de Oración y Doctrina Miércoles');
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
        setConcepto('Ofrenda Culto Domingo Tarde / Noche');
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
  const handleGuardar = (e: React.FormEvent) => {
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

    storageService.guardarTransaccion({
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
      pacto_id: subtipo === 'pacto' ? pactoSeleccionadoId : undefined,
      metodo_pago: metodoPago
    });

    // Mensaje de éxito
    setMensajeExito(`¡Registrado con éxito: ${formatearMoneda(montoNumerico)} en ${subtipo.toUpperCase()}!`);
    setTimeout(() => setMensajeExito(null), 3500);

    // Recargar datos internos
    cargarDatos();
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
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Banner Superior con Botones de Selección Rápida para Miércoles y Domingo */}
      <div className="bg-gradient-to-r from-slate-900 via-church-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Captura de Cultos Oficiales</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Captura Rápida de Entradas</h2>
            <p className="text-slate-300 text-sm mt-1">
              Selecciona el día de culto y registra ofrendas, diezmos o aportes de pacto.
            </p>
          </div>

          {/* Selector Rápido de Días de Servicio */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => seleccionarCultoRapido('miercoles_general')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                tipoCulto === 'miercoles_general'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Culto Miércoles</span>
            </button>

            <button
              type="button"
              onClick={() => seleccionarCultoRapido('domingo_manana')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                tipoCulto === 'domingo_manana'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Domingo Mañana</span>
            </button>

            <button
              type="button"
              onClick={() => seleccionarCultoRapido('domingo_tarde')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                tipoCulto === 'domingo_tarde'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Domingo Noche</span>
            </button>
          </div>
        </div>

        {/* Barra de estado del culto actual */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="font-semibold text-white">Servicio seleccionado:</span>
            <span className="bg-slate-800 px-2.5 py-1 rounded-md text-amber-300 font-medium">
              {formatearFechaLarga(fecha)}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-slate-300">
              Sobres/Entradas registradas hoy: <span className="text-white font-bold">{transaccionesDelCulto.length}</span>
            </div>
            <div className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-lg">
              Total Culto: {formatearMoneda(totalRecaudadoEnCulto)}
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Éxito al Registrar */}
      {mensajeExito && (
        <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-sm">{mensajeExito}</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
            Guardado
          </span>
        </div>
      )}

      {/* Contenedor Principal del Formulario */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Pestañas de Selección de Subtipo de Entrada */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/70 p-2 gap-2">
          
          <button
            type="button"
            onClick={() => cambiarSubtipo('ofrenda')}
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              subtipo === 'ofrenda'
                ? 'bg-white text-emerald-700 shadow-md border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Coins className="w-5 h-5 text-emerald-600" />
            <span>1. Ofrenda</span>
          </button>

          <button
            type="button"
            onClick={() => cambiarSubtipo('diezmo')}
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              subtipo === 'diezmo'
                ? 'bg-white text-indigo-700 shadow-md border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className="w-5 h-5 text-indigo-600" />
            <span>2. Diezmo</span>
          </button>

          <button
            type="button"
            onClick={() => cambiarSubtipo('pacto')}
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              subtipo === 'pacto'
                ? 'bg-white text-amber-700 shadow-md border border-amber-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-5 h-5 text-amber-600" />
            <span>3. Proyecto Pactado</span>
          </button>

        </div>

        {/* Formulario */}
        <form onSubmit={handleGuardar} className="p-6 sm:p-8 space-y-6">
          
          {/* Fecha y Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Fecha del Culto
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-church-500 focus:border-church-500 text-sm font-medium text-slate-800 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Método de Entrega
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-church-500 focus:border-church-500 text-sm font-medium text-slate-800 bg-white"
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
            <div className="space-y-4 bg-emerald-50/50 p-5 rounded-xl border border-emerald-100">
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Tipo o Categoría de Ofrenda
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    className={`py-2 px-3 rounded-lg text-xs font-semibold text-left transition-all border ${
                      categoria === cat
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
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
            <div className="space-y-4 bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Nombre del Miembro / Fiel Diezmante *</span>
                  <span className="text-[11px] font-normal text-slate-500">O escribe "Anónimo"</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Ej. Familia Morales, Hno. Carlos Mendoza..."
                    value={miembroNombre}
                    onChange={(e) => setMiembroNombre(e.target.value)}
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* Sugerencias Rápidas de Miembros Frecuentes */}
              {miembrosFrecuentes.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                    Selección Rápida de Hermanos Frecuentes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {miembrosFrecuentes.slice(0, 6).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMiembroNombre(m.nombre)}
                        className="text-xs bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-md transition-colors font-medium"
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
            <div className="space-y-5 bg-amber-50/50 p-5 rounded-xl border border-amber-200">
              
              {/* Selección del Proyecto Activo */}
              <div>
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                  Proyecto Pactado de la Iglesia *
                </label>
                <select
                  value={proyectoSeleccionadoId}
                  onChange={(e) => {
                    setProyectoSeleccionadoId(e.target.value);
                    setPactoSeleccionadoId('');
                  }}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-semibold text-slate-800 bg-white"
                >
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Meta: {formatearMoneda(p.meta_total)} - Semanal sugerido: {formatearMoneda(p.valor_semanal_sugerido)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selección o Búsqueda del Pactante (Hermano/Familia) */}
              <div>
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                  Seleccionar Hermano / Familia con Pacto Registrado
                </label>
                <select
                  value={pactoSeleccionadoId}
                  onChange={(e) => seleccionarPacto(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-medium text-slate-800 bg-white"
                >
                  <option value="">-- Seleccionar de la lista de pactantes o escribir abajo --</option>
                  {pactosDelProyecto.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.miembro_nombre} - Pacto Total: {formatearMoneda(p.monto_total_pactado)} | Cuota: {formatearMoneda(p.cuota_semanal)}/sem | Resta: {formatearMoneda(p.saldo_pendiente)}
                    </option>
                  ))}
                </select>
              </div>

              {/* O bien ingresar nombre manual */}
              {!pactoSeleccionadoId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    O escribe el Nombre del Hermano / Familia que aporta:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Familia González"
                    value={miembroNombre}
                    onChange={(e) => setMiembroNombre(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  />
                </div>
              )}

              {/* Ficha en vivo del Pactante Seleccionado */}
              {pactoActivo && (
                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="text-sm text-amber-800">{pactoActivo.miembro_nombre}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                      {pactoActivo.semanas_pagadas} semanas pagadas
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-500 block">Monto Pactado:</span>
                      <span className="font-bold text-slate-800">{formatearMoneda(pactoActivo.monto_total_pactado)}</span>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg">
                      <span className="text-emerald-700 block">Total Aportado:</span>
                      <span className="font-bold text-emerald-800">{formatearMoneda(pactoActivo.total_aportado)}</span>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg">
                      <span className="text-amber-800 block">Saldo Restante:</span>
                      <span className="font-bold text-amber-900">{formatearMoneda(pactoActivo.saldo_pendiente)}</span>
                    </div>
                  </div>

                  <p className="text-slate-500 text-[11px] pt-1">
                    💡 Cuota semanal acordada: <strong className="text-slate-800">{formatearMoneda(pactoActivo.cuota_semanal)}</strong>. Al ingresar este monto se abonará automáticamente al saldo del pacto.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MONTO Y CONCEPTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Monto a Ingresar ($ MXN) *</span>
                <span className="text-emerald-600 font-bold">Importe del Sobre</span>
              </label>
              <div className="relative">
                <DollarSign className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  autoFocus
                  required
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border-2 border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 text-xl font-bold text-slate-900 bg-white"
                />
              </div>

              {/* Botones de montos rápidos típicos de sobres */}
              <div className="flex items-center gap-1.5 mt-2">
                {[50, 100, 200, 500, 1000, 2000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMonto(val.toString())}
                    className="text-xs bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 font-semibold px-2 py-1 rounded-md transition-colors"
                  >
                    +${val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Concepto / Nota adicional
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Descripción del ingreso..."
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-church-500 focus:border-church-500 text-sm font-medium text-slate-800 bg-white"
              />
            </div>
          </div>

          {/* Opciones y Botón de Envío */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={modoSobresContinuo}
                onChange={(e) => setModoSobresContinuo(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="font-semibold text-xs text-slate-600">
                ⚡ Modo continuo: Mantener fecha y culto para seguir capturando sobres rápidamente
              </span>
            </label>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-700/30 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>Registrar Entrada (Guardar)</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
