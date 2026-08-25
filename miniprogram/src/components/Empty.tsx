import { View, Text } from '@tarojs/components';
import { ReactNode } from 'react';
import Icon from './Icon';
import './Empty.scss';

interface EmptyProps {
  text?: string;
  /** Icon 图标名（默认 briefcase） */
  icon?: string;
  emoji?: string;
  children?: ReactNode;
}

/** 空状态（还原网页版：w-20 圆底图标 + 灰字 + 可选操作按钮） */
export default function Empty({ text = '暂无数据', icon = 'briefcase', emoji, children }: EmptyProps) {
  return (
    <View className='empty-box'>
      <View className='empty-icon-wrap'>
        {emoji ? <Text className='empty-emoji'>{emoji}</Text> : <Icon name={icon} size={72} color='#D1D5DB' strokeWidth={1.5} />}
      </View>
      <Text className='empty-text'>{text}</Text>
      {children}
    </View>
  );
}
