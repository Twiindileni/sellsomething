import { supabase } from "./supabase";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const UPLOAD_TIMEOUT_MS = 20000;

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export async function uploadProductImage(file, userId) {
  if (!file) return null;
  if (!userId) {
    throw new Error("You must be logged in to upload images.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Please upload a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Session expired. Please log in again.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const uploadPromise = supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  const { error: uploadError } = await withTimeout(
    uploadPromise,
    UPLOAD_TIMEOUT_MS,
    "Image upload timed out. Run supabase/storage.sql in Supabase, or post without a photo."
  );

  if (uploadError) {
    const msg = uploadError.message || "Upload failed";
    if (msg.includes("Bucket not found") || msg.includes("bucket")) {
      throw new Error("Storage bucket missing. Run supabase/storage.sql in your Supabase SQL Editor.");
    }
    throw new Error(msg);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
