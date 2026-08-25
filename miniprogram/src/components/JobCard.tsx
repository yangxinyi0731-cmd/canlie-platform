import { View, Text, Image } from '@tarojs/components';
import type { Job } from '../types';
import { getImageUrl } from '../api';
import Icon from './Icon';
import './JobCard.scss';

interface JobCardProps {
  job: Job;
  /** 菜系 id->name 映射 */
  cuisineMap?: Record<string, string>;
  /** 业态 id->name 映射 */
  bizTypeMap?: Record<string, string>;
  onClick?: () => void;
}

/** 相对时间（还原网页版 timeAgo） */
export function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

/**
 * 职位卡片（1:1 还原网页版 Home 的职位卡：白卡 rounded-xl + 标题/橙薪资 + 菜系/业态/城市 tag + border-t 企业行）
 */
export default function JobCard({ job, cuisineMap = {}, bizTypeMap = {}, onClick }: JobCardProps) {
  const cuisineName = job.cuisineIds ? cuisineMap[job.cuisineIds] : '';
  const bizTypeName = job.businessTypeIds ? bizTypeMap[job.businessTypeIds] : '';
  const logo = getImageUrl(job.enterprise?.companyLogo);
  const salary = !job.minSalary && !job.maxSalary
    ? '面议'
    : `${job.minSalary ? `${job.minSalary / 1000}k` : ''}${job.minSalary && job.maxSalary ? '-' : ''}${job.maxSalary ? `${job.maxSalary / 1000}k` : ''}`;

  return (
    <View className='job-card' onClick={onClick} hoverClass='job-card-hover' hoverStayTime={80}>
      <View className='job-card-header'>
        <Text className='job-title'>{job.title}</Text>
        <Text className='job-salary'>{salary}</Text>
      </View>
      <View className='job-card-tags'>
        {cuisineName ? <Text className='chip chip-orange'>{cuisineName}</Text> : null}
        {bizTypeName ? <Text className='chip chip-blue'>{bizTypeName}</Text> : null}
        {job.city ? (
          <Text className='job-location'>
            {job.province ? `${job.province} ` : ''}{job.city} {job.district || ''}
          </Text>
        ) : null}
      </View>
      {job.enterprise ? (
        <View className='job-card-footer'>
          <View className='company-logo-wrap'>
            {logo ? (
              <Image src={logo} className='company-logo-img' mode='aspectFill' />
            ) : (
              <Text className='company-logo-text'>{job.enterprise.companyName?.charAt(0) || '企'}</Text>
            )}
          </View>
          <Text className='company-name'>{job.enterprise.companyName || ''}</Text>
          <Text className='job-time'>{timeAgo(job.createdAt)}</Text>
        </View>
      ) : null}
    </View>
  );
}
