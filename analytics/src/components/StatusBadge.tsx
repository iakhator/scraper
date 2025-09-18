import { ScrapeJob } from '../types';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: ScrapeJob['status'];
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return '⏳';
      case 'processing':
        return '⚡';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border',
        getStatusStyles(),
        className
      )}
    >
      <span>{getStatusIcon()}</span>
      <span className="capitalize">{status}</span>
    </span>
  );
};
