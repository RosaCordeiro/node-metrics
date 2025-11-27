# 📊 light-node-metrics

Um pacote poderoso e flexível para coleta de métricas em aplicações Node.js/Express usando OpenTelemetry e Prometheus.

[![NPM Version](https://img.shields.io/badge/npm-v1.0.0-blue)](https://www.npmjs.com/package/light-node-metrics)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D14-green)](package.json)

## 🎯 Características

- ✅ **Métricas HTTP** - Rastreie requisições, duração e status codes
- ✅ **Métricas de Cron Jobs** - Monitore execuções, duração e erros
- ✅ **Métricas de Sistema** - CPU, memória e outras métricas do SO
- ✅ **OpenTelemetry & Prometheus** - Padrão de indústria para observabilidade
- ✅ **Decorators TypeScript** - API elegante e intuitiva
- ✅ **Zero Config** - Funciona praticamente pronto para uso
- ✅ **Leve** - Impacto mínimo na performance

## 📦 Instalação

```bash
npm install light-node-metrics
```

### Dependências Obrigatórias

```bash
npm install express@^4.18.0
```

## 🚀 Início Rápido

### 1. Variáveis de Ambiente

Primeiro, configure as variáveis de ambiente obrigatórias no seu `.env`:

```env
APINAME=meu-servico
AMBIENTE=producao
```

### 2. Integração com Express

```typescript
import express from 'express';
import { httpMetricsMiddleware, metricsHandler } from 'light-node-metrics';

const app = express();

// Aplicar middleware de métricas HTTP
app.use(httpMetricsMiddleware);

// Suas rotas
app.get('/api/users', (req, res) => {
  res.json({ message: 'Hello World' });
});

// Endpoint para expor métricas no formato Prometheus
app.get('/metrics', metricsHandler);

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
```

### 3. Monitorar Cron Jobs

Use o decorator `@cronJob` para rastrear execuções de tarefas agendadas:

```typescript
import { cronJob } from 'light-node-metrics';

class MyScheduledTasks {
  @cronJob('cleanup-database')
  async cleanupDatabase() {
    // Sua lógica aqui
    console.log('Limpando banco de dados...');
  }

  @cronJob('send-notifications')
  async sendNotifications() {
    // Sua lógica aqui
    console.log('Enviando notificações...');
  }
}
```

O decorator automaticamente:
- ✅ Conta total de execuções
- ✅ Mede duração de cada execução
- ✅ Rastreia erros e exceções
- ✅ Adiciona labels com nome do job, serviço e ambiente

## 📊 Métricas Coletadas

### HTTP

| Métrica | Tipo | Descrição | Labels |
|---------|------|-----------|--------|
| `http_requests_total` | Counter | Total de requisições HTTP | `service_name`, `environment`, `method`, `path`, `status` |
| `http_request_duration_seconds` | Histogram | Duração das requisições HTTP | `service_name`, `environment`, `method`, `path`, `status` |

### Cron Jobs

| Métrica | Tipo | Descrição | Labels |
|---------|------|-----------|--------|
| `cron_jobs_executed_total` | Counter | Total de execuções de cron jobs | `service_name`, `environment`, `job_name`, `status` |
| `cron_job_duration_seconds` | Histogram | Duração das execuções | `service_name`, `environment`, `job_name` |
| `cron_jobs_errors_total` | Counter | Total de erros em cron jobs | `service_name`, `environment`, `job_name`, `error_type` |

## 🔧 API Completa

### `httpMetricsMiddleware`

Middleware Express que coleta métricas de todas as requisições HTTP.

```typescript
app.use(httpMetricsMiddleware);
```

### `metricsHandler`

Handler para expor as métricas no formato Prometheus (texto).

```typescript
app.get('/metrics', metricsHandler);
```

**Response**: Texto no formato Prometheus
```
# HELP http_requests_total Total de requisições HTTP
# TYPE http_requests_total counter
http_requests_total{service_name="meu-servico",environment="producao",method="GET",path="/api/users",status="200"} 42
```

### `@cronJob(jobName: string)`

Decorator para rastrear execuções de funções/métodos.

```typescript
@cronJob('meu-job-customizado')
async minhaFuncao() {
  // lógica aqui
}
```

### `meter`

Acesso direto ao OpenTelemetry Meter para criar métricas customizadas:

```typescript
import { meter } from 'light-node-metrics';

const meuCounter = meter.createCounter('meu_counter', {
  description: 'Minha métrica customizada'
});

meuCounter.add(1, { tipo: 'evento' });
```

### `getEnvorimentVariables()`

Recupera as variáveis de ambiente necessárias.

```typescript
import { getEnvorimentVariables } from 'light-node-metrics';

const { apiName, environment } = getEnvorimentVariables();
console.log(`Rodando ${apiName} em ${environment}`);
```

## 📈 Visualização com Prometheus

### Configurar Prometheus

Crie um arquivo `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'meu-servico'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Iniciar Prometheus

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

Acesse: http://localhost:9090

### Queries úteis

```promql
# Taxa de requisições por segundo
rate(http_requests_total[1m])

# Latência p95 das requisições
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Taxa de erro
rate(http_requests_total{status=~"5.."}[1m])

# Taxa de sucesso de cron jobs
rate(cron_jobs_executed_total{status="success"}[1m])
```

## 🔍 Exemplo Completo

```typescript
import express from 'express';
import { httpMetricsMiddleware, metricsHandler, cronJob, meter } from 'light-node-metrics';

const app = express();

// Middleware
app.use(express.json());
app.use(httpMetricsMiddleware);

// Classe com cron jobs
class Tasks {
  @cronJob('process-payments')
  async processPayments() {
    // Processar pagamentos
    return 'Pagamentos processados';
  }

  @cronJob('generate-reports')
  async generateReports() {
    // Gerar relatórios
    return 'Relatórios gerados';
  }
}

const tasks = new Tasks();

// Rotas
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/process', async (req, res) => {
  const result = await tasks.processPayments();
  res.json({ result });
});

// Metrics endpoint
app.get('/metrics', metricsHandler);

// Start
app.listen(3000, () => {
  console.log('✅ Servidor rodando em http://localhost:3000');
  console.log('📊 Métricas disponíveis em http://localhost:3000/metrics');
});
```

## ⚠️ Pré-requisitos

- Node.js >= 14.0.0
- Express.js >= 4.18.0
- TypeScript (para desenvolvimento)

## 🛠️ Troubleshooting

### Erro: "Variáveis de ambiente APINAME and AMBIENTE precisam ser definidas"

**Solução**: Certifique-se de ter definido as variáveis de ambiente:

```bash
export APINAME=seu-servico
export AMBIENTE=desenvolvimento
```

Ou use um arquivo `.env`:

```env
APINAME=seu-servico
AMBIENTE=desenvolvimento
```

### Métricas não aparecem em `/metrics`

**Solução**: 
1. Verifique se o middleware está sendo aplicado ANTES das rotas
2. Faça algumas requisições para a API para gerar dados
3. Aguarde alguns segundos e acesse `/metrics` novamente

### Performance baixa após adicionar middlewares

**Dica**: O impacto de performance é mínimo (~1-2ms por requisição). Se houver problemas:
- Reduza a frequência de scrape do Prometheus
- Use sampling de métricas

## 📝 Licença

MIT License © 2025 Cordeiro

## 🤝 Contribuindo

Contribuições são bem-vindas! Para reportar bugs ou sugerir features, abra uma issue no repositório.

## 📧 Suporte

Para dúvidas ou suporte, entre em contato ou abra uma issue no GitHub.

---

**Made with ❤️ by Cordeiro**
