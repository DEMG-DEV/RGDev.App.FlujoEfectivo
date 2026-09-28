import React from 'react';
import { 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Landmark, 
  Receipt, 
  Settings, 
  Church,
  Calendar,
  Wallet
} from 'lucide-react';
import { formatearMoneda } from '../utils/dateUtils';

interface NavbarProps {
  vistaActiva: string;
  setVistaActiva: (vista: string) => void;
  saldoNeto: number;
  onAbrirCapturaIngreso: (tipoCulto?: 'miercoles_general' | 'domingo_manana') => void;
  onAbrirRegistroGasto: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  vistaActiva,
  setVistaActiva,
  saldoNeto,
  onAbrirCapturaIngreso,
  onAbrirRegistroGasto,
}) => {
  return (
    <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-40 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo y Nombre de la Iglesia */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setVistaActiva('dashboard')}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-church-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Church className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Flujo de Efectivo</span>
                <span className="text-[10px] uppercase font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Tesorería
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Gestión de Ofrendas, Diezmos y Gastos</p>
            </div>
          </div>

          {/* Saldo Actual en Caja */}
          <div className="hidden md:flex items-center space-x-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60 shadow-inner">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Fondo en Caja / Bancos</span>
              <span className={`text-base font-bold tracking-tight ${saldoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatearMoneda(saldoNeto)}
              </span>
            </div>
          </div>

          {/* Botones de Acción Rápida */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onAbrirCapturaIngreso()}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-md shadow-emerald-900/30 transition-all duration-150"
              title="Registrar Ofrendas, Diezmos o Pactos"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-200" />
              <span>+ Entrada</span>
            </button>

            <button
              onClick={onAbrirRegistroGasto}
              className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-md shadow-rose-900/30 transition-all duration-150"
              title="Registrar Gasto con Evidencia"
            >
              <ArrowUpRight className="w-4 h-4 text-rose-200" />
              <span>- Gasto</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegación por Pestañas */}
        <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-800 py-2.5 overflow-x-auto no-scrollbar text-sm font-medium">
          <button
            onClick={() => setVistaActiva('dashboard')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              vistaActiva === 'dashboard'
                ? 'bg-church-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Resumen General</span>
          </button>

          <button
            onClick={() => setVistaActiva('ingresos')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              vistaActiva === 'ingresos'
                ? 'bg-church-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>Captura de Entradas</span>
          </button>

          <button
            onClick={() => setVistaActiva('gastos')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              vistaActiva === 'gastos'
                ? 'bg-church-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
            <span>Registro de Gastos</span>
          </button>

          <button
            onClick={() => setVistaActiva('pactos')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              vistaActiva === 'pactos'
                ? 'bg-church-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Landmark className="w-4 h-4 text-indigo-400" />
            <span>Proyectos Pactados</span>
          </button>

          <button
            onClick={() => setVistaActiva('libro_caja')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              vistaActiva === 'libro_caja'
                ? 'bg-church-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>Libro de Caja y Reportes</span>
          </button>

          <button
            onClick={() => setVistaActiva('configuracion')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              vistaActiva === 'configuracion'
                ? 'bg-church-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Aiven & R2</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
