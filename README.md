# installation:
The hopefully obvious:
```BASH
npm install @scegfod/opentelemetry-utils-node-http-proto
```
This will pull in on all the opentelemetry things that you'll need for metrics
and traces, but you'll probably also want a framework; e.g. express:
`npm install express`

Then at the top of your app, you can simply require it at the top of your app's
entry file and pass in the settings to target your instrumentation data
endpoint:
```JavaScript
require('@scegfod/opentelemetry-utils-node-http-proto')(
  app_name = "test-app",// service.name
  app_version = "0.1.0",// service.version (Resource Data)
  instrumentation_base_url = "http://localhost:4318",
  tracer_route  = "/v1/traces",
  metrics_route = "/v1/metrics",
);
```

# local testing:
```BASH
# install go
# (on Fedora)
sudo dnf install go
# (on Ubuntu)
sudo snap install go --classic

# install the cli which we can ping from
go install github.com/equinix-labs/otel-cli@latest

# install the reciever tool that runs in the browser, because it's nice
go install github.com/CtrlSpice/otel-desktop-viewer@latest

# I believe these exports are already defaults, but here they are anyway:
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
export OTEL_TRACES_EXPORTER="otlp"

# see if a span goes through the testing tools before you test your own app:
$(go env GOPATH)/bin/otel-cli exec --service my-service --name "curl google" \
curl https://google.com
```

Once you're sure you have tools setup to run the tests locally, you can make a
silly example app, perhaps in express:

# Example express app that demonstrates some tracing:

## app.js
```JavaScript
'use strict';
require('@scegfod/opentelemetry-utils-node-http-proto')(
  app_name = "test-app",// service.name
  app_version = "0.1.0",// service.version (Resource Data)
  instrumentation_base_url = "http://localhost:4318",
  tracer_route  = "/v1/traces",
  metrics_route = "/v1/metrics",
);
// if express is before the utils import, the express things won't show up
//  e.g. middleware - query, middleware - expressInit, & request handler
const express = require('express');
const { rollTheDice } = require('./dice.js');
const api = require('@opentelemetry/api');
// Scope Data: scope               name     & version
const tracer = api.trace.getTracer("/app.js", "0.0.1");

const baseSpan = require(
  '@scegfod/opentelemetry-utils-node-http-proto/base_span.js'
);

const PORT = parseInt(process.env.PORT || '8080');
const app = express();

app.get('/rolldice', (req, res) => {
  baseSpan(tracer, "/rolldice", (span)=>{
    const rolls = req.query.rolls ? parseInt(req.query.rolls.toString()) : NaN;
    span.setAttribute("num_rolls", rolls);
    span.setStatus({
      code: api.SpanStatusCode.ERROR,
      message: "LOL ERROR, well not really...",
    })
    if (isNaN(rolls)) {
      res
        .status(400)
        .send("Request parameter 'rolls' is missing or not a number.");
      return;
    }
    res.send(JSON.stringify(rollTheDice(rolls, 1, 6)));
  });
});

app.listen(PORT, () => {
  console.log(
    `Listening for requests on http://localhost:${PORT}/rolldice?rolls=5`
  );
});

```

## dice.js
```JavaScript
'use strict';

const api = require('@opentelemetry/api');
// Scope Data: scope               name      & version
const tracer = api.trace.getTracer("/dice.js", "0.0.1");
const meter = api.metrics.getMeter('/dice.js', '0.0.1');

const baseSpan = require(
  '@scegfod/opentelemetry-utils-node-http-proto/base_span.js'
);

const roll_counter = meter.createCounter('dice-lib.rolls.counter');
const eo_counter = meter.createUpDownCounter('evens-minus-odds');

function rollOnce(min, max) {
  return baseSpan(tracer, 'rollOnce', (span)=>{
    span.addEvent("rollin' them bones~");
    const num = Math.floor(Math.random() * (max - min) + min);
    roll_counter.add(1);
    eo_counter.add( -1 * ( ( (num % 2) * 2) - 1 ) );
    if (num % 2){
      span.addEvent('test log', {
        'log.severity': 'warning',
        'log.message': 'odd number rolled! :O',
        'num_rolled': num,
      });
    }
    return num;
  });
}

function rollTheDice(rolls, min, max) {
  return baseSpan(tracer, 'rollTheDice', ()=>{
    const result = [];
    for (let i = 0; i < rolls; i++) {
      result.push(rollOnce(min, max));
    }
    return result;
  });
}

module.exports = { rollTheDice };
```
