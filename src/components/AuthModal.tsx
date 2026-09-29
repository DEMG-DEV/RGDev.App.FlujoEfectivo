import React, { useState } from 'react';
import { Church, Lock, Mail, User, ShieldCheck, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RolUsuario } from '../types';

interface AuthModalProps {
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  
  // Formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<RolUsuario>('tesorero');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 text-center relative">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center mb-3 shadow-inner">
            <Church className="w-8 h-8 text-indigo-300" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Flujo de Efectivo Eclesiástico</h2>
          <p className="text-xs text-indigo-200/80 mt-1">
            Autenticación Segura con <span className="font-semibold text-white">Auth.js</span> & PostgreSQL
          </p>

          {/* Selector de modo Login / Registro */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setModo('login'); setError(null); }}
              className={`py-2 rounded-lg transition-all ${
                modo === 'login' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setModo('registro'); setError(null); }}
              className={`py-2 rounded-lg transition-all ${
                modo === 'registro' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Crear Cuenta
            </button>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
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
                    <option value="pastor">Pastor Principal / Consejo</option>
                    <option value="admin">Administrador del Sistema</option>
                    <option value="operador">Operador de Culto (Solo Lectura/Captura)</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Si es el primer usuario en registrarse, será asignado como Administrador automáticamente.
                </p>
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
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold text-sm shadow-md shadow-indigo-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Procesando con Auth.js...' : modo === 'login' ? 'Acceder al Sistema' : 'Crear Cuenta y Entrar'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Nota explicativa de Auth.js */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 <span className="font-semibold">Nota:</span> Los usuarios creados internamente por los pastores o administradores usan este mismo login y funcionan de manera idéntica.
            </p>
          </div>

        </form>

      </div>
    </div>
  );
};
