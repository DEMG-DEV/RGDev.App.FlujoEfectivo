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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold truncate max-w-sm">{nombre || 'Comprobante de Gasto'}</h4>
              <span className="text-[10px] text-slate-400">Almacenado en Cloudflare R2 Bucket</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!url.startsWith('data:') && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onCerrar}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visor de Contenido */}
        <div className="p-4 bg-slate-100 flex items-center justify-center flex-1 overflow-auto min-h-[300px]">
          {esPdf ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Documento PDF Adjunto</p>
                <p className="text-xs text-slate-500 mt-1">{nombre}</p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                download={nombre || 'comprobante.pdf'}
                className="inline-flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-slate-800"
              >
                <Download className="w-4 h-4" />
                <span>Abrir / Descargar PDF</span>
              </a>
            </div>
          ) : (
            <img
              src={url}
              alt="Evidencia de gasto"
              className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-md bg-white border border-slate-200"
            />
          )}
        </div>

        {/* Pie */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">Evidencia respaldada para auditoría interna de la congregación</span>
          <button
            onClick={onCerrar}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
