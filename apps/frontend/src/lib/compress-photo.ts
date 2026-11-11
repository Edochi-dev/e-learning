/** Lado mayor de la foto enviada: sobra para que la profesora vea el detalle. */
const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.85;

/**
 * Achica una foto del teléfono antes de subirla: las cámaras actuales sacan
 * fotos de 4–12 MB y el servidor acepta 5 MB. Redibujarla en un canvas además
 * descarta el EXIF, incluida la ubicación GPS de la foto.
 *
 * Si el navegador no puede decodificarla (HEIC fuera de Safari), devuelve el
 * archivo original: el servidor sabe convertir HEIC.
 */
export async function compressPhoto(file: File): Promise<File> {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
        return file;
    }
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap.close();
        return file;
    }
    // JPEG no tiene transparencia: sin fondo, un PNG transparente quedaría negro.
    ctx.fillStyle = '#fff'; // design-tokens: allow — fondo del JPEG, no de la interfaz
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}
