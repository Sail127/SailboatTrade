import { normalizeDraftUploadKeys } from "@/lib/draftUploads";

export function makePhotoItemId(prefix = "photo") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function revokeBlobUrl(url) {
  const value = String(url || "");
  if (!value.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(value);
  } catch {}
}

export function filterImageFiles(filesLike) {
  return Array.from(filesLike || []).filter((file) => /^image\//i.test(String(file?.type || "")));
}

export function createLocalPhotoItems(files, { idPrefix = "local", extra = {} } = {}) {
  return filterImageFiles(files).map((file) => ({
    id: makePhotoItemId(idPrefix),
    status: "local",
    uploadedKey: "",
    previewUrl: URL.createObjectURL(file),
    file,
    ...extra,
  }));
}

export async function uploadLocalPhotoItems({
  items,
  maxPhotos,
  uploadFile,
  toPreviewUrl = (key, uploaded) => String(uploaded?.previewUrl || key),
  onBefore = () => {},
  onAfter = () => {},
}) {
  const snapshot = Array.isArray(items) ? items : [];
  if (snapshot.length > maxPhotos) {
    throw new Error(`This listing is limited to ${maxPhotos} photos. Remove photos before uploading.`);
  }

  const locals = snapshot.filter((item) => item?.status === "local" && item?.file);
  if (!locals.length) return snapshot;

  onBefore();
  try {
    const uploadedById = {};
    const previewById = {};

    for (const item of locals) {
      // eslint-disable-next-line no-await-in-loop
      const uploaded = await uploadFile(item.file);
      const key = String(uploaded?.key || "").trim();
      if (!key) throw new Error("Upload failed.");
      uploadedById[item.id] = key;
      previewById[item.id] = toPreviewUrl(key, uploaded);
    }

    return snapshot.map((item) => {
      const key = uploadedById[item.id];
      if (!key) return item;
      revokeBlobUrl(item.previewUrl);
      return {
        ...item,
        status: "uploaded",
        uploadedKey: key,
        previewUrl: previewById[item.id] || key,
        file: null,
      };
    });
  } finally {
    onAfter();
  }
}

export async function deleteDraftUploadKeys(keys) {
  const normalizedKeys = normalizeDraftUploadKeys(keys);
  if (!normalizedKeys.length) return;

  try {
    await fetch("/api/uploads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: normalizedKeys }),
      keepalive: true,
    });
  } catch {}
}

export async function touchDraftUploadKeys(keys) {
  const normalizedKeys = normalizeDraftUploadKeys(keys);
  if (!normalizedKeys.length) return;

  try {
    await fetch("/api/uploads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: normalizedKeys }),
      keepalive: true,
    });
  } catch {}
}
