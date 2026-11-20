/**
 * Redução de imagem no navegador antes de gravar no catálogo (produto, bio-estação, preço Microgeo).
 *
 * As imagens vão para o banco como data URI e o app baixa os catálogos inteiros e os cifra em JS
 * no aparelho: uma foto de 11 MB travava o app por minutos (2026-11). Exibição real: ~120 px.
 * Mesma regra do script da API (`npm run catalog:images`): lado maior ≤ 800 px; com transparência
 * real → PNG, sem → JPEG. A API recusa data URI acima de 512 KB.
 */

export const IMAGE_MAX_SIDE = 800;
export const IMAGE_MAX_CHARS = 512 * 1024;
/**
 * Alvo: o PNG do navegador não usa paleta (uma bio-estação de 800 px com fundo transparente dá
 * ~430 KB); exibida em 96 px no app, 600 ou 400 px bastam.
 */
const IMAGE_TARGET_CHARS = 200 * 1024;
/** Parcela mínima de pixels transparentes (alfa < 240) para manter PNG. */
const MIN_TRANSPARENT_SHARE = 0.005;

export class ImageTooLargeError extends Error {
  constructor() {
    super("Imagem muito grande mesmo após a redução. Use uma imagem mais simples ou menor.");
    this.name = "ImageTooLargeError";
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

function transparentShare(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  const { data } = ctx.getImageData(0, 0, width, height);
  const step = Math.max(1, Math.floor((width * height) / 65536)); // amostra ~64 mil pixels
  let transparent = 0;
  let total = 0;
  for (let p = 0; p < width * height; p += step) {
    total++;
    if (data[p * 4 + 3] < 240) transparent++;
  }
  return total ? transparent / total : 0;
}

function render(img: HTMLImageElement, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round((img.naturalWidth || maxSide) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || maxSide) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

/** Lê o arquivo escolhido e devolve o data URI reduzido (≤ 512 KB) pronto para gravar. */
export async function fileToResizedDataUri(file: File): Promise<string> {
  const img = await loadImage(file);
  let best: string | undefined;
  for (const maxSide of [IMAGE_MAX_SIDE, 600, 400]) {
    const { canvas, ctx, width, height } = render(img, maxSide);
    const transparent = transparentShare(ctx, width, height) > MIN_TRANSPARENT_SHARE;
    let uri: string;
    if (transparent) {
      uri = canvas.toDataURL("image/png");
    } else {
      // JPEG não tem alfa: fundo branco (como nos PDFs) em vez de preto.
      const flat = document.createElement("canvas");
      flat.width = width;
      flat.height = height;
      const fctx = flat.getContext("2d")!;
      fctx.fillStyle = "#ffffff";
      fctx.fillRect(0, 0, width, height);
      fctx.drawImage(canvas, 0, 0);
      uri = flat.toDataURL("image/jpeg", 0.82);
    }
    if (uri.length <= IMAGE_TARGET_CHARS) return uri;
    if (!best || uri.length < best.length) best = uri;
  }
  if (best && best.length <= IMAGE_MAX_CHARS) return best;
  throw new ImageTooLargeError();
}
