import { Job } from '../types';
import { X, ExternalLink, Copy, Download } from 'lucide-react';
import { useState } from 'react';

interface JobModalProps {
  job: Job;
  onClose: () => void;
}

export const JobModal = ({ job, onClose }: JobModalProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'text' | 'links' | 'images'>('overview');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadContent = (content: string, filename: string, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!job.result) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'text', label: 'Content', count: job.result.text?.length || 0 },
    { id: 'links', label: 'Links', count: job.result.links?.length || 0 },
    { id: 'images', label: 'Images', count: job.result.images?.length || 0 },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Job Results</h2>
            <p className="text-sm text-gray-600 mt-1">{job.url}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-900">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Title:</span>
                  <p className="mt-1 text-gray-600">{job.result.title || 'No title'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">URL:</span>
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-1 text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {job.url}
                    <ExternalLink size={14} />
                  </a>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Content Length:</span>
                  <p className="mt-1 text-gray-600">{job.result.text?.length || 0} characters</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Links Found:</span>
                  <p className="mt-1 text-gray-600">{job.result.links?.length || 0}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Images Found:</span>
                  <p className="mt-1 text-gray-600">{job.result.images?.length || 0}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Scraped At:</span>
                  <p className="mt-1 text-gray-600">
                    {job.completedAt ? new Date(job.completedAt).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>

              {job.result.description && (
                <div>
                  <span className="font-medium text-gray-900">Description:</span>
                  <p className="mt-1 text-gray-600">{job.result.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Extracted Text</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(job.result?.text || '', 'text')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                  >
                    <Copy size={14} />
                    {copied === 'text' ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => downloadContent(job.result?.text || '', `${job.id}-content.txt`)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-900">
                  {job.result.text || 'No text content extracted'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Extracted Links</h3>
                {job.result.links && job.result.links.length > 0 && (
                  <button
                    onClick={() => downloadContent(
                      job.result?.links?.join('\n') || '', 
                      `${job.id}-links.txt`
                    )}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                  >
                    <Download size={14} />
                    Download
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-auto space-y-2">
                {job.result.links && job.result.links.length > 0 ? (
                  job.result.links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 text-blue-600 hover:text-blue-800 truncate"
                      >
                        {link}
                      </a>
                      <ExternalLink size={14} className="text-gray-400" />
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No links found</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Extracted Images</h3>
                {job.result.images && job.result.images.length > 0 && (
                  <button
                    onClick={() => downloadContent(
                      job.result?.images?.join('\n') || '', 
                      `${job.id}-images.txt`
                    )}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                  >
                    <Download size={14} />
                    Download
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                {job.result.images && job.result.images.length > 0 ? (
                  job.result.images.map((image, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <img 
                        src={image} 
                        alt={`Extracted ${index + 1}`}
                        className="w-full h-32 object-cover rounded mb-2"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <a 
                        href={image} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 truncate block"
                      >
                        {image}
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <p className="text-gray-500 text-center py-8">No images found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
