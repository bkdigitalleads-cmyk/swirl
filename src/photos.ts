/**
 * Photo storage: images are resized (privacy-friendly EXIF strip via
 * re-encode) and copied into the app's documents/photos directory.
 * The database stores only filenames, never absolute paths, because the
 * app sandbox path can change between app updates.
 */
import { Directory, File, Paths } from 'expo-file-system';
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
 */
export async function storePhoto(sourceUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(sourceUri);
  const rendered = await context.resize({ width: MAX_DIMENSION }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
  const name = `p${Date.now()}_${counter++}.jpg`;
  const dest = new File(photosDir(), name);
  const src = new File(saved.uri);
  src.copy(dest);
  try {
    src.delete();
  } catch {
    // cache cleanup is best-effort
  }
  return name;
}

/** Absolute uri for a stored filename (for <Image source>). */
export function photoUri(filename: string): string {
  return new File(photosDir(), filename).uri;
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
export async function photoThumbBase64(filename: string): Promise<string | null> {
  try {
    const uri = photoUri(filename);
    const context = ImageManipulator.manipulate(uri);
    const rendered = await context.resize({ width: 240 }).renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.55,
      base64: true,
    });
    return saved.base64 ?? null;
  } catch {
    return null;
  }
}
