import { IMAGE_BUCKET, supabase } from "./supabase";
import { IMAGE_TYPES, MAX_UPLOAD_BYTES, resizeImage } from "./image";

/** Resizes and uploads an image to the public bucket; returns its public URL. */
export async function uploadImage(file: File, folder: "products" | "animals"): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Only JPG, PNG or WebP images are allowed.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("That image is too big (over 15 MB).");
  const blob = await resizeImage(file);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
