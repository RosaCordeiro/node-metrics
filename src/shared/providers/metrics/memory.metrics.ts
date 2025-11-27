import { getEnvorimentVariables, meter } from "./main";
import v8 from "v8";
import os from 'os';
import fs from 'fs';

const memoryTotal = meter.createObservableGauge('custom_telemetry_host_memory_total_bytes', { description: 'RAM total disponivel' });
const { apiName, environment } = getEnvorimentVariables();

memoryTotal.addCallback(result => {
    result.observe(os.totalmem(), { service_name: apiName, environment });
});

/*** Memória heap utilizada ***/
const memoryHeapUsed = meter.createObservableGauge('custom_telemetry_process_memory_heap_used_bytes', { description: 'Heap JS em uso' });
memoryHeapUsed.addCallback(result => { result.observe(process.memoryUsage().heapUsed, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }) });

/*** Memória heap alocada ***/
const memoryHeapTotal = meter.createObservableGauge('custom_telemetry_process_memory_heap_total_bytes', { description: 'Heap JS alocada' });
memoryHeapTotal.addCallback(result => { result.observe(process.memoryUsage().heapTotal, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }) });

/*** Memória heap alocada ***/
const memoryHeapTotalGauge = meter.createObservableGauge('custom_telemetry_process_memory_heap_bytes', { description: 'Heap JS alocada (Gauge)' });
memoryHeapTotalGauge.addCallback(result => { result.observe((process.memoryUsage().heapTotal / os.totalmem()) * 100, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }) });

/*** Memória heap limíte ***/
const memoryHeapLimit = meter.createObservableGauge('custom_telemetry_process_memory_heap_limit_bytes', { description: 'Limite maximo da heap' });
memoryHeapLimit.addCallback(result => { result.observe(v8.getHeapStatistics().heap_size_limit, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }) });

/*** RAM usada ***/
const memoryRAMUsed = meter.createObservableGauge('custom_telemetry_process_memory_rss_bytes', { description: 'RAM real usada pelo Node' });
memoryRAMUsed.addCallback(result => { result.observe(process.memoryUsage().rss, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }) });

const memoryContainerTotal = meter.createObservableGauge('custom_telemetry_container_memory_limit_bytes', {
    description: 'RAM limite do container'
});

memoryContainerTotal.addCallback(result => {
    try {
        // Usar CGroup v2 que encontramos
        const memLimit = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
        const containerMemLimit = memLimit === 'max' ? os.totalmem() : parseInt(memLimit);

        result.observe(containerMemLimit, { service_name: apiName, environment });

    } catch (error) {
        result.observe(1073741824, { service_name: apiName, environment });
    }
});

const memoryContainerUsed = meter.createObservableGauge('custom_telemetry_container_memory_used_bytes', {
    description: 'RAM usada no container (compatível com docker stats)'
});

memoryContainerUsed.addCallback(result => {
    try {
        const stat = fs.readFileSync('/sys/fs/cgroup/memory.stat', 'utf8');
        const stats: any = {};

        stat.split('\n').forEach(line => {
            const [key, value] = line.split(' ');
            if (key && value) stats[key] = parseInt(value);
        });

        const usedMem = stats['anon'] + (stats['active_file'] || 0);
        result.observe(usedMem, { service_name: apiName, environment });

    } catch (error) {
        // Fallback
        result.observe(process.memoryUsage().rss, { service_name: apiName, environment });
    }
});
