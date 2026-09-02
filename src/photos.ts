/**
 * Photo storage: images are resized (privacy-friendly EXIF strip via
 * re-encode) and copied into the app's documents/photos directory.
 * The database stores only filenames, never absolute paths, because the
 * app sandbox path can change between app updates.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const PHOTOS_DIR = 'photos';
const MAX_DIMENSION = 1600;

function photosDir(): Directory {
  const dir = new Directory(Paths.document, PHOTOS_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

let counter = 0;

/**
 * Ingest a picked/captured image: resize to <=1600px, re-encode JPEG,
 * store under documents/photos. Returns the stored filename.
 *
 * Build 7 rewrite: the build-6 diagnostic PDF proved the old
 * new-File-API copy silently left NO file on disk ("f:missing") even
 * though storePhoto returned success — the DB then held photo rows with
 * no backing file, breaking thumbnails and the PDF alike. This version
 * (1) writes via the battle-tested legacy FileSystem API, (2) treats the
 * manipulator resize as best-effort (falls back to copying the original
 * capture), and (3) VERIFIES the file exists before returning — if the
 * photo isn't really on disk we throw, so the UI shows "Photo failed"
 * instead of silently recording a ghost photo.
 */
export async function storePhoto(sourceUri: string): Promise<string> {
  const name = `p${Date.now()}_${counter++}.jpg`;
  const dirPath = `${LegacyFS.documentDirectory}${PHOTOS_DIR}`;
  const destPath = `${dirPath}/${name}`;
  await LegacyFS.makeDirectoryAsync(dirPath, { intermediates: true }).catch(
    () => {
      // already exists is fine; a real failure surfaces at copy/verify below
    },
  );

  // Resize/re-encode is best-effort: privacy EXIF strip + smaller file.
  // If the manipulator fails on-device, store the original capture instead.
  let source = sourceUri;
  let tempUri: string | null = null;
  try {
    const context = ImageManipulator.manipulate(sourceUri);
    const rendered = await context.resize({ width: MAX_DIMENSION }).renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
    if (saved?.uri) {
      source = saved.uri;
      tempUri = saved.uri;
    }
  } catch {
    // fall back to the original capture uri
  }

  await LegacyFS.copyAsync({ from: source, to: destPath });

  if (tempUri) {
    LegacyFS.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
  }

  // Verify-or-throw: never report success for a photo that isn't on disk.
  const info = await LegacyFS.getInfoAsync(destPath);
  if (!info.exists || ((info as any).size ?? 1) === 0) {
    throw new Error('The photo could not be saved to device storage.');
  }
  return name;
}

/**
 * Absolute uri for a stored filename (for <Image source>).
 * Built with the SAME legacy-API path construction that storePhoto writes
 * to, so display and export can never diverge from the write path.
 */
export function photoUri(filename: string): string {
  return `${LegacyFS.documentDirectory}${PHOTOS_DIR}/${filename}`;
}

export function deletePhotoFile(filename: string): void {
  try {
    const f = new File(photosDir(), filename);
    if (f.exists) f.delete();
  } catch {
    // missing file is fine
  }
}

export function deletePhotoFiles(filenames: string[]): void {
  for (const f of filenames) deletePhotoFile(f);
}

/**
 * Small base64 JPEG thumbnail for embedding in the PDF report.
 * Returns null if the photo can't be read (report proceeds without it).
 */
export interface ThumbResult {
  b64: string | null;
  /** Compact diagnostic trail — which methods ran and how they failed. */
  diag: string;
}

/**
 * Base64 JPEG for embedding in the PDF report. Tries three methods in order:
 * 1) 240px re-encode via expo-image-manipulator (small file, preferred)
 * 2) direct read of the stored JPEG via the new File API
 * 3) direct read via the legacy FileSystem API
 * The stored photo is already <=1600px re-encoded at ingest, so 2/3 are
 * correct, just heavier. Returns a diagnostic trail either way.
 */
export async function photoThumbBase64Diag(filename: string): Promise<ThumbResult> {
  const steps: string[] = [];
  const uri = photoUri(filename);

  // Method 1: manipulator re-encode
  try {
    const context = ImageManipulator.manipulate(uri);
    const rendered = await context.resize({ width: 240 }).renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.55,
      base64: true,
    });
    if (saved.base64 && saved.base64.length > 0) {
      return { b64: saved.base64, diag: 'm:ok' };
    }
    steps.push('m:empty');
  } catch (e: any) {
    steps.push('m:' + String(e?.message ?? e).slice(0, 80));
  }

  // Method 2: new File API direct read
  try {
    const f = new File(photosDir(), filename);
    if (!f.exists) {
      steps.push('f:missing');
    } else {
      const b64 = await f.base64();
      if (b64 && b64.length > 0) {
        return { b64, diag: steps.join('|') + '|f:ok(' + b64.length + ')' };
      }
      steps.push('f:empty');
    }
  } catch (e: any) {
    steps.push('f:' + String(e?.message ?? e).slice(0, 80));
  }

  // Method 3: legacy FileSystem API
  try {
    const b64 = await LegacyFS.readAsStringAsync(uri, {
      encoding: LegacyFS.EncodingType.Base64,
    });
    if (b64 && b64.length > 0) {
      return { b64, diag: steps.join('|') + '|l:ok(' + b64.length + ')' };
    }
    steps.push('l:empty');
  } catch (e: any) {
    steps.push('l:' + String(e?.message ?? e).slice(0, 80));
  }

  // All three methods failed — append a directory probe so the next
  // diagnostic PDF shows whether the photos dir exists and what's in it.
  try {
    const names = await LegacyFS.readDirectoryAsync(
      `${LegacyFS.documentDirectory}${PHOTOS_DIR}`,
    );
    steps.push(`d:${names.length}[${names.slice(0, 3).join(',')}]`);
  } catch (e: any) {
    steps.push('d:' + String(e?.message ?? e).slice(0, 60));
  }

  return { b64: null, diag: steps.join('|') };
}

/** Back-compat wrapper. */
export async function photoThumbBase64(filename: string): Promise<string | null> {
  return (await photoThumbBase64Diag(filename)).b64;
}
