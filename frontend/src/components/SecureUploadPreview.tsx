import { useEffect, useState } from 'react';
import { uploadApi } from '../api';

interface SecureUploadPreviewProps {
  url: string;
  label?: string;
  className?: string;
}

export default function SecureUploadPreview({
  url,
  label = '安全查看已上传资料',
  className = '',
}: SecureUploadPreviewProps) {
  const [preview, setPreview] = useState<{ src: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    if (preview?.src) URL.revokeObjectURL(preview.src);
  }, [preview]);

  const openPreview = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await uploadApi.getPrivate(url);
      const blob = response.data as Blob;
      setPreview({ src: URL.createObjectURL(blob), mimeType: blob.type });
    } catch {
      setError('资料读取失败，请重新登录或重新上传');
    } finally {
      setLoading(false);
    }
  };

  const closePreview = () => setPreview(null);

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        disabled={loading}
        className={`rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-wait disabled:opacity-60 ${className}`}
      >
        {loading ? '正在验证权限…' : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="受保护资料预览"
          onClick={closePreview}
        >
          {preview.mimeType.startsWith('image/') ? (
            <img
              src={preview.src}
              alt="受保护资料"
              className="max-h-full max-w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <iframe
              src={preview.src}
              title="受保护资料"
              className="h-[85vh] w-full max-w-4xl rounded-lg bg-white"
              onClick={(event) => event.stopPropagation()}
            />
          )}
          <button
            type="button"
            onClick={closePreview}
            className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-2 text-xl text-white"
            aria-label="关闭预览"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
