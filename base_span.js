const api = require('@opentelemetry/api');

module.exports = ( // same return as f(span) given as the third argument
  tracer,   // tracer: api.tracer (api from @opentelemetry/api)
  span_name,// span_name: string (unique name for this span)
  f,        // f is a function that takes span as its only argument
) => {
  return tracer.startActiveSpan(span_name
    , {kind: 1} // this is running on a server
    , span=>{
      try {
        const result = f(span);
        return result;
      } catch (err) {
        span.setStatus({
          code: api.SpanStatusCode.ERROR,
          message: err.message,
        });
      } finally {
        span.end();
      }
    }
  );
};
