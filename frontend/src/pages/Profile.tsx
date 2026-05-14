import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  FileText,
  HeartHandshake,
  ShieldCheck,
  LogOut,
  Building2,
  PlusCircle,
  Search,
  MapPin,
  ChevronRight,
  Briefcase,
  Heart,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { enterpriseApi, talentsApi } from '../api';
import type { Talent, Enterprise } from '../types';

// ---------- Education Label Map ----------
const educationMap: Record<string, string> = {
  '1': '学历不限', '2': '初中及以下', '3': '中专/中技', '4': '高中',
  '5': '大专', '6': '本科', '7': '硕士', '8': '博士',
};

// ---------- Star Rating Component ----------
function StarRating({ level }: { level: number }) {
  const max = 5;
  return (
    <span className="star-level">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`star ${i < level ? 'filled' : 'empty'}`}>
          &#9733;
        </span>
      ))}
    </span>
  );
}

// ---------- Salary Display Helper ----------
function formatSalary(min?: number, max?: number): string {
  if (min != null && max != null) return `${min}k-${max}k`;
  if (min != null) return `${min}k以上`;
  if (max != null) return `${max}k以下`;
  return '面议';
}

// ---------- Section Wrapper ----------
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card mx-4 mb-3 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

// ---------- Action Button ----------
interface ActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

function ActionList({ items }: { items: ActionItem[] }) {
  return (
    <div className="divide-y divide-gray-50">
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={item.onClick}
          className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors ${
            item.danger ? 'text-red-500' : 'text-gray-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`${item.danger ? 'text-red-400' : 'text-gray-400'}`}>
              {item.icon}
            </span>
            <span className={`text-sm ${item.danger ? 'font-medium' : ''}`}>{item.label}</span>
          </div>
          <ChevronRight className={`w-4 h-4 ${item.danger ? 'text-red-300' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

// ================================================================
// TALENT Profile
// ================================================================
function TalentProfile({ profile }: { profile: Talent }) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  // Determine display name
  const displayName = profile.realName || '未设置姓名';
  const title = profile.title || '未设置职位';
  const city = profile.city || '';
  const salary = formatSalary(profile.minSalary, profile.maxSalary);
  const educationLabel = profile.education ? (educationMap[profile.education] || profile.education) : null;
  const workYearsLabel = profile.workYears != null ? `${profile.workYears}年经验` : null;

  const actions: ActionItem[] = [
    {
      label: '编辑简历',
      icon: <FileText className="w-5 h-5" />,
      onClick: () => navigate('/talent/edit'),
    },
    {
      label: '我的匹配',
      icon: <HeartHandshake className="w-5 h-5" />,
      onClick: () => navigate('/talent/matches'),
    },
    {
      label: '投递记录',
      icon: <Briefcase className="w-5 h-5" />,
      onClick: () => navigate('/talent/applications'),
    },
    {
      label: '我的收藏',
      icon: <Heart className="w-5 h-5" />,
      onClick: () => navigate('/talent/favorites'),
    },
    {
      label: '认证材料',
      icon: <ShieldCheck className="w-5 h-5" />,
      onClick: () => navigate('/talent/edit?section=verification'),
    },
    {
      label: '隐私设置',
      icon: <Settings className="w-5 h-5" />,
      onClick: () => navigate('/talent/edit?section=privacy'),
    },
    {
      label: '退出登录',
      icon: <LogOut className="w-5 h-5" />,
      onClick: logout,
      danger: true,
    },
  ];

  return (
    <div className="py-4">
      {/* ===== Profile Card ===== */}
      <Section>
        <div className="px-4 pt-6 pb-5 text-center">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8C38] mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-orange-200 mb-3">
            {displayName.charAt(0)}
          </div>

          {/* Name */}
          <h2 className="text-lg font-bold text-gray-900 mb-1">{displayName}</h2>

          {/* Star Level */}
          {profile.starLevel > 0 && (
            <div className="flex items-center justify-center gap-1 mb-2">
              <StarRating level={profile.starLevel} />
              {profile.starLevelStr && (
                <span className="text-xs text-gray-400 ml-1">({profile.starLevelStr})</span>
              )}
            </div>
          )}

          {/* Title */}
          <p className="text-sm text-gray-600 mb-1">{title}</p>

          {/* Tags row */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {city && (
              <span className="tag-gray">
                <MapPin className="w-3 h-3 mr-1" />
                {city}
              </span>
            )}
            {educationLabel && <span className="tag-gray">{educationLabel}</span>}
            {workYearsLabel && <span className="tag-gray">{workYearsLabel}</span>}
          </div>

          {/* Salary */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">期望薪资</span>
            <p className="text-lg font-bold text-[#FF6B00]">{salary}</p>
          </div>
        </div>
      </Section>

      {/* ===== Actions ===== */}
      <Section>
        <ActionList items={actions} />
      </Section>

      {/* Version info */}
      <p className="text-center text-[11px] text-gray-300 mt-4">餐猎 v1.0.0</p>
    </div>
  );
}

// ================================================================
// ENTERPRISE Profile
// ================================================================
function EnterpriseProfile({ profile }: { profile: Enterprise }) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const jobCount = profile._count?.jobs ?? 0;

  const actions: ActionItem[] = [
    {
      label: '企业信息',
      icon: <Building2 className="w-5 h-5" />,
      onClick: () => navigate('/enterprise/edit'),
    },
    {
      label: '发布职位',
      icon: <PlusCircle className="w-5 h-5" />,
      onClick: () => navigate('/enterprise/post-job'),
    },
    {
      label: '人才搜索',
      icon: <Search className="w-5 h-5" />,
      onClick: () => navigate('/enterprise/talent-search'),
    },
    {
      label: '退出登录',
      icon: <LogOut className="w-5 h-5" />,
      onClick: logout,
      danger: true,
    },
  ];

  return (
    <div className="py-4">
      {/* ===== Company Card ===== */}
      <Section>
        <div className="px-4 pt-6 pb-5">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF8C38] flex items-center justify-center text-white text-xl font-bold shadow-md shadow-orange-200 flex-shrink-0">
              {profile.companyName ? profile.companyName.charAt(0) : '企'}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {profile.companyName || '未设置企业名称'}
              </h2>
              {profile.city && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.city}
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{jobCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">在招职位</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {profile.licenseVerified ? '已认证' : '未认证'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">企业认证</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {profile.companySize || '-'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">公司规模</p>
            </div>
          </div>

          {/* Description */}
          {profile.description && (
            <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-2">
              {profile.description}
            </p>
          )}
        </div>
      </Section>

      {/* ===== Actions ===== */}
      <Section>
        <ActionList items={actions} />
      </Section>

      {/* Version info */}
      <p className="text-center text-[11px] text-gray-300 mt-4">餐猎 v1.0.0</p>
    </div>
  );
}

// ================================================================
// Loading Skeleton
// ================================================================
function ProfileSkeleton() {
  return (
    <div className="py-4 animate-pulse">
      <div className="card mx-4 mb-3 px-4 pt-6 pb-5">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-3" />
          <div className="h-5 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-20" />
        </div>
      </div>
      <div className="card mx-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0">
            <div className="w-5 h-5 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ================================================================
// Main Profile Component
// ================================================================
export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [profileData, setProfileData] = useState<Talent | Enterprise | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch profile data if user.profile is null
  useEffect(() => {
    if (!user) return;
    if (user.profile) {
      setProfileData(user.profile as Talent | Enterprise);
      return;
    }
    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (user.role === 'TALENT') {
          const res = await talentsApi.getProfile();
          setProfileData(res.data);
          updateUser({ ...user, profile: res.data });
        } else if (user.role === 'ENTERPRISE') {
          const res = await enterpriseApi.getProfile();
          setProfileData(res.data);
          updateUser({ ...user, profile: res.data });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6">
        <User className="w-16 h-16 text-gray-200 mb-3" />
        <p className="text-sm">请先登录</p>
      </div>
    );
  }

  // Loading state
  if (loading || !profileData) {
    return <ProfileSkeleton />;
  }

  // Render based on role
  switch (user.role) {
    case 'TALENT':
      return <TalentProfile profile={profileData as Talent} />;
    case 'ENTERPRISE':
      return <EnterpriseProfile profile={profileData as Enterprise} />;
    case 'ADMIN':
      return <AdminProfile />;
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6">
          <User className="w-16 h-16 text-gray-200 mb-3" />
          <p className="text-sm">未知用户角色</p>
        </div>
      );
  }
}

// ================================================================
// ADMIN Profile
// ================================================================
function AdminProfile() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="py-4">
      <Section>
        <div className="px-4 pt-6 pb-5 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-md mb-3">
            A
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">管理员</h2>
          <p className="text-sm text-gray-500">平台管理权限</p>
        </div>
      </Section>

      <Section>
        <div className="divide-y divide-gray-50">
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors text-gray-700"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span className="text-sm">管理后台</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors text-red-500"
          >
            <div className="flex items-center gap-3">
              <span className="text-red-400">
                <LogOut className="w-5 h-5" />
              </span>
              <span className="text-sm font-medium">退出登录</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-300" />
          </button>
        </div>
      </Section>

      <p className="text-center text-[11px] text-gray-300 mt-4">餐猎 v1.0.0</p>
    </div>
  );
}
