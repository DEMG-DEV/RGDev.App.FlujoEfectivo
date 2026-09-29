import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CapturaIngresosView } from './components/CapturaIngresosView';
import { RegistroGastoView } from './components/RegistroGastoView';
import { ProyectosPactadosView } from './components/ProyectosPactadosView';
import { LibroCajaView } from './components/LibroCajaView';
import { ModalEvidencia } from './components/ModalEvidencia';
import { AuthView } from './components/AuthView';
import { GestionUsuariosModal } from './components/GestionUsuariosModal';
import { ReporteFinancieroModal } from './components/ReporteFinancieroModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { storageService } from './services/storageService';
import { Transaccion, ProyectoPactado, PactoMiembro, ResumenFinanciero, TipoCulto, SubtipoIngreso } from './types';
import { Church } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [vistaActiva, setVistaActiva] = useState<string>('dashboard');
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoPactado[]>([]);
  const [pactos, setPactos] = useState<PactoMiembro[]>([]);
  const [resumen, setResumen] = useState<ResumenFinanciero>({
    totalIngresos: 0,
    totalGastos: 0,
    saldoNeto: 0,
    ingresosMiercoles: 0,
    ingresosDomingo: 0,
    totalDiezmos: 0,
    totalOfrendas: 0,
    totalPactos: 0,
    totalOtrosIngresos: 0,
    totalProyectosMeta: 0,
    totalProyectosRecaudado: 0
  });

  // Modal de usuarios
  const [mostrarModalUsuarios, setMostrarModalUsuarios] = useState<boolean>(false);

  // Modal de Reporte Financiero PDF Oficial
  const [mostrarModalReporte, setMostrarModalReporte] = useState<boolean>(false);

  // Tipo de culto preseleccionado para la vista de captura
  const [cultoPreseleccionado, setCultoPreseleccionado] = useState<TipoCulto>('domingo_manana');
  const [subtipoPreseleccionado, setSubtipoPreseleccionado] = useState<SubtipoIngreso | undefined>();
  const [proyectoPreseleccionadoId, setProyectoPreseleccionadoId] = useState<string | undefined>();
  const [pactoPreseleccionadoId, setPactoPreseleccionadoId] = useState<string | undefined>();

  // Modal de evidencia Lightbox
  const [evidenciaModalUrl, setEvidenciaModalUrl] = useState<string | null>(null);
  const [evidenciaModalNombre, setEvidenciaModalNombre] = useState<string | undefined>(undefined);

  // Recargar datos desde el servicio y sincronizar con Aiven PostgreSQL
  const recargarTodo = async () => {
    const txsLocal = storageService.getTransacciones();
    const projsLocal = storageService.getProyectos();
    const pctsLocal = storageService.getPactos();
    setTransacciones(txsLocal);
    setProyectos(projsLocal);
    setPactos(pctsLocal);
    setResumen(storageService.calcularResumen());

    try {
      const [txsRemotas, projsRemotos, pctsRemotos] = await Promise.all([
        storageService.cargarTransaccionesRemotas(),
        storageService.cargarProyectosRemotos(),
        storageService.cargarPactosRemotos()
      ]);
      setTransacciones(txsRemotas);
      setProyectos(projsRemotos);
      setPactos(pctsRemotos);
      setResumen(storageService.calcularResumen());
    } catch (e) {
      console.warn('Sincronización remota pendiente:', e);
    }
  };

  useEffect(() => {
    if (user) {
      recargarTodo();
    }
  }, [user]);

  const handleAbrirCaptura = (tipoCulto?: TipoCulto, subtipo?: SubtipoIngreso) => {
    if (tipoCulto) {
      setCultoPreseleccionado(tipoCulto);
    }
    setSubtipoPreseleccionado(subtipo || 'ofrenda');
    setProyectoPreseleccionadoId(undefined);
    setPactoPreseleccionadoId(undefined);
    setVistaActiva('ingresos');
  };

  const handleAbrirGasto = () => {
    setVistaActiva('gastos');
  };

  const handleVerEvidencia = (url: string, nombre?: string) => {
    setEvidenciaModalUrl(url);
    setEvidenciaModalNombre(nombre);
  };

  const handleCerrarEvidencia = () => {
    setEvidenciaModalUrl(null);
    setEvidenciaModalNombre(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center mb-4 animate-pulse">
          <Church className="w-8 h-8 text-indigo-300" />
        </div>
        <p className="text-white font-semibold text-sm">Verificando sesión en Auth.js...</p>
        <p className="text-slate-400 text-xs mt-1">Conectando a PostgreSQL en Aiven</p>
      </div>
    );
  }

  // Vista completamente separada si no hay usuario autenticado (sin renderizar el sistema debajo)
  if (!user) {
    return <AuthView onSuccess={() => recargarTodo()} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col font-sans">
      
      {/* Barra de Navegación Superior */}
      <Navbar
        vistaActiva={vistaActiva}
        setVistaActiva={setVistaActiva}
        saldoNeto={resumen.saldoNeto}
        onAbrirCapturaIngreso={handleAbrirCaptura}
        onAbrirRegistroGasto={handleAbrirGasto}
        onAbrirGestionUsuarios={() => setMostrarModalUsuarios(true)}
        onAbrirReportePDF={() => setMostrarModalReporte(true)}
      />

      {/* Contenido Principal según Vista */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {vistaActiva === 'dashboard' && (
          <DashboardView
            resumen={resumen}
            transacciones={transacciones}
            proyectos={proyectos}
            onIrACaptura={handleAbrirCaptura}
            onIrAGastos={() => setVistaActiva('gastos')}
            onIrAPactos={() => setVistaActiva('pactos')}
            onIrALibroCaja={() => setVistaActiva('libro_caja')}
            onVerEvidencia={handleVerEvidencia}
            onAbrirReportePDF={() => setMostrarModalReporte(true)}
          />
        )}

        {vistaActiva === 'ingresos' && (
          <CapturaIngresosView
            tipoCultoInicial={cultoPreseleccionado}
            subtipoInicial={subtipoPreseleccionado}
            proyectoIdInicial={proyectoPreseleccionadoId}
            pactoIdInicial={pactoPreseleccionadoId}
            onIngresoGuardado={recargarTodo}
          />
        )}

        {vistaActiva === 'gastos' && (
          <RegistroGastoView
            onGastoGuardado={recargarTodo}
            onVerEvidencia={handleVerEvidencia}
          />
        )}

        {vistaActiva === 'pactos' && (
          <ProyectosPactadosView
            onAbonarPacto={(proyectoId, pactoId) => {
              setCultoPreseleccionado('domingo_manana');
              setSubtipoPreseleccionado('pacto');
              setProyectoPreseleccionadoId(proyectoId);
              setPactoPreseleccionadoId(pactoId);
              setVistaActiva('ingresos');
            }}
            onProyectoFinalizado={recargarTodo}
          />
        )}

        {vistaActiva === 'libro_caja' && (
          <LibroCajaView
            transacciones={transacciones}
            onTransaccionEliminada={recargarTodo}
            onVerEvidencia={handleVerEvidencia}
            onAbrirReportePDF={() => setMostrarModalReporte(true)}
          />
        )}
      </main>

      {/* Modal de Evidencia (Lightbox) */}
      <ModalEvidencia
        url={evidenciaModalUrl}
        nombre={evidenciaModalNombre}
        onCerrar={handleCerrarEvidencia}
      />

      {/* Modal de Gestión de Usuarios para Administradores / Pastores */}
      <GestionUsuariosModal
        isOpen={mostrarModalUsuarios}
        onClose={() => setMostrarModalUsuarios(false)}
        currentUserEmail={user?.email}
      />

      {/* Modal de Reporte Financiero PDF Oficial */}
      <ReporteFinancieroModal
        isOpen={mostrarModalReporte}
        onClose={() => setMostrarModalReporte(false)}
        transacciones={transacciones}
        proyectos={proyectos}
        pactos={pactos}
      />

      {/* Footer pastoral */}
      <footer className="no-print bg-white/80 backdrop-blur-md border-t border-black/[0.06] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            Sistema de Flujo de Efectivo Eclesiástico • Tesorería y Mayordomía
          </p>
          <p className="text-slate-400">
            PostgreSQL en Aiven • Cloudflare R2 Bucket • Autenticación Auth.js • Vercel Serverless
          </p>
        </div>
      </footer>

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
