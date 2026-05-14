import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchesApi } from '../api';
import type { Match } from '../types';

function getScoreBadge(score: number): { label: string; className: string } {
  if (score >= 80) return { label: '高度匹配', className: 'bg-green-50 text-green-700 border-green-200' };
  if (score >= 60) return { label: '中等匹配', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
  return { label: '较低匹配', className: 'bg-red-50 text-red-700 border-red-200' };
}

function getScoreBoxClass(score: number): string {
  if (score >= 80) return 'bg-green-50 text-green-600 border-green-200';
  if (score >= 60) return 'bg-yellow-50 text-yellow-600 border-yellow-200';
  return 'bg-red-50 text-red-600 border-red-200';
}

function formatSalary(min?: number, max?: number): string {
  if (min == null && max == null) return '薪资面议';
  const minK = min != null ? Math.round(min / 1000) : 0;
  const maxK = max != null ? Math.round(max / 1000) : 0;
  if (minK === maxK) return `${minK}K`;
  return `${minK}-${maxK}K`;
}

function MatchCard({ match, onClick }: { match: Match; onClick: () => void }) {
  const job = match.job;
  const scoreBadge = getScoreBadge(match.score);
  const scoreBoxClass = getScoreBoxClass(match.score);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm p-4 active:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {job?.title || '未知职位'}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5 truncate">
            {job?.enterprise?.companyName || '未知企业'}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-bold text-[#FF6B00]">
              {formatSalary(job?.minSalary, job?.maxSalary)}
            </span>
            {job?.city && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {job.city}
              </span>
            )}
          </div>
          <div className="mt-2">
            <span
              className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium border ${scoreBadge.className}`}
            >
              {scoreBadge.label}
            </span>
          </div>
        </div>

        {/* Score box */}
        <div
          className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-lg font-extrabold border ${scoreBoxClass}`}
        >
          {match.score}
        </div>
      </div>
    </div>
  );
}

export default function MyMatches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const res = await matchesApi.getMyMatches();
      const data: Match[] = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      data.sort((a, b) => b.score - a.score);
      setMatches(data);
    } catch (err) {
      console.error('Failed to load matches', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (match: Match) => {
    navigate(`/jobs/${match.jobId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-gray-400">加载中...</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">我的匹配职位</h1>

      {matches.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 text-gray-300">&#128200;</div>
          <p className="text-gray-400 text-sm mb-1">暂无匹配职位</p>
          <p className="text-gray-300 text-xs">
            完善您的简历信息，获取更多匹配推荐
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onClick={() => handleClick(match)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
