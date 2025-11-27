"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsHandler = exports.meter = void 0;
exports.getEnvorimentVariables = getEnvorimentVariables;
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const api_1 = require("@opentelemetry/api");
function getEnvorimentVariables() {
    const apiName = process.env.APINAME;
    const environment = process.env.AMBIENTE;
    if (!apiName || !environment) {
        throw new Error("Variáveis de ambiente APINAME and AMBIENTE precisam ser definidas para métricas.");
    }
    return { apiName, environment };
}
const prometheusExporter = new exporter_prometheus_1.PrometheusExporter({ preventServerStart: true });
const meterProvider = new sdk_metrics_1.MeterProvider({
    readers: [prometheusExporter]
});
api_1.metrics.setGlobalMeterProvider(meterProvider);
const meter = api_1.metrics.getMeter(getEnvorimentVariables().apiName);
exports.meter = meter;
const metricsHandler = async (req, res) => {
    return prometheusExporter.getMetricsRequestHandler(req, res);
};
exports.metricsHandler = metricsHandler;
