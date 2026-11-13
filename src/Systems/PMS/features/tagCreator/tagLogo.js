// Rasterizes the H3 logo SVG to a PNG data URL once (jsPDF can't embed SVG
// directly) and caches it so every tag reuses the same image data.
let logoPromise = null;

export function loadLogoImage() {
  if (logoPromise) return logoPromise;

  logoPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        aspect: img.naturalWidth / img.naturalHeight || 1,
      });
    };
    img.onerror = reject;
    img.src = '/H3-logo.svg';
  });

  return logoPromise;
}
