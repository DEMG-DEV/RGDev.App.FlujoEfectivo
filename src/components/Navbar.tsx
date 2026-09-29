import React from 'react';
import { 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Landmark, 
  Receipt, 
  Church,
  Wallet,
  Users,
  LogOut,
  FileText
} from 'lucide-react';
import { formatearMoneda } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  vistaActiva: string;
  setVistaActiva: (vista: string) => void;
  saldoNeto: number;
  onAbrirCapturaIngreso: (tipoCulto?: 'miercoles_general' | 'domingo_manana') => void;
  onAbrirRegistroGasto: () => void;
  onAbrirGestionUsuarios?: () => void;
  onAbrirReportePDF?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  vistaActiva,
  setVistaActiva,
  saldoNeto,
  onAbrirCapturaIngreso,
  onAbrirRegistroGasto,
  onAbrirGestionUsuarios,
  onAbrirReportePDF,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'ingresos', label: 'Entradas', icon: ArrowDownLeft, color: 'text-emerald-400' },
    { id: 'gastos', label: 'Gastos', icon: ArrowUpRight, color: 'text-rose-400' },
    { id: 'pactos', label: 'Pactos', icon: Landmark, color: 'text-indigo-400' },
    { id: 'libro_caja', label: 'Libro de Caja', icon: Receipt, color: 'text-amber-400' },
  ];

  return (
    <header className="bg-slate-900/95 backdrop-blur-md text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-13 py-1.5 gap-2 sm:gap-4">
          
          {/* Logo y Marca compacta */}
          <div 
            className="flex items-center space-x-2 cursor-pointer flex-shrink-0" 
            onClick={() => setVistaActiva('dashboard')}
            title="Ir al Resumen General"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-church-600 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/10">
              <Church className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">Flujo de Efectivo</span>
              <span className="font-bold text-sm tracking-tight text-white sm:hidden">Flujo</span>
              <span className="text-[9px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                Caja
              </span>
            </div>
          </div>

          {/* Navegación por pestañas (En desktop en la misma fila) */}
          <nav className="hidden lg:flex items-center space-x-1 flex-shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const activo = vistaActiva === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setVistaActiva(item.id)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    activo
                      ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.color || ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Lado derecho: Saldo compacto, Acciones y Usuario */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            
            {/* Saldo Neto en Caja compacto */}
            <div 
              className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 shadow-inner"
              title="Fondo total en caja / bancos"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className={`text-xs font-bold tracking-tight ${saldoNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatearMoneda(saldoNeto)}
              </span>
            </div>

            {/* Botones de acción rápida mínimos */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onAbrirCapturaIngreso()}
                className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-sm transition-all"
                title="Registrar entrada (+ Entrada)"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Entrada</span>
              </button>

              <button
                onClick={onAbrirRegistroGasto}
                className="flex items-center space-x-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-sm transition-all"
                title="Registrar salida (- Gasto)"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">- Gasto</span>
              </button>

              {onAbrirReportePDF && (
                <button
                  onClick={onAbrirReportePDF}
                  className="flex items-center space-x-1 bg-blue-600/80 hover:bg-blue-600 active:bg-blue-700 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-sm transition-all border border-blue-500/30"
                  title="Generar Reporte PDF Oficial"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">PDF</span>
                </button>
              )}
            </div>

            {/* Usuario y Logout */}
            {user && (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                <div className="hidden xl:flex items-center space-x-1.5">
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[100px]">
                    {user.name}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {user.role}
                  </span>
                </div>

                {(user.role === 'admin' || user.role === 'pastor') && onAbrirGestionUsuarios && (
                  <button
                    type="button"
                    onClick={onAbrirGestionUsuarios}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition border border-slate-700/60"
                    title="Gestionar Usuarios"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-500/10 rounded-lg transition border border-slate-700/60"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Fila compacta de pestañas únicamente en pantallas pequeñas (< lg) */}
        <nav className="flex lg:hidden space-x-1 border-t border-slate-800/80 py-1 overflow-x-auto no-scrollbar text-xs font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const activo = vistaActiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setVistaActiva(item.id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                  activo
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.color || ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
