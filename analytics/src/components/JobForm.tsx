import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateJob, useCreateBulkJobs } from '../hooks/useJobs';
import { Plus, Upload, Loader2 } from 'lucide-react';

interface JobFormData {
  url: string;
  urls: string;
  priority: 'low' | 'medium' | 'high';
}

export const JobForm = () => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<JobFormData>({
    defaultValues: {
      priority: 'medium'
    }
  });

  const createJob = useCreateJob();
  const createBulkJobs = useCreateBulkJobs();

  const onSubmit = (data: JobFormData) => {
    if (mode === 'single') {
      createJob.mutate({
        url: data.url,
        priority: data.priority,
      }, {
        onSuccess: () => {
          reset();
        }
      });
    } else {
      const urls = data.urls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      createBulkJobs.mutate({
        urls,
        priority: data.priority,
      }, {
        onSuccess: () => {
          reset();
        }
      });
    }
  };

  const isLoading = createJob.isPending || createBulkJobs.isPending;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Submit URLs for Scraping</h2>
      </div>

      {/* Mode Toggle */}
      <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'single'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus size={16} />
          Single URL
        </button>
        <button
          type="button"
          onClick={() => setMode('bulk')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'bulk'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload size={16} />
          Bulk URLs
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mode === 'single' ? (
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              URL to Scrape
            </label>
            <input
              id="url"
              type="url"
              {...register('url', { 
                required: 'URL is required',
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: 'Please enter a valid URL'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="https://example.com"
            />
            {errors.url && (
              <p className="text-red-600 text-sm mt-1">{errors.url.message}</p>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="urls" className="block text-sm font-medium text-gray-700 mb-1">
              URLs to Scrape (one per line)
            </label>
            <textarea
              id="urls"
              rows={6}
              {...register('urls', { 
                required: 'At least one URL is required',
                validate: (value) => {
                  const urls = value.split('\n').filter(url => url.trim());
                  if (urls.length === 0) return 'At least one URL is required';
                  if (urls.length > 100) return 'Maximum 100 URLs allowed';
                  
                  const invalidUrls = urls.filter(url => !/^https?:\/\/.+/.test(url.trim()));
                  if (invalidUrls.length > 0) return 'All URLs must be valid (start with http:// or https://)';
                  
                  return true;
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="https://example.com&#10;https://another-site.com&#10;https://third-site.com"
            />
            {errors.urls && (
              <p className="text-red-600 text-sm mt-1">{errors.urls.message}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="priority"
            {...register('priority')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Plus size={16} />
              {mode === 'single' ? 'Submit URL' : 'Submit URLs'}
            </>
          )}
        </button>
      </form>

      {(createJob.error || createBulkJobs.error) && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">
            {createJob.error?.message || createBulkJobs.error?.message}
          </p>
        </div>
      )}
    </div>
  );
};
