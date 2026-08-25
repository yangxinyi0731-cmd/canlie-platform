import { View, Text } from '@tarojs/components';
import './Loading.scss';

/** 加载中（还原网页版：w-8 h-8 border-3 橙色顶边透明圆环旋转） */
export default function Loading({ text }: { text?: string }) {
  return (
    <View className='loading-wrap'>
      <View className='loading-spinner' />
      {text ? <View className='loading-text'>{text}</View> : null}
    </View>
  );
}
