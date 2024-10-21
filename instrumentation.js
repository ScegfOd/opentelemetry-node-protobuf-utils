/*instrumentation.js*/
const opentelemetry = require('@opentelemetry/sdk-node');
const {
  getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node');
const {
  PeriodicExportingMetricReader,
} = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} = require('@opentelemetry/semantic-conventions');
const {
  OTLPTraceExporter,
} = require('@opentelemetry/exporter-trace-otlp-proto');
const {
  OTLPMetricExporter,
} = require('@opentelemetry/exporter-metrics-otlp-proto');

module.exports = (
  app_name = "test-app",// service.name
  app_version = "0.1.0",// service.version (Resource Data)
  instrumentation_base_url = "http://localhost:4318",
  tracer_route  = "/v1/traces",
  metrics_route = "/v1/metrics",
  auto_instrument = false,
) => {
  const instrumentations = {};
  if (auto_instrument){
    instrumentations.instrumentations = [getNodeAutoInstrumentations()]
  }
  new opentelemetry.NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]:    app_name,   // service.name
      [ATTR_SERVICE_VERSION]: app_version,// service.version (Resource Data)
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${instrumentation_base_url}${tracer_route}`,
      // optional - collection of custom headers to be sent with each request
      // , empty by default
      headers: {},
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${instrumentation_base_url}${metrics_route}`,
        headers: {}, // as headers above
        concurrencyLimit: 1, // an optional limit on pending requests
      }),
    }),
    ...instrumentations,
  }).start(); // actually start opentelemetry for node
}
