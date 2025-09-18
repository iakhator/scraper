import { Job } from '../types';
import { StatusBadge } from './StatusBadge';
import { Eye, Download, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JobCardProps {
  job: Job;
  onViewResults?: (job: Job) => void;
  onRetry?: (job: Job) => void;
}

export const JobCard = ({ job, onViewResults, onRetry }: JobCardProps) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'queued':
        return <Clock size={14} className="text-yellow-500" />;
      case 'processing':
        return <RefreshCw size={14} className="text-blue-500 animate-spin" />;
      case 'completed':
        return <Eye size={14} className="text-green-500" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return null;
    }
  };

  const canRetry = job.status === 'failed';
  const canViewResults = job.status === 'completed' && job.result;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(job.status)}
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {job.url}
            </h3>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span>ID: {job.id}</span>
            <span>Priority: {job.priority}</span>
            <span>Created: {formatDate(job.createdAt)}</span>
            {job.completedAt && (
              <span>Completed: {formatDate(job.completedAt)}</span>
            )}
          </div>

          {job.error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <strong>Error:</strong> {job.error}
            </div>
          )}

          {job.result && (
            <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
              <div className="grid grid-cols-2 gap-2">
                <span><strong>Title:</strong> {job.result.title || 'N/A'}</span>
                <span><strong>Links:</strong> {job.result.links?.length || 0}</span>
                <span><strong>Text Length:</strong> {job.result.text?.length || 0} chars</span>
                <span><strong>Images:</strong> {job.result.images?.length || 0}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={job.status} />
          
          <div className="flex gap-1">
            {canViewResults && (
              <button
                onClick={() => onViewResults?.(job)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                title="View Results"
              >
                <Eye size={12} />
                View
              </button>
            )}
            
            {job.result?.downloadUrl && (
              <a
                href={job.result.downloadUrl}
                download
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                title="Download Results"
              >
                <Download size={12} />
                Download
              </a>
            )}
            
            {canRetry && (
              <button
                onClick={() => onRetry?.(job)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
                title="Retry Job"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
