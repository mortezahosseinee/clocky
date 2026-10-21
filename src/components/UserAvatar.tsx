import React from 'react';
import { isColorAvatar, getColorFromAvatar, isEmojiAvatar, parseEmojiAvatar } from '../utils/deviceAndIp';

interface UserAvatarProps {
  avatar?: string;
  firstName?: string;
  lastName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  rounded?: 'full' | 'xl' | '2xl' | 'lg';
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl'
};

const emojiSizeClasses = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
  '2xl': 'text-5xl'
};

const roundedClasses = {
  full: 'rounded-full',
  '2xl': 'rounded-2xl',
  xl: 'rounded-xl',
  lg: 'rounded-lg'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  firstName = '',
  lastName = '',
  size = 'md',
  className = '',
  rounded = 'xl'
}) => {
  const sizeCls = sizeClasses[size];
  const emojiCls = emojiSizeClasses[size];
  const roundCls = roundedClasses[rounded];
  const initial = (firstName[0] || lastName[0] || 'U').toUpperCase();

  if (avatar && isEmojiAvatar(avatar)) {
    const { emoji, bgColor } = parseEmojiAvatar(avatar);
    return (
      <div
        className={`${sizeCls} ${roundCls} flex items-center justify-center shadow-xs shrink-0 select-none ${className}`}
        style={{ backgroundColor: bgColor }}
      >
        <span className={`${emojiCls} leading-none`} role="img" aria-label="avatar">
          {emoji}
        </span>
      </div>
    );
  }

  if (avatar && isColorAvatar(avatar)) {
    const bgColor = getColorFromAvatar(avatar);
    return (
      <div
        className={`${sizeCls} ${roundCls} flex items-center justify-center font-bold text-white shadow-xs shrink-0 select-none ${className}`}
        style={{ backgroundColor: bgColor }}
      >
        <span>{initial}</span>
      </div>
    );
  }

  if (avatar && !isColorAvatar(avatar)) {
    return (
      <img
        src={avatar}
        alt={`${firstName} ${lastName}`}
        className={`${sizeCls} ${roundCls} object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeCls} ${roundCls} flex items-center justify-center font-bold text-white shadow-xs shrink-0 select-none ${className}`}
      style={{ backgroundColor: 'var(--primary-color, #2563eb)' }}
    >
      <span>{initial}</span>
    </div>
  );
};

