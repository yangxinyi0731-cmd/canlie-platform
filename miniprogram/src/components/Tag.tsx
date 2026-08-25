import { Text } from '@tarojs/components';
import { ReactNode } from 'react';

interface TagProps {
  variant?: 'orange' | 'gray' | 'green' | 'blue' | 'purple' | 'yellow' | 'red';
  children: ReactNode;
  style?: React.CSSProperties;
}

/** 标签（还原网页版 .tag 五色变体） */
export default function Tag({ variant = 'gray', children, style }: TagProps) {
  return (
    <Text className={`tag tag-${variant}`} style={style}>
      {children}
    </Text>
  );
}
