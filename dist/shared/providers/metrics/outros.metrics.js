"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const perf_hooks_1 = require("perf_hooks");
const main_1 = require("./main");
const fs_1 = __importDefault(require("fs"));
const upTime = main_1.meter.createObservableGauge('custom_telemetry_process_uptime_seconds', { description: 'Tempo total que o processo esta em execucao.' });
upTime.addCallback(result => { result.observe(process.uptime(), { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment }); });
/*** EventLoop ***/
const h = (0, perf_hooks_1.monitorEventLoopDelay)({ resolution: 10 });
h.enable();
const lagGauge = main_1.meter.createObservableGauge('custom_telemetry_event_loop_lag_seconds', {
    description: 'Atraso medio do event loop em segundos',
});
lagGauge.addCallback((result) => {
    const lagSec = h.mean / 1e9; // mean está em nanosegundos
    result.observe(lagSec, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment });
});
/*** Arquivos (FS) ***/
const fdsGauge = main_1.meter.createObservableGauge('custom_telemetry_process_open_fds', { description: 'Numero de descritores de arquivo abertos' });
fdsGauge.addCallback((result) => {
    const fdCount = fs_1.default.readdirSync('/proc/self/fd').length;
    result.observe(fdCount, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment });
});
/*** Processos ativos ***/
const handlesGauge = main_1.meter.createObservableGauge('custom_telemetry_process_active_handles', { description: 'Numero de handles ativos (timers, sockets, etc.)' });
handlesGauge.addCallback((result) => {
    const activeHandles = process._getActiveHandles().length;
    result.observe(activeHandles, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment });
});
/*** Tempo Garbage Collection ***/
const gcGauge = main_1.meter.createObservableGauge('custom_telemetry_process_gc_duration_seconds', { description: 'Tempo gasto em garbage collection (segundos)' });
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
    result.observe(gcTotalNs / 1e9, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment }); // converte ns → s
});
