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
  RefreshCw,
  Pencil,
  Save
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

  // Estado para edición de usuario existente
  const [usuarioAEditar, setUsuarioAEditar] = useState<Usuario | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRol, setEditRol] = useState<RolUsuario>('tesorero');
  const [editActivo, setEditActivo] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [actualizandoUsuario, setActualizandoUsuario] = useState(false);

  const handleIniciarEdicion = (u: Usuario) => {
    setUsuarioAEditar(u);
    setEditNombre(u.nombre);
    setEditEmail(u.email);
    setEditRol(u.rol);
    setEditActivo(u.activo);
    setEditPassword('');
    setMostrarFormulario(false);
    setError(null);
    setMensajeExito(null);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioAEditar) return;
    setActualizandoUsuario(true);
    setError(null);
    setMensajeExito(null);

    try {
      const payload: any = {
        id: usuarioAEditar.id,
        nombre: editNombre.trim(),
        email: editEmail.trim().toLowerCase(),
        rol: editRol,
        activo: editActivo
      };

      if (editPassword) {
        if (editPassword.length < 6) {
          setError('La nueva contraseña debe tener al menos 6 caracteres.');
          setActualizandoUsuario(false);
          return;
        }
        payload.password = editPassword;
      }

      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito(`¡Usuario "${editNombre}" actualizado exitosamente!`);
        setUsuarioAEditar(null);
        cargarUsuarios();
      } else {
        setError(data.error || 'No se pudo actualizar el usuario.');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al actualizar usuario.');
    } finally {
      setActualizandoUsuario(false);
    }
  };

  // Control para habilitar / deshabilitar registro público
  const [registroHabilitado, setRegistroHabilitado] = useState<boolean>(true);
  const [actualizandoConfig, setActualizandoConfig] = useState<boolean>(false);

  const cargarConfiguracion = async () => {
    try {
      const res = await fetch('/api/configuracion');
      if (res.ok) {
        const data = await res.json();
        setRegistroHabilitado(data.registro_habilitado);
      }
    } catch (e) {
      console.warn('Error cargando configuración:', e);
    }
  };

  const handleToggleRegistro = async () => {
    setActualizandoConfig(true);
    setError(null);
    try {
      const nuevoValor = !registroHabilitado;
      const res = await fetch('/api/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave: 'registro_habilitado',
          valor: String(nuevoValor)
        })
      });

      if (res.ok) {
        setRegistroHabilitado(nuevoValor);
        setMensajeExito(
          nuevoValor
            ? 'Registro público de cuentas HABILITADO. Ahora cualquiera puede crear su cuenta desde la pantalla de login.'
            : 'Registro público de cuentas DESHABILITADO. Solo administradores pueden crear usuarios desde este panel.'
        );
      } else {
        setError('No se pudo actualizar el estado de registro.');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setActualizandoConfig(false);
    }
  };

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
      cargarConfiguracion();
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

          {/* Tarjeta de Control: Habilitar / Deshabilitar Registro Público */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-start space-x-3.5 pr-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                registroHabilitado 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : 'bg-rose-100 text-rose-700 border border-rose-200'
              }`}>
                {registroHabilitado ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-slate-800">
                    Registro Público de Usuarios (Pantalla de Login)
                  </h4>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    registroHabilitado 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {registroHabilitado ? 'Habilitado' : 'Deshabilitado'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {registroHabilitado
                    ? 'Cualquier persona que acceda al enlace puede auto-registrarse desde la vista de login.'
                    : 'La opción de crear cuenta está desactivada en el login. Solo los administradores pueden registrar usuarios desde este panel.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={actualizandoConfig}
              onClick={handleToggleRegistro}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                registroHabilitado ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
              title={registroHabilitado ? 'Click para deshabilitar registro público' : 'Click para habilitar registro público'}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  registroHabilitado ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
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

          {/* Formulario de Edición de Usuario */}
          {usuarioAEditar && (
            <form onSubmit={handleGuardarEdicion} className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-4 animate-in fade-in duration-150 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Pencil className="w-3.5 h-3.5 text-amber-700" />
                  <span>Editar Usuario: {usuarioAEditar.nombre}</span>
                </h5>
                <button
                  type="button"
                  onClick={() => setUsuarioAEditar(null)}
                  className="text-amber-700 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rol Asignado</label>
                  <div className="relative">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <select
                      value={editRol}
                      onChange={(e) => setEditRol(e.target.value as RolUsuario)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="tesorero">Tesorero / Caja</option>
                      <option value="pastor">Pastor / Liderazgo</option>
                      <option value="admin">Administrador del Sistema</option>
                      <option value="operador">Operador de Culto</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estado de Cuenta</label>
                  <div className="relative">
                    <select
                      value={editActivo ? 'true' : 'false'}
                      onChange={(e) => setEditActivo(e.target.value === 'true')}
                      className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="true">Activo (Habilitado para ingresar)</option>
                      <option value="false">Inactivo (Acceso suspendido)</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cambiar Contraseña <span className="text-[10px] text-slate-400 font-normal">(Opcional: dejar en blanco si no deseas cambiarla)</span>
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      minLength={6}
                      placeholder="Escribe una nueva contraseña solo si deseas cambiarla (mínimo 6 caracteres)"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-amber-200/60">
                <button
                  type="button"
                  onClick={() => setUsuarioAEditar(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actualizandoUsuario}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{actualizandoUsuario ? 'Guardando...' : 'Guardar Cambios'}</span>
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
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => handleIniciarEdicion(u)}
                              className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition"
                              title="Editar información de usuario"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleEliminar(u.id, u.nombre)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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
