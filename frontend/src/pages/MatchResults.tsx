import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchesApi, jobsApi } from '../api';
import type { Match, Job } from '../types';

const BREAKDOWN_ITEMS: { key: keyof Pick<Match, 'cuisineMatch' | 'salaryMatch' | 'cityMatch' | 'experienceMatch' | 'brandMatch' | 'stabilityMatch'>; label: string }[] = [
  { key: 'cuisineMatch', label: '菜系' },
  { key: 'salaryMatch', label: '薪资' },
  { key: 'cityMatch', label: '城市' },
  { key: 'experienceMatch', label: '经验' },
  { key: 'brandMatch', label: '品牌' },
  { key: 'stabilityMatch', label: '稳定性' },
];

function getScoreLevel(score: number): { text: string; bg: string; border: string } {
  if (score >= 80) return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-l-green-500' };
  if (score >= 60) return { text: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-l-yellow-500' };
  return { text: 'text-red-500', bg: 'bg-red-50', border: 'border-l-red-500' };
}

function getScoreLabel(score: number): string {
  if (score >= 80) return '高度匹配';
  if (score >= 60) return '中等匹配';
  return '低匹配';
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-green-50 text-green-700';
  if (score >= 60) return 'bg-yellow-50 text-yellow-700';
  return 'bg-red-50 text-red-700';
}

function StarDisplay({ level }: { level: number }) {
  if (level >= 6) {
    return (
      <span className="star-level">
        <span className="text-yellow-500 font-bold text-xs">金牌</span>
      </span>
    );
  }
  if (level <= 0) {
    return <span className="text-xs text-gray-400">普通</span>;
  }
  return (
    <span className="star-level">
      {Array.from({ length: Math.min(level, 5) }, (_, i) => (
        <span key={i} className="star">
          &#9733;
        </span>
      ))}
    </span>
  );
}

function BreakdownBar({ value, label }: { value: number; label: string }) {
  const level = getScoreLevel(value ?? 0);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-sm font-bold ${level.text}`}>{value ?? 0}</span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
}

export default function MatchResults() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [rematching, setRematching] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobRes, matchRes] = await Promise.all([
        jobsApi.getById(jobId!).catch(() => null),
        matchesApi.getJobMatches(jobId!),
      ]);
      if (jobRes) setJob(jobRes.data);

      const raw = Array.isArray(matchRes.data) ? matchRes.data : matchRes.data?.items ?? [];
      const sorted: Match[] = raw.sort((a: Match, b: Match) => b.score - a.score);
      setMatches(sorted);
    } catch (err) {
      console.error('Failed to load match data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRematch = async () => {
    if (!jobId) return;
    setRematching(true);
    try {
      await matchesApi.runMatch(jobId);
      await loadData();
    } catch (err) {
      console.error('Rematch failed', err);
      alert('重新匹配失败，请重试');
    } finally {
      setRematching(false);
    }
  };

  const handleChat = (match: Match) => {
    const talentUserId = match.talent?.userId;
    if (!talentUserId) return;
    navigate(`/chat/${talentUserId}?jobId=${match.jobId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 app-container">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-gray-900 truncate">
              {job?.title || '匹配结果'}
            </h1>
          </div>
          <button
            onClick={handleRematch}
            disabled={rematching}
            className="flex-shrink-0 btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
          >
            {rematching ? '匹配中...' : '重新匹配'}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto">
        {matches.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 text-gray-300">&#128269;</div>
            <p className="text-gray-400 text-sm mb-1">暂无匹配结果</p>
            <p className="text-gray-300 text-xs">
              点击「重新匹配」开始匹配人才
            </p>
            <button
              onClick={handleRematch}
              disabled={rematching}
              className="btn-primary mt-5 text-sm disabled:opacity-50"
            >
              {rematching ? '匹配中...' : '开始匹配'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-400">
              共找到 <span className="font-medium text-gray-500">{matches.length}</span> 个匹配人才
            </p>
            {matches.map((match) => {
              const talent = match.talent;
              const scoreLevel = getScoreLevel(match.score);
              return (
                <div
                  key={match.id}
                  className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${scoreLevel.border} slide-up`}
                >
                  {/* Top row: score + basic info */}
                  <div className="flex items-start gap-4">
                    {/* Score circle */}
                    <div className="flex-shrink-0 text-center w-16">
                      <div className={`text-3xl font-extrabold ${scoreLevel.text}`}>
                        {match.score}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">匹配度</div>
                    </div>

                    {/* Talent info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-base">
                          {talent?.realName || '未知'}
                        </span>
                        <StarDisplay level={talent?.starLevel ?? 0} />
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {talent?.title || '-'}
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">
                        {talent?.currentCompany || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Score breakdown grid */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {BREAKDOWN_ITEMS.map((item) => (
                        <BreakdownBar
                          key={item.key}
                          label={item.label}
                          value={match[item.key] ?? 0}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Bottom actions */}
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${getScoreBadgeClass(match.score)}`}
                    >
                      {getScoreLabel(match.score)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleChat(match)}
                        className="btn-primary text-xs px-5 py-1.5"
                      >
                        沟通
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
