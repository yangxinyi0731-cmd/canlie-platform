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
  companySize?: string
  revenue?: string
  description?: string
  address?: string
  city?: string
  website?: string
  contactName?: string
  contactPhone?: string
  status: string
  _count?: { jobs: number }
}

export interface Talent {
  id: string
  userId: string
  realName?: string
  gender?: string
  birthYear?: number
  city?: string
  phone?: string
  email?: string
  avatar?: string
  title?: string
  currentCompany?: string
  minSalary?: number
  maxSalary?: number
  workYears?: number
  education?: string
  maritalStatus?: string
  hasChildren?: boolean
  hometown?: string
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
  resumes?: Resume[]
  verifications?: Verification[]
  _count?: { jobApplications: number }
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
  minSalary: number
  maxSalary: number
  salaryMonth: number
  city: string
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
  headcount: number
  status: string
  openPartner: boolean
  serviceType: string
  enterprise?: Enterprise
  _count?: { applications: number }
  createdAt: string
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
  totalScore: number
  talent?: Talent
  job?: Job
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
