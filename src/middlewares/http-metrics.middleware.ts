import { Request, Response, NextFunction } from 'express';
import { getEnvorimentVariables, meter } from '../shared/providers/metrics/main';

const httpRequestsTotal = meter.createCounter('http_requests_total', {
    description: 'Total de requisições HTTP',
    advice: {
        explicitBucketBoundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    }
});

const httpRequestDuration = meter.createHistogram('http_request_duration_seconds', {
    description: 'Duração das requisições HTTP em segundos',
    advice: {
        explicitBucketBoundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    }
});

export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();

    const { apiName, environment } = getEnvorimentVariables();

    res.on('finish', () => {
        const duration = process.hrtime(start);
        const durationSeconds = duration[0] + duration[1] / 1e9;

        // Registra as métricas
        httpRequestsTotal.add(1, {
            service_name: apiName,
            environment: environment,
            method: req.method,
            path: req.route?.path || req.path,
            status: res.statusCode.toString()
        });

        httpRequestDuration.record(durationSeconds, {
            service_name: apiName,
            environment: environment,
            method: req.method,
            path: req.route?.path || req.path,
            status: res.statusCode.toString()
        });
    });

    next();
};