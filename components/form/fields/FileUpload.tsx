"use client";

import { useCallback, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName, UploadedFile } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants/form";

interface FileUploadProps {
  name: FormFieldName;
  label: string;
  required?: boolean;
  accept?: string;
}

type UploadStatus = "uploading" | "failed";

interface UploadItem {
  key: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
}

const MAX_PARALLEL_UPLOADS = 3;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function uploadSingleFile(
  file: File,
  onProgress: (progress: number) => void
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
      onProgress(percent);
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed. Check your network and retry."));
    };

    xhr.onabort = () => {
      reject(new Error("Upload was canceled."));
    };

    xhr.onload = () => {
      const rawBody =
        typeof xhr.response === "object" && xhr.response !== null
          ? (xhr.response as Record<string, unknown>)
          : safeParseJson(xhr.responseText || "");

      if (xhr.status >= 200 && xhr.status < 300) {
        const fileBody = rawBody.file as
          | { name?: string; url?: string; size?: number; type?: string }
          | undefined;
        const uploaded: UploadedFile = {
          name: fileBody?.name ?? file.name,
          url: fileBody?.url ?? "",
          size: typeof fileBody?.size === "number" ? fileBody.size : file.size,
          type: fileBody?.type ?? file.type,
        };
        if (!uploaded.url) {
          reject(new Error("Upload succeeded but response was missing file URL."));
          return;
        }
        onProgress(100);
        resolve(uploaded);
        return;
      }

      const message =
        typeof rawBody.error === "string" && rawBody.error
          ? rawBody.error
          : `Upload failed (${xhr.status})`;
      reject(new Error(message));
    };

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export function FileUpload({ name, label, required, accept }: FileUploadProps) {
  const { setValue, getValues, watch, formState: { errors } } = useFormContext<ItemizationFormData>();
  const files = (watch(name) as UploadedFile[]) || [];
  const helper = HELPER_TEXT[name];
  const error = errors[name];

  const [dragging, setDragging] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploading = uploadItems.some((item) => item.status === "uploading");

  const updateUploadItem = useCallback((key: string, patch: Partial<UploadItem>) => {
    setUploadItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  }, []);

  const appendUploadedFile = useCallback((uploadedFile: UploadedFile) => {
    const current = (getValues(name) as UploadedFile[]) || [];
    setValue(name, [...current, uploadedFile] as never, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [getValues, name, setValue]);

  const uploadOne = useCallback(
    async (item: UploadItem): Promise<boolean> => {
      try {
        const uploadedFile = await uploadSingleFile(item.file, (progress) => {
          updateUploadItem(item.key, {
            progress,
            status: "uploading",
            error: undefined,
          });
        });
        appendUploadedFile(uploadedFile);
        setUploadItems((current) => current.filter((entry) => entry.key !== item.key));
        return true;
      } catch (err) {
        updateUploadItem(item.key, {
          status: "failed",
          error: err instanceof Error ? err.message : "Upload failed",
        });
        return false;
      }
    },
    [appendUploadedFile, updateUploadItem]
  );

  const uploadBatch = useCallback(async (nextFiles: File[]) => {
    if (nextFiles.length === 0) return;
    setUploadError(null);

    const incoming = nextFiles.map<UploadItem>((file) => ({
      key: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading",
    }));
    setUploadItems((current) => [...current, ...incoming]);

    const queue = incoming.slice();
    const results: boolean[] = [];
    const workerCount = Math.min(MAX_PARALLEL_UPLOADS, queue.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) return;
        const ok = await uploadOne(item);
        results.push(ok);
      }
    });

    await Promise.all(workers);
    if (results.some((ok) => !ok)) {
      setUploadError("Some files failed to upload. Retry the failed files below.");
    }
  }, [uploadOne]);

  const handleFiles = useCallback(
    (fileList: FileList) => {
      if (uploading) return;
      if (fileList.length === 0) return;
      void uploadBatch(Array.from(fileList));
    },
    [uploadBatch, uploading]
  );

  const triggerFilePicker = useCallback(() => {
    if (uploading) return;
    inputRef.current?.click();
  }, [uploading]);

  const removeFile = (index: number) => {
    setValue(name, files.filter((_, i) => i !== index) as never, { shouldValidate: true });
  };

  const removeUploadItem = useCallback((key: string) => {
    setUploadItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const retryUpload = useCallback(async (key: string) => {
    const target = uploadItems.find((item) => item.key === key);
    if (!target || target.status !== "failed") return;

    setUploadError(null);
    updateUploadItem(key, { status: "uploading", progress: 0, error: undefined });
    const ok = await uploadOne({ ...target, status: "uploading", progress: 0, error: undefined });
    if (!ok) {
      setUploadError("Some files failed to upload. Retry the failed files below.");
    }
  }, [uploadItems, updateUploadItem, uploadOne]);

  return (
    <div className="field-group" data-field-name={name}>
      <span className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {helper && <p className="field-helper">{helper}</p>}
      <div
        className={`file-drop ${dragging ? "dragging" : ""} ${uploading ? "uploading" : ""}`}
        role="button"
        tabIndex={0}
        aria-disabled={uploading ? true : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          if (uploading) return;
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (uploading) return;
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          triggerFilePicker();
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          triggerFilePicker();
        }}
      >
        <p>{uploading ? "Uploading files..." : "Drop files here or click to browse"}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        hidden
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />

      {(uploadItems.length > 0 || files.length > 0) && (
        <div className="file-list">
          {uploadItems.map((item) => (
            <div
              key={item.key}
              className={`file-item ${item.status === "failed" ? "file-item--failed" : "file-item--uploading"}`}
            >
              <div className="file-item-main">
                <span className="file-item-name">{item.name}</span>
                <span className="file-item-meta">
                  {formatBytes(item.size)} ·{" "}
                  {item.status === "uploading" ? `${item.progress}% uploaded` : "Upload failed"}
                </span>
                {item.status === "uploading" && (
                  <div className="file-progress">
                    <span style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === "failed" && item.error && (
                  <span className="file-item-error">{item.error}</span>
                )}
              </div>
              <div className="file-item-actions">
                {item.status === "failed" && (
                  <button
                    type="button"
                    className="file-item-retry"
                    onClick={(e) => {
                      e.stopPropagation();
                      void retryUpload(item.key);
                    }}
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  className="file-item-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeUploadItem(item.key);
                  }}
                  aria-label={`Remove ${item.name}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {files.map((f, i) => (
            <div key={`${f.url}-${i}`} className="file-item file-item--complete">
              <div className="file-item-main">
                <span className="file-item-name">{f.name}</span>
                <span className="file-item-meta">{formatBytes(f.size)} · Uploaded</span>
              </div>
              <button
                type="button"
                className="file-item-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                aria-label={`Remove ${f.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="field-error">{error.message as string}</p>}
      {!error && uploadError && <p className="field-error">{uploadError}</p>}
    </div>
  );
}
