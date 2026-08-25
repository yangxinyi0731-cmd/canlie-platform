import { Text } from '@tarojs/components';

interface StarRatingProps {
  value?: number;
  /** 星星字号 rpx（默认 28rpx = 网页 14px） */
  size?: number;
}

/** 星级（还原网页版 .star-level：黄星 + 灰空星） */
export default function StarRating({ value = 0, size = 28 }: StarRatingProps) {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(
      <Text key={i} className={`star ${i < value ? '' : 'empty'}`} style={{ fontSize: `${size}rpx` }}>
        ★
      </Text>
    );
  }
  return <Text className='star-level'>{stars}</Text>;
}
