import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { metrics } from '@opentelemetry/api';
import { Request, Response } from 'express';

function getEnvorimentVariables() {
    const apiName = process.env.APINAME;
    const environment = process.env.AMBIENTE;

    if (!apiName || !environment) {
        throw new Error("Variáveis de ambiente APINAME and AMBIENTE precisam ser definidas para métricas.");
    }

    return { apiName, environment };
}

const prometheusExporter = new PrometheusExporter(
    { preventServerStart: true }
);

const meterProvider = new MeterProvider({
    readers: [prometheusExporter]
});

metrics.setGlobalMeterProvider(meterProvider);

const meter = metrics.getMeter(getEnvorimentVariables().apiName);

export { meter, getEnvorimentVariables }

export const metricsHandler = async (req: Request, res: Response) => {
    return prometheusExporter.getMetricsRequestHandler(req, res);
};
