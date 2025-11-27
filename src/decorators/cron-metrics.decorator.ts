import { meter } from '../index';
import { getEnvorimentVariables } from '../shared/providers/metrics/main';

const cronJobsExecuted = meter.createCounter('cron_jobs_executed_total', {
  description: 'Total de execuções de cron jobs'
});

const cronJobDuration = meter.createHistogram('cron_job_duration_seconds', {
  description: 'Duração das execuções dos cron jobs',
  advice: {
    explicitBucketBoundaries: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300]
  }
});

const cronJobErrors = meter.createCounter('cron_jobs_errors_total', {
  description: 'Total de erros em cron jobs'
});

export function cronJob(jobName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const { apiName, environment }  = getEnvorimentVariables();
      const labels = { 
        service_name: apiName, 
        environment, 
        job_name: jobName
      };

      const start = process.hrtime();
      
      try {
        const result = await originalMethod.apply(this, args);
        
        const duration = process.hrtime(start);
        const durationSeconds = duration[0] + duration[1] / 1e9;
        
        cronJobsExecuted.add(1, { ...labels, status: 'success' });
        cronJobDuration.record(durationSeconds, labels);
        
        return result;
      } catch (error: any) {
        const duration = process.hrtime(start);
        const durationSeconds = duration[0] + duration[1] / 1e9;
        
        cronJobsExecuted.add(1, { ...labels, status: 'error' });
        cronJobErrors.add(1, { ...labels, error_type: error.constructor.name });
        cronJobDuration.record(durationSeconds, labels);
        
        throw error;
      }
    };
    
    return descriptor;
  };
}