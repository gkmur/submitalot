"use client";

import { useCallback, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { ItemizationFormData, FormFieldName, UploadedFile } from "@/lib/types";
import { HELPER_TEXT } from "@/lib/constants";

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

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      size: f.size,
      type: f.type,
    }));
    setValue(name, [...files, ...newFiles] as never, { shouldValidate: true });
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
        <p>Drop files here or click to browse</p>
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
    </div>
  );
}
