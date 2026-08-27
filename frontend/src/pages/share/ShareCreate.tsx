import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sharesApi, uploadApi, getImageUrl } from '../../api';

export default function ShareCreate() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('STARTUP');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const remain = 9 - images.length;
      const selected = Array.from(files).slice(0, remain);
      const urls: string[] = [];
      for (const file of selected) {
        const res = await uploadApi.upload(file, 'SHARE_IMAGE');
        urls.push(res.data.url);
      }
      setImages((prev) => [...prev, ...urls]);
    } catch {
      setError('图片上传失败');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await uploadApi.uploadVideo(file);
      setVideoUrl(res.data.url);
    } catch {
      setError('视频上传失败（支持 mp4/mov/webm，最大100MB）');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('请填写标题'); return; }
    if (!category) { setError('请选择分类'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await sharesApi.create({
        category,
        title: title.trim(),
        content: content.trim() || undefined,
        images,
        videoUrl: videoUrl || undefined,
      });
      navigate(`/share/${res.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]";

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 头部 */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-500">←</button>
          <h1 className="text-base font-bold text-gray-900">发布分享</h1>
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="ml-auto px-4 py-1.5 bg-[#FF6B00] text-white text-sm font-medium rounded-full disabled:opacity-50"
          >
            {submitting ? '发布中...' : '发布'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

        {/* 分类选择 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-2">选择分类</p>
          <div className="flex gap-2">
            {[
              { key: 'STARTUP', label: '📣 创业分享', desc: '开店/创业经历' },
              { key: 'LEARNING', label: '📚 学习分享', desc: '经验/知识干货' },
            ].map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`flex-1 py-3 rounded-xl border text-sm transition-colors ${
                  category === c.key ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00] font-medium' : 'border-gray-200 text-gray-500'
                }`}
              >
                <p>{c.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 标题与内容 */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题 *"
            className={inputCls}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="分享你的故事、经验、干货内容..."
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* 图片上传 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-2">图片（最多9张）</p>
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square">
                <img src={getImageUrl(img) || ''} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 cursor-pointer bg-gray-50">
                <span className="text-2xl leading-none">{uploading ? '⏳' : '＋'}</span>
                <span className="text-[10px] mt-1">{images.length}/9</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        {/* 视频上传 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-2">视频（可选，单个≤100MB）</p>
          {videoUrl ? (
            <div className="relative">
              <video src={getImageUrl(videoUrl) || ''} controls playsInline preload="metadata" className="w-full rounded-lg bg-black" />
              <button
                onClick={() => setVideoUrl('')}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 cursor-pointer bg-gray-50">
              <span className="text-xl">🎬</span>
              <span className="text-sm">{uploading ? '上传中...' : '上传视频'}</span>
              <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" className="hidden" onChange={handleVideoUpload} disabled={uploading} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
