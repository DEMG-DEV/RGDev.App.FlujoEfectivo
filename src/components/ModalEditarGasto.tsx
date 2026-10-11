import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  Tag, 
  Loader2, 
  Cloud,
  Check
} from 'lucide-react';
import { Transaccion, MetodoPago } from '../types';
import { storageService } from '../services/storageService';
import { subirEvidenciaACloudflare, UploadResult } from '../services/cloudflareService';
import { formatearMoneda, getFechaHoy, getUltimoDiaSemana, identificarDiaSemana, extraerFechaYYYYMMDD } from '../utils/dateUtils';

interface ModalEditarGastoProps {
  isOpen: boolean;
  transaccion: Transaccion | null;
  onClose: () => void;
  onGuardado: (txActualizada: Transaccion) => void;
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

export const ModalEditarGasto: React.FC<ModalEditarGastoProps> = ({
  isOpen,
  transaccion,
  onClose,
  onGuardado,
  onVerEvidencia
}) => {
  const [monto, setMonto] = useState<string>('');
  const [concepto, setConcepto] = useState<string>('');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_GASTOS[0]);
  const [fecha, setFecha] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');

  // Estado de la evidencia / comprobante
  const [evidenciaUrl, setEvidenciaUrl] = useState<string | null>(null);
  const [evidenciaNombre, setEvidenciaNombre] = useState<string | null>(null);
  const [evidenciaTipo, setEvidenciaTipo] = useState<string | null>(null);

  // Estados de subida y procesamiento
  const [subiendo, setSubiendo] = useState<boolean>(false);
  const [progreso, setProgreso] = useState<number>(0);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos cuando se abre el modal con una transacción
  useEffect(() => {
    if (transaccion && isOpen) {
      setMonto(transaccion.monto ? transaccion.monto.toString() : '');
      setConcepto(transaccion.concepto || '');
      setCategoria(transaccion.categoria || CATEGORIAS_GASTOS[0]);
      setFecha(extraerFechaYYYYMMDD(transaccion.fecha));
      setMetodoPago(transaccion.metodo_pago || 'efectivo');
      setEvidenciaUrl(transaccion.evidencia_url || null);
      setEvidenciaNombre(transaccion.evidencia_nombre || null);
      setEvidenciaTipo(transaccion.evidencia_tipo || null);
      setErrorSubida(null);
      setProgreso(0);
      setSubiendo(false);
      setGuardando(false);
    }
  }, [transaccion, isOpen]);

  if (!isOpen || !transaccion) return null;

  const esPdf = (url: string | null, tipo: string | null) => {
    if (!url) return false;
    return (
      url.toLowerCase().includes('.pdf') || 
      url.startsWith('data:application/pdf') || 
      tipo === 'application/pdf'
    );
  };

  // Manejador para procesar y subir archivo
  const procesarArchivo = async (file: File) => {
    if (!file) return;
    setErrorSubida(null);
    setSubiendo(true);
    setProgreso(15);

    try {
      const res: UploadResult = await subirEvidenciaACloudflare(file, (pct) => {
        setProgreso(pct);
      });
      setEvidenciaUrl(res.url);
      setEvidenciaNombre(res.name);
      setEvidenciaTipo(res.type);
      setSubiendo(false);
      setProgreso(100);
    } catch (err: any) {
      setErrorSubida(err.message || 'Error al procesar el comprobante');
      setSubiendo(false);
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
    setEvidenciaUrl(null);
    setEvidenciaNombre(null);
    setEvidenciaTipo(null);
    setProgreso(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNumerico = parseFloat(monto);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      alert('Por favor ingrese un monto válido para el gasto');
      return;
    }

    if (!concepto.trim()) {
      alert('Por favor ingrese un concepto o motivo del gasto');
      return;
    }

    setGuardando(true);

    try {
      const txActualizada = await storageService.editarTransaccion(transaccion.id, {
        monto: montoNumerico,
        concepto: concepto.trim(),
        categoria,
        fecha: extraerFechaYYYYMMDD(fecha),
        metodo_pago: metodoPago,
        evidencia_url: evidenciaUrl || undefined,
        evidencia_nombre: evidenciaNombre || undefined,
        evidencia_tipo: evidenciaTipo || undefined
      });

      setGuardando(false);
      if (txActualizada) {
        onGuardado(txActualizada);
      }
      onClose();
    } catch (err: any) {
      setGuardando(false);
      alert('Error al guardar los cambios del gasto: ' + (err.message || 'Error desconocido'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header Apple HIG */}
        <div className="bg-[#F9F9FB] border-b border-slate-200 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">
                Editar Egreso / Gasto
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Modifica importes, detalles y gestiona el comprobante digital
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando || subiendo}
            className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-50"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleGuardar} className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1">
          
          {/* Monto Hero */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500 transition-all">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Importe del Gasto ($)
            </label>
            <div className="relative flex items-center">
              <span className="text-xl font-bold text-rose-600 mr-1.5">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full text-2xl font-black text-slate-900 bg-transparent outline-none tabular-nums placeholder:text-slate-300"
              />
              {monto && !isNaN(parseFloat(monto)) && (
                <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">
                  {formatearMoneda(parseFloat(monto))}
                </span>
              )}
            </div>
          </div>

          {/* Concepto / Motivo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Concepto / Proveedor / Motivo
            </label>
            <input
              type="text"
              required
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Pago de CFE, Compra de cables de audio, Ferretería..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Dos Columnas: Categoría y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Categoría</span>
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
              >
                {CATEGORIAS_GASTOS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fecha</span>
                </label>
                {fecha && (
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                    identificarDiaSemana(fecha) === 'miercoles'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : identificarDiaSemana(fecha) === 'domingo'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-slate-100 text-slate-700'
                  }`}>
                    {identificarDiaSemana(fecha)}
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
              {/* Accesos rápidos para mover fecha */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Mover a:</span>
                <button
                  type="button"
                  onClick={() => setFecha(getFechaHoy())}
                  className="text-[10px] font-semibold bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 px-1.5 py-0.5 rounded transition-colors"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setFecha(getUltimoDiaSemana(3))}
                  className="text-[10px] font-semibold bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 px-1.5 py-0.5 rounded transition-colors"
                >
                  Últ. Miércoles
                </button>
                <button
                  type="button"
                  onClick={() => setFecha(getUltimoDiaSemana(0))}
                  className="text-[10px] font-semibold bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 px-1.5 py-0.5 rounded transition-colors"
                >
                  Últ. Domingo
                </button>
              </div>
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>Método de Pago</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['efectivo', 'transferencia', 'cheque', 'tarjeta'] as MetodoPago[]).map((metodo) => (
                <button
                  key={metodo}
                  type="button"
                  onClick={() => setMetodoPago(metodo)}
                  className={`py-2 px-2 text-center rounded-xl text-xs font-bold capitalize border transition-all ${
                    metodoPago === metodo
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  {metodo}
                </button>
              ))}
            </div>
          </div>

          {/* SECCIÓN COMPROBANTE / EVIDENCIA DIGITAL */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Cloud className="w-4 h-4 text-sky-600" />
                <span>Comprobante de Gasto (Cloudflare R2)</span>
              </label>
              {evidenciaUrl && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>Comprobante adjunto</span>
                </span>
              )}
            </div>

            {/* CASO A: TIENE COMPROBANTE -> VISUALIZAR, VER O REEMPLAZAR */}
            {evidenciaUrl ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
                <div className="flex items-center space-x-3">
                  {/* Vista Previa Miniatura */}
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-2xs relative group">
                    {esPdf(evidenciaUrl, evidenciaTipo) ? (
                      <FileText className="w-8 h-8 text-rose-500" />
                    ) : (
                      <img
                        src={evidenciaUrl}
                        alt="Comprobante"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Datos del archivo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {evidenciaNombre || 'Comprobante digital'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {esPdf(evidenciaUrl, evidenciaTipo) ? 'Documento PDF' : 'Imagen de recibo / factura'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1.5">
                      {onVerEvidencia && (
                        <button
                          type="button"
                          onClick={() => onVerEvidencia(evidenciaUrl, evidenciaNombre || undefined)}
                          className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visualizar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Reemplazar</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleEliminarEvidencia}
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors"
                        title="Eliminar comprobante"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* CASO B: NO TIENE COMPROBANTE -> DROPZONE PARA SUBIR */
              <div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                    dragOver 
                      ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  {subiendo ? (
                    <div className="py-2 space-y-2">
                      <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Subiendo comprobante a Cloudflare R2...</p>
                      <div className="w-48 bg-slate-200 h-1.5 rounded-full mx-auto overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full transition-all duration-200 rounded-full"
                          style={{ width: `${progreso}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{progreso}%</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-1">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200/60">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        Haz clic o arrastra un comprobante aquí
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Soporta imágenes (JPG, PNG, WebP) o recibos en PDF
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input oculto para subida */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {errorSubida && (
              <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorSubida}</span>
              </div>
            )}
          </div>

          {/* Footer de Acciones */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando || subiendo}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || subiendo}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-60 active:scale-[0.98]"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
