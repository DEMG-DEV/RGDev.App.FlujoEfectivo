import React, { useState, useRef } from 'react';
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

    storageService.guardarTransaccion({
      tipo: 'gasto',
      categoria,
      monto: montoNumerico,
      fecha,
      tipo_culto: 'no_aplica',
      concepto: descFinal,
      metodo_pago: metodoPago,
      evidencia_url: evidenciaResult?.url,
      evidencia_nombre: evidenciaResult?.name,
      evidencia_tipo: evidenciaResult?.type
    });

    setMensajeExito(`¡Gasto de ${formatearMoneda(montoNumerico)} registrado con evidencia respaldada!`);
    setTimeout(() => setMensajeExito(null), 4000);

    // Limpiar formulario
    setMonto('');
    setConcepto('');
    setProveedor('');
    handleEliminarEvidencia();

    onGastoGuardado?.();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-rose-900/40">
        <div className="flex items-center space-x-3 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <ArrowUpRight className="w-4 h-4" />
          <span>Salidas de Caja & Rendición de Cuentas</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Registro de Gastos y Egresos</h2>
        <p className="text-slate-300 text-sm mt-1">
          Registra cada salida seleccionando la fecha exacta y adjuntando la evidencia (ticket, factura o recibo) para respaldo en Cloudflare Bucket.
        </p>
      </div>

      {/* Alerta de Éxito */}
      {mensajeExito && (
        <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-sm">{mensajeExito}</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
            Guardado
          </span>
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <form onSubmit={handleGuardarGasto} className="space-y-6">
          
          {/* Fecha y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Fecha del Gasto *</span>
                <span className="text-slate-400 text-[11px] font-normal">Día de compra o pago</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm font-semibold text-slate-800 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Categoría del Egreso *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm font-semibold text-slate-800 bg-white"
              >
                {CATEGORIAS_GASTOS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Monto y Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Monto del Gasto ($ MXN) *</span>
                <span className="text-rose-600 font-bold">Total Pagado</span>
              </label>
              <div className="relative">
                <DollarSign className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border-2 border-rose-500 focus:ring-4 focus:ring-rose-500/20 text-xl font-bold text-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Método de Pago Realizado
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm font-medium text-slate-800 bg-white"
              >
                <option value="efectivo">Efectivo de Caja Chica</option>
                <option value="transferencia">Transferencia Bancaria (SPEI)</option>
                <option value="tarjeta">Tarjeta de Débito / Crédito de la Iglesia</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Concepto y Proveedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Concepto / Motivo Detallado *
              </label>
              <input
                type="text"
                placeholder="Ej. Pago de luz recibo septiembre, compra de focos, etc."
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm font-medium text-slate-800 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Proveedor o Beneficiario (Opcional)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Ej. CFE, Ferretería El Tornillo, Telmex..."
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm font-medium text-slate-800 bg-white"
                />
              </div>
            </div>
          </div>

          {/* ÁREA DE SUBIDA DE EVIDENCIA A CLOUDFLARE R2 */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Cloud className="w-4 h-4 text-sky-600" />
                <span>Subir Evidencia (Cloudflare R2 Bucket)</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Imágenes (JPG, PNG, WebP) o Documentos PDF
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
                    ? 'border-sky-500 bg-sky-50/70 scale-[0.99]'
                    : 'border-slate-300 hover:border-sky-400 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                {subiendoEvidencia ? (
                  <div className="py-4 space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-sky-100 flex items-center justify-center animate-spin">
                      <Cloud className="w-6 h-6 text-sky-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Subiendo a Cloudflare Bucket...</p>
                    <div className="w-64 max-w-full mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-sky-600 h-full transition-all duration-200"
                        style={{ width: `${progresoSubida}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-3 space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Arrastra aquí tu comprobante o <span className="text-sky-600 underline">haz clic para examinar</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Toma una foto con tu teléfono del recibo/factura o selecciona un archivo
                      </p>
                    </div>
                    <div className="inline-flex items-center space-x-1.5 bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-semibold px-2.5 py-1 rounded-full mt-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                      <span>Almacenamiento seguro en Cloudflare Bucket</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Tarjeta de Evidencia Cargada
              <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5 w-full sm:w-auto">
                  {evidenciaResult.type.startsWith('image/') ? (
                    <div className="relative group w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-sky-300 flex-shrink-0">
                      <img 
                        src={evidenciaResult.url} 
                        alt="Comprobante" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-7 h-7" />
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900 truncate max-w-[220px]">
                        {evidenciaResult.name}
                      </span>
                      <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-200">
                        Cloudflare R2
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(evidenciaResult.size / 1024).toFixed(1)} KB • Evidencia adjunta con éxito
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  {onVerEvidencia && (
                    <button
                      type="button"
                      onClick={() => onVerEvidencia(evidenciaResult.url, evidenciaResult.name)}
                      className="flex items-center space-x-1 text-xs font-semibold bg-white text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-600" />
                      <span>Ver</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleEliminarEvidencia}
                    className="flex items-center space-x-1 text-xs font-semibold bg-white text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50"
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

          {/* Botón de Guardado */}
          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-base rounded-xl shadow-lg shadow-rose-700/30 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5 text-rose-200" />
              <span>Registrar Gasto</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
