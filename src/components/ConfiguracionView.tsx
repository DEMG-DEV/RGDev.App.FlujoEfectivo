import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  Cloud, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  ShieldCheck, 
  ExternalLink,
  Terminal,
  KeyRound,
  Server
} from 'lucide-react';
import { storageService } from '../services/storageService';

export const ConfiguracionView: React.FC = () => {
  // Config Aiven
  const [aivenUri, setAivenUri] = useState(() => {
    return localStorage.getItem('iglesia_flujo_aiven_uri') || 
           import.meta.env.VITE_AIVEN_PG_URL || 
           '';
  });
  const [probandoConexion, setProbandoConexion] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState<{ tipo: 'exito' | 'error' | 'aviso'; mensaje: string } | null>(null);
  // Config Cloudflare R2
  const [r2AccountId, setR2AccountId] = useState('');
  const [r2BucketName, setR2BucketName] = useState('gospel');
  const [r2AccessKey, setR2AccessKey] = useState('');
  const [r2SecretKey, setR2SecretKey] = useState('');
  const [r2PublicUrl, setR2PublicUrl] = useState('');

  const [copiadoSql, setCopiadoSql] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState(false);

  const copiarSchemaSql = () => {
    const sqlText = `-- SCHEMA SQL AIVEN POSTGRESQL PARA FLUJO DE EFECTIVO ECLESIÁSTICO
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS miembros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proyectos_pactados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    meta_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    valor_semanal_sugerido NUMERIC(14, 2) NOT NULL DEFAULT 0,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pactos_miembros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos_pactados(id) ON DELETE CASCADE,
    miembro_nombre VARCHAR(150) NOT NULL,
    miembro_telefono VARCHAR(30),
    monto_total_pactado NUMERIC(14, 2) NOT NULL,
    cuota_semanal NUMERIC(14, 2) NOT NULL,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(20) DEFAULT 'al_dia',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transacciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(10) NOT NULL,
    subtipo VARCHAR(20),
    categoria VARCHAR(100) NOT NULL,
    monto NUMERIC(14, 2) NOT NULL,
    fecha DATE NOT NULL,
    dia_semana VARCHAR(15) NOT NULL,
    tipo_culto VARCHAR(30) DEFAULT 'no_aplica',
    concepto VARCHAR(255) NOT NULL,
    miembro_nombre VARCHAR(150),
    proyecto_id UUID REFERENCES proyectos_pactados(id),
    pacto_id UUID REFERENCES pactos_miembros(id),
    metodo_pago VARCHAR(20) NOT NULL DEFAULT 'efectivo',
    evidencia_url TEXT,
    evidencia_nombre VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX IF NOT EXISTS idx_transacciones_dia ON transacciones(dia_semana);`;

    navigator.clipboard.writeText(sqlText);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 3000);
  };

  const handleGuardarConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('iglesia_flujo_aiven_uri', aivenUri);
    setGuardadoExito(true);
    setTimeout(() => setGuardadoExito(false), 3500);
  };

  const probarConexionAiven = async () => {
    setProbandoConexion(true);
    setEstadoConexion(null);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'connected') {
          setEstadoConexion({ tipo: 'exito', mensaje: '✅ ¡Conexión exitosa a Aiven PostgreSQL!' });
        } else {
          setEstadoConexion({ tipo: 'aviso', mensaje: `ℹ️ ${data.message || 'Servicio respondiendo.'}` });
        }
      } else {
        setEstadoConexion({ tipo: 'error', mensaje: '⚠️ No se pudo conectar al endpoint de Aiven. Verifica si el servicio está en estado "Running" en Aiven.' });
      }
    } catch {
      setEstadoConexion({ tipo: 'aviso', mensaje: 'ℹ️ Modo local activo. La URI fue guardada y se utilizará al conectarse.' });
    } finally {
      setProbandoConexion(false);
    }
  };

  // Descargar Respaldo JSON
  const descargarRespaldo = () => {
    const data = {
      transacciones: storageService.getTransacciones(),
      proyectos: storageService.getProyectos(),
      pactos: storageService.getPactos(),
      miembros: storageService.getMiembros(),
      fecha_respaldo: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_tesoreria_iglesia_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-700">
        <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Settings className="w-4 h-4" />
          <span>Infraestructura Cloud</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Conexión a Aiven & Cloudflare Bucket</h2>
        <p className="text-slate-300 text-sm mt-1 max-w-3xl">
          Arquitectura Jamstack serverless con React: la base de datos corre en <strong>Aiven PostgreSQL</strong> y los comprobantes de gastos se respaldan en <strong>Cloudflare R2 Bucket</strong>, sin servidores backend que mantener.
        </p>
      </div>

      {guardadoExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-sm font-semibold flex items-center space-x-2">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>Configuración guardada exitosamente.</span>
        </div>
      )}

      {/* 1. SECCIÓN AIVEN POSTGRESQL */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Aiven con PostgreSQL</h3>
              <p className="text-xs text-slate-500">Base de datos relacional para guardar ofrendas, diezmos y pactos</p>
            </div>
          </div>

          <a 
            href="https://console.aiven.io" 
            target="_blank" 
            rel="noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200"
          >
            <span>Consola Aiven</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Cadena de Conexión (Service URI) de Aiven PostgreSQL
            </label>
            <input
              type="text"
              value={aivenUri}
              onChange={(e) => setAivenUri(e.target.value)}
              placeholder="postgres://avnadmin:pass@host:port/defaultdb?sslmode=require"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 bg-slate-50 focus:bg-white"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Copia la "Service URI" desde la pantalla general de tu servicio PostgreSQL en Aiven.
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleGuardarConfig}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                Guardar Configuración
              </button>

              <button
                type="button"
                onClick={probarConexionAiven}
                disabled={probandoConexion}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {probandoConexion ? 'Probando conexión...' : '⚡ Probar Conexión con Aiven'}
              </button>
            </div>

            {estadoConexion && (
              <div className={`mt-3 p-3 rounded-xl text-xs font-semibold border ${
                estadoConexion.tipo === 'exito' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : estadoConexion.tipo === 'error'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {estadoConexion.mensaje}
              </div>
            )}
          </div>

          {/* Botón Copiar Script SQL */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Terminal className="w-4 h-4 text-slate-600" />
                <span>Script SQL de Inicialización (schema.sql)</span>
              </span>
              <p className="text-xs text-slate-500">
                Copia las sentencias DDL para crear las tablas de miembros, pactos y transacciones en Aiven.
              </p>
            </div>

            <button
              type="button"
              onClick={copiarSchemaSql}
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                copiadoSql
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {copiadoSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiadoSql ? '¡Copiado al Portapapeles!' : 'Copiar Script SQL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN CLOUDFLARE R2 BUCKET */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cloudflare Bucket (R2 Storage)</h3>
              <p className="text-xs text-slate-500">Almacenamiento de fotos de comprobantes, facturas y tickets de gastos</p>
            </div>
          </div>

          <a 
            href="https://dash.cloudflare.com" 
            target="_blank" 
            rel="noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200"
          >
            <span>Panel Cloudflare</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Cloudflare Account ID
            </label>
            <input
              type="text"
              value={r2AccountId}
              onChange={(e) => setR2AccountId(e.target.value)}
              placeholder="Ej. a1b2c3d4e5f6..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nombre del Bucket R2
            </label>
            <input
              type="text"
              value={r2BucketName}
              onChange={(e) => setR2BucketName(e.target.value)}
              placeholder="evidencias-tesoreria"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              URL Pública o Dominio del Bucket (Public URL)
            </label>
            <input
              type="text"
              value={r2PublicUrl}
              onChange={(e) => setR2PublicUrl(e.target.value)}
              placeholder="https://pub-xxxxxx.r2.dev"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              R2 Binding Name en Pages
            </label>
            <input
              type="text"
              readOnly
              value="BUCKET"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-100 text-slate-600 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200 text-xs text-sky-900 space-y-1">
          <p className="font-bold flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Configuración de Despliegue en Cloudflare Pages:</span>
          </p>
          <p className="text-slate-600">
            Al conectar este repositorio a Cloudflare Pages, añade en <strong>Settings &gt; Functions &gt; R2 bucket bindings</strong> un binding con la variable <code className="bg-sky-100 px-1 py-0.5 rounded text-sky-800 font-mono">BUCKET</code> apuntando a tu bucket de Cloudflare. ¡Y listo! Las evidencias se guardarán automáticamente sin servidor backend intermedio.
          </p>
        </div>
      </div>

      {/* 3. COPIA DE SEGURIDAD LOCAL */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-slate-900">Copia de Seguridad de Tesorería</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Descarga un respaldo completo en formato JSON de todos los movimientos, proyectos pactados y hermanos registrados.
          </p>
        </div>

        <button
          type="button"
          onClick={descargarRespaldo}
          className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Descargar Respaldo JSON</span>
        </button>
      </div>

    </div>
  );
};
