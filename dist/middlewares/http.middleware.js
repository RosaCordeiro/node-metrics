"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpMetricsMiddleware = void 0;
const instrumentation_1 = require("./../shared/providers/metrics/instrumentation");
const httpRequestsTotal = instrumentation_1.meter.createCounter('http_requests_total', {
    description: 'Total de requisições HTTP',
    advice: {
        explicitBucketBoundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    }
});
const httpRequestDuration = instrumentation_1.meter.createHistogram('http_request_duration_seconds', {
    description: 'Duração das requisições HTTP em segundos',
    advice: {
        explicitBucketBoundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    }
});
const httpMetricsMiddleware = (req, res, next) => {
    const start = process.hrtime();
    const { apiName, environment } = (0, instrumentation_1.getEnvorimentVariables)();
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
exports.httpMetricsMiddleware = httpMetricsMiddleware;
