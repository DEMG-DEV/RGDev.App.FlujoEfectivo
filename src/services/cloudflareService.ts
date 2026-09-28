// Servicio de integración para Cloudflare R2 Bucket
// Soporta subida vía Cloudflare Pages Functions (/api/upload), S3 API o modo preview

export interface UploadResult {
  url: string;
  key: string;
  name: string;
  size: number;
  type: string;
  storage: 'cloudflare_r2' | 'local_preview';
}

/**
 * Comprime una imagen en el navegador antes de enviarla a Cloudflare R2
 * para optimizar ancho de banda y almacenamiento
 */
export async function comprimirImagen(file: File, maxWidth = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file; // Si es PDF o SVG no comprimir
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

/**
 * Sube la evidencia al bucket de Cloudflare R2
 */
export async function subirEvidenciaACloudflare(
  archivo: File,
  onProgreso?: (porcentaje: number) => void
): Promise<UploadResult> {
  onProgreso?.(20);

  // 1. Optimizar si es imagen
  const archivoOptimizado = await comprimirImagen(archivo);
  onProgreso?.(45);

  const formData = new FormData();
  formData.append('file', archivoOptimizado);

  try {
    // Intentar subida a la Cloudflare Pages Function
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    onProgreso?.(80);

    if (response.ok) {
      const data = await response.json();
      onProgreso?.(100);
      return {
        url: data.url,
        key: data.key,
        name: data.filename || archivo.name,
        size: data.size || archivoOptimizado.size,
        type: data.type || archivoOptimizado.type,
        storage: data.url.startsWith('data:') ? 'local_preview' : 'cloudflare_r2',
      };
    }
  } catch (error) {
    console.warn('Endpoint /api/upload no disponible (modo desarrollo local). Usando almacenamiento local.');
  }

  // Fallback seguro: lectura local como Base64 Data URL (persiste en la app)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = 50 + Math.round((e.loaded / e.total) * 50);
        onProgreso?.(pct);
      }
    };
    reader.onload = () => {
      onProgreso?.(100);
      const timestamp = Date.now();
      const sanitizedName = archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      resolve({
        url: reader.result as string,
        key: `r2_comprobantes/${timestamp}_${sanitizedName}`,
        name: archivo.name,
        size: archivoOptimizado.size,
        type: archivoOptimizado.type,
        storage: 'local_preview',
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(archivoOptimizado);
  });
}
