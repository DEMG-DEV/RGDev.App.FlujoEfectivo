-- =========================================================================
-- SCHEMA SQL PARA AIVEN POSTGRESQL - FLUJO DE EFECTIVO ECLESIÁSTICO
-- Ejecutar en la consola SQL de tu servicio PostgreSQL en Aiven
-- =========================================================================

-- 1. EXTENSIONES ÚTILES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE USUARIOS / AUTENTICACIÓN (Auth.js)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'tesorero' CHECK (rol IN ('admin', 'pastor', 'tesorero', 'operador')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(LOWER(email));

-- 3. TABLA DE MIEMBROS / DIEZMANTES / PACTANTES
CREATE TABLE IF NOT EXISTS miembros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(100),
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE PROYECTOS PACTADOS (Construcción, Equipamiento, Terreno, etc.)
CREATE TABLE IF NOT EXISTS proyectos_pactados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    meta_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    valor_semanal_sugerido NUMERIC(14, 2) NOT NULL DEFAULT 0,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    color_acento VARCHAR(20) DEFAULT '#4f46e5',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE PACTOS INDIVIDUALES POR MIEMBRO
CREATE TABLE IF NOT EXISTS pactos_miembros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos_pactados(id) ON DELETE CASCADE,
    miembro_nombre VARCHAR(150) NOT NULL,
    miembro_telefono VARCHAR(30),
    monto_total_pactado NUMERIC(14, 2) NOT NULL,
    cuota_semanal NUMERIC(14, 2) NOT NULL,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(20) DEFAULT 'al_dia' CHECK (estado IN ('al_dia', 'completado', 'pendiente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE CATEGORÍAS DE INGRESOS Y GASTOS
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    color VARCHAR(20)
);

-- 6. TABLA PRINCIPAL DE TRANSACCIONES / MOVIMIENTOS DE CAJA
CREATE TABLE IF NOT EXISTS transacciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
    subtipo VARCHAR(20) CHECK (subtipo IN ('ofrenda', 'diezmo', 'pacto', 'otro_ingreso', NULL)),
    categoria VARCHAR(100) NOT NULL,
    monto NUMERIC(14, 2) NOT NULL CHECK (monto > 0),
    fecha DATE NOT NULL,
    dia_semana VARCHAR(15) NOT NULL CHECK (dia_semana IN ('miercoles', 'domingo', 'otro')),
    tipo_culto VARCHAR(30) DEFAULT 'no_aplica' CHECK (tipo_culto IN ('miercoles_general', 'domingo_manana', 'domingo_tarde', 'especial', 'no_aplica')),
    concepto VARCHAR(255) NOT NULL,
    miembro_id UUID REFERENCES miembros(id) ON DELETE SET NULL,
    miembro_nombre VARCHAR(150),
    proyecto_id UUID REFERENCES proyectos_pactados(id) ON DELETE SET NULL,
    pacto_id UUID REFERENCES pactos_miembros(id) ON DELETE SET NULL,
    metodo_pago VARCHAR(20) NOT NULL DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'transferencia', 'cheque', 'tarjeta')),
    evidencia_url TEXT,            -- URL de Cloudflare R2 Bucket
    evidencia_nombre VARCHAR(255),  -- Nombre del archivo en R2
    evidencia_tipo VARCHAR(50),    -- MIME type (image/jpeg, application/pdf, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. ÍNDICES DE RENDIMIENTO PARA REPORTES RÁPIDOS
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX IF NOT EXISTS idx_transacciones_dia_semana ON transacciones(dia_semana);
CREATE INDEX IF NOT EXISTS idx_transacciones_subtipo ON transacciones(subtipo);
CREATE INDEX IF NOT EXISTS idx_transacciones_proyecto ON transacciones(proyecto_id);

-- 8. DATOS SEMILLA / INICIALES
INSERT INTO categorias (tipo, nombre, icono, color) VALUES
('ingreso', 'Diezmo General', 'heart-handshake', '#10b981'),
('ingreso', 'Ofrenda General', 'coins', '#059669'),
('ingreso', 'Ofrenda Misionera', 'globe', '#0d9488'),
('ingreso', 'Ofrenda Escuela Dominical / Niños', 'baby', '#14b8a6'),
('ingreso', 'Aporte a Proyecto Pactado', 'landmark', '#6366f1'),
('ingreso', 'Donación Especial', 'gift', '#8b5cf6'),
('gasto', 'Servicios Básicos (Luz, Agua, Gas)', 'zap', '#f59e0b'),
('gasto', 'Internet y Telecomunicaciones', 'wifi', '#d97706'),
('gasto', 'Mantenimiento del Templo', 'hammer', '#ef4444'),
('gasto', 'Honorarios Pastorales / Viáticos', 'user-check', '#b91c1c'),
('gasto', 'Sonido, Multimedia e Instrumentos', 'music', '#dc2626'),
('gasto', 'Obra Social y Misericordia', 'heart', '#ec4899'),
('gasto', 'Material de Evangelismo y Discipulado', 'book-open', '#7c3aed'),
('gasto', 'Papelería y Administración', 'file-text', '#64748b'),
('gasto', 'Eventos y Retiros', 'calendar', '#0284c7')
ON CONFLICT DO NOTHING;

-- Proyecto semilla de ejemplo
INSERT INTO proyectos_pactados (id, nombre, descripcion, meta_total, valor_semanal_sugerido, fecha_inicio, color_acento) VALUES
('b3f1c840-7e3e-4b2e-a55e-1a2b3c4d5e6f', 'Adquisición de Nuevo Sistema de Audio y Microfonía', 'Renovación de consola digital, micrófonos inalámbricos y monitores de piso para los cultos', 150000.00, 2500.00, CURRENT_DATE - INTERVAL '30 days', '#4f46e5'),
('c4a2d951-8f4f-5c3f-b66f-2b3c4d5e6f7a', 'Remodelación de Baños y Sala de Cuna', 'Construcción y acondicionamiento de baños para damas, caballeros y área para bebés', 85000.00, 1500.00, CURRENT_DATE - INTERVAL '15 days', '#0d9488')
ON CONFLICT DO NOTHING;
