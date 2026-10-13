import React, { useEffect, useRef } from 'react';
import { AlertTriangle, HelpCircle, Loader2, X } from 'lucide-react';

export interface ModalConfirmacionProps {
  isOpen: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: 'peligro' | 'primario';
  cargando?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ModalConfirmacion: React.FC<ModalConfirmacionProps> = ({
  isOpen,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'primario',
  cargando = false,
  onConfirm,
  onCancel,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Guardar foco previo y enfocar botón apropiado al abrir
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      const timer = setTimeout(() => {
        if (variante === 'peligro') {
          // En acciones destructivas, enfocar 'Cancelar' por seguridad WCAG
          cancelBtnRef.current?.focus();
        } else {
          confirmBtnRef.current?.focus();
        }
      }, 50);

      return () => clearTimeout(timer);
    } else {
      // Restaurar foco al elemento previo cuando se cierra
      previousActiveElement.current?.focus?.();
    }
  }, [isOpen, variante]);

  // Soporte para tecla Escape y trampeo básico de teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!cargando) {
          onCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cargando, onCancel]);

  if (!isOpen) return null;

  const esPeligro = variante === 'peligro';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-confirmacion-titulo"
        aria-describedby="modal-confirmacion-mensaje"
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-black/[0.08] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 p-6 flex flex-col space-y-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                esPeligro
                  ? 'bg-rose-50 text-rose-600 border-rose-200/60'
                  : 'bg-blue-50 text-blue-600 border-blue-200/60'
              }`}
            >
              {esPeligro ? (
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <HelpCircle className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div className="pr-2">
              <h3
                id="modal-confirmacion-titulo"
                className="text-base font-bold text-slate-900 leading-snug"
              >
                {titulo}
              </h3>
              <p
                id="modal-confirmacion-mensaje"
                className="text-xs text-slate-500 mt-1.5 leading-relaxed"
              >
                {mensaje}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={cargando}
            aria-label="Cerrar diálogo"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Acciones Apple HIG */}
        <div className="pt-2 flex items-center justify-end space-x-2.5 border-t border-slate-100">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={cargando}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-all disabled:opacity-50"
          >
            {textoCancelar}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={cargando}
            className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 ${
              esPeligro
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
            }`}
          >
            {cargando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{textoConfirmar}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
