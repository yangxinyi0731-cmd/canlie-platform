export interface User {
  id: string
  phone: string
  name?: string
  avatar?: string
  role: 'TALENT' | 'ENTERPRISE' | 'ADMIN'
  status: string
  profile?: Enterprise | Talent
}

export interface Enterprise {
  id: string
  userId: string
  companyName: string
  companyLogo?: string
  businessLicense?: string
  licenseVerified: boolean
  isPreparation?: boolean
  personalIdFront?: string
  personalIdBack?: string
  companySize?: string
  revenue?: string
  description?: string
  address?: string
  city?: string
  province?: string
  website?: string
  contactName?: string
  contactPhone?: string
  status: string
  notes?: string
  starLevel: number
  starLevelStr: string
  businessModelDescription?: string
  developmentPlan?: string
  shareholderInfo?: string
  mainMarkets?: string
  welfareBenefits?: string
  currentStatus?: string
  bossInfo?: string
  equityOpportunity?: boolean
  _count?: { jobs: number }
}

export interface Talent {
  id: string
  userId: string
  realName?: string
  gender?: string
  birthYear?: number
  birthMonth?: number
  idNumber?: string
  city?: string
  province?: string
  phone?: string
  email?: string
  avatar?: string
  title?: string
  jobCategoryId?: string
  currentCompany?: string
  minSalary?: number
  maxSalary?: number
  workYears?: number
  education?: string
  maritalStatus?: string
  hasChildren?: boolean
  hometown?: string
  hometownProvince?: string
  cuisineIds?: string
  businessTypeIds?: string
  status: string
  privacyMode: string
  contactPrivacy: string
  acceptPartner: boolean
  starLevel: number
  starLevelStr: string
  brandEndorsement?: string
  headBrandExp?: string
  projectExp?: string
  selfIntro?: string
  parentInfo?: string
  learningAbility?: string
  thinkingStyle?: string
  personalSkills?: string
  brandExperienceDetail?: string
  projectExpDetail?: string
  preferredBusinessModel?: string
  resumes?: Resume[]
  verifications?: Verification[]
  workExperiences?: WorkExperience[]
  _count?: { jobApplications: number }
}

export interface WorkExperience {
  id: string
  talentId: string
  companyName: string
  position: string
  startYear: number
  startMonth: number
  endYear?: number
  endMonth?: number
  isCurrent: boolean
  description?: string
  bgRefName?: string
  bgRefTitle?: string
  bgRefPhone?: string
  createdAt?: string
}

export interface Resume {
  id: string
  talentId: string
  title: string
  content: string
  fileUrl?: string
  isDefault: boolean
}

export interface Verification {
  id: string
  talentId: string
  type: string
  refName?: string
  refTitle?: string
  refPhone?: string
  certFileUrl?: string
  salaryFileUrl?: string
  status: string
  createdAt: string
}

export interface Job {
  id: string
  enterpriseId: string
  title: string
  department?: string
  jobCategoryId?: string
  minSalary: number
  maxSalary: number
  salaryMonth: number
  city: string
  province?: string
  district?: string
  address?: string
  businessTypeIds: string
  cuisineIds?: string
  description: string
  requirements: string
  ageMin?: number
  ageMax?: number
  maritalReq?: string
  childrenReq?: string
  qualifications?: string
  educationReq?: string
  experienceReq?: number
  genderReq?: string
  minTenureReq?: number
  headcount: number
  status: string
  openPartner: boolean
  serviceType: string
  enterprise?: Enterprise
  _count?: { applications: number }
  createdAt: string
}

export interface JobCategory {
  id: string
  name: string
  sortOrder: number
  subCategories: JobSubCategory[]
}

export interface JobSubCategory {
  id: string
  categoryId: string
  name: string
  sortOrder: number
}

export interface ChinaCity {
  id: string
  name: string
  province: string
  level: string
  sortOrder: number
}

export interface ChatMessage {
  id: string
  senderId: string
  receiverId: string
  jobId?: string
  content: string
  type: string
  read: boolean
  createdAt: string
  sender: { id: string; name?: string; avatar?: string; role: string }
}

export interface ChatConversation {
  id: string
  chatWith: string
  jobId?: string
  unreadCount: number
  lastMessage?: string
  lastTime?: string
  otherUser: User
  otherProfile?: any
  job?: { id: string; title: string }
}

export interface Cuisine {
  id: string
  name: string
  level: number
  parentId?: string
  sortOrder: number
}

export interface BusinessType {
  id: string
  name: string
  sortOrder: number
}

export interface PaginatedResponse<T> {
  total: number
  page: number
  pageSize: number
  items?: T[]
}

export interface JobFavorite {
  id: string
  jobId: string
  talentId: string
  createdAt: string
  job?: Job & { enterprise?: Enterprise }
}

export interface JobApplication {
  id: string
  jobId: string
  talentId: string
  status: 'PENDING' | 'VIEWED' | 'CONTACTED' | 'REJECTED' | 'ACCEPTED'
  createdAt: string
  job?: Job & { enterprise?: Enterprise }
  talent?: Talent
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  content: string
  data?: string
  read: boolean
  createdAt: string
}

export interface Match {
  id: string
  jobId: string
  talentId: string
  score: number
  hardFilterPassed: boolean
  cuisineMatch: number
  salaryMatch: number
  cityMatch: number
  experienceMatch: number
  educationMatch: number
  skillMatch: number
  brandMatch: number
  stabilityMatch: number
  businessMatch?: number
  growthMatch?: number
  partnerMatch?: number
  ageMatch?: number
  genderMatch?: number
  tenureMatch?: number
  enterpriseMatch?: number
  totalScore: number
  talent?: Talent
  job?: Job
}

// ========== 供应平台 ==========

export interface SupplyCategory {
  id: string
  code: string
  name: string
  sortOrder: number
  active: boolean
}

export interface SupplyProduct {
  id: string
  companyId: string
  name: string
  price?: string
  images: string
  description?: string
  cuisineIds?: string
  createdAt: string
}

export interface SupplyCompany {
  id: string
  userId: string
  categoryId: string
  companyName: string
  businessLicense?: string
  productDesc?: string
  services?: string
  introduction?: string
  contactName?: string
  contactPhone?: string
  cuisineIds?: string
  status: string
  reason?: string
  createdAt: string
  category?: SupplyCategory
  products?: SupplyProduct[]
  _count?: { products: number }
}

// ========== 创业分享/学习分享 ==========

export interface ShareComment {
  id: string
  postId: string
  userId: string
  content: string
  createdAt: string
  user?: { id: string; name?: string; avatar?: string; phone?: string }
}

export interface SharePost {
  id: string
  userId: string
  category: string
  title: string
  content?: string
  images: string
  videoUrl?: string
  likeCount: number
  commentCount: number
  status: string
  createdAt: string
  user?: { id: string; name?: string; avatar?: string; phone?: string }
  likedByMe?: boolean
  comments?: ShareComment[]
}
