import React, { useState, useEffect } from 'react';
import { Church, Lock, Mail, User, ShieldCheck, AlertCircle, ArrowRight, CheckCircle2, UserPlus, LogIn, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RolUsuario } from '../types';

interface AuthViewProps {
  onSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  
  // Estado de configuración de registros
  const [registroHabilitado, setRegistroHabilitado] = useState<boolean>(true);
  const [totalUsuarios, setTotalUsuarios] = useState<number>(0);
  const [cargandoConfig, setCargandoConfig] = useState<boolean>(true);

  // Formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<RolUsuario>('tesorero');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Consultar si el registro está habilitado
  const consultarConfiguracion = async () => {
    try {
      const res = await fetch('/api/configuracion');
      if (res.ok) {
        const data = await res.json();
        setRegistroHabilitado(data.registro_habilitado);
        setTotalUsuarios(data.total_usuarios || 0);
        if (!data.registro_habilitado && data.total_usuarios > 0) {
          setModo('login');
        }
      }
    } catch (e) {
      console.warn('No se pudo verificar estado de registro:', e);
    } finally {
      setCargandoConfig(false);
    }
  };

  useEffect(() => {
    consultarConfiguracion();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExitoMsg(null);
    setLoading(true);

    try {
      if (modo === 'login') {
        const res = await login(email, password);
        if (res.success) {
          if (onSuccess) onSuccess();
        } else {
          setError(res.error || 'Credenciales inválidas. Verifica tu correo y contraseña.');
        }
      } else {
        if (!registroHabilitado && totalUsuarios > 0) {
          setError('El registro de nuevos usuarios está deshabilitado. Solicita tu cuenta al pastor o administrador.');
          setLoading(false);
          return;
        }

        const res = await register(email, password, nombre, rol);
        if (res.success) {
          setExitoMsg('¡Cuenta registrada exitosamente!');
          if (onSuccess) onSuccess();
        } else {
          setError(res.error || 'No se pudo registrar el usuario.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      
      {/* Resplandor decorativo de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Barra superior de marca simple */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 ring-1 ring-white/20">
            <Church className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base tracking-tight">Flujo de Efectivo Eclesiástico</h1>
            <p className="text-slate-400 text-xs">Tesorería, Mayordomía y Finanzas</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>PostgreSQL en Aiven • Auth.js</span>
        </div>
      </header>

      {/* Contenedor Central: Vista Separada de Autenticación */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl shadow-indigo-950/40 border border-slate-200 overflow-hidden">
          
          {/* Cabecera de la tarjeta */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 text-center relative">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-3.5 shadow-inner">
              <Church className="w-7 h-7 text-indigo-300" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">Acceso al Sistema</h2>
            <p className="text-xs text-indigo-200/80 mt-1">
              Ingresa tus credenciales para acceder a la administración
            </p>

            {/* Selector de modo Login / Registro (o aviso de registro cerrado) */}
            <div className="mt-5">
              {registroHabilitado || totalUsuarios === 0 ? (
                <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => { setModo('login'); setError(null); }}
                    className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                      modo === 'login' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Iniciar Sesión</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModo('registro'); setError(null); }}
                    className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                      modo === 'registro' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{totalUsuarios === 0 ? 'Crear Administrador' : 'Crear Cuenta'}</span>
                  </button>
                </div>
              ) : (
                <div className="py-2 px-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center justify-center space-x-2 text-xs text-amber-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Auto-registro cerrado • Acceso solo con cuenta</span>
                </div>
              )}
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
            
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {exitoMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{exitoMsg}</span>
              </div>
            )}

            {modo === 'registro' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Pastor David Méndez"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rol en el Ministerio</label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <select
                      value={rol}
                      onChange={(e) => setRol(e.target.value as RolUsuario)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="tesorero">Tesorero / Administrador de Caja</option>
                      <option value="pastor">Pastor Principal / Junta Pastoral</option>
                      <option value="admin">Administrador del Sistema</option>
                      <option value="operador">Operador de Culto (Captura Continua)</option>
                    </select>
                  </div>
                  {totalUsuarios === 0 && (
                    <p className="text-[11px] text-indigo-600 font-semibold mt-1">
                      ⭐ Esta será la primera cuenta y se configurará como Super Administrador.
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@iglesia.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || cargandoConfig}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold text-sm shadow-md shadow-indigo-600/25 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>
                {loading 
                  ? 'Verificando credenciales...' 
                  : modo === 'login' 
                  ? 'Acceder al Sistema' 
                  : 'Crear Cuenta y Entrar'
                }
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Aviso pastoral */}
            <div className="pt-2 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                💡 <span className="font-semibold text-slate-700">Seguridad:</span> Acceso reservado a miembros autorizados por la junta pastoral y el equipo de tesorería.
              </p>
            </div>

          </form>

        </div>
      </main>

      {/* Pie de página pastoral simple */}
      <footer className="relative z-10 w-full text-center py-6 text-xs text-slate-500">
        <p>Sistema de Flujo de Efectivo Eclesiástico • Tesorería y Mayordomía</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Autenticación Segura con Auth.js y PostgreSQL</p>
      </footer>

    </div>
  );
};
