// Utilidades de fecha y formato financiero adaptadas a la vida eclesiástica

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
  const [year, month, day] = fechaStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dia = date.getDay();
  if (dia === 3) return 'miercoles';
  if (dia === 0) return 'domingo';
  return 'otro';
}

export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(monto || 0);
}

export function formatearFechaCorta(fechaStr: string): string {
  if (!fechaStr) return '';
  const [year, month, day] = fechaStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatearFechaLarga(fechaStr: string): string {
  if (!fechaStr) return '';
  const [year, month, day] = fechaStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}
