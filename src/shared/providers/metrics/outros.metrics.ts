import { monitorEventLoopDelay, PerformanceObserver } from "perf_hooks";
import { getEnvorimentVariables, meter } from "./main";
import fs from 'fs';

const upTime = meter.createObservableGauge('custom_telemetry_process_uptime_seconds', { description: 'Tempo total que o processo esta em execucao.' });
upTime.addCallback(result => { result.observe(process.uptime(), { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment }) });

/*** EventLoop ***/
const h = monitorEventLoopDelay({ resolution: 10 });
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
    const fdCount = fs.readdirSync('/proc/self/fd').length;
    result.observe(fdCount, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });
});

/*** Processos ativos ***/
const handlesGauge = meter.createObservableGauge('custom_telemetry_process_active_handles', { description: 'Numero de handles ativos (timers, sockets, etc.)' });
handlesGauge.addCallback((result) => {
    const activeHandles = (process as any)._getActiveHandles().length;
    result.observe(activeHandles, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });
});

/*** Tempo Garbage Collection ***/
const gcGauge = meter.createObservableGauge('custom_telemetry_process_gc_duration_seconds', { description: 'Tempo gasto em garbage collection (segundos)' });

let gcTotalNs = 0;

const obs = new PerformanceObserver((list) => {
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
