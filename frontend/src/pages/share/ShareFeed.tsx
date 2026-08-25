import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sharesApi, getImageUrl, safeArray } from '../../api';
import type { SharePost } from '../../types';

const CATEGORY_LABEL: Record<string, string> = {
  STARTUP: '创业分享',
  LEARNING: '学习分享',
};

const CATEGORY_STYLE: Record<string, string> = {
  STARTUP: 'bg-orange-50 text-[#FF6B00]',
  LEARNING: 'bg-purple-50 text-purple-600',
};

function parseImages(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function ShareFeed() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('ALL');
  const [posts, setPosts] = useState<SharePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [likingId, setLikingId] = useState('');

  const load = (p: number, cat: string, reset: boolean) => {
    setLoading(true);
    sharesApi.list({ category: cat === 'ALL' ? undefined : cat, page: p, pageSize: 10 })
      .then((res) => {
        const list = safeArray<SharePost>(res.data?.posts);
        setPosts((prev) => (reset ? list : [...prev, ...list]));
        setHasMore(prev => {
          const total = res.data?.total ?? 0;
          return prev && list.length > 0 && p * 10 < total;
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
    setPosts([]);
    setHasMore(true);
    load(1, tab, true);
  }, [tab]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next, tab, false);
  };

  const handleLike = async (id: string) => {
    if (likingId) return;
    setLikingId(id);
    try {
      const res = await sharesApi.toggleLike(id);
      const liked = res.data?.liked;
      setLikedSet((prev) => {
        const next = new Set(prev);
        if (liked) next.add(id);
        else next.delete(id);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) }
            : p
        )
      );
    } catch { /* ignore */ } finally {
      setLikingId('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* 头部 */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-700 px-4 pt-8 pb-14">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">
            ←
          </button>
          <h1 className="text-lg font-bold text-white">创业分享</h1>
          <button onClick={() => navigate('/share/my')} className="text-xs text-white/80">我的</button>
        </div>
        <p className="text-white/90 text-sm leading-relaxed">餐饮人交流分享社区<br />创业故事 · 经验学习 · 行业干货</p>
      </div>

      {/* 分类 Tab */}
      <div className="px-4 -mt-8">
        <div className="bg-white rounded-xl shadow-sm flex p-1">
          {[
            { key: 'ALL', label: '全部' },
            { key: 'STARTUP', label: '创业分享' },
            { key: 'LEARNING', label: '学习分享' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t.key ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white shadow' : 'text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 信息流 */}
      <div className="p-4 space-y-4">
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl py-12 text-center text-gray-400 text-sm">
            <div className="text-5xl mb-3">📝</div>
            还没有分享，快来发布第一条吧
          </div>
        ) : (
          posts.map((p) => {
            const images = parseImages(p.images);
            const liked = likedSet.has(p.id);
            return (
              <div key={p.id} className="bg-white rounded-xl shadow-sm overflow-hidden" onClick={() => navigate(`/share/${p.id}`)}>
                {/* 用户信息 */}
                <div className="flex items-center gap-2.5 px-4 pt-3.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(p.user?.name || p.user?.phone || '餐').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.user?.name || p.user?.phone || '用户'}</p>
                    <p className="text-[11px] text-gray-400">{timeAgo(p.createdAt)}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLE[p.category] || 'bg-gray-100 text-gray-600'}`}>
                    {CATEGORY_LABEL[p.category] || '分享'}
                  </span>
                </div>

                {/* 标题与内容 */}
                <div className="px-4 pt-2.5 pb-3">
                  <p className="text-[15px] font-semibold text-gray-900 leading-snug">{p.title}</p>
                  {p.content && <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-3 whitespace-pre-line">{p.content}</p>}
                </div>

                {/* 图片 */}
                {images.length > 0 && (
                  <div className={`px-4 pb-3 grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 || images.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {images.slice(0, 9).map((img, idx) => (
                      <div key={idx} className={images.length === 1 ? 'max-h-64 w-full' : 'aspect-square'}>
                        <img
                          src={getImageUrl(img) || ''}
                          alt=""
                          className="w-full h-full object-cover rounded-lg bg-gray-100"
                          onClick={(e) => { e.stopPropagation(); }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* 视频 */}
                {p.videoUrl && (
                  <div className="px-4 pb-3">
                    <video
                      src={getImageUrl(p.videoUrl) || ''}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full rounded-lg bg-black"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {/* 操作栏 */}
                <div className="flex items-center px-4 py-2.5 border-t border-gray-50">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike(p.id); }}
                    disabled={!!likingId}
                    className={`flex items-center gap-1 text-sm transition-colors ${liked ? 'text-red-500' : 'text-gray-500'}`}
                  >
                    <span className="text-lg leading-none">{liked ? '❤️' : '🤍'}</span>
                    <span>{p.likeCount || 0}</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/share/${p.id}`); }}
                    className="flex items-center gap-1 text-sm text-gray-500 ml-6"
                  >
                    <span className="text-lg leading-none">💬</span>
                    <span>{p.commentCount || 0}</span>
                  </button>
                  <span className="ml-auto text-xs text-gray-300">
                    {new Date(p.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric' })}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* 加载更多 */}
        {posts.length > 0 && (
          <div className="text-center">
            {hasMore ? (
              <button onClick={handleLoadMore} className="px-6 py-2 text-xs text-gray-400">
                {loading ? '加载中...' : '加载更多'}
              </button>
            ) : (
              <p className="text-xs text-gray-300 py-2">— 已经到底啦 —</p>
            )}
          </div>
        )}
      </div>

      {/* 发布按钮 */}
      <button
        onClick={() => navigate('/share/create')}
        className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8C38] text-white text-3xl shadow-lg shadow-orange-300 flex items-center justify-center z-10"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        ＋
      </button>
    </div>
  );
}
