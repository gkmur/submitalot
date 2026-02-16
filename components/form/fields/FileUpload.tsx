"use client";

import { useCallback, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName, UploadedFile } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants/form";

interface FileUploadProps {
  name: FormFieldName;
  label: string;
  required?: boolean;
  accept?: string;
}

export function FileUpload({ name, label, required, accept }: FileUploadProps) {
  const { setValue, watch, formState: { errors } } = useFormContext<ItemizationFormData>();
  const files = (watch(name) as UploadedFile[]) || [];
  const helper = HELPER_TEXT[name];
  const error = errors[name];
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFiles = useCallback(async (fileList: FileList) => {
    if (fileList.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const uploaded: UploadedFile[] = [];
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Upload failed (${res.status})`);
        }

        uploaded.push({
          name: body.file?.name ?? file.name,
          url: body.file?.url ?? "",
          size: body.file?.size ?? file.size,
          type: body.file?.type ?? file.type,
        });
      }

      setValue(name, [...files, ...uploaded] as never, { shouldValidate: true });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [files, name, setValue]);

  const removeFile = (index: number) => {
    setValue(name, files.filter((_, i) => i !== index) as never, { shouldValidate: true });
  };

  return (
    <div className="field-group">
      <span className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {helper && <p className="field-helper">{helper}</p>}
      <div
        className={`file-drop ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          if (accept) input.accept = accept;
          input.onchange = () => { if (input.files) handleFiles(input.files); };
          input.click();
        }}
      >
        <p>{uploading ? "Uploading..." : "Drop files here or click to browse"}</p>
      </div>
      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <div key={i} className="file-item">
              <span>{f.name}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>×</button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="field-error">{error.message as string}</p>}
      {!error && uploadError && <p className="field-error">{uploadError}</p>}
    </div>
  );
}
