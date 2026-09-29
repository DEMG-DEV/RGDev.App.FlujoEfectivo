import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Landmark, 
  Receipt, 
  Church,
  Users,
  LogOut,
  ChevronDown,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  vistaActiva: string;
  setVistaActiva: (vista: string) => void;
  saldoNeto?: number;
  onAbrirCapturaIngreso?: (tipoCulto?: 'miercoles_general' | 'domingo_manana') => void;
  onAbrirRegistroGasto?: () => void;
  onAbrirGestionUsuarios?: () => void;
  onAbrirReportePDF?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  vistaActiva,
  setVistaActiva,
  onAbrirGestionUsuarios,
}) => {
  const { user, logout } = useAuth();
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const menuUsuarioRef = useRef<HTMLDivElement>(null);

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (menuUsuarioRef.current && !menuUsuarioRef.current.contains(event.target as Node)) {
        setMenuUsuarioAbierto(false);
      }
    };
    if (menuUsuarioAbierto) {
      document.addEventListener('mousedown', handleClickAfuera);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickAfuera);
    };
  }, [menuUsuarioAbierto]);

  const navItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'libro_caja', label: 'Caja General', icon: Receipt },
    { id: 'ingresos', label: 'Entradas', icon: ArrowDownLeft },
    { id: 'gastos', label: 'Gastos', icon: ArrowUpRight },
    { id: 'pactos', label: 'Pactos', icon: Landmark },
  ];

  return (
    <header className="no-print bg-slate-900/95 backdrop-blur-md text-white sticky top-0 z-40 border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* 1. Logo y Marca Minimalista */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer flex-shrink-0" 
            onClick={() => setVistaActiva('dashboard')}
            title="Ir al Resumen General"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 ring-1 ring-white/10">
              <Church className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white">
              Flujo de Efectivo
            </span>
          </div>

          {/* 2. Pestañas de Navegación Segmentadas y Limpias (Desktop) */}
          <nav className="hidden md:flex items-center bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
            {navItems.map((item) => {
              const Icon = item.icon;
              const activo = vistaActiva === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setVistaActiva(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activo
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 3. Perfil de Usuario Minimalista con Menú Desplegable */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {user && (
              <div className="relative" ref={menuUsuarioRef}>
                <button
                  type="button"
                  onClick={() => setMenuUsuarioAbierto(!menuUsuarioAbierto)}
                  className="flex items-center space-x-2 py-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 transition-all text-xs text-slate-200 shadow-sm"
                  title="Opciones de cuenta"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center text-[10px] border border-blue-500/30">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold hidden sm:inline text-xs">
                    {user.name}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {user.role}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuUsuarioAbierto ? 'rotate-180' : ''}`} />
                </button>

                {/* Popover / Menú Desplegable de Usuario */}
                {menuUsuarioAbierto && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    
                    {/* Info de cuenta */}
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      {/* Opción Gestión de Usuarios (solo administradores / pastores) */}
                      {(user.role === 'admin' || user.role === 'pastor') && onAbrirGestionUsuarios && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuUsuarioAbierto(false);
                            onAbrirGestionUsuarios();
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center space-x-2 transition-colors"
                        >
                          <Users className="w-4 h-4 text-indigo-400" />
                          <span>Gestión de Usuarios</span>
                        </button>
                      )}

                      {/* Cerrar Sesión */}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuUsuarioAbierto(false);
                          logout();
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Barra de pestañas en dispositivos móviles (< md) */}
        <nav className="flex md:hidden space-x-1 border-t border-slate-800/80 py-1.5 overflow-x-auto no-scrollbar text-xs font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const activo = vistaActiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setVistaActiva(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activo
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

      </div>
    </header>
  );
};
