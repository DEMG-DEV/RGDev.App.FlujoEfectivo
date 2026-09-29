import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText 
} from 'lucide-react';

interface FloatingActionsDockProps {
  onAbrirCapturaIngreso: () => void;
  onAbrirRegistroGasto: () => void;
  onAbrirReportePDF?: () => void;
}

export const FloatingActionsDock: React.FC<FloatingActionsDockProps> = ({
  onAbrirCapturaIngreso,
  onAbrirRegistroGasto,
  onAbrirReportePDF
}) => {
  const [abierto, setAbierto] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener('mousedown', handleClickAfuera);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickAfuera);
    };
  }, [abierto]);

  return (
    <div 
      ref={dockRef} 
      className="no-print fixed bottom-6 right-6 z-40 flex flex-col items-end select-none"
    >
      {/* Botones de acción desplegados */}
      {abierto && (
        <div className="flex flex-col items-end space-y-2.5 mb-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* 1. Registrar Entrada */}
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              onAbrirCapturaIngreso();
            }}
            className="group flex items-center space-x-2.5 bg-white/95 backdrop-blur-md hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200/90 hover:border-emerald-300 py-2 px-3.5 rounded-2xl shadow-lg transition-all active:scale-95"
            title="Registrar nueva ofrenda o diezmo"
          >
            <span className="text-xs font-bold whitespace-nowrap">
              + Registrar Entrada
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </button>

          {/* 2. Registrar Gasto */}
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              onAbrirRegistroGasto();
            }}
            className="group flex items-center space-x-2.5 bg-white/95 backdrop-blur-md hover:bg-rose-50 text-slate-800 hover:text-rose-800 border border-slate-200/90 hover:border-rose-300 py-2 px-3.5 rounded-2xl shadow-lg transition-all active:scale-95"
            title="Registrar un egreso o gasto operativo"
          >
            <span className="text-xs font-bold whitespace-nowrap">
              - Registrar Gasto
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </button>

          {/* 3. Generar Reporte PDF */}
          {onAbrirReportePDF && (
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                onAbrirReportePDF();
              }}
              className="group flex items-center space-x-2.5 bg-white/95 backdrop-blur-md hover:bg-blue-50 text-slate-800 hover:text-blue-800 border border-slate-200/90 hover:border-blue-300 py-2 px-3.5 rounded-2xl shadow-lg transition-all active:scale-95"
              title="Generar o imprimir reporte oficial en PDF"
            >
              <span className="text-xs font-bold whitespace-nowrap">
                📄 Reporte Oficial PDF
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
            </button>
          )}

        </div>
      )}

      {/* Botón Principal Flotante (Apple HIG Floating Trigger) */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-200 active:scale-90 border ${
          abierto
            ? 'bg-slate-900 text-white border-slate-800 rotate-90 scale-95 shadow-slate-900/40'
            : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105'
        }`}
        title={abierto ? 'Cerrar menú' : 'Acciones rápidas: + Entrada, - Gasto, PDF'}
      >
        {abierto ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6 stroke-[2.5]" />
        )}
      </button>

    </div>
  );
};
