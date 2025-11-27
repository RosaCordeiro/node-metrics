"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
const os_1 = __importDefault(require("os"));
const cpuUserGauge = main_1.meter.createObservableGauge('custom_telemetry_process_cpu_user_seconds_total', { description: 'Tempo de CPU em modo usuario gasto pelo processo Node.js' });
cpuUserGauge.addCallback(result => {
    const usage = process.cpuUsage();
    result.observe(usage.user / 1e6, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment });
});
const cpuSystemGauge = main_1.meter.createObservableGauge('custom_telemetry_process_cpu_system_seconds_total', { description: 'Tempo de CPU em modo sistema gasto pelo processo Node.js' });
cpuSystemGauge.addCallback(result => {
    const usage = process.cpuUsage();
    result.observe(usage.system / 1e6, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment });
});
const cpuPercentGauge = main_1.meter.createObservableGauge('custom_telemetry_process_cpu_percent', { description: 'Percentual de uso de CPU do processo Node.js' });
let lastCpuUsage = process.cpuUsage();
let lastTime = process.hrtime.bigint();
cpuPercentGauge.addCallback(result => {
    const currentUsage = process.cpuUsage();
    const currentTime = process.hrtime.bigint();
    const diffUser = currentUsage.user - lastCpuUsage.user;
    const diffSystem = currentUsage.system - lastCpuUsage.system;
    const elapsedMs = Number(currentTime - lastTime) / 1e6;
    const cpuPercent = (diffUser + diffSystem) / 1000 / elapsedMs * 100 / os_1.default.cpus().length;
    result.observe(cpuPercent, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment });
    lastCpuUsage = currentUsage;
    lastTime = currentTime;
});
let lastHostTimes = os_1.default.cpus().map(cpu => cpu.times);
const hostCpuUsageGauge = main_1.meter.createObservableGauge('custom_telemetry_host_cpu_usage_percent', { description: 'Percentual medio de uso de CPU no host/container' });
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
    result.observe(usagePercent, { service_name: (0, main_1.getEnvorimentVariables)().apiName, environment: (0, main_1.getEnvorimentVariables)().environment });
    lastHostTimes = cpus.map(cpu => cpu.times);
});
