"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsHandler = exports.meter = void 0;
exports.getEnvorimentVariables = getEnvorimentVariables;
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const api_1 = require("@opentelemetry/api");
const os_1 = __importDefault(require("os"));
const v8_1 = __importDefault(require("v8"));
const fs_1 = __importDefault(require("fs"));
const perf_hooks_1 = require("perf_hooks");
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
/* Métricas de memória */
/*** Memória Total ***/
const memoryTotal = meter.createObservableGauge('custom_telemetry_host_memory_total_bytes', { description: 'RAM total disponivel' });
const { apiName, environment } = getEnvorimentVariables();
memoryTotal.addCallback(result => {
    result.observe(os_1.default.totalmem(), { service_name: apiName, environment });
});
/*** Memória heap utilizada ***/
const memoryHeapUsed = meter.createObservableGauge('custom_telemetry_process_memory_heap_used_bytes', { description: 'Heap JS em uso' });
memoryHeapUsed.addCallback(result => { result.observe(process.memoryUsage().heapUsed, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }); });
/*** Memória heap alocada ***/
const memoryHeapTotal = meter.createObservableGauge('custom_telemetry_process_memory_heap_total_bytes', { description: 'Heap JS alocada' });
memoryHeapTotal.addCallback(result => { result.observe(process.memoryUsage().heapTotal, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }); });
/*** Memória heap alocada ***/
const memoryHeapTotalGauge = meter.createObservableGauge('custom_telemetry_process_memory_heap_bytes', { description: 'Heap JS alocada (Gauge)' });
memoryHeapTotalGauge.addCallback(result => { result.observe((process.memoryUsage().heapTotal / os_1.default.totalmem()) * 100, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }); });
/*** Memória heap limíte ***/
const memoryHeapLimit = meter.createObservableGauge('custom_telemetry_process_memory_heap_limit_bytes', { description: 'Limite maximo da heap' });
memoryHeapLimit.addCallback(result => { result.observe(v8_1.default.getHeapStatistics().heap_size_limit, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }); });
/*** RAM usada ***/
const memoryRAMUsed = meter.createObservableGauge('custom_telemetry_process_memory_rss_bytes', { description: 'RAM real usada pelo Node' });
memoryRAMUsed.addCallback(result => { result.observe(process.memoryUsage().rss, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }); });
const memoryContainerTotal = meter.createObservableGauge('custom_telemetry_container_memory_limit_bytes', {
    description: 'RAM limite do container'
});
memoryContainerTotal.addCallback(result => {
    try {
        // Usar CGroup v2 que encontramos
        const memLimit = fs_1.default.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
        const containerMemLimit = memLimit === 'max' ? os_1.default.totalmem() : parseInt(memLimit);
        result.observe(containerMemLimit, { service_name: apiName, environment });
    }
    catch (error) {
        result.observe(1073741824, { service_name: apiName, environment });
    }
});
const memoryContainerUsed = meter.createObservableGauge('custom_telemetry_container_memory_used_bytes', {
    description: 'RAM usada no container (compatível com docker stats)'
});
memoryContainerUsed.addCallback(result => {
    try {
        const stat = fs_1.default.readFileSync('/sys/fs/cgroup/memory.stat', 'utf8');
        const stats = {};
        stat.split('\n').forEach(line => {
            const [key, value] = line.split(' ');
            if (key && value)
                stats[key] = parseInt(value);
        });
        const usedMem = stats['anon'] + (stats['active_file'] || 0);
        result.observe(usedMem, { service_name: apiName, environment });
    }
    catch (error) {
        // Fallback
        result.observe(process.memoryUsage().rss, { service_name: apiName, environment });
    }
});
/* CPU */
/*** Tempo CPU usuário ***/
const cpuUserGauge = meter.createObservableGauge('custom_telemetry_process_cpu_user_seconds_total', { description: 'Tempo de CPU em modo usuario gasto pelo processo Node.js' });
cpuUserGauge.addCallback(result => {
    const usage = process.cpuUsage();
    result.observe(usage.user / 1e6, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });
});
/*** Tempo CPU sistema ***/
const cpuSystemGauge = meter.createObservableGauge('custom_telemetry_process_cpu_system_seconds_total', { description: 'Tempo de CPU em modo sistema gasto pelo processo Node.js' });
cpuSystemGauge.addCallback(result => {
    const usage = process.cpuUsage();
    result.observe(usage.system / 1e6, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });
});
/*** Tempo CPU processo ***/
const cpuPercentGauge = meter.createObservableGauge('custom_telemetry_process_cpu_percent', {
    description: 'Percentual de uso de CPU do processo Node.js'
});
let lastCpuUsage = process.cpuUsage();
let lastTime = process.hrtime.bigint();
cpuPercentGauge.addCallback(result => {
    const currentUsage = process.cpuUsage();
    const currentTime = process.hrtime.bigint();
    // Calcular diferença desde última medição
    const diffUser = currentUsage.user - lastCpuUsage.user;
    const diffSystem = currentUsage.system - lastCpuUsage.system;
    const elapsedMs = Number(currentTime - lastTime) / 1e6;
    const cpuPercent = (diffUser + diffSystem) / 1000 / elapsedMs * 100 / os_1.default.cpus().length;
    result.observe(cpuPercent, { service_name: apiName, environment });
    // Atualizar estado
    lastCpuUsage = currentUsage;
    lastTime = currentTime;
});
/*** Tempo CPU host ***/
let lastHostTimes = os_1.default.cpus().map(cpu => cpu.times);
const hostCpuUsageGauge = meter.createObservableGauge('custom_telemetry_host_cpu_usage_percent', { description: 'Percentual medio de uso de CPU no host/container' });
hostCpuUsageGauge.addCallback(result => {
    const cpus = os_1.default.cpus();
    let idleDiff = 0, totalDiff = 0;
    cpus.forEach((cpu, i) => {
        const old = lastHostTimes[i];
        const idle = cpu.times.idle - old.idle;
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0) -
            Object.values(old).reduce((a, b) => a + b, 0);
        idleDiff += idle;
        totalDiff += total;
    });
    const usagePercent = 100 * (1 - idleDiff / totalDiff);
    result.observe(usagePercent, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });
    lastHostTimes = cpus.map(cpu => cpu.times);
});
/* CPU */
/*** Up Time ***/
const upTime = meter.createObservableGauge('custom_telemetry_process_uptime_seconds', { description: 'Tempo total que o processo esta em execucao.' });
upTime.addCallback(result => { result.observe(process.uptime(), { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }); });
/*** EventLoop ***/
const h = (0, perf_hooks_1.monitorEventLoopDelay)({ resolution: 10 });
h.enable();
const lagGauge = meter.createObservableGauge('custom_telemetry_event_loop_lag_seconds', {
    description: 'Atraso medio do event loop em segundos',
});
lagGauge.addCallback((result) => {
    const lagSec = h.mean / 1e9; // mean está em nanosegundos
    result.observe(lagSec, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });
});
/*** Arquivos (FS) ***/
const fdsGauge = meter.createObservableGauge('custom_telemetry_process_open_fds', { description: 'Numero de descritores de arquivo abertos' });
fdsGauge.addCallback((result) => {
    const fdCount = fs_1.default.readdirSync('/proc/self/fd').length;
    result.observe(fdCount, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });
});
/*** Processos ativos ***/
const handlesGauge = meter.createObservableGauge('custom_telemetry_process_active_handles', { description: 'Numero de handles ativos (timers, sockets, etc.)' });
handlesGauge.addCallback((result) => {
    const activeHandles = process._getActiveHandles().length;
    result.observe(activeHandles, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });
});
/*** Tempo Garbage Collection ***/
const gcGauge = meter.createObservableGauge('custom_telemetry_process_gc_duration_seconds', { description: 'Tempo gasto em garbage collection (segundos)' });
let gcTotalNs = 0;
const obs = new perf_hooks_1.PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
        if (entry.entryType === 'gc') {
            gcTotalNs += entry.duration * 1e6; // entry.duration em ms → ns
        }
    });
});
obs.observe({ entryTypes: ['gc'], buffered: true });
gcGauge.addCallback((result) => {
    result.observe(gcTotalNs / 1e9, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }); // converte ns → s
});
const metricsHandler = async (req, res) => {
    return prometheusExporter.getMetricsRequestHandler(req, res);
};
exports.metricsHandler = metricsHandler;
