import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Filter, 
  Landmark, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShieldCheck,
  Building,
  UserCheck,
  Check,
  HeartHandshake,
  Coins,
  Wallet,
  BookOpen,
  Table,
  Camera,
  Pencil,
  History,
  AlertTriangle,
  RotateCcw,
  Trash2,
  FileCheck,
  Eye,
  CheckCheck,
  Sparkles
} from 'lucide-react';
import { 
  Transaccion, 
  ProyectoPactado, 
  PactoMiembro, 
  ReporteHistorico, 
  SnapshotMovimiento, 
  ResultadoAuditoriaReporte, 
  ItemAuditoriaMovimiento 
} from '../types';
import { storageService } from '../services/storageService';
import { formatearMoneda, formatearFechaCorta, formatearFechaLarga, getFechaHoy } from '../utils/dateUtils';

interface ReporteFinancieroModalProps {
  isOpen: boolean;
  onClose: () => void;
  transacciones: Transaccion[];
  proyectos: ProyectoPactado[];
  pactos: PactoMiembro[];
  onVerEvidencia?: (url: string, nombre?: string) => void;
}

type RangoPeriodo = 'por_mes' | 'todo' | 'este_ano' | 'personalizado';

// Helper para determinar el mes inicial con datos reales
const obtenerMesInicial = (txs: Transaccion[]): string => {
  const hoyClave = new Date().toISOString().slice(0, 7);
  if (!txs || txs.length === 0) return hoyClave;
  const tieneHoy = txs.some(t => t.fecha?.startsWith(hoyClave));
  if (tieneHoy) return hoyClave;
  const mesesConTxs = Array.from(
    new Set(txs.map(t => t.fecha?.slice(0, 7)).filter(Boolean))
  ).sort().reverse();
  return (mesesConTxs[0] as string) || hoyClave;
};

// Regla de privacidad eclesiástica: en los diezmos NUNCA debe salir el nombre del diezmante
const esDiezmoTransaccion = (t: Transaccion): boolean => {
  return (
    t.subtipo === 'diezmo' ||
    t.categoria === 'Diezmo General' ||
    Boolean(t.categoria?.toLowerCase().includes('diezmo')) ||
    Boolean(t.concepto?.toLowerCase().includes('diezmo'))
  );
};

export const ReporteFinancieroModal: React.FC<ReporteFinancieroModalProps> = ({
  isOpen,
  onClose,
  transacciones,
  proyectos,
  pactos,
  onVerEvidencia
}) => {
  // Asegurar que cuando el modal de reporte esté abierto, la app de fondo se oculte completamente al imprimir
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('reporte-modal-activo');
      return () => {
        document.body.classList.remove('reporte-modal-activo');
      };
    }
  }, [isOpen]);

  // Filtros de fecha y modo
  const [periodo, setPeriodo] = useState<RangoPeriodo>('por_mes');
  const [mesSeleccionado, setMesSeleccionado] = useState<string>(() => obtenerMesInicial(transacciones));
  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    const m = obtenerMesInicial(transacciones);
    return `${m}-01`;
  });
  const [fechaHasta, setFechaHasta] = useState<string>(() => {
    const m = obtenerMesInicial(transacciones);
    const [year, month] = m.split('-').map(Number);
    const ultimo = new Date(year, month, 0).getDate();
    return `${m}-${ultimo.toString().padStart(2, '0')}`;
  });

  // Al abrir el modal, asegurar sincronización con el mes más relevante si el actual está vacío
  useEffect(() => {
    if (isOpen && periodo === 'por_mes') {
      const mSugerido = obtenerMesInicial(transacciones);
      const tieneActual = transacciones.some(t => t.fecha?.startsWith(mesSeleccionado));
      if (!tieneActual && mSugerido !== mesSeleccionado) {
        aplicarMes(mSugerido);
      }
    }
  }, [isOpen]);

  // Secciones a incluir en la impresión
  const [incluirResumenMensual, setIncluirResumenMensual] = useState<boolean>(true);
  const [incluirIngresos, setIncluirIngresos] = useState<boolean>(true);
  const [incluirGastos, setIncluirGastos] = useState<boolean>(true);
  const [incluirProyectos, setIncluirProyectos] = useState<boolean>(true);
  const [incluirLibroCaja, setIncluirLibroCaja] = useState<boolean>(false);
  const [incluirAnexos, setIncluirAnexos] = useState<boolean>(true);

  // Personalización de Nombre de Iglesia y Logo (con persistencia en localStorage)
  const [nombreIglesia, setNombreIglesia] = useState<string>(() => {
    return localStorage.getItem('rgdev_nombre_iglesia') || 'Iglesia Cristiana Evangélica';
  });
  const [logoIglesia, setLogoIglesia] = useState<string>(() => {
    return localStorage.getItem('rgdev_logo_iglesia') || '';
  });
  const [editandoNombre, setEditandoNombre] = useState<boolean>(false);
  const [tempNombre, setTempNombre] = useState<string>(nombreIglesia);
  const fileInputLogoRef = useRef<HTMLInputElement>(null);

  const handleGuardarNombre = () => {
    const limpio = tempNombre.trim() || 'Iglesia Cristiana Evangélica';
    setNombreIglesia(limpio);
    localStorage.setItem('rgdev_nombre_iglesia', limpio);
    setEditandoNombre(false);
  };

  const handleSubirLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Por favor selecciona una imagen menor a 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setLogoIglesia(base64);
        localStorage.setItem('rgdev_logo_iglesia', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuitarLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoIglesia('');
    localStorage.removeItem('rgdev_logo_iglesia');
    if (fileInputLogoRef.current) {
      fileInputLogoRef.current.value = '';
    }
  };

  // Estado de navegación del modal y gestión del histórico inmutable
  const [modoModal, setModoModal] = useState<'generador' | 'historial' | 'visor_historico'>('generador');
  const [reportesHistoricos, setReportesHistoricos] = useState<ReporteHistorico[]>(() => storageService.getReportesHistoricos());
  const [reporteHistoricoSeleccionado, setReporteHistoricoSeleccionado] = useState<ReporteHistorico | null>(null);
  const [modoAuditoriaVisor, setModoAuditoriaVisor] = useState<'con_auditoria' | 'congelado'>('con_auditoria');
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);

  // Cargar reportes remotos de PostgreSQL al abrir modal
  useEffect(() => {
    if (isOpen) {
      storageService.cargarReportesHistoricosRemotos().then(data => {
        if (data && data.length > 0) {
          setReportesHistoricos(data);
        }
      });
    }
  }, [isOpen]);

  // Auditoría diferencial automática para el reporte histórico seleccionado
  const auditoriaActual = useMemo<ResultadoAuditoriaReporte | null>(() => {
    if (!reporteHistoricoSeleccionado) return null;
    return storageService.auditarReporteHistorico(reporteHistoricoSeleccionado, transacciones);
  }, [reporteHistoricoSeleccionado, transacciones]);

  // Mapa rápido de cambios por ID de transacción
  const mapaCambiosPorId = useMemo(() => {
    const mapa = new Map<string, ItemAuditoriaMovimiento>();
    if (auditoriaActual?.items) {
      for (const it of auditoriaActual.items) {
        mapa.set(it.id, it);
      }
    }
    return mapa;
  }, [auditoriaActual]);

  // Fecha y folio de emisión dinámicos o históricos
  const fechaEmision = useMemo(() => new Date(), []);
  const folioReporte = useMemo(() => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TES-${fechaEmision.getFullYear()}${(fechaEmision.getMonth() + 1).toString().padStart(2, '0')}-${rand}`;
  }, [fechaEmision]);

  const folioActivo = reporteHistoricoSeleccionado ? reporteHistoricoSeleccionado.folio : folioReporte;
  const fechaEmisionActiva = reporteHistoricoSeleccionado ? new Date(reporteHistoricoSeleccionado.fecha_emision) : fechaEmision;
  const nombreIglesiaActivo = reporteHistoricoSeleccionado ? reporteHistoricoSeleccionado.nombre_iglesia : nombreIglesia;
  const logoIglesiaActivo = reporteHistoricoSeleccionado ? (reporteHistoricoSeleccionado.logo_iglesia || '') : logoIglesia;

  // Lista de meses disponibles ordenada descendente
  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set<string>();
    const hoyClave = new Date().toISOString().slice(0, 7);
    setMeses.add(hoyClave);

    for (const t of transacciones) {
      if (t.fecha && t.fecha.length >= 7) {
        setMeses.add(t.fecha.slice(0, 7));
      }
    }

    return Array.from(setMeses).sort().reverse();
  }, [transacciones]);

  const formatearNombreMes = (claveMes: string) => {
    if (!claveMes) return '';
    const [year, month] = claveMes.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const str = new Intl.DateTimeFormat('es-MX', {
      month: 'long',
      year: 'numeric'
    }).format(date);
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const aplicarMes = (claveMes: string) => {
    setMesSeleccionado(claveMes);
    setPeriodo('por_mes');
    const [year, month] = claveMes.split('-').map(Number);
    const ultimoDia = new Date(year, month, 0).getDate();
    setFechaDesde(`${claveMes}-01`);
    setFechaHasta(`${claveMes}-${ultimoDia.toString().padStart(2, '0')}`);
  };

  // Manejo de cambio de periodo rápido
  const handleCambioPeriodo = (nuevo: RangoPeriodo) => {
    setPeriodo(nuevo);
    const hoy = new Date();

    if (nuevo === 'por_mes') {
      aplicarMes(mesSeleccionado);
    } else if (nuevo === 'todo') {
      setFechaDesde('2000-01-01');
      setFechaHasta('2099-12-31');
    } else if (nuevo === 'este_ano') {
      const year = hoy.getFullYear();
      setFechaDesde(`${year}-01-01`);
      setFechaHasta(`${year}-12-31`);
    }
  };

  // 1. Transacciones base de Caja General (excluyendo pactos y egresos internos de liquidación)
  const transaccionesBaseCaja = useMemo(() => {
    return transacciones.filter(t => {
      if (t.subtipo === 'pacto') return false;
      if (t.tipo === 'gasto' && t.categoria === 'Liquidación / Remanente de Proyecto') return false;
      return true;
    });
  }, [transacciones]);

  // 2. Mapa cronológico de saldo acumulado en Caja General (id -> saldo)
  const mapaSaldosCaja = useMemo(() => {
    const cronologicas = [...transaccionesBaseCaja].sort((a, b) => {
      const compFecha = a.fecha.localeCompare(b.fecha);
      if (compFecha !== 0) return compFecha;
      const aTime = a.created_at || '';
      const bTime = b.created_at || '';
      return aTime.localeCompare(bTime);
    });

    const mapa = new Map<string, number>();
    let acumulado = 0;
    for (const t of cronologicas) {
      if (t.tipo === 'ingreso') {
        acumulado += t.monto;
      } else if (t.tipo === 'gasto') {
        acumulado -= t.monto;
      }
      mapa.set(t.id, acumulado);
    }
    return mapa;
  }, [transaccionesBaseCaja]);

  // 2.1. Resumen y auditoría contable mes por mes (Caja General)
  const resumenesMensuales = useMemo(() => {
    const mesesSet = new Set<string>();
    const mesActualClave = new Date().toISOString().slice(0, 7);
    mesesSet.add(mesActualClave);

    for (const t of transaccionesBaseCaja) {
      if (t.fecha && t.fecha.length >= 7) {
        mesesSet.add(t.fecha.slice(0, 7));
      }
    }

    const mesesOrdenados = Array.from(mesesSet).sort();

    const resultado: Array<{
      claveMes: string;
      nombreMes: string;
      fechaInicio: string;
      fechaFin: string;
      saldoInicial: number;
      totalIngresos: number;
      totalOfrendas: number;
      totalDiezmos: number;
      totalOtros: number;
      totalGastos: number;
      flujoNeto: number;
      saldoFinal: number;
      cantidadMovimientos: number;
      entradas: Transaccion[];
      gastos: Transaccion[];
    }> = [];

    let saldoAcumulado = 0;

    for (const claveMes of mesesOrdenados) {
      const [year, month] = claveMes.split('-').map(Number);
      const ultimoDia = new Date(year, month, 0).getDate();
      const fInicio = `${claveMes}-01`;
      const fFin = `${claveMes}-${ultimoDia.toString().padStart(2, '0')}`;

      const saldoInicial = saldoAcumulado;

      const txsMes = transaccionesBaseCaja.filter(t => t.fecha >= fInicio && t.fecha <= fFin);
      const entradasMes = txsMes.filter(t => t.tipo === 'ingreso');
      const gastosMes = txsMes.filter(t => t.tipo === 'gasto');

      const totalIngresos = entradasMes.reduce((acc, t) => acc + (t.monto || 0), 0);
      const totalOfrendas = entradasMes.filter(t => t.subtipo === 'ofrenda').reduce((acc, t) => acc + t.monto, 0);
      const totalDiezmos = entradasMes.filter(t => t.subtipo === 'diezmo').reduce((acc, t) => acc + t.monto, 0);
      const totalOtros = entradasMes.filter(t => t.subtipo !== 'ofrenda' && t.subtipo !== 'diezmo').reduce((acc, t) => acc + t.monto, 0);

      const totalGastos = gastosMes.reduce((acc, t) => acc + (t.monto || 0), 0);
      const flujoNeto = totalIngresos - totalGastos;
      saldoAcumulado += flujoNeto;

      resultado.push({
        claveMes,
        nombreMes: formatearNombreMes(claveMes),
        fechaInicio: fInicio,
        fechaFin: fFin,
        saldoInicial,
        totalIngresos,
        totalOfrendas,
        totalDiezmos,
        totalOtros,
        totalGastos,
        flujoNeto,
        saldoFinal: saldoAcumulado,
        cantidadMovimientos: txsMes.length,
        entradas: entradasMes,
        gastos: gastosMes
      });
    }

    return resultado;
  }, [transaccionesBaseCaja]);

  // Meses a visualizar en la tabla mensual
  const mesesAMostrar = useMemo(() => {
    if (periodo === 'por_mes') {
      const match = resumenesMensuales.filter(m => m.claveMes === mesSeleccionado);
      return match.length > 0 ? match : resumenesMensuales.slice(-1);
    }
    if (periodo === 'este_ano') {
      const yearStr = new Date().getFullYear().toString();
      return resumenesMensuales.filter(m => m.claveMes.startsWith(yearStr));
    }
    return resumenesMensuales;
  }, [resumenesMensuales, periodo, mesSeleccionado]);

  // 3. Filtrar movimientos según el rango de fechas
  const transaccionesFiltradas = useMemo(() => {
    return transacciones.filter(t => {
      if (periodo === 'todo') return true;
      return t.fecha >= fechaDesde && t.fecha <= fechaHasta;
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [transacciones, periodo, fechaDesde, fechaHasta]);

  // Movimientos de Caja General en el período (Ofrendas, Diezmos y Gastos Operativos)
  const transaccionesCajaFiltradas = useMemo(() => {
    return transaccionesFiltradas.filter(t => {
      if (t.subtipo === 'pacto') return false;
      if (t.tipo === 'gasto' && t.categoria === 'Liquidación / Remanente de Proyecto') return false;
      return true;
    });
  }, [transaccionesFiltradas]);

  // Entradas de Caja General (Ofrendas y Diezmos ordenadas estrictamente por fecha)
  const entradasCaja = useMemo(() => {
    return transaccionesCajaFiltradas
      .filter(t => t.tipo === 'ingreso')
      .sort((a, b) => {
        const c = a.fecha.localeCompare(b.fecha);
        if (c !== 0) return c;
        return (a.created_at || '').localeCompare(b.created_at || '');
      });
  }, [transaccionesCajaFiltradas]);

  // Gastos Operativos de Caja General ordenados estrictamente por fecha
  const gastosCaja = useMemo(() => {
    return transaccionesCajaFiltradas
      .filter(t => t.tipo === 'gasto')
      .sort((a, b) => {
        const c = a.fecha.localeCompare(b.fecha);
        if (c !== 0) return c;
        return (a.created_at || '').localeCompare(b.created_at || '');
      });
  }, [transaccionesCajaFiltradas]);

  // Comprobantes de egresos / gastos respaldados con archivo o imagen en Cloudflare R2
  const gastosConComprobante = useMemo(() => {
    return gastosCaja.filter(g => Boolean(g.evidencia_url));
  }, [gastosCaja]);

  // Mapa de ID de transacción a número de anexo (para referencia cruzada exacta)
  const mapaIndicesAnexos = useMemo(() => {
    const mapa = new Map<string, number>();
    gastosConComprobante.forEach((g, idx) => {
      mapa.set(g.id, idx + 1);
    });
    return mapa;
  }, [gastosConComprobante]);

  // Aportes de Proyectos Pactados en el período
  const aportesPactosFiltrados = useMemo(() => {
    return transaccionesFiltradas.filter(t => t.tipo === 'ingreso' && t.subtipo === 'pacto');
  }, [transaccionesFiltradas]);

  // 4. Totales Contables alineados con Resumen y Caja General
  const totalEntradasCaja = useMemo(() => {
    return entradasCaja.reduce((acc, t) => acc + (t.monto || 0), 0);
  }, [entradasCaja]);

  const totalGastosCaja = useMemo(() => {
    return gastosCaja.reduce((acc, t) => acc + (t.monto || 0), 0);
  }, [gastosCaja]);

  // Balance Neto de Caja General (idéntico al Libro de Caja y al Resumen)
  const balanceNetoCaja = totalEntradasCaja - totalGastosCaja;

  // Desglose de Entradas de Caja
  const totalOfrendas = useMemo(() => {
    return entradasCaja.filter(t => t.subtipo === 'ofrenda').reduce((acc, t) => acc + t.monto, 0);
  }, [entradasCaja]);

  const totalDiezmos = useMemo(() => {
    return entradasCaja.filter(t => t.subtipo === 'diezmo').reduce((acc, t) => acc + t.monto, 0);
  }, [entradasCaja]);

  const totalOtrosIngresos = useMemo(() => {
    return entradasCaja.filter(t => t.subtipo !== 'ofrenda' && t.subtipo !== 'diezmo').reduce((acc, t) => acc + t.monto, 0);
  }, [entradasCaja]);

  const pctOfrendas = totalEntradasCaja > 0 ? Math.round((totalOfrendas / totalEntradasCaja) * 100) : 0;
  const pctDiezmos = totalEntradasCaja > 0 ? Math.round((totalDiezmos / totalEntradasCaja) * 100) : 0;

  // Recaudación por Cultos (regla estricta Miércoles vs Domingo sin conteo cruzado)
  const esMiercoles = (t: Transaccion) => t.dia_semana === 'miercoles' || t.tipo_culto === 'miercoles_general';
  const esDomingo = (t: Transaccion) => !esMiercoles(t) && (t.dia_semana === 'domingo' || t.tipo_culto === 'domingo_manana' || t.tipo_culto === 'domingo_tarde');

  const entradasMiercoles = useMemo(() => {
    return entradasCaja.filter(esMiercoles).reduce((acc, t) => acc + t.monto, 0);
  }, [entradasCaja]);

  const entradasDomingo = useMemo(() => {
    return entradasCaja.filter(esDomingo).reduce((acc, t) => acc + t.monto, 0);
  }, [entradasCaja]);

  // Totales de proyectos pactados
  const totalAportesPactosPeriodo = useMemo(() => {
    return aportesPactosFiltrados.reduce((acc, t) => acc + (t.monto || 0), 0);
  }, [aportesPactosFiltrados]);

  const totalMetaProyectos = useMemo(() => {
    return proyectos.reduce((acc, p) => acc + (p.meta_total || 0), 0);
  }, [proyectos]);

  const totalRecaudadoProyectos = useMemo(() => {
    return proyectos.reduce((acc, p) => acc + (p.total_recaudado || 0), 0);
  }, [proyectos]);

  const totalPactadoMiembros = useMemo(() => {
    return pactos.reduce((acc, p) => acc + (p.monto_total_pactado || 0), 0);
  }, [pactos]);

  const totalAportadoMiembros = useMemo(() => {
    return pactos.reduce((acc, p) => acc + (p.total_aportado || 0), 0);
  }, [pactos]);

  // Desglose de Gastos por Categoría para explicación inmediata y fácil
  const gastosPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const g of gastosCaja) {
      const cat = g.categoria || 'Gastos Operativos';
      mapa.set(cat, (mapa.get(cat) || 0) + (g.monto || 0));
    }
    return Array.from(mapa.entries())
      .map(([categoria, total]) => ({
        categoria,
        total,
        porcentaje: totalGastosCaja > 0 ? Math.round((total / totalGastosCaja) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [gastosCaja, totalGastosCaja]);

  // Descripción legible del período
  const periodoDescripcionActiva = useMemo(() => {
    if (modoModal === 'visor_historico' && reporteHistoricoSeleccionado) {
      return reporteHistoricoSeleccionado.periodo_descripcion;
    }
    return periodo === 'por_mes'
      ? `Mes de ${formatearNombreMes(mesSeleccionado)} (${formatearFechaCorta(fechaDesde)} al ${formatearFechaCorta(fechaHasta)})`
      : periodo === 'todo'
      ? 'Total Histórico Consolidado'
      : periodo === 'este_ano'
      ? `Año Fiscal ${new Date().getFullYear()} (${formatearFechaCorta(fechaDesde)} al ${formatearFechaCorta(fechaHasta)})`
      : `${formatearFechaCorta(fechaDesde)} al ${formatearFechaCorta(fechaHasta)}`;
  }, [modoModal, reporteHistoricoSeleccionado, periodo, mesSeleccionado, fechaDesde, fechaHasta]);

  // Entradas a mostrar según el modo activo (generador vs visor histórico congelado o auditado)
  const entradasAMostrar = useMemo(() => {
    if (modoModal === 'visor_historico' && reporteHistoricoSeleccionado) {
      const snapEntradas = (reporteHistoricoSeleccionado.movimientos_snapshot || []).filter(t => t.tipo === 'ingreso');
      if (modoAuditoriaVisor === 'congelado') {
        return snapEntradas;
      }
      // Con auditoría: movimientos congelados + los detectados como agregados posteriormente en esa fecha
      const agregados = (auditoriaActual?.items || [])
        .filter(it => it.tipoCambio === 'agregado_posteriormente' && it.tipo === 'ingreso')
        .map(it => {
          const txActual = transacciones.find(t => t.id === it.id);
          return txActual || {
            id: it.id,
            tipo: 'ingreso',
            subtipo: it.subtipo,
            categoria: it.categoriaActual || 'Ingreso',
            monto: it.montoActual || 0,
            fecha: it.fechaActual || '',
            dia_semana: 'otro',
            tipo_culto: 'no_aplica',
            concepto: it.conceptoActual || '',
            miembro_nombre: it.miembroActual,
            metodo_pago: 'efectivo',
            created_at: ''
          } as Transaccion;
        });
      return [...snapEntradas, ...agregados];
    }
    return entradasCaja;
  }, [modoModal, reporteHistoricoSeleccionado, modoAuditoriaVisor, auditoriaActual, transacciones, entradasCaja]);

  // Gastos a mostrar según el modo activo
  const gastosAMostrar = useMemo(() => {
    if (modoModal === 'visor_historico' && reporteHistoricoSeleccionado) {
      const snapGastos = (reporteHistoricoSeleccionado.movimientos_snapshot || []).filter(t => t.tipo === 'gasto');
      if (modoAuditoriaVisor === 'congelado') {
        return snapGastos;
      }
      // Con auditoría: movimientos congelados + los detectados como agregados posteriormente en esa fecha
      const agregados = (auditoriaActual?.items || [])
        .filter(it => it.tipoCambio === 'agregado_posteriormente' && it.tipo === 'gasto')
        .map(it => {
          const txActual = transacciones.find(t => t.id === it.id);
          return txActual || {
            id: it.id,
            tipo: 'gasto',
            subtipo: undefined,
            categoria: it.categoriaActual || 'Gasto',
            monto: it.montoActual || 0,
            fecha: it.fechaActual || '',
            dia_semana: 'otro',
            tipo_culto: 'no_aplica',
            concepto: it.conceptoActual || '',
            metodo_pago: 'efectivo',
            created_at: ''
          } as Transaccion;
        });
      return [...snapGastos, ...agregados];
    }
    return gastosCaja;
  }, [modoModal, reporteHistoricoSeleccionado, modoAuditoriaVisor, auditoriaActual, transacciones, gastosCaja]);

  // Totales dinámicos adaptados al visor histórico
  const totalEntradasMostrar = useMemo(() => {
    if (modoModal === 'visor_historico' && reporteHistoricoSeleccionado) {
      if (modoAuditoriaVisor === 'congelado') {
        return reporteHistoricoSeleccionado.totales?.totalEntradasCaja || 0;
      }
      return (reporteHistoricoSeleccionado.totales?.totalEntradasCaja || 0) + (auditoriaActual?.diferenciaEntradas || 0);
    }
    return totalEntradasCaja;
  }, [modoModal, reporteHistoricoSeleccionado, modoAuditoriaVisor, auditoriaActual, totalEntradasCaja]);

  const totalGastosMostrar = useMemo(() => {
    if (modoModal === 'visor_historico' && reporteHistoricoSeleccionado) {
      if (modoAuditoriaVisor === 'congelado') {
        return reporteHistoricoSeleccionado.totales?.totalGastosCaja || 0;
      }
      return (reporteHistoricoSeleccionado.totales?.totalGastosCaja || 0) + (auditoriaActual?.diferenciaGastos || 0);
    }
    return totalGastosCaja;
  }, [modoModal, reporteHistoricoSeleccionado, modoAuditoriaVisor, auditoriaActual, totalGastosCaja]);

  const balanceNetoMostrar = useMemo(() => {
    if (modoModal === 'visor_historico' && reporteHistoricoSeleccionado) {
      if (modoAuditoriaVisor === 'congelado') {
        return reporteHistoricoSeleccionado.totales?.balanceNetoCaja !== undefined
          ? reporteHistoricoSeleccionado.totales.balanceNetoCaja
          : (reporteHistoricoSeleccionado.totales?.totalEntradasCaja || 0) - (reporteHistoricoSeleccionado.totales?.totalGastosCaja || 0);
      }
      return auditoriaActual?.balanceActualizado !== undefined 
        ? auditoriaActual.balanceActualizado 
        : ((reporteHistoricoSeleccionado.totales?.balanceNetoCaja || 0) + (auditoriaActual?.diferenciaBalanceNeto || 0));
    }
    return balanceNetoCaja;
  }, [modoModal, reporteHistoricoSeleccionado, modoAuditoriaVisor, auditoriaActual, balanceNetoCaja]);

  const totalOfrendasMostrar = useMemo(() => {
    if (modoModal === 'visor_historico' && reporteHistoricoSeleccionado) {
      return reporteHistoricoSeleccionado.totales?.totalOfrendas || 0;
    }
    return totalOfrendas;
  }, [modoModal, reporteHistoricoSeleccionado, totalOfrendas]);

  const totalDiezmosMostrar = useMemo(() => {
    if (modoModal === 'visor_historico' && reporteHistoricoSeleccionado) {
      return reporteHistoricoSeleccionado.totales?.totalDiezmos || 0;
    }
    return totalDiezmos;
  }, [modoModal, reporteHistoricoSeleccionado, totalDiezmos]);

  const totalRecaudadoProyectosMostrar = useMemo(() => {
    if (modoModal === 'visor_historico' && reporteHistoricoSeleccionado) {
      return reporteHistoricoSeleccionado.totales?.totalProyectosRecaudado || 0;
    }
    return totalRecaudadoProyectos;
  }, [modoModal, reporteHistoricoSeleccionado, totalRecaudadoProyectos]);

  const totalMetaProyectosMostrar = useMemo(() => {
    if (modoModal === 'visor_historico' && reporteHistoricoSeleccionado) {
      return reporteHistoricoSeleccionado.totales?.totalProyectosMeta || 0;
    }
    return totalMetaProyectos;
  }, [modoModal, reporteHistoricoSeleccionado, totalMetaProyectos]);

  // Guardar snapshot inmutable en el historial
  const archivarReporteActual = async (): Promise<ReporteHistorico> => {
    const snapshot: ReporteHistorico = {
      id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      folio: folioReporte,
      fecha_emision: new Date().toISOString(),
      periodo_tipo: periodo,
      periodo_descripcion: periodoDescripcionActiva,
      mes_seleccionado: mesSeleccionado,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      nombre_iglesia: nombreIglesia,
      logo_iglesia: logoIglesia,
      secciones_incluidas: {
        incluirResumenMensual,
        incluirIngresos,
        incluirGastos,
        incluirProyectos,
        incluirLibroCaja,
        incluirAnexos
      },
      totales: {
        totalEntradasCaja,
        totalGastosCaja,
        balanceNetoCaja,
        totalOfrendas,
        totalDiezmos,
        totalOtros: totalOtrosIngresos,
        totalProyectosRecaudado: totalRecaudadoProyectos,
        totalProyectosMeta: totalMetaProyectos
      },
      desglose_categorias_gastos: gastosPorCategoria,
      movimientos_snapshot: transaccionesCajaFiltradas.map(t => ({
        id: t.id,
        tipo: t.tipo,
        subtipo: t.subtipo,
        categoria: t.categoria,
        monto: t.monto,
        fecha: t.fecha,
        dia_semana: t.dia_semana,
        tipo_culto: t.tipo_culto,
        concepto: t.concepto,
        miembro_id: t.miembro_id,
        miembro_nombre: t.miembro_nombre,
        metodo_pago: t.metodo_pago,
        evidencia_url: t.evidencia_url,
        evidencia_nombre: t.evidencia_nombre,
        created_at: t.created_at
      })),
      proyectos_snapshot: proyectos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        meta_total: p.meta_total,
        total_recaudado: p.total_recaudado
      }))
    };

    await storageService.guardarReporteHistorico(snapshot);
    setReportesHistoricos(storageService.getReportesHistoricos());
    return snapshot;
  };

  // Disparar diálogo nativo de impresión / Guardar como PDF (auto-archivando si es nuevo)
  const handleImprimir = async () => {
    if (modoModal === 'generador') {
      try {
        await archivarReporteActual();
        setMensajeGuardado(`✓ Reporte archivado en historial con folio ${folioReporte}`);
        setTimeout(() => setMensajeGuardado(null), 4000);
      } catch (e) {
        console.warn('Error al archivar reporte:', e);
      }
    }
    window.print();
  };

  // Exportar a CSV completo y estructurado
  const exportarCSV = () => {
    const rows = [
      ['FOLIO', folioReporte],
      ['FECHA EMISION', fechaEmision.toLocaleString('es-MX')],
      ['PERIODO', periodo === 'por_mes' ? `Mes de ${formatearNombreMes(mesSeleccionado)} (${fechaDesde} al ${fechaHasta})` : periodo === 'todo' ? 'Total Histórico Consolidado' : `${fechaDesde} al ${fechaHasta}`],
      ['--- RESUMEN EJECUTIVO (ALINEADO A CAJA GENERAL Y RESUMEN) ---'],
      ['ENTRADAS CAJA GENERAL (OFRENDAS Y DIEZMOS)', totalEntradasCaja],
      ['TOTAL OFRENDAS', totalOfrendas],
      ['TOTAL DIEZMOS', totalDiezmos],
      ['TOTAL EGRESOS OPERATIVOS', totalGastosCaja],
      ['BALANCE NETO EN CAJA GENERAL', balanceNetoCaja],
      ['FONDO PROYECTOS PACTADOS (INDEPENDIENTE)', totalRecaudadoProyectos],
      ['APORTES A PROYECTOS EN PERIODO', totalAportesPactosPeriodo],
      ['RECAUDACION MIERCOLES GENERAL', entradasMiercoles],
      ['RECAUDACION DOMINGOS', entradasDomingo],
      [],
      ['--- DETALLE DE ENTRADAS A CAJA GENERAL ---'],
      ['Fecha', 'Culto', 'Clasificación', 'Miembro/Hermano', 'Concepto', 'Método', 'Monto'],
      ...entradasCaja.map(i => {
        const esDiezmo = esDiezmoTransaccion(i);
        return [
          i.fecha,
          i.dia_semana,
          esDiezmo ? 'diezmo' : (i.subtipo || 'ofrenda'),
          `"${(esDiezmo ? 'Confidencial' : (i.miembro_nombre || 'Ofrenda Colectiva')).replace(/"/g, '""')}"`,
          `"${(esDiezmo ? 'Diezmo General' : (i.concepto || '')).replace(/"/g, '""')}"`,
          i.metodo_pago,
          i.monto
        ];
      }),
      [],
      ['--- DETALLE DE EGRESOS & GASTOS OPERATIVOS ---'],
      ['Fecha', 'Categoría', 'Concepto/Proveedor', 'Método', 'Evidencia', 'Monto'],
      ...gastosCaja.map(g => [
        g.fecha,
        g.categoria,
        `"${(g.concepto || '').replace(/"/g, '""')}"`,
        g.metodo_pago,
        g.evidencia_url ? 'SI' : 'NO',
        g.monto
      ]),
      [],
      ['--- APORTES A PROYECTOS PACTADOS EN EL PERIODO ---'],
      ['Fecha', 'Proyecto', 'Hermano/Donante', 'Concepto', 'Método', 'Monto'],
      ...aportesPactosFiltrados.map(p => [
        p.fecha,
        `"${(p.proyecto_nombre || '').replace(/"/g, '""')}"`,
        `"${(p.miembro_nombre || '').replace(/"/g, '""')}"`,
        `"${(p.concepto || '').replace(/"/g, '""')}"`,
        p.metodo_pago,
        p.monto
      ]),
      [],
      ['--- ESTADO DE PROYECTOS PACTADOS ---'],
      ['Proyecto', 'Meta Total', 'Total Recaudado', 'Saldo Restante', '% Avance'],
      ...proyectos.map(p => [
        `"${p.nombre.replace(/"/g, '""')}"`,
        p.meta_total,
        p.total_recaudado,
        Math.max(0, p.meta_total - p.total_recaudado),
        `${Math.min(100, Math.round((p.total_recaudado / (p.meta_total || 1)) * 100))}%`
      ]),
      [],
      ['--- DETALLE DE HERMANOS PACTANTES ---'],
      ['Hermano/a', 'Proyecto', 'Pactado Total', 'Cuota Semanal', 'Total Aportado', 'Saldo Pendiente', 'Estado'],
      ...pactos.map(pct => [
        `"${pct.miembro_nombre.replace(/"/g, '""')}"`,
        `"${pct.proyecto_nombre.replace(/"/g, '""')}"`,
        pct.monto_total_pactado,
        pct.cuota_semanal,
        pct.total_aportado,
        pct.saldo_pendiente,
        pct.estado
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_financiero_oficial_${fechaEmision.toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderFilaEntrada = (i: Transaccion | SnapshotMovimiento) => {
    const esDiezmo = esDiezmoTransaccion(i as Transaccion);
    const cambio = (modoModal === 'visor_historico' && modoAuditoriaVisor === 'con_auditoria')
      ? mapaCambiosPorId.get(i.id)
      : null;

    const esModificado = cambio?.tipoCambio === 'modificado';
    const esEliminado = cambio?.tipoCambio === 'eliminado';
    const esAgregado = cambio?.tipoCambio === 'agregado_posteriormente';

    return (
      <tr 
        key={i.id} 
        className={`transition-colors ${
          esModificado 
            ? 'bg-amber-50/80 hover:bg-amber-100/60' 
            : esEliminado 
            ? 'bg-rose-50/70 hover:bg-rose-100/60 text-slate-400' 
            : esAgregado
            ? 'bg-indigo-50/70 hover:bg-indigo-100/60'
            : 'hover:bg-slate-50'
        }`}
      >
        <td className="py-2 px-2.5 whitespace-nowrap font-bold text-slate-900">
          <span className={esEliminado ? 'line-through text-slate-400' : ''}>{formatearFechaCorta(i.fecha)}</span>
          {esModificado && cambio.fechaOriginal && cambio.fechaActual && cambio.fechaOriginal !== cambio.fechaActual && (
            <span className="block text-[9px] text-amber-800 font-normal">Antes: {formatearFechaCorta(cambio.fechaOriginal)}</span>
          )}
        </td>
        <td className="py-2 px-2.5 whitespace-nowrap capitalize text-slate-600">
          {i.dia_semana === 'miercoles' ? 'Miércoles General' : i.dia_semana === 'domingo' ? 'Domingo' : 'Especial'}
        </td>
        <td className="py-2 px-2.5 whitespace-nowrap">
          <div className="flex flex-col items-start gap-0.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
              esDiezmo 
                ? 'bg-indigo-100 text-indigo-800' 
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {esDiezmo ? 'Diezmo' : (i.subtipo || 'Ofrenda')}
            </span>

            {/* Badges de Auditoría diferencial */}
            {esModificado && (
              <span className="text-[9px] font-extrabold text-amber-900 bg-amber-200/90 px-1 py-0.2 rounded border border-amber-300">
                ⚠️ Modificado
              </span>
            )}
            {esEliminado && (
              <span className="text-[9px] font-extrabold text-rose-900 bg-rose-200/90 px-1 py-0.2 rounded border border-rose-300">
                ❌ Eliminado en caja
              </span>
            )}
            {esAgregado && (
              <span className="text-[9px] font-extrabold text-indigo-900 bg-indigo-200/90 px-1 py-0.2 rounded border border-indigo-300">
                ➕ Añadido posterior
              </span>
            )}
          </div>
        </td>
        <td className="py-2 px-2.5 text-slate-800">
          {esDiezmo ? (
            <span className="text-slate-400 italic font-semibold">Confidencial</span>
          ) : (
            <>
              <span className={esEliminado ? 'line-through text-slate-400' : ''}>
                {i.miembro_nombre || <span className="text-slate-400 italic">Ofrenda Colectiva</span>}
              </span>
              {esModificado && cambio.miembroOriginal && cambio.miembroActual && cambio.miembroOriginal !== cambio.miembroActual && (
                <span className="block text-[9px] text-amber-800 font-normal">Antes: {cambio.miembroOriginal}</span>
              )}
            </>
          )}
        </td>
        <td className="py-2 px-2.5 text-slate-600 font-medium">
          <span className={esEliminado ? 'line-through text-slate-400' : ''}>
            {esDiezmo ? 'Diezmo General' : i.concepto}
          </span>
          {esModificado && cambio.conceptoOriginal && cambio.conceptoActual && cambio.conceptoOriginal !== cambio.conceptoActual && (
            <span className="block text-[9px] text-amber-800 font-normal">Antes: "{cambio.conceptoOriginal}"</span>
          )}
        </td>
        <td className="py-2 px-2.5 whitespace-nowrap capitalize text-slate-500">
          {i.metodo_pago}
        </td>
        <td className="py-2 px-2.5 text-right font-bold whitespace-nowrap">
          {esModificado ? (
            <div>
              <span className="text-[10px] text-slate-400 line-through block font-normal">
                Antes: +{formatearMoneda(cambio.montoOriginal)}
              </span>
              <span className="text-amber-900 font-black">
                +{formatearMoneda(cambio.montoActual)}
              </span>
              <span className={`text-[9px] font-bold block ${cambio.diferenciaMonto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ({cambio.diferenciaMonto >= 0 ? '+' : ''}{formatearMoneda(cambio.diferenciaMonto)})
              </span>
            </div>
          ) : esEliminado ? (
            <div>
              <span className="text-slate-400 line-through">
                +{formatearMoneda(cambio.montoOriginal)}
              </span>
              <span className="text-[9px] text-rose-700 font-bold block">
                (-{formatearMoneda(cambio.montoOriginal)})
              </span>
            </div>
          ) : (
            <span className="text-emerald-700">
              +{formatearMoneda(i.monto)}
            </span>
          )}
        </td>
      </tr>
    );
  };

  const renderFilaGasto = (g: Transaccion | SnapshotMovimiento) => {
    const numAnexo = mapaIndicesAnexos.get(g.id);
    const cambio = (modoModal === 'visor_historico' && modoAuditoriaVisor === 'con_auditoria')
      ? mapaCambiosPorId.get(g.id)
      : null;

    const esModificado = cambio?.tipoCambio === 'modificado';
    const esEliminado = cambio?.tipoCambio === 'eliminado';
    const esAgregado = cambio?.tipoCambio === 'agregado_posteriormente';

    return (
      <tr 
        key={g.id} 
        className={`transition-colors ${
          esModificado 
            ? 'bg-amber-50/80 hover:bg-amber-100/60' 
            : esEliminado 
            ? 'bg-rose-50/70 hover:bg-rose-100/60 text-slate-400' 
            : esAgregado
            ? 'bg-indigo-50/70 hover:bg-indigo-100/60'
            : 'hover:bg-slate-50'
        }`}
      >
        <td className="py-2 px-2.5 whitespace-nowrap font-bold text-slate-900">
          <span className={esEliminado ? 'line-through text-slate-400' : ''}>{formatearFechaCorta(g.fecha)}</span>
          {esModificado && cambio.fechaOriginal && cambio.fechaActual && cambio.fechaOriginal !== cambio.fechaActual && (
            <span className="block text-[9px] text-amber-800 font-normal">Antes: {formatearFechaCorta(cambio.fechaOriginal)}</span>
          )}
        </td>
        <td className="py-2 px-2.5 whitespace-nowrap font-semibold text-slate-700">
          <span className={esEliminado ? 'line-through text-slate-400' : ''}>{g.categoria}</span>
          <div className="flex flex-col items-start gap-0.5 mt-0.5">
            {esModificado && (
              <span className="text-[9px] font-extrabold text-amber-900 bg-amber-200/90 px-1 py-0.2 rounded border border-amber-300">
                ⚠️ Modificado
              </span>
            )}
            {esEliminado && (
              <span className="text-[9px] font-extrabold text-rose-900 bg-rose-200/90 px-1 py-0.2 rounded border border-rose-300">
                ❌ Eliminado en caja
              </span>
            )}
            {esAgregado && (
              <span className="text-[9px] font-extrabold text-indigo-900 bg-indigo-200/90 px-1 py-0.2 rounded border border-indigo-300">
                ➕ Añadido posterior
              </span>
            )}
          </div>
        </td>
        <td className="py-2 px-2.5 text-slate-800">
          <span className={esEliminado ? 'line-through text-slate-400' : ''}>{g.concepto}</span>
          {esModificado && cambio.conceptoOriginal && cambio.conceptoActual && cambio.conceptoOriginal !== cambio.conceptoActual && (
            <span className="block text-[9px] text-amber-800 font-normal">Antes: "{cambio.conceptoOriginal}"</span>
          )}
        </td>
        <td className="py-2 px-2.5 whitespace-nowrap capitalize text-slate-500">
          {g.metodo_pago}
        </td>
        <td className="py-2 px-2.5 whitespace-nowrap text-[10px]">
          {g.evidencia_url ? (
            <span 
              onClick={() => onVerEvidencia?.(g.evidencia_url!, g.evidencia_nombre)}
              title="Ver comprobante adjunto"
              className="font-bold text-sky-800 bg-sky-50 border border-sky-300 px-2 py-0.5 rounded cursor-pointer hover:bg-sky-100 transition-colors inline-flex items-center space-x-1"
            >
              <span>Anexo #{numAnexo || 1}</span>
            </span>
          ) : (
            <span className="text-slate-400 italic">Sin archivo</span>
          )}
        </td>
        <td className="py-2 px-2.5 text-right font-bold whitespace-nowrap">
          {esModificado ? (
            <div>
              <span className="text-[10px] text-slate-400 line-through block font-normal">
                Antes: -{formatearMoneda(cambio.montoOriginal)}
              </span>
              <span className="text-rose-900 font-black">
                -{formatearMoneda(cambio.montoActual)}
              </span>
              <span className={`text-[9px] font-bold block ${cambio.diferenciaMonto <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ({cambio.diferenciaMonto > 0 ? '+' : ''}{formatearMoneda(cambio.diferenciaMonto)})
              </span>
            </div>
          ) : esEliminado ? (
            <div>
              <span className="text-slate-400 line-through">
                -{formatearMoneda(cambio.montoOriginal)}
              </span>
              <span className="text-[9px] text-emerald-700 font-bold block">
                (+{formatearMoneda(cambio.montoOriginal)})
              </span>
            </div>
          ) : (
            <span className="text-rose-700">
              -{formatearMoneda(g.monto)}
            </span>
          )}
        </td>
      </tr>
    );
  };

  if (!isOpen) return null;

  return (
    <div id="modal-reporte-financiero" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Ventana Modal / Contenedor de Hoja */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:h-auto print:shadow-none print:border-none print:rounded-none">
        
        {/* Barra Superior de Control Apple HIG (no-print) */}
        <div className="no-print bg-[#F9F9FB] border-b border-slate-200 px-3 sm:px-5 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-none">
                  Informe Financiero Eclesiástico Oficial
                </h2>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  Folio: {folioActivo} • Sincronizado con Resumen y Caja General
                </span>
              </div>
            </div>

            {/* Selector de Modo Principal: Generador vs Historial */}
            <div className="apple-segmented-group p-0.5 ml-0 sm:ml-2 flex">
              <button
                type="button"
                onClick={() => {
                  setReporteHistoricoSeleccionado(null);
                  setModoModal('generador');
                }}
                className={`apple-segmented-item flex-1 sm:flex-none px-2.5 sm:px-3 py-1 text-xs font-semibold focus-visible:outline-none transition-all ${
                  modoModal === 'generador' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 inline mr-1" />
                <span>Generar Informe</span>
              </button>
              <button
                type="button"
                onClick={() => setModoModal('historial')}
                className={`apple-segmented-item flex-1 sm:flex-none px-2.5 sm:px-3 py-1 text-xs font-semibold focus-visible:outline-none transition-all ${
                  modoModal === 'historial' || modoModal === 'visor_historico' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                <span>Historial ({reportesHistoricos.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mensajeGuardado && (
              <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl animate-in fade-in duration-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{mensajeGuardado}</span>
              </span>
            )}

            {modoModal === 'generador' && (
              <button
                type="button"
                onClick={async () => {
                  await archivarReporteActual();
                  setMensajeGuardado(`✓ Folio ${folioReporte} guardado en el historial`);
                  setTimeout(() => setMensajeGuardado(null), 4000);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                title="Guardar snapshot inmutable en el historial sin mandar a imprimir"
              >
                <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Guardar en Historial</span>
              </button>
            )}

            <button
              onClick={exportarCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Descargar datos en CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {modoModal !== 'historial' && (
              <button
                onClick={handleImprimir}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                title="Imprimir o guardar como PDF"
              >
                <Printer className="w-4 h-4" />
                <span>{modoModal === 'visor_historico' ? 'Re-imprimir PDF' : 'Imprimir / Guardar PDF'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors ml-1"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Banner de Auditoría al Visitar Reporte Histórico (no-print) */}
        {modoModal === 'visor_historico' && reporteHistoricoSeleccionado && (
          <div className="no-print bg-amber-50/90 border-b border-amber-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>
                Visualizando Reporte Histórico: <strong>Folio {reporteHistoricoSeleccionado.folio}</strong>
                {' '}(Emitido el {formatearFechaLarga(reporteHistoricoSeleccionado.fecha_emision.slice(0, 10))})
              </span>
              {auditoriaActual?.tieneCambios ? (
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-900 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>
                    {auditoriaActual.totalModificados + auditoriaActual.totalEliminados + auditoriaActual.totalAgregados} cambios posteriores detectados
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Sin alteraciones (Íntegro)</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="apple-segmented-group p-0.5 bg-amber-100/90">
                <button
                  type="button"
                  onClick={() => setModoAuditoriaVisor('congelado')}
                  className={`apple-segmented-item px-2.5 py-1 text-xs font-semibold ${
                    modoAuditoriaVisor === 'congelado' ? 'apple-segmented-active' : 'text-amber-900'
                  }`}
                >
                  ❄️ Vista Original Congelada
                </button>
                <button
                  type="button"
                  onClick={() => setModoAuditoriaVisor('con_auditoria')}
                  className={`apple-segmented-item px-2.5 py-1 text-xs font-semibold ${
                    modoAuditoriaVisor === 'con_auditoria' ? 'apple-segmented-active' : 'text-amber-900'
                  }`}
                >
                  🔍 Con Trazabilidad de Cambios {auditoriaActual?.tieneCambios && `(${auditoriaActual.items.length})`}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReporteHistoricoSeleccionado(null);
                  setModoModal('historial');
                }}
                className="px-3 py-1 rounded-xl bg-white border border-amber-300 font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
              >
                ← Volver al Historial
              </button>
            </div>
          </div>
        )}

        {/* Barra de Filtros Rápida Apple HIG (no-print, solo en modo generador) */}
        {modoModal === 'generador' && (
          <div className="no-print bg-white px-5 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            
            {/* Segmented Control de Modo de Reporte */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="apple-segmented-group p-0.5">
                <button
                  type="button"
                  onClick={() => handleCambioPeriodo('por_mes')}
                  className={`apple-segmented-item px-3 py-1 text-xs font-semibold focus-visible:outline-none ${periodo === 'por_mes' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  📅 Por Mes
                </button>
                <button
                  type="button"
                  onClick={() => handleCambioPeriodo('todo')}
                  className={`apple-segmented-item px-3 py-1 text-xs font-semibold focus-visible:outline-none ${periodo === 'todo' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  📜 Histórico
                </button>
                <button
                  type="button"
                  onClick={() => handleCambioPeriodo('este_ano')}
                  className={`apple-segmented-item px-2.5 py-1 text-xs font-semibold focus-visible:outline-none ${periodo === 'este_ano' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Año en Curso
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodo('personalizado')}
                  className={`apple-segmented-item px-2.5 py-1 text-xs font-semibold focus-visible:outline-none ${periodo === 'personalizado' ? 'apple-segmented-active' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Personalizado
                </button>
              </div>

              {/* Selector de Mes cuando el modo es "Por Mes" */}
              {periodo === 'por_mes' && (
                <div className="flex items-center space-x-1.5 bg-blue-50/90 border border-blue-200/80 rounded-xl px-2.5 py-1 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[11px] font-bold text-blue-800">Seleccionar Mes:</span>
                  <select
                    value={mesSeleccionado}
                    onChange={(e) => aplicarMes(e.target.value)}
                    className="bg-transparent font-bold text-blue-950 text-xs cursor-pointer focus:outline-none pr-1"
                  >
                    {mesesDisponibles.map((clave) => (
                      <option key={clave} value={clave} className="text-slate-900 font-semibold">
                        {formatearNombreMes(clave)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {periodo === 'todo' && (
                <span className="text-[11px] text-slate-500 font-medium bg-slate-100 border border-slate-200/70 px-2.5 py-1 rounded-xl">
                  Consolidado histórico de todos los períodos
                </span>
              )}

              {/* Fechas personalizadas si está activo */}
              {periodo === 'personalizado' && (
                <div className="flex items-center space-x-2 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Del:</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="px-1.5 py-0.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                  />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Al:</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="px-1.5 py-0.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Toggles de Secciones a Imprimir */}
            <div className="flex items-center space-x-2.5 text-slate-600 text-xs font-medium">
              {(periodo === 'todo' || periodo === 'este_ano') && (
                <label className="flex items-center space-x-1 cursor-pointer select-none text-blue-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={incluirResumenMensual}
                    onChange={(e) => setIncluirResumenMensual(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Tabla por Mes</span>
                </label>
              )}
              <label className="flex items-center space-x-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={incluirIngresos}
                  onChange={(e) => setIncluirIngresos(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>Entradas</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={incluirGastos}
                  onChange={(e) => setIncluirGastos(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>Gastos</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={incluirProyectos}
                  onChange={(e) => setIncluirProyectos(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>Proyectos</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer select-none text-indigo-700 font-semibold">
                <input
                  type="checkbox"
                  checked={incluirLibroCaja}
                  onChange={(e) => setIncluirLibroCaja(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Libro Diario</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer select-none text-sky-700 font-semibold">
                <input
                  type="checkbox"
                  checked={incluirAnexos}
                  onChange={(e) => setIncluirAnexos(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-0"
                />
                <span>Anexos ({gastosConComprobante.length})</span>
              </label>
            </div>

          </div>
        )}

        {/* VISTA 1: LISTADO DE REPORTES HISTÓRICOS EMITIDOS */}
        {modoModal === 'historial' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-[#F9F9FB] font-sans">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <History className="w-5 h-5 text-blue-600" />
                    <span>Historial de Reportes Oficiales Emitidos</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Registro inmutable de informes archivados. Cada emisión guarda un snapshot fiel. Si algún movimiento fue modificado con posterioridad en caja, el sistema de auditoría lo detecta y muestra el antes y después al reimprimir.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setReporteHistoricoSeleccionado(null);
                    setModoModal('generador');
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex-shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ Generar Nuevo Informe</span>
                </button>
              </div>

              {reportesHistoricos.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200/60">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Aún no hay reportes guardados en el historial</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Al imprimir o hacer clic en "Guardar en Historial", se archivará una copia completa de todos los datos para su posterior reimpresión y auditoría de cambios.
                  </p>
                  <button
                    onClick={() => {
                      setReporteHistoricoSeleccionado(null);
                      setModoModal('generador');
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-sm"
                  >
                    Generar primer informe
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reportesHistoricos.map((rep) => {
                    const audit = storageService.auditarReporteHistorico(rep, transacciones);
                    const fechaStr = formatearFechaLarga(rep.fecha_emision.slice(0, 10));

                    return (
                      <div 
                        key={rep.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200/70 px-2 py-0.5 rounded-md">
                              {rep.folio}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {rep.periodo_descripcion}
                            </span>

                            {/* Badge de Integridad Contable */}
                            {!audit.tieneCambios ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Íntegro (Sin modificaciones)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>
                                  {audit.totalModificados + audit.totalEliminados + audit.totalAgregados} cambios posteriores
                                  {Math.abs(audit.diferenciaBalanceNeto) > 0.01 && ` (Δ ${formatearMoneda(audit.diferenciaBalanceNeto)})`}
                                </span>
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span><strong>Emisión:</strong> {fechaStr}</span>
                            <span>•</span>
                            <span><strong>Movimientos originales:</strong> {rep.movimientos_snapshot?.length || 0}</span>
                            <span>•</span>
                            <span><strong>Iglesia:</strong> {rep.nombre_iglesia}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                            <span className="text-emerald-700 font-semibold">
                              Entradas: <strong>+{formatearMoneda(rep.totales?.totalEntradasCaja || 0)}</strong>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-rose-700 font-semibold">
                              Gastos: <strong>-{formatearMoneda(rep.totales?.totalGastosCaja || 0)}</strong>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className={`font-bold ${((rep.totales?.balanceNetoCaja ?? 0) >= 0) ? 'text-slate-900' : 'text-rose-600'}`}>
                              Balance: {formatearMoneda(rep.totales?.balanceNetoCaja || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              setReporteHistoricoSeleccionado(rep);
                              setModoAuditoriaVisor(audit.tieneCambios ? 'con_auditoria' : 'congelado');
                              setModoModal('visor_historico');
                            }}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Re-imprimir / Ver</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`¿Seguro que deseas eliminar el reporte con folio ${rep.folio} del historial?`)) {
                                await storageService.eliminarReporteHistorico(rep.id);
                                setReportesHistoricos(storageService.getReportesHistoricos());
                              }
                            }}
                            title="Eliminar este reporte del historial"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: CUERPO DEL INFORME OFICIAL (ÁREA IMPRIMIBLE / HOJA BLANCA) */}
        {modoModal !== 'historial' && (
        <div id="reporte-imprimible" className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
          
          {/* 1. ENCABEZADO INSTITUCIONAL MINIMALISTA APPLE HIG */}
          <div className="border-b border-slate-200/90 pb-4 mb-5 print-break-inside-avoid break-inside-avoid">
            <div id="reporte-membrete-tabla" className="flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-4">
              
              <div id="reporte-membrete-col-izq" className="flex items-center space-x-3.5">
                {/* Logo personalizable */}
                <div className="relative group/logo flex-shrink-0">
                  <input
                    type="file"
                    ref={fileInputLogoRef}
                    onChange={handleSubirLogo}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputLogoRef.current?.click()}
                    title="Clic para cambiar logo de la iglesia"
                    className="relative block rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {logoIglesia ? (
                      <img
                        src={logoIglesia}
                        alt={`Logo de ${nombreIglesia}`}
                        className="w-12 h-12 object-contain bg-white rounded-xl border border-slate-200/80 p-0.5 shadow-2xs"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-2xs">
                        <Landmark className="w-6 h-6 text-amber-400" />
                      </div>
                    )}
                    {/* Overlay al hacer hover (no-print) */}
                    <div className="no-print absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded-xl text-white">
                      <Camera className="w-4 h-4" />
                    </div>
                  </button>
                  {logoIglesia && (
                    <button
                      type="button"
                      onClick={handleQuitarLogo}
                      title="Quitar logo personalizado y restaurar ícono"
                      className="no-print absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center text-[9px] shadow-sm"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Nombre personalizable y versículo (subtítulo eliminado) */}
                <div className="min-w-0">
                  {editandoNombre ? (
                    <div className="flex items-center space-x-1.5 mb-0.5">
                      <input
                        type="text"
                        value={tempNombre}
                        onChange={(e) => setTempNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGuardarNombre();
                          if (e.key === 'Escape') setEditandoNombre(false);
                        }}
                        autoFocus
                        className="text-base sm:text-lg font-black tracking-tight text-slate-900 border-b-2 border-blue-600 bg-blue-50/50 px-1 py-0.5 outline-none rounded-t"
                      />
                      <button
                        type="button"
                        onClick={handleGuardarNombre}
                        className="p-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-xs shadow-2xs"
                        title="Guardar nombre"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoNombre(false)}
                        className="p-1 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300 text-xs"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="group/nombre flex items-center space-x-1.5">
                      <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-950 leading-tight">
                        {nombreIglesia}
                      </h1>
                      <button
                        type="button"
                        onClick={() => {
                          setTempNombre(nombreIglesia);
                          setEditandoNombre(true);
                        }}
                        title="Personalizar nombre de la iglesia"
                        className="no-print opacity-0 group-hover/nombre:opacity-100 hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 rounded-md focus-visible:opacity-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Versículo bíblico preservado */}
                  <p className="text-[11px] sm:text-xs text-slate-500 italic mt-0.5">
                    "Cuentas claras y transparentes para la edificación de la obra de Dios" (2 Corintios 8:21)
                  </p>
                </div>
              </div>

              {/* Caja de Folio y Fechas Minimalista */}
              <div id="reporte-membrete-col-der" className="text-left sm:text-right bg-slate-50/80 border border-slate-200/70 rounded-xl px-3.5 py-2 sm:min-w-[220px]">
                <div className="flex sm:justify-end items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Folio:</span>
                  <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded font-mono">
                    {folioActivo}
                  </span>
                </div>
                {modoModal === 'visor_historico' && (
                  <div className="mb-1">
                    {modoAuditoriaVisor === 'con_auditoria' && auditoriaActual?.tieneCambios ? (
                      <span className="inline-block text-[9px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                        Re-impresión con Auditoría
                      </span>
                    ) : (
                      <span className="inline-block text-[9px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
                        Re-impresión Fiel
                      </span>
                    )}
                  </div>
                )}
                <div className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Emisión:</span> {formatearFechaLarga(fechaEmisionActiva.toISOString().slice(0, 10))}
                </div>
                <div className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Período:</span> {periodoDescripcionActiva}
                </div>
              </div>

            </div>
          </div>

          {/* 2. RESUMEN EJECUTIVO (4 TARJETAS CLAVE) */}
          <div className="mb-6 print-break-inside-avoid break-inside-avoid">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Resumen Ejecutivo de Tesorería (Sincronizado con Caja General)</span>
              </h2>

              {modoModal === 'visor_historico' && modoAuditoriaVisor === 'con_auditoria' && auditoriaActual?.tieneCambios && (
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                  ⚠️ Mostrando libros actualizados con {auditoriaActual.items.length} modificaciones posteriores
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
              
              {/* Card 1: Entradas a Caja General */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span className="text-emerald-800 font-bold">Entradas Caja General</span>
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  +{formatearMoneda(totalEntradasMostrar)}
                </div>
                {modoModal === 'visor_historico' && modoAuditoriaVisor === 'con_auditoria' && auditoriaActual && Math.abs(auditoriaActual.diferenciaEntradas) > 0.01 && (
                  <div className="text-[10px] text-amber-800 font-bold mt-0.5">
                    Original: +{formatearMoneda(reporteHistoricoSeleccionado?.totales?.totalEntradasCaja || 0)}
                  </div>
                )}
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  Ofrendas: <strong className="text-emerald-700">{formatearMoneda(totalOfrendasMostrar)}</strong> • Diezmos: <strong className="text-indigo-700">{formatearMoneda(totalDiezmosMostrar)}</strong>
                </div>
                <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  {entradasAMostrar.length} ingresos operativos
                </div>
              </div>

              {/* Card 2: Total Egresos */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span className="text-rose-800 font-bold">Total Egresos</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  -{formatearMoneda(totalGastosMostrar)}
                </div>
                {modoModal === 'visor_historico' && modoAuditoriaVisor === 'con_auditoria' && auditoriaActual && Math.abs(auditoriaActual.diferenciaGastos) > 0.01 && (
                  <div className="text-[10px] text-rose-800 font-bold mt-0.5">
                    Original: -{formatearMoneda(reporteHistoricoSeleccionado?.totales?.totalGastosCaja || 0)}
                  </div>
                )}
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  Gastos de operación eclesiástica
                </div>
                <div className="text-[10px] text-rose-700 font-bold mt-0.5">
                  {gastosAMostrar.length} pagos realizados
                </div>
              </div>

              {/* Card 3: Fondo en Caja General */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                  <span>Balance Neto en Caja</span>
                  <span className={`w-2 h-2 rounded-full ${balanceNetoMostrar >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                </div>
                <div className={`text-xl sm:text-2xl font-black tracking-tight ${balanceNetoMostrar >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatearMoneda(balanceNetoMostrar)}
                </div>
                {modoModal === 'visor_historico' && modoAuditoriaVisor === 'con_auditoria' && auditoriaActual?.tieneCambios && (
                  <div className="text-[10px] text-amber-300 font-bold mt-1 pt-1 border-t border-slate-800">
                    Original emitido: {formatearMoneda(auditoriaActual.balanceOriginal)}
                    <span className="block text-[9px] text-slate-300">
                      Variación: {auditoriaActual.diferenciaBalanceNeto >= 0 ? '+' : ''}{formatearMoneda(auditoriaActual.diferenciaBalanceNeto)}
                    </span>
                  </div>
                )}
                <div className="text-[10px] text-slate-300 mt-1 font-medium">
                  {balanceNetoMostrar >= 0 ? 'Superávit disponible al cierre' : 'Déficit del período'}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Idéntico al Libro de Caja General
                </div>
              </div>

              {/* Card 4: Fondo Proyectos Pactados */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span className="text-indigo-800 font-bold">Fondo Proyectos</span>
                  <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">
                  {formatearMoneda(totalRecaudadoProyectosMostrar)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  Meta global: <strong className="text-slate-800">{formatearMoneda(totalMetaProyectosMostrar)}</strong>
                </div>
                <div className="text-[10px] text-indigo-700 font-bold mt-0.5">
                  Fondo restringido independiente
                </div>
              </div>

            </div>

            {/* 2.1 ESTRUCTURA DE INGRESOS Y EGRESOS (SIMPLE DE EXPLICAR) */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 text-xs">
              
              {/* Bloque Izquierdo: Origen de las Entradas */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200">
                    <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Origen de Entradas a Caja</span>
                    </span>
                    <span className="text-emerald-700 font-black tabular-nums">+{formatearMoneda(totalEntradasCaja)}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-emerald-800">Ofrendas Generales:</span>
                      <span className="font-bold tabular-nums">{formatearMoneda(totalOfrendas)} <span className="text-slate-400 font-normal">({pctOfrendas}%)</span></span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <div className="flex items-center space-x-1">
                        <span className="font-semibold text-indigo-800">Diezmos de Congregación:</span>
                        <span className="text-[10px] text-slate-400 italic">(Confidencial)</span>
                      </div>
                      <span className="font-bold tabular-nums">{formatearMoneda(totalDiezmos)} <span className="text-slate-400 font-normal">({pctDiezmos}%)</span></span>
                    </div>
                    {totalOtrosIngresos > 0 && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-semibold text-slate-600">Otros Ingresos Operativos:</span>
                        <span className="font-bold tabular-nums">{formatearMoneda(totalOtrosIngresos)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/70 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Cultos Miércoles:</span>
                    <strong className="text-slate-900 tabular-nums">{formatearMoneda(entradasMiercoles)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Cultos Dominicales:</span>
                    <strong className="text-slate-900 tabular-nums">{formatearMoneda(entradasDomingo)}</strong>
                  </div>
                </div>
              </div>

              {/* Bloque Derecho: Destino de los Gastos */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200">
                    <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Destino de Gastos Operativos</span>
                    </span>
                    <span className="text-rose-700 font-black tabular-nums">-{formatearMoneda(totalGastosCaja)}</span>
                  </div>

                  {gastosPorCategoria.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 italic text-[11px]">
                      No se registraron egresos en el período seleccionado.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {gastosPorCategoria.slice(0, 4).map((g) => (
                        <div key={g.categoria} className="flex items-center justify-between text-slate-700">
                          <span className="font-medium truncate max-w-[200px]">{g.categoria}:</span>
                          <span className="font-bold tabular-nums text-slate-900">
                            -{formatearMoneda(g.total)} <span className="text-slate-400 font-normal">({g.porcentaje}%)</span>
                          </span>
                        </div>
                      ))}
                      {gastosPorCategoria.length > 4 && (
                        <div className="flex items-center justify-between text-slate-500 text-[11px] pt-0.5">
                          <span>Otros ({gastosPorCategoria.length - 4} rubros adicionales):</span>
                          <span className="font-semibold tabular-nums">
                            -{formatearMoneda(gastosPorCategoria.slice(4).reduce((acc, c) => acc + c.total, 0))}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/70 text-[11px] text-slate-500 flex justify-between items-center">
                  <span>{gastosCaja.length} comprobantes y pagos</span>
                  <span className="text-slate-700 font-bold">100% auditado</span>
                </div>
              </div>

            </div>

            {/* Síntesis Ejecutiva en Lenguaje Claro (Simple de Explicar a la Congregación) */}
            <div className="mt-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-blue-950">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                <span className="font-extrabold uppercase tracking-wider text-[10px] text-blue-800 block">
                  Lectura Ejecutiva para la Congregación
                </span>
                <p className="text-slate-700 leading-relaxed text-xs">
                  En el período evaluado (<strong>{periodo === 'por_mes' ? `Mes de ${formatearNombreMes(mesSeleccionado)}` : periodo === 'todo' ? 'Histórico Consolidado' : `${formatearFechaCorta(fechaDesde)} al ${formatearFechaCorta(fechaHasta)}`}</strong>), la congregación administró ingresos totales por <strong>+{formatearMoneda(totalEntradasCaja)}</strong> (ofrendas y diezmos confidenciales) y egresos operativos por <strong>-{formatearMoneda(totalGastosCaja)}</strong>, generando un balance neto {balanceNetoCaja >= 0 ? <span className="text-emerald-700 font-black">favorable (superávit de {formatearMoneda(balanceNetoCaja)})</span> : <span className="text-rose-700 font-black">con déficit temporal de {formatearMoneda(balanceNetoCaja)}</span>}. Asimismo, el fondo restringido de proyectos suma <strong>{formatearMoneda(totalRecaudadoProyectos)}</strong> destinados a sus obras respectivas.
                </p>
              </div>
            </div>

          </div>

          {/* TABLA: REPORTE DE ENTRADAS Y GASTOS MES A MES (CUANDO SE CONSULTA EL TOTAL GENERAL) */}
          {(periodo === 'todo' || periodo === 'este_ano') && incluirResumenMensual && (
            <div className="mb-8 print-break-inside-avoid break-inside-avoid">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 flex items-center space-x-1.5">
                    <span>Reporte Consolidado de Entradas y Gastos Mes a Mes</span>
                  </h3>
                </div>
                <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  {mesesAMostrar.length} Meses Auditados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Mes / Período</th>
                      <th className="py-2.5 px-3 text-right text-emerald-800">Ofrendas</th>
                      <th className="py-2.5 px-3 text-right text-indigo-800">Diezmos</th>
                      <th className="py-2.5 px-3 text-right font-bold text-emerald-700">Total Entradas (+)</th>
                      <th className="py-2.5 px-3 text-right font-bold text-rose-700">Gastos (-)</th>
                      <th className="py-2.5 px-3 text-right">Balance Neto</th>
                      <th className="py-2.5 px-3 text-right font-black">Saldo al Cierre</th>
                      <th className="py-2.5 px-3 text-center">Movs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {mesesAMostrar.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-slate-400 italic">
                          No hay movimientos registrados.
                        </td>
                      </tr>
                    ) : (
                      mesesAMostrar.map((m) => (
                        <tr key={m.claveMes} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {m.nombreMes}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 font-semibold">
                            +{formatearMoneda(m.totalOfrendas)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-indigo-700 font-semibold">
                            +{formatearMoneda(m.totalDiezmos)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 font-bold">
                            +{formatearMoneda(m.totalIngresos)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-rose-700 font-bold">
                            -{formatearMoneda(m.totalGastos)}
                          </td>
                          <td className={`py-2.5 px-3 text-right tabular-nums font-bold ${
                            m.flujoNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {m.flujoNeto >= 0 ? '+' : ''}{formatearMoneda(m.flujoNeto)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-black text-slate-950">
                            {formatearMoneda(m.saldoFinal)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-semibold text-[11px]">
                            {m.cantidadMovimientos}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {mesesAMostrar.length > 0 && (
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black text-xs">
                      <tr>
                        <td className="py-2.5 px-3 text-slate-900 uppercase">Total Consolidado</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-emerald-800">
                          +{formatearMoneda(mesesAMostrar.reduce((acc, m) => acc + m.totalOfrendas, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-indigo-800">
                          +{formatearMoneda(mesesAMostrar.reduce((acc, m) => acc + m.totalDiezmos, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-emerald-800">
                          +{formatearMoneda(mesesAMostrar.reduce((acc, m) => acc + m.totalIngresos, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-rose-800">
                          -{formatearMoneda(mesesAMostrar.reduce((acc, m) => acc + m.totalGastos, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          {formatearMoneda(mesesAMostrar.reduce((acc, m) => acc + m.flujoNeto, 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-blue-900 font-extrabold text-sm">
                          {formatearMoneda(mesesAMostrar[mesesAMostrar.length - 1]?.saldoFinal ?? 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">
                          {mesesAMostrar.reduce((acc, m) => acc + m.cantidadMovimientos, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* 3. SECCIÓN 1: DETALLE DE ENTRADAS A CAJA GENERAL (OFRENDAS Y DIEZMOS) */}
          {incluirIngresos && (
            <div className="mb-8">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300 print-break-inside-avoid break-inside-avoid">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    1. Detalle Cronológico de Entradas de Caja General (Ofrendas & Diezmos)
                  </h3>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Subtotal: +{formatearMoneda(totalEntradasMostrar)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Fecha</th>
                      <th className="py-2 px-2.5">Culto / Servicio</th>
                      <th className="py-2 px-2.5">Clasificación</th>
                      <th className="py-2 px-2.5">Hermano / Donante</th>
                      <th className="py-2 px-2.5">Concepto / Destino</th>
                      <th className="py-2 px-2.5">Método</th>
                      <th className="py-2 px-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {entradasAMostrar.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                          No se registraron entradas de caja en el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      entradasAMostrar.map(renderFilaEntrada)
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={6} className="py-2 px-2.5 text-right uppercase text-[10px] text-slate-600">
                        Total Entradas Caja ({entradasAMostrar.length} capturas):
                      </td>
                      <td className="py-2 px-2.5 text-right text-emerald-700 font-black text-xs">
                        +{formatearMoneda(totalEntradasMostrar)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 4. SECCIÓN 2: DETALLE DE GASTOS OPERATIVOS */}
          {incluirGastos && (
            <div className="mb-8">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300 print-break-inside-avoid break-inside-avoid">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    2. Detalle Cronológico de Egresos & Gastos Operativos
                  </h3>
                </div>
                <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  Subtotal: -{formatearMoneda(totalGastosMostrar)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Fecha</th>
                      <th className="py-2 px-2.5">Categoría Operativa</th>
                      <th className="py-2 px-2.5">Concepto / Proveedor / Motivo</th>
                      <th className="py-2 px-2.5">Método</th>
                      <th className="py-2 px-2.5">Evidencia</th>
                      <th className="py-2 px-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {gastosAMostrar.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                          No se registraron gastos en el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      gastosAMostrar.map(renderFilaGasto)
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="py-2 px-2.5 text-right uppercase text-[10px] text-slate-600">
                        Total Egresos ({gastosAMostrar.length} movimientos):
                      </td>
                      <td className="py-2 px-2.5 text-right text-rose-700 font-black text-xs">
                        -{formatearMoneda(totalGastosMostrar)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 5. SECCIÓN 3: ESTADO DE PROYECTOS PACTADOS (FONDO INDEPENDIENTE) */}
          {incluirProyectos && (
            <div className="mb-8">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300 print-break-inside-avoid break-inside-avoid">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    3. Rendición y Estado de Proyectos Pactados (Fondo Independiente)
                  </h3>
                </div>
                <span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  Fondo Recaudado: {formatearMoneda(totalRecaudadoProyectos)}
                </span>
              </div>

              {/* Proyectos Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 print-break-inside-avoid break-inside-avoid">
                {proyectos.map(p => {
                  const pct = Math.min(100, Math.round((p.total_recaudado / (p.meta_total || 1)) * 100));
                  const saldoRestante = Math.max(0, p.meta_total - p.total_recaudado);
                  return (
                    <div key={p.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-extrabold text-xs text-slate-900">{p.nombre}</span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                          {pct}% cumplido
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="grid grid-cols-3 text-[10px] text-slate-600 font-medium">
                        <div>Meta: <strong className="text-slate-900">{formatearMoneda(p.meta_total)}</strong></div>
                        <div>Recaudado: <strong className="text-emerald-700">{formatearMoneda(p.total_recaudado)}</strong></div>
                        <div>Restante: <strong className="text-rose-700">{formatearMoneda(saldoRestante)}</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sub-tabla: Aportes Registrados a Proyectos en el Período */}
              {aportesPactosFiltrados.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-indigo-900 mb-1.5 flex items-center justify-between">
                    <span>Aportes Recaudados para Proyectos en este Período ({aportesPactosFiltrados.length} recibos):</span>
                    <span className="text-emerald-700 font-black text-xs">+{formatearMoneda(totalAportesPactosPeriodo)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 mb-4">
                      <thead className="bg-indigo-50 text-indigo-900 font-bold uppercase tracking-wider text-[10px] border-b border-indigo-200">
                        <tr>
                          <th className="py-1.5 px-2.5">Fecha</th>
                          <th className="py-1.5 px-2.5">Proyecto</th>
                          <th className="py-1.5 px-2.5">Hermano / Donante</th>
                          <th className="py-1.5 px-2.5">Concepto</th>
                          <th className="py-1.5 px-2.5">Método</th>
                          <th className="py-1.5 px-2.5 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {aportesPactosFiltrados.map((ap) => (
                          <tr key={ap.id} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5 whitespace-nowrap font-bold text-slate-900">
                              {formatearFechaCorta(ap.fecha)}
                            </td>
                            <td className="py-1.5 px-2.5 text-indigo-900 font-semibold">
                              {ap.proyecto_nombre || 'Proyecto Especial'}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-800 font-medium">
                              {ap.miembro_nombre}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600">
                              {ap.concepto}
                            </td>
                            <td className="py-1.5 px-2.5 capitalize text-slate-500">
                              {ap.metodo_pago}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-black text-emerald-700 whitespace-nowrap">
                              +{formatearMoneda(ap.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detalle Individual de Hermanos Pactantes */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Hermano / Pactante</th>
                      <th className="py-2 px-2.5">Proyecto Asignado</th>
                      <th className="py-2 px-2.5 text-right">Compromiso Total</th>
                      <th className="py-2 px-2.5 text-right">Cuota Semanal</th>
                      <th className="py-2 px-2.5 text-right">Total Aportado</th>
                      <th className="py-2 px-2.5 text-right">Saldo Pendiente</th>
                      <th className="py-2 px-2.5 text-center">Avance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pactos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                          No hay pactantes registrados en el sistema.
                        </td>
                      </tr>
                    ) : (
                      pactos.map((pct) => {
                        const porcentaje = Math.min(100, Math.round(((pct.total_aportado || 0) / (pct.monto_total_pactado || 1)) * 100));
                        return (
                          <tr key={pct.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 font-bold text-slate-900 whitespace-nowrap">
                              {pct.miembro_nombre}
                            </td>
                            <td className="py-2 px-2.5 text-indigo-900 font-semibold">
                              {pct.proyecto_nombre}
                            </td>
                            <td className="py-2 px-2.5 text-right font-medium text-slate-700 whitespace-nowrap">
                              {formatearMoneda(pct.monto_total_pactado)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-medium text-slate-600 whitespace-nowrap">
                              {formatearMoneda(pct.cuota_semanal)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                              {formatearMoneda(pct.total_aportado)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-rose-700 whitespace-nowrap">
                              {formatearMoneda(pct.saldo_pendiente)}
                            </td>
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                porcentaje >= 100 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : porcentaje >= 50 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-amber-100 text-amber-800'
                              }`}>
                                {porcentaje}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-2 px-2.5 text-right uppercase text-[10px] text-slate-600">
                        Totales Pactos ({pactos.length} hermanos):
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-900 font-black text-xs">
                        {formatearMoneda(totalPactadoMiembros)}
                      </td>
                      <td className="py-2 px-2.5"></td>
                      <td className="py-2 px-2.5 text-right text-emerald-700 font-black text-xs">
                        {formatearMoneda(totalAportadoMiembros)}
                      </td>
                      <td className="py-2 px-2.5 text-right text-rose-700 font-black text-xs">
                        {formatearMoneda(Math.max(0, totalPactadoMiembros - totalAportadoMiembros))}
                      </td>
                      <td className="py-2 px-2.5"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 6. SECCIÓN 4 (OPCIONAL): LIBRO DIARIO DE CAJA GENERAL CON SALDO EN CADA MOVIMIENTO */}
          {incluirLibroCaja && (
            <div className="mb-8">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300 print-break-inside-avoid break-inside-avoid">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    4. Libro Diario de Caja General (Movimientos con Saldo en Caja)
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
                  Balance Cierre: {formatearMoneda(balanceNetoCaja)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Fecha</th>
                      <th className="py-2 px-2.5">Tipo</th>
                      <th className="py-2 px-2.5">Categoría / Concepto</th>
                      <th className="py-2 px-2.5">Hermano / Donante / Proveedor</th>
                      <th className="py-2 px-2.5">Método</th>
                      <th className="py-2 px-2.5 text-right">Monto</th>
                      <th className="py-2 px-2.5 text-right font-black">Saldo en Caja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {transaccionesCajaFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                          No se encontraron movimientos en Caja General para el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      transaccionesCajaFiltradas.map((t) => {
                        const saldoMov = mapaSaldosCaja.get(t.id) ?? 0;
                        return (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 whitespace-nowrap font-bold text-slate-900">
                              {formatearFechaCorta(t.fecha)}
                            </td>
                            <td className="py-2 px-2.5 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {t.tipo === 'ingreso' ? '+ Entrada' : '- Gasto'}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-slate-800">
                              <span className="font-semibold block">{esDiezmoTransaccion(t) ? 'Diezmo General' : t.categoria}</span>
                              <span className="text-slate-500 text-[11px] block">
                                {esDiezmoTransaccion(t) ? 'Diezmo General' : t.concepto}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-slate-700">
                              {esDiezmoTransaccion(t) ? (
                                <span className="text-slate-400 italic font-semibold">Confidencial</span>
                              ) : (
                                t.miembro_nombre || (t.tipo === 'ingreso' ? 'Ofrenda Colectiva' : 'Proveedor')
                              )}
                            </td>
                            <td className="py-2 px-2.5 whitespace-nowrap capitalize text-slate-500">
                              {t.metodo_pago}
                            </td>
                            <td className={`py-2 px-2.5 text-right font-bold whitespace-nowrap ${
                              t.tipo === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              {t.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(t.monto)}
                            </td>
                            <td className={`py-2 px-2.5 text-right font-black whitespace-nowrap ${
                              saldoMov >= 0 ? 'text-slate-950' : 'text-rose-600'
                            }`}>
                              {formatearMoneda(saldoMov)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="py-2 px-2.5 text-right uppercase text-[10px] text-slate-600">
                        Total Entradas: +{formatearMoneda(totalEntradasCaja)} | Total Gastos: -{formatearMoneda(totalGastosCaja)}
                      </td>
                      <td className="py-2 px-2.5 text-right text-xs uppercase font-extrabold text-slate-800">
                        Saldo:
                      </td>
                      <td className={`py-2 px-2.5 text-right font-black text-xs ${
                        balanceNetoCaja >= 0 ? 'text-slate-950' : 'text-rose-600'
                      }`}>
                        {formatearMoneda(balanceNetoCaja)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 6. ANEXO DOCUMENTAL: COMPROBANTES Y FACTURAS DE EGRESOS FISCALES */}
          {incluirAnexos && gastosConComprobante.length > 0 && (
            <div className="mb-8 pt-4">
              <div className="flex items-center justify-between pb-2 mb-4 border-b-2 border-slate-900 print-break-inside-avoid break-inside-avoid">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xs">
                    A
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-950">
                      Anexo Documental: Comprobantes & Evidencias Digitales de Gastos
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Respaldo documental fiscal y facturas en Cloudflare R2 ({gastosConComprobante.length} comprobantes identificados)
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-sky-800 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
                  {gastosConComprobante.length} {gastosConComprobante.length === 1 ? 'Comprobante' : 'Comprobantes'}
                </span>
              </div>

              {/* Cuadrícula de Comprobantes con Identificación Completa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                {gastosConComprobante.map((g, idx) => {
                  const numAnexo = idx + 1;
                  const esPdf = g.evidencia_url?.toLowerCase().includes('.pdf') || 
                                g.evidencia_url?.startsWith('data:application/pdf') || 
                                g.evidencia_tipo === 'application/pdf';

                  return (
                    <div
                      key={g.id}
                      className="border-2 border-slate-200 rounded-2xl p-4 bg-white shadow-2xs print:border-slate-300 print:shadow-none print-break-inside-avoid break-inside-avoid flex flex-col justify-between"
                    >
                      {/* Cabecera del Anexo Identificado */}
                      <div>
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-sky-700 text-white shadow-2xs">
                              ANEXO #{numAnexo}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {formatearFechaCorta(g.fecha)}
                            </span>
                          </div>
                          <span className="text-sm font-black text-rose-700 tabular-nums">
                            -{formatearMoneda(g.monto)}
                          </span>
                        </div>

                        {/* Ficha de Identificación del Gasto */}
                        <div className="bg-slate-50 rounded-xl p-2.5 space-y-1 text-xs border border-slate-100 mb-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Categoría:</span>
                            <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">{g.categoria}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Concepto / Motivo:</span>
                            <span className="font-medium text-slate-700 text-right truncate max-w-[200px]">{g.concepto}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Método:</span>
                            <span className="font-semibold text-slate-600 capitalize">{g.metodo_pago}</span>
                          </div>
                          {g.evidencia_nombre && (
                            <div className="flex items-baseline justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Archivo:</span>
                              <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]">{g.evidencia_nombre}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Visualización del Comprobante / Imagen o PDF */}
                      <div className="mt-auto pt-2 border-t border-slate-100">
                        {esPdf ? (
                          <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {g.evidencia_nombre || 'Comprobante Fiscal en PDF'}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Documento PDF digital archivado en Cloudflare R2
                              </p>
                            </div>
                            {onVerEvidencia && g.evidencia_url && (
                              <button
                                type="button"
                                onClick={() => onVerEvidencia(g.evidencia_url!, g.evidencia_nombre)}
                                className="no-print px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-50 text-rose-700 border border-rose-300 rounded-lg shadow-2xs"
                              >
                                Abrir PDF
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-center min-h-[160px] max-h-[260px] overflow-hidden">
                            <img
                              src={g.evidencia_url}
                              alt={`Comprobante de ${g.concepto}`}
                              className="max-h-[240px] w-auto max-w-full object-contain rounded-lg shadow-2xs bg-white cursor-pointer hover:scale-[1.02] transition-transform"
                              onClick={() => onVerEvidencia?.(g.evidencia_url!, g.evidencia_nombre)}
                              loading="eager"
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6.5 ANEXO DE AUDITORÍA: TRAZABILIDAD DE MODIFICACIONES POSTERIORES (SECCIÓN IMPRIMIBLE) */}
          {reporteHistoricoSeleccionado && modoAuditoriaVisor === 'con_auditoria' && auditoriaActual?.tieneCambios && (
            <div className="mb-8 p-5 bg-amber-50/70 border-2 border-amber-300 rounded-3xl print-break-inside-avoid break-inside-avoid">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-amber-200 gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-amber-950">
                      Anexo de Auditoría: Trazabilidad de Modificaciones Posteriores
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      Constancia formal de alteraciones contables registradas con posterioridad a la emisión del reporte original (Folio {reporteHistoricoSeleccionado.folio} emitido el {formatearFechaLarga(reporteHistoricoSeleccionado.fecha_emision.slice(0, 10))})
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-950 bg-amber-200/80 px-3 py-1 rounded-full border border-amber-300 self-start sm:self-auto">
                  {auditoriaActual.items.length} alteraciones auditadas
                </span>
              </div>

              {/* Cuadro de Variación Contable */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
                <div className="bg-white p-3.5 rounded-2xl border border-amber-200">
                  <span className="text-slate-500 font-medium block text-[11px]">Balance Original Emitido:</span>
                  <span className="text-lg font-black text-slate-900 tabular-nums">
                    {formatearMoneda(auditoriaActual.balanceOriginal)}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-amber-200">
                  <span className="text-slate-500 font-medium block text-[11px]">Variación Posterior Neta:</span>
                  <span className={`text-lg font-black tabular-nums ${auditoriaActual.diferenciaBalanceNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {auditoriaActual.diferenciaBalanceNeto >= 0 ? '+' : ''}{formatearMoneda(auditoriaActual.diferenciaBalanceNeto)}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-amber-200">
                  <span className="text-slate-500 font-medium block text-[11px]">Balance Actualizado en Libros:</span>
                  <span className="text-lg font-black text-slate-900 tabular-nums">
                    {formatearMoneda(auditoriaActual.balanceActualizado)}
                  </span>
                </div>
              </div>

              {/* Tabla detallada de movimientos alterados */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-white rounded-2xl border border-amber-200 overflow-hidden">
                  <thead className="bg-amber-100/70 text-amber-950 text-[10px] uppercase font-bold tracking-wider border-b border-amber-200">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Tipo / Estado</th>
                      <th className="py-2.5 px-3">Concepto / Clasificación</th>
                      <th className="py-2.5 px-3">Valor Original</th>
                      <th className="py-2.5 px-3">Valor Actual en Libros</th>
                      <th className="py-2.5 px-3 text-right">Efecto en Caja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 font-medium text-xs">
                    {auditoriaActual.items.map((it) => (
                      <tr key={it.id} className="hover:bg-amber-50/50">
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900">
                          {it.fechaActual ? formatearFechaCorta(it.fechaActual) : it.fechaOriginal ? formatearFechaCorta(it.fechaOriginal) : '-'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            it.tipoCambio === 'modificado'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : it.tipoCambio === 'eliminado'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                          }`}>
                            {it.tipoCambio === 'modificado' ? 'Modificado' : it.tipoCambio === 'eliminado' ? 'Eliminado' : 'Añadido posterior'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">
                          <div className="font-bold text-slate-900">{it.conceptoActual || it.conceptoOriginal}</div>
                          <div className="text-[10px] text-amber-900 mt-0.5">{it.detallesCambio.join(' • ')}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap line-through">
                          {it.montoOriginal !== undefined ? formatearMoneda(it.montoOriginal) : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {it.montoActual !== undefined ? formatearMoneda(it.montoActual) : '-'}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black whitespace-nowrap ${it.diferenciaMonto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {it.diferenciaMonto >= 0 ? '+' : ''}{formatearMoneda(it.diferenciaMonto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-amber-800 italic mt-3">
                * Este anexo garantiza la transparencia y fe pública contable, dejando constancia exacta de las diferencias entre la versión emitida y el libro actual.
              </p>
            </div>
          )}

          {/* 7. SECCIÓN CERTIFICACIÓN Y FIRMAS OFICIALES DE TESORERÍA */}
          <div className="pt-8 mt-6 border-t-2 border-slate-900 print-break-inside-avoid">
            
            <p className="text-[11px] text-slate-600 text-center italic mb-10 max-w-2xl mx-auto">
              "Damos testimonio y fe de que los fondos detallados en el presente informe financiero corresponden fielmente a los ingresos recibidos en caja general, los gastos efectuados con sus correspondientes comprobantes, y los proyectos pactados bajo mayordomía eclesiástica."
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
              
              {/* Pastor Principal */}
              <div className="space-y-1">
                <div className="border-t border-slate-900 w-44 sm:w-48 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-950 uppercase tracking-tight">Pastor Principal</p>
                <p className="text-[10px] text-slate-500">Supervisión & Aprobación</p>
              </div>

              {/* Secretario General */}
              <div className="space-y-1">
                <div className="border-t border-slate-900 w-44 sm:w-48 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-950 uppercase tracking-tight">Secretario General</p>
                <p className="text-[10px] text-slate-500">Fe Pública & Actas</p>
              </div>

              {/* Tesorero General */}
              <div className="space-y-1">
                <div className="border-t border-slate-900 w-44 sm:w-48 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-950 uppercase tracking-tight">Tesorero General</p>
                <p className="text-[10px] text-slate-500">Elaboración & Control</p>
              </div>

            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              Documento Oficial emitido por el Sistema RGDev Flujo de Efectivo • Sello de Integridad Digital • Aiven PostgreSQL & Cloudflare R2
            </div>

          </div>

        </div>
        )}

      </div>

    </div>
  );
};
