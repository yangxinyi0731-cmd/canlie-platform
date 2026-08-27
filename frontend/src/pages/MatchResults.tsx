import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchesApi, jobsApi } from '../api';
import type { Match, Job } from '../types';

const BREAKDOWN_ITEMS: { key: string; label: string; icon: string }[] = [
  { key: 'salaryMatch', label: '薪资', icon: '💰' },
  { key: 'cuisineMatch', label: '菜系', icon: '🍳' },
  { key: 'businessMatch', label: '业态', icon: '🏢' },
  { key: 'cityMatch', label: '地域', icon: '📍' },
  { key: 'experienceMatch', label: '经验', icon: '📋' },
  { key: 'educationMatch', label: '学历', icon: '🎓' },
  { key: 'brandMatch', label: '品牌', icon: '⭐' },
  { key: 'stabilityMatch', label: '稳定性', icon: '🏠' },
  { key: 'growthMatch', label: '成长', icon: '📈' },
  { key: 'partnerMatch', label: '合伙', icon: '🤝' },
  { key: 'ageMatch', label: '年龄', icon: '🎂' },
  { key: 'skillMatch', label: '技能', icon: '🔧' },
  { key: 'genderMatch', label: '性别', icon: '👤' },
  { key: 'tenureMatch', label: '任职', icon: '⏳' },
  { key: 'enterpriseMatch', label: '企业', icon: '🏢' },
];

function getScoreLevel(score: number): { text: string; textColor: string; borderColor: string } {
  if (score >= 80) return { text: '高度匹配', textColor: 'text-green-600', borderColor: 'border-l-green-500' };
  if (score >= 60) return { text: '中等匹配', textColor: 'text-yellow-600', borderColor: 'border-l-yellow-500' };
  return { text: '低匹配', textColor: 'text-red-500', borderColor: 'border-l-red-500' };
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-green-50 text-green-700 border-green-200';
  if (score >= 60) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-400';
}

function StarDisplay({ level, str }: { level: number; str?: string }) {
  if (level >= 6) {
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">🏅 金牌</span>;
  }
  if (level <= 0) {
    return <span className="text-xs text-gray-400">普通</span>;
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-yellow-500">
      {Array.from({ length: Math.min(level, 5) }, (_, i) => (
        <span key={i} className="text-sm">★</span>
      ))}
    </span>
  );
}

function BreakdownBar({ value, label, icon }: { value: number; label: string; icon: string }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-sm w-6 text-center">{icon}</span>
      <span className="text-xs text-gray-500 w-10">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(v)}`}
          style={{ width: `${Math.max(3, v)}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${v >= 80 ? 'text-green-600' : v >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
        {v}
      </span>
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
          <span className="text-sm text-gray-500">AI 匹配计算中...</span>
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
            <button onClick={() => navigate(-1)} className="flex-shrink-0 text-gray-500 hover:text-gray-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-gray-900 truncate">{job?.title || 'AI 匹配结果'}</h1>
          </div>
          <button
            onClick={handleRematch}
            disabled={rematching}
            className="flex-shrink-0 px-4 py-1.5 bg-[#FF6B00] text-white text-sm rounded-lg font-medium disabled:opacity-50 hover:bg-[#e86000] transition-colors"
          >
            {rematching ? 'AI匹配中...' : '重新匹配'}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto">
        {matches.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 text-sm mb-1">暂无智能匹配结果</p>
            <p className="text-gray-400 text-xs mb-5">点击"重新匹配"，AI 将自动分析所有人才</p>
            <button
              onClick={handleRematch}
              disabled={rematching}
              className="px-6 py-2.5 bg-[#FF6B00] text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {rematching ? 'AI分析中...' : '开始 AI 匹配'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                AI 匹配 <span className="font-semibold text-gray-600">{matches.length}</span> 位候选人
              </p>
              <span className="text-xs text-gray-400">按匹配度排列</span>
            </div>

            {matches.map((match) => {
              const talent = match.talent;
              const scoreLevel = getScoreLevel(match.score);

              return (
                <div key={match.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${scoreLevel.borderColor} overflow-hidden`}>
                  {/* Header: Score + Basic Info */}
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Score Circle */}
                      <div className="flex-shrink-0 text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                          match.score >= 80 ? 'border-green-200 bg-green-50' :
                          match.score >= 60 ? 'border-yellow-200 bg-yellow-50' :
                          'border-red-200 bg-red-50'
                        }`}>
                          <div className="text-center">
                            <div className={`text-xl font-extrabold ${scoreLevel.textColor}`}>{match.score}</div>
                            <div className="text-[9px] text-gray-400 leading-none">匹配度</div>
                          </div>
                        </div>
                      </div>

                      {/* Talent Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{talent?.realName || '匿名人才'}</span>
                          <StarDisplay level={talent?.starLevel ?? 0} str={talent?.starLevelStr} />
                        </div>
                        <div className="text-sm text-gray-500 truncate">{talent?.title || '-'}</div>
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {[talent?.currentCompany, talent?.city].filter(Boolean).join(' · ') || '企业名称未授权展示'}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          {talent?.workYears != null && <span>🏗 {talent.workYears}年经验</span>}
                          {talent?.education && <span>🎓 {talent.education === 'BACHELOR' ? '本科' : talent.education === 'MASTER' ? '硕士' : talent.education === 'DOCTOR' ? '博士' : talent.education === 'ASSOCIATE' ? '大专' : talent.education === 'HIGH_SCHOOL' ? '高中' : talent.education}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Score Breakdown - 12 Dimensions */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2">AI 匹配维度分解</p>
                      <div className="space-y-0">
                        {BREAKDOWN_ITEMS.map((item) => (
                          <BreakdownBar
                            key={item.key}
                            label={item.label}
                            icon={item.icon}
                            value={(match as any)[item.key] ?? 0}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${getScoreBadgeClass(match.score)}`}>
                        {match.score >= 80 ? '🟢' : match.score >= 60 ? '🟡' : '🔴'} {scoreLevel.text}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/talents/${match.talentId}`)}
                          className="text-xs px-3 py-1.5 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          查看简历
                        </button>
                        <button
                          onClick={() => handleChat(match)}
                          className="text-xs px-4 py-1.5 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#e86000] transition-colors"
                        >
                          沟通
                        </button>
                      </div>
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
