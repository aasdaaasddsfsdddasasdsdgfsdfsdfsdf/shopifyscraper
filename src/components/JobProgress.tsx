import { CheckCircle, Loader2, XCircle, Pause } from 'lucide-react';
import { ScrapeJob } from '../lib/supabase';

interface JobProgressProps {
  job: ScrapeJob | null;
  currentProgress?: string;
}

export function JobProgress({ job, currentProgress }: JobProgressProps) {
  if (!job) return null;

  const getStatusIcon = () => {
    switch (job.status) {
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Pause className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`rounded-lg shadow-sm p-6 border ${getStatusColor()}`}>
      <div className="flex items-center gap-3 mb-4">
        {getStatusIcon()}
        <h3 className="text-lg font-semibold text-gray-800">{getStatusText()}</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Date Range:</span>
          <span className="font-medium text-gray-800">
            {job.start_date} to {job.end_date}
          </span>
        </div>

        {job.status === 'in_progress' && (
          <div className="flex justify-between">
            <span className="text-gray-600">Currently Processing:</span>
            <span className="font-medium text-gray-800">{currentProgress || job.processing_date}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-600">Records Scraped:</span>
          <span className="font-medium text-blue-600">{job.total_records.toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Started:</span>
          <span className="font-medium text-gray-800">
            {new Date(job.created_at).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
