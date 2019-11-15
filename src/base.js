/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const adobefetch = require('@adobe/fetch');
const Constants = require('./constants');
const querystring = require('querystring');
const Debug = require('debug');

module.exports = class baseAPIClient {
  constructor(fetch = {}, opts) {
    if (typeof fetch === 'object') {
      opts = fetch;
      if (!opts.auth) {
        throw 'No configuration provided.';
      }
      fetch = adobefetch.config({ auth: opts.auth });
    }

    if (!opts) {
      opts = this._default();
    }

    this.name = opts.name ? opts.name : this._default().name;
    this.rootPath = opts.rootPath ? opts.rootPath : this._default().rootPath;

    this.debug = Debug(`aep-api-client:${this.name}`);
    this.fetch = fetch;
    this.opts = opts;
    const gateway =
      opts.gateway || this._default().gateway || Constants.DEFAULT_GATEWAY;
    this.gateway = gateway.replace(/\/$/, '');
    this.endpoint = `${this.gateway}${this.rootPath}`;
    this.headers = adobefetch.normalizeHeaders(this._default().headers);

    if (opts.headers) {
      this.headers = Object.assign(
        this.headers,
        adobefetch.normalizeHeaders(opts.headers)
      );
    }
  }

  _default() {
    return {
      name: 'base',
      rootPath: '',
      headers: {
        'cache-control': 'no-cache'
      }
    };
  }

  ensurePrefix(path) {
    return path.substr(0, 1) !== '/' ? `/${path}` : path;
  }

  addParamsToPath(path, params) {
    if (params) {
      const [basePath, query] = path.split('?');
      if (query) {
        const existingParams = querystring.parse(query);
        params = Object.assign(existingParams, params);
      }
      return `${basePath}?${querystring.stringify(params)}`;
    } else {
      return path;
    }
  }

  async api(path, method = 'GET', returnsJson = true, options = {}, payload) {
    let url = path.startsWith(this.endpoint)
      ? path
      : `${this.endpoint}${this.ensurePrefix(path)}`;
    let response;

    try {
      this.debug(`Fetch ${url}`);
      if (!options.headers) {
        options.headers = this.headers;
      } else {
        let headers = Object.assign({}, this.headers);
        headers = Object.assign(
          headers,
          adobefetch.normalizeHeaders(options.headers)
        );
        options.headers = headers;
      }
      options.method = method;

      if (payload) {
        options.body = JSON.stringify(payload);
        if (!options.headers['content-type']) {
          options.headers['content-type'] = 'application/json';
        }
      }

      response = await this.fetch(url, options);
    } catch (err) {
      this.debug(`Fetch ${url} failed: ${err}`);
      throw {
        error: err.toString(),
        status: 0
      };
    }

    if (response) {
      if (response.ok) {
        if (returnsJson) {
          return await response.json();
        } else {
          return response;
        }
      } else {
        throw {
          error: response.statusText || 'Unknown error',
          status: response.status || 0
        };
      }
    } else {
      this.debug(`Fetch ${path} failed: Empty response.`);
      throw {
        error: 'Empty response',
        status: 0
      };
    }
  }

  async get(path, returnJson = true, options = {}) {
    return this.api(path, 'GET', returnJson, options);
  }

  async post(path, payload, returnJson = true, options = {}) {
    return this.api(path, 'POST', returnJson, options, payload);
  }

  async patch(path, payload, returnJson = true, options = {}) {
    return this.api(path, 'PATCH', returnJson, options, payload);
  }

  async put(path, payload, returnJson = true, options = {}) {
    return this.api(path, 'PUT', returnJson, options, payload);
  }

  async delete(path, payload, returnJson = true, options = {}) {
    return this.api(path, 'DELETE', returnJson, options, payload);
  }
};
