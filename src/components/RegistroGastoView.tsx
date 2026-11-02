import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Cloud, 
  Building2, 
  ArrowUpRight,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { MetodoPago } from '../types';
import { storageService } from '../services/storageService';
import { subirEvidenciaACloudflare, UploadResult } from '../services/cloudflareService';
import { getFechaHoy, formatearMoneda } from '../utils/dateUtils';

interface RegistroGastoProps {
  onGastoGuardado?: () => void;
  onVerEvidencia?: (url: string, nombre?: string) => void;
}

const CATEGORIAS_GASTOS = [
  'Servicios Básicos (Luz, Agua, Gas)',
  'Internet y Telecomunicaciones',
  'Mantenimiento y Reparaciones del Templo',
  'Honorarios Pastorales / Viáticos',
  'Sonido, Multimedia e Instrumentos',
  'Obra Social, Misericordia y Canasta Básica',
  'Material de Evangelismo y Discipulado',
  'Escuela Dominical y Actividades Infantiles',
  'Papelería, Limpieza y Administración',
  'Eventos Especiales, Vigilias y Retiros',
  'Aportes Misioneros y Ofrendas a Ministerios'
];

export const RegistroGastoView: React.FC<RegistroGastoProps> = ({ 
  onGastoGuardado,
  onVerEvidencia 
}) => {
  const [fecha, setFecha] = useState<string>(getFechaHoy());
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_GASTOS[0]);
  const [concepto, setConcepto] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [proveedor, setProveedor] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState<string>('');
  const [origenFondos, setOrigenFondos] = useState<'general' | 'proyecto'>('general');
  const [proyectos, setProyectos] = useState(() => storageService.getProyectos().filter(p => p.activo));

  useEffect(() => {
    setProyectos(storageService.getProyectos().filter(p => p.activo));
  }, []);

  // Estado de subida de evidencia a Cloudflare R2
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [evidenciaResult, setEvidenciaResult] = useState<UploadResult | null>(null);
  const [subiendoEvidencia, setSubiendoEvidencia] = useState<boolean>(false);
  const [progresoSubida, setProgresoSubida] = useState<number>(0);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manejar selección de archivo
  const procesarArchivo = async (file: File) => {
    if (!file) return;
    setErrorSubida(null);
    setArchivoSeleccionado(file);
    setSubiendoEvidencia(true);
    setProgresoSubida(10);

    try {
      const resultado = await subirEvidenciaACloudflare(file, (pct) => {
        setProgresoSubida(pct);
      });
      setEvidenciaResult(resultado);
      setSubiendoEvidencia(false);
    } catch (err: any) {
      setErrorSubida(err.message || 'Error al procesar la evidencia');
      setSubiendoEvidencia(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      procesarArchivo(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      procesarArchivo(e.dataTransfer.files[0]);
    }
  };

  const handleEliminarEvidencia = () => {
    setArchivoSeleccionado(null);
    setEvidenciaResult(null);
    setProgresoSubida(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGuardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNumerico = parseFloat(monto);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      alert('Por favor ingrese un monto válido para el gasto');
      return;
    }

    if (!concepto.trim()) {
      alert('Por favor ingrese una descripción o concepto del gasto');
      return;
    }

    const descFinal = proveedor.trim() 
      ? `${concepto.trim()} (Proveedor: ${proveedor.trim()})`
      : concepto.trim();

    const proyecto = proyectos.find(p => p.id === proyectoSeleccionadoId);

    // 1. Si el gasto es financiado con fondos acumulados previamente en el proyecto,
    // transferir el fondo a Caja General. Si se paga con fondos generales (diezmos/ofrendas en parcialidades),
    // sale directamente como egreso de Caja General asignado al proyecto.
    if (proyecto && origenFondos === 'proyecto') {
      await storageService.guardarTransaccion({
        tipo: 'ingreso',
        subtipo: 'ofrenda',
        categoria: 'Ofrenda General',
        monto: montoNumerico,
        fecha,
        tipo_culto: 'no_aplica',
        concepto: `Fondo transferido del proyecto: ${proyecto.nombre} para compra`,
        proyecto_id: proyecto.id,
        proyecto_nombre: proyecto.nombre,
        metodo_pago: metodoPago
      });
    }

    // 2. Registrar el movimiento de salida / gasto con su comprobante
    await storageService.guardarTransaccion({
      tipo: 'gasto',
      categoria,
      monto: montoNumerico,
      fecha,
      tipo_culto: 'no_aplica',
      concepto: descFinal,
      proyecto_id: proyecto ? proyecto.id : undefined,
      proyecto_nombre: proyecto ? proyecto.nombre : undefined,
      metodo_pago: metodoPago,
      evidencia_url: evidenciaResult?.url,
      evidencia_nombre: evidenciaResult?.name,
      evidencia_tipo: evidenciaResult?.type
    });

    setMensajeExito(`¡Gasto de ${formatearMoneda(montoNumerico)} registrado correctamente!`);
    setTimeout(() => setMensajeExito(null), 4000);

    // Limpiar formulario
    setMonto('');
    setConcepto('');
    setProveedor('');
    setProyectoSeleccionadoId('');
    handleEliminarEvidencia();

    onGastoGuardado?.();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
      
      {/* 1. HEADER LIMPIO ESTILO APPLE HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Registro de Gastos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Salidas de caja general, proyectos y comprobantes digitales
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
            Guardado
          </span>
        </div>
      )}

      {/* 2. TARJETA PRINCIPAL UNIFICADA (APPLE GROUPED INSET STYLE) */}
      <div className="bg-white/95 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 sm:p-7 shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-6">
        
        <form onSubmit={handleGuardarGasto} className="space-y-6">
          
          {/* HERO AMOUNT INPUT (ESTILO APPLE CASH / FINANCE) */}
          <div className="py-2 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Importe del Gasto
            </span>
            <div className="inline-flex items-baseline justify-center">
              <span className="text-3xl sm:text-4xl font-semibold text-slate-300 mr-1 select-none">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
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

          {/* FILA COMPACTA: FECHA Y MÉTODO DE PAGO */}
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                Fecha del Gasto *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              >
                <option value="efectivo">Efectivo de Caja Chica</option>
                <option value="transferencia">Transferencia Bancaria (SPEI)</option>
                <option value="tarjeta">Tarjeta de Débito / Crédito</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* CATEGORÍA Y PROVEEDOR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                Categoría del Egreso *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              >
                {CATEGORIAS_GASTOS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Proveedor / Beneficiario</span>
                <span className="text-[10px] text-slate-400 lowercase">opcional</span>
              </label>
              <input
                type="text"
                placeholder="Ej. CFE, Papelería San José, Telmex..."
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              />
            </div>
          </div>

          {/* ASIGNAR GASTO A PROYECTO PACTADO (OPCIONAL) */}
          {proyectos.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Financiar con Proyecto Pactado</span>
                <span className="text-[10px] text-slate-400 lowercase">opcional</span>
              </label>
              <select
                value={proyectoSeleccionadoId}
                onChange={(e) => setProyectoSeleccionadoId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              >
                <option value="">Gasto Operativo General (Sin proyecto asociado)</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (Fondos: {formatearMoneda(p.total_recaudado)})
                  </option>
                ))}
              </select>
              {proyectoSeleccionadoId && (
                <div className="mt-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Origen de los recursos para este pago:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className={`flex items-start space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      origenFondos === 'general' ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-semibold' : 'bg-white border-slate-200 text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="origenFondos"
                        checked={origenFondos === 'general'}
                        onChange={() => setOrigenFondos('general')}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="block font-bold">Caja General (Diezmos / Ofrendas)</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Pago en parcialidades directo desde fondos generales.
                        </span>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      origenFondos === 'proyecto' ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-semibold' : 'bg-white border-slate-200 text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="origenFondos"
                        checked={origenFondos === 'proyecto'}
                        onChange={() => setOrigenFondos('proyecto')}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="block font-bold">Fondo Acumulado del Proyecto</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Se toma del remanente ahorrado en el proyecto.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONCEPTO / MOTIVO DETALLADO */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">
              Concepto / Detalle *
            </label>
            <input
              type="text"
              placeholder="Ej. Pago de luz recibo mes en curso, cables de audio..."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
            />
          </div>

          {/* COMPROBANTE DIGITAL (CLOUDFLARE R2) */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Comprobante Digital
              </label>
              <span className="text-[10px] text-slate-400">
                JPG, PNG, WebP o PDF
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden"
            />

            {!evidenciaResult ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-slate-900 bg-slate-100/70'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {subiendoEvidencia ? (
                  <div className="py-2 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Subiendo a Cloudflare R2...</p>
                    <div className="w-36 max-w-full mx-auto bg-slate-200 rounded-full h-1 overflow-hidden">
                      <div 
                        className="bg-slate-900 h-full transition-all duration-200"
                        style={{ width: `${progresoSubida}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2.5 py-1">
                    <UploadCloud className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600 font-medium">
                      Adjuntar foto o factura digital
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-900 font-semibold underline">Examinar</span>
                  </div>
                )}
              </div>
            ) : (
              // Tarjeta de Evidencia Cargada Apple HIG
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 overflow-hidden">
                  {evidenciaResult.type.startsWith('image/') ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex-shrink-0">
                      <img 
                        src={evidenciaResult.url} 
                        alt="Comprobante" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <span className="font-semibold text-xs text-slate-900 truncate block max-w-[200px]">
                      {evidenciaResult.name}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {(evidenciaResult.size / 1024).toFixed(1)} KB · Cloudflare R2
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {onVerEvidencia && (
                    <button
                      type="button"
                      onClick={() => onVerEvidencia(evidenciaResult.url, evidenciaResult.name)}
                      className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Ver
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleEliminarEvidencia}
                    className="text-xs font-semibold text-rose-600 bg-white border border-slate-200 hover:border-rose-200 px-2.5 py-1 rounded-xl hover:bg-rose-50 transition-all"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            )}

            {errorSubida && (
              <div className="mt-1.5 text-xs text-rose-600 flex items-center space-x-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errorSubida}</span>
              </div>
            )}
          </div>

          {/* BOTÓN DE GUARDADO (APPLE ACTION STYLE) */}
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-7 py-3 font-semibold text-xs sm:text-sm rounded-2xl shadow-sm bg-slate-950 hover:bg-slate-800 active:scale-[0.98] text-white shadow-slate-950/10 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Registrar Gasto</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
