export async function compressImageFile(
  file: File,
  maxDimension = 420,
  quality = 0.85
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Falha ao carregar imagem'));
      image.src = objectUrl;
    });

    const width = img.naturalWidth || img.width || maxDimension;
    const height = img.naturalHeight || img.height || maxDimension;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D indisponível');
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Não foi possível ler o arquivo de imagem.'));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler imagem.'));
      reader.readAsDataURL(file);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
