import { getEnvorimentVariables, meter } from "./main";
import os from 'os';

const cpuUserGauge = meter.createObservableGauge(
    'custom_telemetry_process_cpu_user_seconds_total',
    { description: 'Tempo de CPU em modo usuario gasto pelo processo Node.js' });
cpuUserGauge.addCallback(result => {
    const usage = process.cpuUsage();
    result.observe(usage.user / 1e6, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });
});

const cpuSystemGauge = meter.createObservableGauge(
    'custom_telemetry_process_cpu_system_seconds_total',
    { description: 'Tempo de CPU em modo sistema gasto pelo processo Node.js' });
cpuSystemGauge.addCallback(result => {
    const usage = process.cpuUsage();
    result.observe(usage.system / 1e6, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });
});

const cpuPercentGauge = meter.createObservableGauge(
    'custom_telemetry_process_cpu_percent',
    { description: 'Percentual de uso de CPU do processo Node.js' });


cpuPercentGauge.addCallback(result => {
    let lastCpuUsage = process.cpuUsage();
    let lastTime = process.hrtime.bigint();

    const currentUsage = process.cpuUsage();
    const currentTime = process.hrtime.bigint();

    const diffUser = currentUsage.user - lastCpuUsage.user;
    const diffSystem = currentUsage.system - lastCpuUsage.system;
    const elapsedMs = Number(currentTime - lastTime) / 1e6;

    const cpuPercent = (diffUser + diffSystem) / 1000 / elapsedMs * 100 / os.cpus().length;

    result.observe(cpuPercent, { service_name: getEnvorimentVariables().apiName, environment: getEnvorimentVariables().environment });

    lastCpuUsage = currentUsage;
    lastTime = currentTime;
});

let lastHostTimes = os.cpus().map(cpu => cpu.times);

const hostCpuUsageGauge = meter.createObservableGauge(
    'custom_telemetry_host_cpu_usage_percent', 
    { description: 'Percentual medio de uso de CPU no host/container' });
hostCpuUsageGauge.addCallback(result => {
    const cpus = os.cpus();
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
