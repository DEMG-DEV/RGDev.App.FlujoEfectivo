import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  X, 
  Check, 
  AlertCircle, 
  Key, 
  Mail, 
  User, 
  UserCheck, 
  UserX,
  RefreshCw
} from 'lucide-react';
import { Usuario, RolUsuario } from '../types';

interface GestionUsuariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

export const GestionUsuariosModal: React.FC<GestionUsuariosModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail
}) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Formulario para nuevo usuario interno
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>('tesorero');
  const [guardando, setGuardando] = useState(false);

  const cargarUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      if (res.ok && data.success) {
        setUsuarios(data.data || []);
      } else {
        setError(data.error || 'Error al obtener usuarios');
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarUsuarios();
    }
  }, [isOpen]);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setMensajeExito(null);

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoNombre,
          email: nuevoEmail,
          password: nuevoPassword,
          rol: nuevoRol,
          activo: true
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito(`¡Usuario "${nuevoNombre}" creado exitosamente! Ya puede iniciar sesión con Auth.js usando su correo y contraseña.`);
        setNuevoNombre('');
        setNuevoEmail('');
        setNuevoPassword('');
        setNuevoRol('tesorero');
        setMostrarFormulario(false);
        cargarUsuarios();
      } else {
        setError(data.error || 'No se pudo crear el usuario.');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al crear usuario.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (u: Usuario) => {
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: u.id,
          activo: !u.activo
        })
      });
      if (res.ok) {
        cargarUsuarios();
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  const handleEliminar = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al usuario "${nombre}"?`)) return;
    try {
      const res = await fetch(`/api/usuarios?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        cargarUsuarios();
      }
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Administración de Usuarios</h3>
              <p className="text-xs text-slate-400">
                Usuarios con acceso a Auth.js (creados internamente o auto-registrados)
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Alertas */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mensajeExito && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{mensajeExito}</span>
            </div>
          )}

          {/* Banner explicativo de compatibilidad idéntica */}
          <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-950 mb-0.5">
                Compatibilidad total con Auth.js
              </p>
              <p className="text-indigo-800/90 leading-relaxed">
                Todos los usuarios que crees aquí se guardan en la tabla <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono">usuarios</code> con contraseña cifrada (bcrypt). Cuando inicien sesión desde la pantalla de login de Auth.js, funcionarán exactamente igual que cualquier otro usuario.
              </p>
            </div>
          </div>

          {/* Botón para desplegar formulario de creación */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <span>Usuarios Activos en PostgreSQL</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {usuarios.length}
              </span>
            </h4>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={cargarUsuarios}
                disabled={loading}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                title="Actualizar lista"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{mostrarFormulario ? 'Ocultar Formulario' : '+ Crear Usuario'}</span>
              </button>
            </div>
          </div>

          {/* Formulario de Crear Usuario Internamente */}
          {mostrarFormulario && (
            <form onSubmit={handleCrearUsuario} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-in fade-in duration-150">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Registrar Nuevo Usuario Interno
              </h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre y Apellido</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Hno. Pedro Ramírez"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="tesoreria@iglesia.com"
                      value={nuevoEmail}
                      onChange={(e) => setNuevoEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña de Acceso</label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      value={nuevoPassword}
                      onChange={(e) => setNuevoPassword(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rol Asignado</label>
                  <div className="relative">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <select
                      value={nuevoRol}
                      onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="tesorero">Tesorero / Caja</option>
                      <option value="pastor">Pastor / Liderazgo</option>
                      <option value="admin">Administrador del Sistema</option>
                      <option value="operador">Operador de Culto</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {guardando ? 'Guardando en DB...' : 'Crear y Habilitar en Auth.js'}
                </button>
              </div>
            </form>
          )}

          {/* Tabla de Usuarios */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      {loading ? 'Cargando usuarios desde PostgreSQL...' : 'No hay usuarios registrados aún.'}
                    </td>
                  </tr>
                ) : (
                  usuarios.map((u) => {
                    const isSelf = u.email === currentUserEmail;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 flex items-center space-x-2">
                            <span>{u.nombre}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-normal">
                                Tú
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                            u.rol === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : u.rol === 'pastor'
                              ? 'bg-blue-100 text-blue-700'
                              : u.rol === 'tesorero'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.rol}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleActivo(u)}
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                              u.activo 
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700' 
                                : 'bg-rose-50 text-rose-700 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                            title="Click para cambiar estado"
                          >
                            {u.activo ? (
                              <>
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                <span>Activo</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3 text-rose-600" />
                                <span>Inactivo</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleEliminar(u.id, u.nombre)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Footer del Modal */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
