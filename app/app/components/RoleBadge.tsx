import { getRoleName, getRoleBadgeColor, UserRole } from '@/app/lib/permissions';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function RoleBadge({ role, size = 'md', className = '' }: RoleBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${getRoleBadgeColor(role)} ${sizeClasses[size]} ${className}`}>
      {getRoleName(role)}
    </span>
  );
}

