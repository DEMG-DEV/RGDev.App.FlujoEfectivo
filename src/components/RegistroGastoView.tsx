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

  const handleGuardarGasto = (e: React.FormEvent) => {
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
    storageService.guardarTransaccion({
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
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Encabezado Apple HIG */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-center space-x-2 text-rose-600 text-[11px] font-bold uppercase tracking-wider mb-1">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Salidas de Caja & Rendición de Cuentas</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
          Registro de Gastos y Egresos
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Registra cada salida seleccionando la fecha exacta y adjuntando comprobantes digitales con respaldo en Cloudflare R2.
        </p>
      </div>

      {/* Alerta de Éxito */}
      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-bold text-xs sm:text-sm">{mensajeExito}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
            Guardado
          </span>
        </div>
      )}

      {/* Formulario Apple HIG Inset Grouped */}
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 sm:p-8">
        <form onSubmit={handleGuardarGasto} className="space-y-6">
          
          {/* HERO AMOUNT INPUT (ESTILO APPLE FINANCE / WALLET) */}
          <div className="bg-rose-50/40 border border-rose-200/60 rounded-2xl p-6 text-center space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900">
              Monto del Gasto ($ MXN)
            </span>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-3xl font-extrabold text-rose-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                autoFocus
                required
                className="w-56 text-center text-4xl sm:text-5xl font-black text-rose-950 bg-transparent border-b-2 border-rose-300 focus:border-rose-500 focus:outline-none tabular-nums placeholder-rose-300"
              />
            </div>
          </div>

          {/* Fecha y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Fecha del Gasto *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Categoría del Egreso *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                {CATEGORIAS_GASTOS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Método de Pago y Proveedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Método de Pago Realizado
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="efectivo">Efectivo de Caja Chica</option>
                <option value="transferencia">Transferencia Bancaria (SPEI)</option>
                <option value="tarjeta">Tarjeta de Débito / Crédito</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Proveedor o Beneficiario (Opcional)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Ej. CFE, Papelería San José, Telmex..."
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Asignación a Proyecto Pactado (Opcional) */}
          {proyectos.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Asignar Gasto a Proyecto Pactado (Opcional)</span>
                <span className="text-[10px] text-slate-400 font-normal">Para deducir de los fondos del proyecto</span>
              </label>
              <select
                value={proyectoSeleccionadoId}
                onChange={(e) => setProyectoSeleccionadoId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">-- Gasto Operativo General (Sin proyecto asociado) --</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.nombre} (Fondos recaudados: {formatearMoneda(p.total_recaudado)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Concepto Detallado */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Concepto / Motivo Detallado *
            </label>
            <input
              type="text"
              placeholder="Ej. Pago de luz recibo mes en curso, compra de cables de audio..."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* ÁREA DE SUBIDA DE EVIDENCIA CLOUDFLARE R2 BUCKET */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Comprobante o Evidencia Digital (Cloudflare R2)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
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
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                {subiendoEvidencia ? (
                  <div className="py-4 space-y-3">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center animate-spin">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Subiendo a Cloudflare R2...</p>
                    <div className="w-48 max-w-full mx-auto bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-200"
                        style={{ width: `${progresoSubida}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-3 space-y-1.5">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Arrastra aquí tu comprobante o <span className="text-blue-600 underline">haz clic para examinar</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Toma una foto con tu teléfono del recibo o factura
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Tarjeta de Evidencia Cargada Apple HIG
              <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  {evidenciaResult.type.startsWith('image/') ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-blue-200 flex-shrink-0">
                      <img 
                        src={evidenciaResult.url} 
                        alt="Comprobante" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900 truncate max-w-[200px]">
                        {evidenciaResult.name}
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Cloudflare R2
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {(evidenciaResult.size / 1024).toFixed(1)} KB • Evidencia adjunta
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  {onVerEvidencia && (
                    <button
                      type="button"
                      onClick={() => onVerEvidencia(evidenciaResult.url, evidenciaResult.name)}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-blue-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleEliminarEvidencia}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-rose-600 bg-white border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Quitar</span>
                  </button>
                </div>
              </div>
            )}

            {errorSubida && (
              <div className="mt-2 text-xs text-rose-600 flex items-center space-x-1.5 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorSubida}</span>
              </div>
            )}
          </div>

          {/* Botón de Guardado Apple HIG */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center space-x-2"
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
