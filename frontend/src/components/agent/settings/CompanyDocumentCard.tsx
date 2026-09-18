import React, { useState } from 'react';
import { Building2, Upload, FileText, Download, Trash2, ExternalLink } from 'lucide-react';

interface CompanyDocumentCardProps {
  currentDocument: string | null;
  isOwner: boolean;
  onUploadDocument: (file: File) => Promise<void>;
  onRemoveDocument: () => Promise<void>;
  uploadProgress: number | null;
}

const CompanyDocumentCard: React.FC<CompanyDocumentCardProps> = ({
  currentDocument,
  isOwner,
  onUploadDocument,
  onRemoveDocument,
  uploadProgress,
}) => {
  const [editingDocument, setEditingDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await onUploadDocument(selectedFile);
      setEditingDocument(false);
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
    }
  };

  const documentName = currentDocument
    ? currentDocument.split('/').pop()?.replace(/^company_overview_\d+_/, '') || 'View Document'
    : null;

  return (
    <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-4 sm:p-6 md:p-8 flex-1 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#EAEAEA] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center font-bold">
              <Building2 size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                Knowledge Grounding
              </span>
              <h3 className="text-base font-bold text-[#16281D]">Company Overview Document</h3>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#71717A] mb-5">
          Upload your company overview catalog or profile document (.txt, .pdf, .doc, .docx). This document enables the AI agent to ground customer answers with precise business context.
        </p>
      </div>

      <div className="mt-auto">
        {editingDocument ? (
          <div className="p-5 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] space-y-4">
            <label className="flex flex-col items-center justify-center p-6 bg-white border border-dashed border-[#EAEAEA] hover:border-[#16281D] rounded-2xl cursor-pointer transition-colors text-center">
              <Upload size={20} className="text-[#71717A] mb-2" />
              <span className="text-xs font-semibold text-[#16281D]">
                {selectedFile ? selectedFile.name : 'Click to select document'}
              </span>
              <span className="text-[11px] text-[#71717A] mt-0.5">
                Supports .pdf, .txt, .doc, .docx files up to 10MB
              </span>
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>

            {uploadProgress !== null ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#71717A] font-medium">
                  <span>Uploading document...</span>
                  <span className="font-mono font-bold text-[#16281D]">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-[#EAEAEA] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#9FE870] rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDocument(false);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 rounded-full bg-white border border-[#EAEAEA] hover:bg-[#EAEAEA] text-xs font-semibold text-[#71717A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile}
                  className="px-5 py-2 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] transition-colors disabled:opacity-50"
                >
                  Upload Document
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#EAEAEA] flex items-center justify-center shrink-0 text-[#16281D]">
                <FileText size={16} />
              </div>
              <div className="overflow-hidden">
                {currentDocument ? (
                  <a
                    href={currentDocument}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#16281D] hover:underline flex items-center gap-1.5 truncate"
                  >
                    <span className="truncate">{documentName}</span>
                    <ExternalLink size={12} className="shrink-0 text-[#71717A]" />
                  </a>
                ) : (
                  <span className="text-xs text-[#71717A]">No overview document uploaded yet</span>
                )}
                <span className="text-[11px] text-[#71717A] block">
                  {currentDocument ? 'Active AI Knowledge Source' : 'Default system prompts active'}
                </span>
              </div>
            </div>

            {isOwner && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingDocument(true)}
                  className="px-3.5 py-1.5 rounded-full bg-white border border-[#EAEAEA] hover:border-[#16281D] text-xs font-semibold text-[#16281D] transition-colors"
                >
                  {currentDocument ? 'Change' : 'Upload'}
                </button>
                {currentDocument && (
                  <button
                    type="button"
                    onClick={onRemoveDocument}
                    className="px-3.5 py-1.5 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-xs font-semibold text-[#EF4444] transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDocumentCard;
