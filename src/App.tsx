import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CapturaIngresosView } from './components/CapturaIngresosView';
import { RegistroGastoView } from './components/RegistroGastoView';
import { ProyectosPactadosView } from './components/ProyectosPactadosView';
import { LibroCajaView } from './components/LibroCajaView';
import { ConfiguracionView } from './components/ConfiguracionView';
import { ModalEvidencia } from './components/ModalEvidencia';
import { storageService } from './services/storageService';
import { Transaccion, ProyectoPactado, ResumenFinanciero, TipoCulto } from './types';

export const App: React.FC = () => {
  const [vistaActiva, setVistaActiva] = useState<string>('dashboard');
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoPactado[]>([]);
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

  // Tipo de culto preseleccionado para la vista de captura
  const [cultoPreseleccionado, setCultoPreseleccionado] = useState<TipoCulto>('domingo_manana');

  // Modal de evidencia Lightbox
  const [evidenciaModalUrl, setEvidenciaModalUrl] = useState<string | null>(null);
  const [evidenciaModalNombre, setEvidenciaModalNombre] = useState<string | undefined>(undefined);

  // Recargar datos desde el servicio y sincronizar con Aiven PostgreSQL
  const recargarTodo = async () => {
    // 1. Mostrar estado local inmediato
    const txsLocal = storageService.getTransacciones();
    const projsLocal = storageService.getProyectos();
    setTransacciones(txsLocal);
    setProyectos(projsLocal);
    setResumen(storageService.calcularResumen());

    // 2. Sincronizar remotamente con Aiven
    try {
      const [txsRemotas, projsRemotos] = await Promise.all([
        storageService.cargarTransaccionesRemotas(),
        storageService.cargarProyectosRemotos()
      ]);
      setTransacciones(txsRemotas);
      setProyectos(projsRemotos);
      setResumen(storageService.calcularResumen());
    } catch (e) {
      console.warn('Sincronización remota pendiente:', e);
    }
  };

  useEffect(() => {
    recargarTodo();
  }, []);

  const handleAbrirCaptura = (tipoCulto?: TipoCulto) => {
    if (tipoCulto) {
      setCultoPreseleccionado(tipoCulto);
    }
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Barra de Navegación Superior */}
      <Navbar
        vistaActiva={vistaActiva}
        setVistaActiva={setVistaActiva}
        saldoNeto={resumen.saldoNeto}
        onAbrirCapturaIngreso={handleAbrirCaptura}
        onAbrirRegistroGasto={handleAbrirGasto}
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
          />
        )}

        {vistaActiva === 'ingresos' && (
          <CapturaIngresosView
            tipoCultoInicial={cultoPreseleccionado}
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
              setVistaActiva('ingresos');
            }}
          />
        )}

        {vistaActiva === 'libro_caja' && (
          <LibroCajaView
            transacciones={transacciones}
            onTransaccionEliminada={recargarTodo}
            onVerEvidencia={handleVerEvidencia}
          />
        )}

        {vistaActiva === 'configuracion' && (
          <ConfiguracionView />
        )}
      </main>

      {/* Modal de Evidencia (Lightbox) */}
      <ModalEvidencia
        url={evidenciaModalUrl}
        nombre={evidenciaModalNombre}
        onCerrar={handleCerrarEvidencia}
      />

      {/* Footer pastoral */}
      <footer className="no-print bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            Sistema de Flujo de Efectivo Eclesiástico • Tesorería y Mayordomía
          </p>
          <p className="text-slate-400">
            PostgreSQL en Aiven • Cloudflare R2 Bucket • Arquitectura Serverless Jamstack
          </p>
        </div>
      </footer>

    </div>
  );
};

export default App;
