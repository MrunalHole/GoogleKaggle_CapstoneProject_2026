import { useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import "./Dropzone.css";

interface DropzoneProps {
  accept: string;
  label: string;
  hint: string;
  icon?: ReactNode;
  onFileSelected: (file: File) => void;
  selectedFileName?: string | null;
  onClear?: () => void;
}

export default function Dropzone({
  accept,
  label,
  hint,
  icon,
  onFileSelected,
  selectedFileName,
  onClear,
}: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files && files[0]) onFileSelected(files[0]);
    },
    [onFileSelected]
  );

  return (
    <div
      className={`dropzone ${dragOver ? "dropzone--active" : ""} ${
        selectedFileName ? "dropzone--filled" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !selectedFileName && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !selectedFileName) {
          inputRef.current?.click();
        }
      }}
      aria-label={label}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="visually-hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {!selectedFileName ? (
        <>
          <div className="dropzone__icon">{icon ?? <UploadCloud size={22} />}</div>
          <p className="dropzone__label">{label}</p>
          <p className="dropzone__hint">{hint}</p>
        </>
      ) : (
        <div className="dropzone__file">
          <FileText size={20} />
          <span className="dropzone__filename">{selectedFileName}</span>
          {onClear && (
            <button
              className="dropzone__clear"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
