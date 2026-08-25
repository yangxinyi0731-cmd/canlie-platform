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

function EnterpriseStar({ level, str }: { level?: number; str?: string }) {
  if (!level || level <= 0) return <span className="text-xs text-gray-400">普通</span>;
  if (level >= 6) return <span className="text-xs text-yellow-600 font-bold">🏅 金牌</span>;
  return (
    <span className="text-yellow-500 text-xs">
      {'★'.repeat(Math.min(level, 5))}
    </span>
  );
}

function MatchCard({ match, onClick }: { match: Match; onClick: () => void }) {
  const job = match.job;
  const enterprise = job?.enterprise;
  const scoreBadge = getScoreBadge(match.score);
  const scoreBoxClass = getScoreBoxClass(match.score);

  // Summary dimension display
  const dims = [
    { key: 'salaryMatch', label: '薪资', v: match.salaryMatch },
    { key: 'experienceMatch', label: '经验', v: match.experienceMatch },
    { key: 'genderMatch', label: '性别', v: match.genderMatch },
    { key: 'tenureMatch', label: '任职', v: match.tenureMatch },
    { key: 'enterpriseMatch', label: '企业', v: match.enterpriseMatch },
    { key: 'brandMatch', label: '品牌', v: match.brandMatch },
  ];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm p-4 active:bg-gray-50 transition-colors cursor-pointer border border-gray-50 hover:border-orange-100"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{job?.title || '未知职位'}</h3>
            {match.score >= 80 && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">🔥 推荐</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-gray-500 truncate">{enterprise?.companyName || '未知企业'}</p>
            {enterprise?.starLevel != null && <EnterpriseStar level={enterprise.starLevel} str={enterprise.starLevelStr} />}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-bold text-[#FF6B00]">{formatSalary(job?.minSalary, job?.maxSalary)}</span>
            {job?.city && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                📍 {job.city}
              </span>
            )}
          </div>

          {/* Quick dimension scores */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {dims.map((d) => {
              const v = d.v ?? 0;
              return (
              <span key={d.key} className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                v >= 80 ? 'bg-green-50 text-green-600' : v >= 60 ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-500'
              }`}>
                {d.label} {v}
              </span>
              );
            })}
          </div>

          <div className="mt-2">
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium border ${scoreBadge.className}`}>
              {scoreBadge.label}
            </span>
            {job?.openPartner && <span className="ml-1 text-[10px] text-purple-500">🤝 可合伙</span>}
          </div>
        </div>

        {/* Score box */}
        <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-lg font-extrabold border ${scoreBoxClass}`}>
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
  const [sortBy, setSortBy] = useState<'score' | 'salary' | 'date'>('score');

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

  const sortedMatches = [...matches].sort((a, b) => {
    if (sortBy === 'salary') return (b.job?.maxSalary || 0) - (a.job?.maxSalary || 0);
    if (sortBy === 'date') return new Date(b.job?.createdAt || '').getTime() - new Date(a.job?.createdAt || '').getTime();
    return b.score - a.score;
  });

  const handleClick = (match: Match) => {
    navigate(`/jobs/${match.jobId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-gray-400">AI 匹配加载中...</span>
      </div>
    );
  }

  const highMatches = matches.filter(m => m.score >= 80).length;
  const midMatches = matches.filter(m => m.score >= 60 && m.score < 80).length;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">AI 智能匹配</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            共 {matches.length} 个匹配 · {highMatches} 高度 · {midMatches} 中等
          </p>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white"
        >
          <option value="score">按匹配度</option>
          <option value="salary">按薪资</option>
          <option value="date">按发布时间</option>
        </select>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 text-gray-300">📊</div>
          <p className="text-gray-500 text-sm mb-1">暂无智能匹配职位</p>
          <p className="text-gray-400 text-xs">完善您的简历信息，AI 将自动为您匹配适合的职位</p>
          <button
            onClick={() => navigate('/talent/edit')}
            className="mt-4 px-5 py-2 bg-[#FF6B00] text-white rounded-lg text-sm font-medium"
          >
            完善简历 →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMatches.map((match) => (
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
