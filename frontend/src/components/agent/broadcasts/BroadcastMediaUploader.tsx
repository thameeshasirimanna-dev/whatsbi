import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  UploadCloud,
  X,
  Link2,
  Check,
  AlertCircle,
  Loader2,
  FileImage,
} from 'lucide-react';

export interface BroadcastMediaHeader {
  type: 'image';
  id?: string;
  link: string;
  filename?: string;
}

interface BroadcastMediaUploaderProps {
  mediaHeader: BroadcastMediaHeader | null;
  onUpload: (file: File) => Promise<void>;
  onSetLink: (link: string) => void;
  onRemove: () => void;
  uploading: boolean;
}

export const BroadcastMediaUploader: React.FC<BroadcastMediaUploaderProps> = ({
  mediaHeader,
  onUpload,
  onSetLink,
  onRemove,
  uploading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndUpload = async (file: File) => {
    setLocalError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setLocalError('Invalid file type. Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    // Max 16MB for WhatsApp image
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      setLocalError('File size exceeds 16MB limit for WhatsApp images.');
      return;
    }

    try {
      await onUpload(file);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to upload poster image');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await validateAndUpload(e.target.files[0]);
    }
  };

  const handleApplyUrl = () => {
    setLocalError(null);
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setLocalError('Please enter a valid image URL');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setLocalError('URL must start with http:// or https://');
      return;
    }
    onSetLink(trimmed);
    setUrlInput('');
    setShowUrlInput(false);
  };

  return (
    <div className="space-y-2.5 font-sans">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#16281D] flex items-center gap-1.5">
          <ImageIcon size={14} className="text-[#15803D]" />
          <span>Promotional Poster / Flyer (Optional)</span>
        </label>
        {!mediaHeader && (
          <button
            type="button"
            onClick={() => {
              setShowUrlInput(!showUrlInput);
              setLocalError(null);
            }}
            className="text-[11px] font-semibold text-[#15803D] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Link2 size={12} />
            <span>{showUrlInput ? 'Upload file instead' : 'Use image URL'}</span>
          </button>
        )}
      </div>

      {localError && (
        <div className="flex items-center gap-2 p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626]">
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{localError}</span>
          <button
            type="button"
            onClick={() => setLocalError(null)}
            className="text-[#DC2626] hover:opacity-75 cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {mediaHeader ? (
        /* Attached Media Display Card */
        <div className="p-3 bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-[#EAEAEA] shrink-0 relative flex items-center justify-center">
              <img
                src={mediaHeader.link}
                alt="Poster preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <FileImage size={20} className="text-[#71717A] absolute -z-10" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#16281D] truncate max-w-[200px] sm:max-w-[260px]">
                  {mediaHeader.filename || 'Promotional Poster'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#15803D] bg-[#22C55E]/15 px-2 py-0.5 rounded-full shrink-0">
                  <Check size={10} strokeWidth={3} /> Attached
                </span>
              </div>
              <p className="text-[11px] text-[#71717A] mt-0.5">
                Free-form text message will be delivered as the caption of this poster.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#FEE2E2] text-[#71717A] hover:text-[#DC2626] border border-[#EAEAEA] flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-xs"
            title="Remove poster"
          >
            <X size={14} />
          </button>
        </div>
      ) : showUrlInput ? (
        /* Direct URL Input Mode */
        <div className="p-3.5 bg-white border border-[#EAEAEA] rounded-2xl space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="https://example.com/poster-banner.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] outline-none focus:border-[#9FE870] font-sans"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-4 py-2 bg-[#16281D] hover:bg-[#2A4433] text-[#9FE870] rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              Attach
            </button>
          </div>
          <span className="text-[10px] text-[#71717A] block">
            Direct public image link (.jpg, .png, .webp).
          </span>
        </div>
      ) : (
        /* Drag & Drop File Upload Zone */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-[#9FE870] bg-[#9FE870]/10'
              : 'border-[#EAEAEA] bg-white hover:border-[#16281D]/30 hover:bg-[#F4F7F4]/50'
          } ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center justify-center py-2">
              <Loader2 size={24} className="animate-spin text-[#15803D] mb-1.5" />
              <p className="text-xs font-bold text-[#16281D]">Uploading poster to WhatsApp...</p>
              <p className="text-[11px] text-[#71717A] mt-0.5">Optimizing for high-resolution recipient display</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#F4F7F4] flex items-center justify-center text-[#16281D] mb-2 border border-[#EAEAEA]">
                <UploadCloud size={20} className="text-[#15803D]" />
              </div>
              <p className="text-xs font-bold text-[#16281D]">
                Drop poster image here, or <span className="text-[#15803D] underline">browse files</span>
              </p>
              <p className="text-[10px] text-[#71717A] mt-1">
                Supports JPG, PNG, WEBP up to 16MB. Text will be sent as its caption.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BroadcastMediaUploader;
