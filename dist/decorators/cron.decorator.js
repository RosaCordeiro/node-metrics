"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronJob = cronJob;
const index_1 = require("../index");
const instrumentation_1 = require("../shared/providers/metrics/instrumentation");
const cronJobsExecuted = index_1.meter.createCounter('cron_jobs_executed_total', {
    description: 'Total de execuções de cron jobs'
});
const cronJobDuration = index_1.meter.createHistogram('cron_job_duration_seconds', {
    description: 'Duração das execuções dos cron jobs',
    advice: {
        explicitBucketBoundaries: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300]
    }
});
const cronJobErrors = index_1.meter.createCounter('cron_jobs_errors_total', {
    description: 'Total de erros em cron jobs'
});
function cronJob(jobName) {
    return function (target, propertyName, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const { apiName, environment } = (0, instrumentation_1.getEnvorimentVariables)();
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
            }
            catch (error) {
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
