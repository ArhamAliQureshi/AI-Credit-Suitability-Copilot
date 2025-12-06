import React, { useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { FileData } from '../types';

interface FileUploadProps {
  files: FileData[];
  onFilesChange: (files: FileData[]) => void;
  docType: string;
  label: string;
  description?: string;
  required?: boolean;
  hasError?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  files, 
  onFilesChange, 
  docType, 
  label, 
  description, 
  required,
  hasError
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter files relevant to this specific docType
  const myFiles = files.filter(f => f.docType === docType);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: FileData[] = [];
      const globalFileCount = files.length;
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        
        // Global limit check (relaxed to 10 for multiple categories)
        if (globalFileCount + newFiles.length >= 10) {
          alert("Maximum global file limit (10) reached.");
          break;
        }

        if (file.size > 4 * 1024 * 1024) {
            alert(`File ${file.name} is too large (max 4MB)`);
            continue;
        }

        const base64 = await fileToBase64(file);
        newFiles.push({
          name: file.name,
          mimeType: file.type,
          data: base64,
          docType: docType // Tag the file
        });
      }
      
      onFilesChange([...files, ...newFiles]);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove Data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (fileToRemove: FileData) => {
    // We match by name and docType to ensure uniqueness in deletion
    const updated = files.filter(f => !(f.name === fileToRemove.name && f.docType === fileToRemove.docType));
    onFilesChange(updated);
  };

  return (
    <div className={`rounded-xl border transition-colors ${hasError ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
            <div>
                <label className="block text-sm font-semibold text-slate-800">
                {label} {required && <span className="text-rose-500">*</span>}
                </label>
                {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
            </div>
            <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs flex items-center bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 px-3 py-1.5 rounded-md transition-all shadow-sm"
            >
                <Upload className="w-3 h-3 mr-2" /> Upload
            </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileSelect} 
          className="hidden" 
          accept="application/pdf,image/png,image/jpeg"
          multiple
        />

        {/* File List for this category */}
        {myFiles.length > 0 ? (
            <div className="mt-3 space-y-2">
            {myFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-md shadow-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                    {file.mimeType.includes('pdf') ? (
                    <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    ) : (
                    <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                    <span className="text-xs text-slate-700 truncate max-w-[200px]">{file.name}</span>
                </div>
                <button 
                    onClick={() => removeFile(file)}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
                </div>
            ))}
            </div>
        ) : (
            <div className="mt-3 text-xs text-slate-400 italic border border-dashed border-slate-300 rounded p-2 text-center bg-white/50">
                No files uploaded
            </div>
        )}
        
        {hasError && (
            <div className="mt-2 flex items-center text-rose-600 text-xs font-medium animate-pulse">
                <AlertCircle className="w-3 h-3 mr-1.5" />
                This document is required.
            </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
