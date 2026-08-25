import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sharesApi, getImageUrl, safeArray } from '../../api';
import type { SharePost, ShareComment } from '../../types';

const CATEGORY_LABEL: Record<string, string> = {
  STARTUP: '创业分享',
  LEARNING: '学习分享',
};

function parseImages(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function SharePostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<SharePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    if (!id) return;
    sharesApi.getById(id)
      .then((res) => setPost(res.data))
      .catch((err) => setError(err?.response?.data?.error || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleLike = async () => {
    if (!post || liking) return;
    setLiking(true);
    try {
      const res = await sharesApi.toggleLike(post.id);
      const isLiked = res.data?.liked;
      setLiked(isLiked);
      setPost((prev) => prev ? { ...prev, likeCount: Math.max(0, prev.likeCount + (isLiked ? 1 : -1)) } : prev);
    } catch { /* ignore */ } finally {
      setLiking(false);
    }
  };

  const handleComment = async () => {
    if (!post || !comment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await sharesApi.addComment(post.id, comment.trim());
      setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1, comments: [...(prev.comments || []), res.data] } : prev);
      setComment('');
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400">
        <p className="text-sm">{error || '内容不存在'}</p>
        <button onClick={() => navigate('/share')} className="mt-4 px-6 py-2 bg-[#FF6B00] text-white text-sm rounded-lg">返回</button>
      </div>
    );
  }

  const images = parseImages(post.images);
  const comments = safeArray<ShareComment>(post.comments);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 头部 */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-500">←</button>
          <h1 className="text-base font-bold text-gray-900">分享详情</h1>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-600">
            {CATEGORY_LABEL[post.category] || '分享'}
          </span>
        </div>
      </div>

      {/* 内容 */}
      <div className="p-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {(post.user?.name || post.user?.phone || '餐').charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{post.user?.name || post.user?.phone || '用户'}</p>
              <p className="text-[11px] text-gray-400">{new Date(post.createdAt).toLocaleString('zh-CN')}</p>
            </div>
          </div>

          <h2 className="text-base font-bold text-gray-900 mt-3 leading-snug">{post.title}</h2>
          {post.content && (
            <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-line">{post.content}</p>
          )}

          {images.length > 0 && (
            <div className={`mt-3 grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 || images.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {images.slice(0, 9).map((img, idx) => (
                <div key={idx} className={images.length === 1 ? 'max-h-72 w-full' : 'aspect-square'}>
                  <img src={getImageUrl(img) || ''} alt="" className="w-full h-full object-cover rounded-lg bg-gray-100" />
                </div>
              ))}
            </div>
          )}

          {post.videoUrl && (
            <video
              src={getImageUrl(post.videoUrl) || ''}
              controls
              playsInline
              preload="metadata"
              className="mt-3 w-full rounded-lg bg-black"
            />
          )}

          {/* 操作栏 */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-6">
            <button onClick={handleLike} disabled={liking} className={`flex items-center gap-1.5 text-sm ${liked ? 'text-red-500' : 'text-gray-500'}`}>
              <span className="text-xl leading-none">{liked ? '❤️' : '🤍'}</span>
              <span>{post.likeCount}</span>
            </button>
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <span className="text-xl leading-none">💬</span>
              <span>{post.commentCount}</span>
            </span>
          </div>
        </div>

        {/* 评论区 */}
        <div className="bg-white rounded-xl p-4 mt-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">评论（{comments.length}）</h3>
          {comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">暂无评论，来说两句吧</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(c.user?.name || c.user?.phone || '餐').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">
                      {c.user?.name || c.user?.phone || '用户'}
                      <span className="ml-2 text-[10px]">{new Date(c.createdAt).toLocaleString('zh-CN')}</span>
                    </p>
                    <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 评论输入 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="写下你的评论..."
          className="flex-1 h-10 px-3 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
        />
        <button
          onClick={handleComment}
          disabled={!comment.trim() || submitting}
          className="px-5 h-10 bg-[#FF6B00] text-white text-sm font-medium rounded-full disabled:opacity-40"
        >
          {submitting ? '...' : '发布'}
        </button>
      </div>
    </div>
  );
}
