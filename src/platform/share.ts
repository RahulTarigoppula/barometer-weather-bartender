import { isNative } from './native';

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/** Web Share with a file on phones, a download on desktop, the system share sheet in the APK. */
export async function shareFile(blob: Blob, filename: string, title: string): Promise<ShareOutcome> {
  if (isNative()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const written = await Filesystem.writeFile({
      path: filename,
      data: await toBase64(blob),
      directory: Directory.Cache,
    });
    try {
      await Share.share({ title, files: [written.uri] });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const file = new File([blob], filename, { type: blob.type });
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (coarse && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  download(blob, filename);
  return 'downloaded';
}

export function downloadText(text: string, filename: string): void {
  download(new Blob([text], { type: 'application/json' }), filename);
}
