import type { AttachmentAdapter } from "@assistant-ui/react";

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file."));
        return;
      }
      const commaIndex = result.indexOf(",");
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file."));
    };
    reader.readAsDataURL(file);
  });

const getAttachmentType = (file: File) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "document";
  if (file.type.startsWith("text/")) return "document";
  return "file";
};

export const attachmentAdapter: AttachmentAdapter = {
  accept: "*/*",
  async add({ file }) {
    return {
      id: createId(),
      type: getAttachmentType(file),
      name: file.name,
      contentType: file.type || "application/octet-stream",
      file,
      status: {
        type: "requires-action",
        reason: "composer-send",
      },
    };
  },
  async remove() {
    // No-op: the File object is GC'd when removed from state.
  },
  async send(attachment) {
    const data = await readFileAsBase64(attachment.file);
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          filename: attachment.name,
          data,
          mimeType: attachment.contentType,
        },
      ],
    };
  },
};
