<div align="center">
  
  ![banner](https://www.beincom.app/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo_beincom_icon_and_text_only_post_alpha.539e3bfb.webp&w=640&q=75)

# Test with K6

</div>

BIC E2E and Performance test.

## Steps to run the test

1. Install dependencies

```bash
yarn
```

2. Build script test

```bash
yarn build
```

3. Build k6 with extensions

```bash
docker run --rm -it -u "$(id -u):$(id -g)" -v "${PWD}:/xk6" grafana/xk6 build v0.43.1 --with github.com/oleiade/xk6-kv --with github.com/grafana/xk6-dashboard@latest --with github.com/Juandavi1/xk6-prompt@0.0.1 --with github.com/gpiechnik2/xk6-httpagg@latest --with github.com/elastic/xk6-output-elasticsearch@latest
```
[comment]: # For MacOS
```bash
docker run --rm -e GOOS=darwin -u "$(id -u):$(id -g)" -v "${PWD}:/xk6" \
  grafana/xk6 build --with github.com/oleiade/xk6-kv --with github.com/grafana/xk6-dashboard@latest --with github.com/Juandavi1/xk6-prompt@0.0.1 --with github.com/gpiechnik2/xk6-httpagg@latest --with github.com/elastic/xk6-output-elasticsearch@latest
```

[comment]: # For Windows
```bash
docker run --rm -e GOOS=windows -u "$(id -u):$(id -g)" -v "${PWD}:/xk6" `
  grafana/xk6 build --output k6.exe ` --with github.com/oleiade/xk6-kv --with github.com/grafana/xk6-dashboard@latest --with github.com/Juandavi1/xk6-prompt@0.0.1 --with github.com/gpiechnik2/xk6-httpagg@latest --with github.com/elastic/xk6-output-elasticsearch@latest
```

3. Run the test

```bash
./k6 run --out dashboard=report=dashboard/test-report.html dist/main.test.js
```

Run with output elasticsearch. The metrics are stored in the index `k6-metrics` which will be automatically created by extension [xk6-output-elasticsearch](https://github.com/elastic/xk6-output-elasticsearch)
```bash
export K6_ELASTICSEARCH_URL=xxx
export K6_ELASTICSEARCH_USER=xxx
export K6_ELASTICSEARCH_PASSWORD=xxx

./k6 run --out web-dashboard=report=dashboard/newsfeed/2024-01-24:11-15.html dist/main.test.js --out output-elasticsearch
```

## Writing own tests

House rules for writing tests:

- The test code is located in `src` folder
- The entry points for the tests need to have "_test_" word in the name to distinguish them from auxiliary files. You can change the entry [here](./webpack.config.js#L8).
- If static files are required then add them to `./assets` folder. Its content gets copied to the destination folder (`dist`) along with compiled scripts.

## Steps to run the seed data

1. Change config

- Update config in `config.ts` if you need.
- Update `communityIndex` in `scripts/main.script.ts` to change the community for create contents.

2. Run the seed

```bash
yarn create-data
```

### Transpiling and Bundling

By default, k6 can only run ES5.1 JavaScript code. To use TypeScript, we have to set up a bundler that converts TypeScript to JavaScript code.

This project uses `Babel` and `Webpack` to bundle the different files - using the configuration of the [`webpack.config.js`](./webpack.config.js) file.

If you want to learn more, check out [Bundling node modules in k6](https://k6.io/docs/using-k6/modules#bundling-node-modules).
