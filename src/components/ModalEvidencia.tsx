import React from 'react';
import { X, ExternalLink, Download, FileText, Cloud } from 'lucide-react';

interface ModalEvidenciaProps {
  url: string | null;
  nombre?: string;
  onCerrar: () => void;
}

export const ModalEvidencia: React.FC<ModalEvidenciaProps> = ({ url, nombre, onCerrar }) => {
  if (!url) return null;

  const esPdf = url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh]">
        
        {/* Cabecera Apple HIG */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#F9F9FB] border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-sm">{nombre || 'Comprobante de Gasto'}</h4>
              <span className="text-[10px] text-slate-400 font-medium">Almacenado en Cloudflare R2 Bucket</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {!url.startsWith('data:') && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={onCerrar}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visor de Contenido */}
        <div className="p-4 bg-slate-50 flex items-center justify-center flex-1 overflow-auto min-h-[300px]">
          {esPdf ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Documento PDF Adjunto</p>
                <p className="text-xs text-slate-500 mt-1">{nombre}</p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                download={nombre || 'comprobante.pdf'}
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Abrir / Descargar PDF</span>
              </a>
            </div>
          ) : (
            <img
              src={url}
              alt="Evidencia de gasto"
              className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-sm bg-white border border-slate-200"
            />
          )}
        </div>

        {/* Pie */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">Respaldo oficial para auditoría y rendición de cuentas</span>
          <button
            onClick={onCerrar}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
