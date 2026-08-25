import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sharesApi, getImageUrl, safeArray } from '../../api';
import type { SharePost } from '../../types';

const CATEGORY_LABEL: Record<string, string> = {
  STARTUP: '创业分享',
  LEARNING: '学习分享',
};

const STATUS_LABEL: Record<string, string> = {
  VISIBLE: '已发布',
  HIDDEN: '已隐藏',
};

function parseImages(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function MyShares() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<SharePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    sharesApi.getMy()
      .then((res) => setPosts(safeArray<SharePost>(res.data)))
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除该分享吗？')) return;
    try {
      await sharesApi.remove(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('删除失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 头部 */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-500">←</button>
          <h1 className="text-base font-bold text-gray-900">我的分享</h1>
          <button onClick={() => navigate('/share/create')} className="ml-auto px-4 py-1.5 bg-[#FF6B00] text-white text-xs font-medium rounded-full">
            ＋ 发布
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl py-12 text-center text-gray-400 text-sm">
            <div className="text-5xl mb-3">📝</div>
            还没有发布过分享
            <br />
            <button onClick={() => navigate('/share/create')} className="mt-4 px-6 py-2 bg-[#FF6B00] text-white text-xs rounded-lg">
              立即发布
            </button>
          </div>
        ) : (
          posts.map((p) => {
            const images = parseImages(p.images);
            return (
              <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm" onClick={() => navigate(`/share/${p.id}`)}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    p.category === 'STARTUP' ? 'bg-orange-50 text-[#FF6B00]' : 'bg-purple-50 text-purple-600'
                  }`}>
                    {CATEGORY_LABEL[p.category] || '分享'}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'VISIBLE' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {STATUS_LABEL[p.status] || p.status}
                  </span>
                </div>

                <p className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">{p.title}</p>
                {p.content && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{p.content}</p>}

                <div className="flex items-center gap-3 mt-3">
                  {images.length > 0 && (
                    <img src={getImageUrl(images[0]) || ''} alt="" className="w-16 h-12 rounded-lg object-cover border border-gray-100" />
                  )}
                  {p.videoUrl && <span className="text-xl">🎬</span>}
                  <span className="ml-auto text-xs text-gray-400">
                    👍 {p.likeCount} · 💬 {p.commentCount}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    {new Date(p.createdAt).toLocaleString('zh-CN')}
                  </span>
                  <div className="flex gap-3">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/share/${p.id}`); }} className="text-xs text-gray-500">
                      查看
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="text-xs text-red-500">
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
