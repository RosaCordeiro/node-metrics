"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
const v8_1 = __importDefault(require("v8"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const memoryTotal = main_1.meter.createObservableGauge('custom_telemetry_host_memory_total_bytes', { description: 'RAM total disponivel' });
const { apiName, environment } = (0, main_1.getEnvorimentVariables)();
memoryTotal.addCallback(result => {
    result.observe(os_1.default.totalmem(), { service_name: apiName, environment });
});
/*** Memória heap utilizada ***/
const memoryHeapUsed = main_1.meter.createObservableGauge('custom_telemetry_process_memory_heap_used_bytes', { description: 'Heap JS em uso' });
memoryHeapUsed.addCallback(result => { result.observe(process.memoryUsage().heapUsed, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment }); });
/*** Memória heap alocada ***/
const memoryHeapTotal = main_1.meter.createObservableGauge('custom_telemetry_process_memory_heap_total_bytes', { description: 'Heap JS alocada' });
memoryHeapTotal.addCallback(result => { result.observe(process.memoryUsage().heapTotal, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment }); });
/*** Memória heap alocada ***/
const memoryHeapTotalGauge = main_1.meter.createObservableGauge('custom_telemetry_process_memory_heap_bytes', { description: 'Heap JS alocada (Gauge)' });
memoryHeapTotalGauge.addCallback(result => { result.observe((process.memoryUsage().heapTotal / os_1.default.totalmem()) * 100, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment }); });
/*** Memória heap limíte ***/
const memoryHeapLimit = main_1.meter.createObservableGauge('custom_telemetry_process_memory_heap_limit_bytes', { description: 'Limite maximo da heap' });
memoryHeapLimit.addCallback(result => { result.observe(v8_1.default.getHeapStatistics().heap_size_limit, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment }); });
/*** RAM usada ***/
const memoryRAMUsed = main_1.meter.createObservableGauge('custom_telemetry_process_memory_rss_bytes', { description: 'RAM real usada pelo Node' });
memoryRAMUsed.addCallback(result => { result.observe(process.memoryUsage().rss, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment }); });
const memoryContainerTotal = main_1.meter.createObservableGauge('custom_telemetry_container_memory_limit_bytes', {
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
const memoryContainerUsed = main_1.meter.createObservableGauge('custom_telemetry_container_memory_used_bytes', {
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
