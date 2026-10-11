// Utilidades de fecha y formato financiero adaptadas a la vida eclesiástica

/**
 * Normaliza cualquier formato de fecha (Date, ISO string con hora, timestamp o YYYY-MM-DD)
 * al formato estándar estricto 'YYYY-MM-DD'
 */
export function extraerFechaYYYYMMDD(fechaVal: any): string {
  if (!fechaVal) return new Date().toISOString().slice(0, 10);
  if (fechaVal instanceof Date) {
    if (isNaN(fechaVal.getTime())) return new Date().toISOString().slice(0, 10);
    return fechaVal.toISOString().slice(0, 10);
  }
  const str = String(fechaVal).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function getUltimoDiaSemana(targetDay: 0 | 3): string {
  // targetDay: 0 = Domingo, 3 = Miércoles
  const hoy = new Date();
  const currentDay = hoy.getDay();
  let diff = currentDay - targetDay;
  
  if (diff < 0) {
    diff += 7;
  }
  
  const targetDate = new Date(hoy);
  targetDate.setDate(hoy.getDate() - diff);
  return targetDate.toISOString().slice(0, 10);
}

export function getFechaHoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function identificarDiaSemana(fechaStr: string): 'miercoles' | 'domingo' | 'otro' {
  if (!fechaStr) return 'otro';
  const clean = extraerFechaYYYYMMDD(fechaStr);
  const [year, month, day] = clean.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return 'otro';
  const dia = date.getDay();
  if (dia === 3) return 'miercoles';
  if (dia === 0) return 'domingo';
  return 'otro';
}

export function formatearMoneda(monto: any): string {
  const num = typeof monto === 'number' ? monto : (parseFloat(String(monto)) || 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(isNaN(num) ? 0 : num);
}

export function formatearFechaCorta(fechaStr: string): string {
  if (!fechaStr) return '';
  const clean = extraerFechaYYYYMMDD(fechaStr);
  const [year, month, day] = clean.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return clean;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatearFechaLarga(fechaStr: string): string {
  if (!fechaStr) return '';
  const clean = extraerFechaYYYYMMDD(fechaStr);
  const [year, month, day] = clean.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return clean;
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}
