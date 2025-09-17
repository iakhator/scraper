import { useState } from 'react';
import { Job } from '../types';
import { JobCard } from './JobCard';
import { useJobs, useRetryJob } from '../hooks/useJobs';
import { Search, Filter, RefreshCw, Download } from 'lucide-react';
import { JobModal } from './JobModal';

interface JobListProps {
  searchTerm?: string;
  statusFilter?: Job['status'] | 'all';
}

export const JobList = ({ searchTerm = '', statusFilter = 'all' }: JobListProps) => {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [localFilter, setLocalFilter] = useState(statusFilter);
  
  const { data: jobsData, isLoading, refetch } = useJobs();
  const jobs = jobsData?.jobs || [];
  const retryJob = useRetryJob();

  // Filter jobs based on search and status
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = localSearch === '' || 
      job.url.toLowerCase().includes(localSearch.toLowerCase()) ||
      job.id.toLowerCase().includes(localSearch.toLowerCase());
    
    const matchesStatus = localFilter === 'all' || job.status === localFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleRetry = (job: Job) => {
    retryJob.mutate(job.id);
  };

  const handleViewResults = (job: Job) => {
    setSelectedJob(job);
  };

  const handleExportResults = () => {
    const completedJobs = filteredJobs.filter(job => job.status === 'completed' && job.result);
    const exportData = completedJobs.map(job => ({
      id: job.id,
      url: job.url,
      title: job.result?.title || '',
      text: job.result?.text || '',
      links: job.result?.links || [],
      images: job.result?.images || [],
      createdAt: job.createdAt,
      completedAt: job.completedAt
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraper-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<Job['status'], number>);

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search jobs by URL or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={localFilter}
                onChange={(e) => setLocalFilter(e.target.value as Job['status'] | 'all')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All ({jobs.length})</option>
                <option value="queued">Queued ({statusCounts.queued || 0})</option>
                <option value="processing">Processing ({statusCounts.processing || 0})</option>
                <option value="completed">Completed ({statusCounts.completed || 0})</option>
                <option value="failed">Failed ({statusCounts.failed || 0})</option>
              </select>
            </div>

            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            {filteredJobs.some(job => job.status === 'completed') && (
              <button
                onClick={handleExportResults}
                className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <Download size={16} />
                Export Results
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-600">
              <RefreshCw size={20} className="animate-spin" />
              <span>Loading jobs...</span>
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {localSearch || localFilter !== 'all' ? (
                <div>
                  <p className="text-lg font-medium mb-2">No jobs match your filters</p>
                  <p>Try adjusting your search terms or filters</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">No scraping jobs yet</p>
                  <p>Submit your first URL to get started</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewResults={handleViewResults}
                onRetry={handleRetry}
              />
            ))}
          </div>
        )}
      </div>

      {/* Job Results Modal */}
      {selectedJob && (
        <JobModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
};
