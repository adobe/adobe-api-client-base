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
const { Headers } = require.requireActual('node-fetch');
const { BaseClient } = require('../index');

const AUTH_ONLY_OPTS = { auth: { test: 'this' } };
const DEFAULT_OPTS = {
  rootPath: '/my/api',
  auth: { this: 'this' }
};

const OPTS_WITH_HEADER = {
  auth: { test: 'this' },
  rootPath: '/my/api',
  headers: {
    'Some-Header': 'Some Value'
  }
};

adobefetch.normalizeHeaders = require.requireActual(
  '@adobe/fetch'
).normalizeHeaders;

jest.mock('@adobe/fetch');

function mockFetch(validationFn, returnValue, configValidationFn) {
  adobefetch.config.mockImplementation(fetchOpts => {
    if (typeof configValidationFn === 'function') {
      configValidationFn(fetchOpts);
    }
    return async (url, options) => {
      if (typeof validationFn === 'function') {
        validationFn(url, options);
      }
      if (returnValue) {
        if (typeof returnValue === 'function') {
          return returnValue(url, options);
        } else {
          return returnValue;
        }
      } else {
        return {
          ok: true,
          json: async () => {
            return {
              result: 'some result'
            };
          }
        };
      }
    };
  });
}

describe('Validate constructor', () => {
  test('Creates fetch from config', async () => {
    expect.assertions(1);
    mockFetch(undefined, undefined, fetchOpts =>
      expect(fetchOpts.auth.test).toBe('this')
    );
    const client = new BaseClient(AUTH_ONLY_OPTS);
    await client.get('/some/url');
  });

  test('Uses given fetch', async () => {
    expect.assertions(1);
    mockFetch(undefined, undefined, fetchOpts =>
      expect(fetchOpts.auth.test).toBe('this')
    );
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, { rootPath: '/my/api' });
    await client.get('/some/url');
  });

  test('Uses default configuration', async () => {
    expect.assertions(1);
    mockFetch(url => expect(url).toBe('https://platform.adobe.io/some/url'));
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch);
    await client.get('/some/url');
  });

  test('Override gateway', async () => {
    expect.assertions(1);
    mockFetch(url => expect(url).toBe('https://test.adobe.io/some/url'));
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, {
      gateway: 'https://test.adobe.io'
    });
    await client.get('/some/url');
  });

  test('Uses given configuration', async () => {
    expect.assertions(1);
    mockFetch(url =>
      expect(url).toBe('https://platform.adobe.io/my/api/some/url')
    );
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, { rootPath: '/my/api' });
    await client.get('/some/url');
  });

  test('Uses given configuration without fetch', async () => {
    expect.assertions(1);
    mockFetch(url =>
      expect(url).toBe('https://platform.adobe.io/my/api/some/url')
    );
    const client = new BaseClient(DEFAULT_OPTS);
    await client.get('/some/url');
  });

  test('Fails with no configuration', async () => {
    expect.assertions(1);
    expect(() => new BaseClient()).toThrow('No configuration provided.');
  });
});

describe('Validate API calls', () => {
  test('Adds custom options', async () => {
    expect.assertions(1);
    mockFetch((url, fetchOpts) => expect(fetchOpts.someOption).toBe(true));
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, { rootPath: '/my/api' });
    await client.get('/some/url', true, { someOption: true });
  });

  test('Adds preceding slash', async () => {
    expect.assertions(1);
    mockFetch(url =>
      expect(url).toBe('https://platform.adobe.io/my/api/some/url')
    );
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, { rootPath: '/my/api' });
    await client.get('some/url');
  });

  test('Can send response object', async () => {
    expect.assertions(2);
    mockFetch(undefined, { status: 200, ok: true });
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, { rootPath: '/my/api' });
    let response = await client.api('/some/url', 'GET', false);
    expect(response.status).toBe(200);
    response = await client.api('/some/url', false, false, {});
    expect(response.status).toBe(200);
  });

  test('Can send JSON', async () => {
    expect.assertions(2);
    mockFetch(undefined, {
      status: 200,
      ok: true,
      json: async () => {
        return { hello: 'world' };
      }
    });
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, { rootPath: '/my/api' });
    let response = await client.api('/some/url', 'GET', true);
    expect(response).toStrictEqual({ hello: 'world' });
    response = await client.api('/some/url', undefined, undefined, {});
    expect(response).toStrictEqual({ hello: 'world' });
  });

  test('Returns error when response is not ok', async () => {
    expect.assertions(1);
    mockFetch(undefined, {
      status: 404,
      statusText: 'it failed',
      ok: false
    });
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, { rootPath: '/my/api' });
    await expect(client.get('/some/url')).rejects.toEqual({
      error: 'it failed',
      status: 404
    });
  });

  test('Returns error if fetch throws error', async () => {
    expect.assertions(1);
    mockFetch(() => {
      throw 'Fake error';
    });
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, { rootPath: '/my/api' });
    await expect(client.get('/some/url')).rejects.toEqual({
      error: 'Fake error',
      status: 0
    });
  });

  test('Returns unknown error if fetch returns an invalid response', async () => {
    expect.assertions(1);
    mockFetch(undefined, {});
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, { rootPath: '/my/api' });
    await expect(client.get('/some/url')).rejects.toEqual({
      error: 'Unknown error',
      status: 0
    });
  });

  test('Returns empty error if fetch returns an empty response', async () => {
    expect.assertions(1);
    mockFetch(undefined, () => {});
    const fetch = adobefetch.config(AUTH_ONLY_OPTS);
    const client = new BaseClient(fetch, { rootPath: '/my/api' });
    await expect(client.get('/some/url')).rejects.toEqual({
      error: 'Empty response',
      status: 0
    });
  });

  test('Uses correct methods', async () => {
    expect.assertions(6);
    mockFetch(undefined, (url, options) => {
      return {
        ok: true,
        json: async () => {
          return { method: options.method };
        }
      };
    });
    const client = new BaseClient(DEFAULT_OPTS);
    expect((await client.api('/some/url')).method).toBe('GET'); // Default.
    expect((await client.get('/some/url')).method).toBe('GET');
    expect((await client.post('/some/url')).method).toBe('POST');
    expect((await client.delete('/some/url')).method).toBe('DELETE');
    expect((await client.patch('/some/url')).method).toBe('PATCH');
    expect((await client.put('/some/url')).method).toBe('PUT');
  });

  test('Sends JSON in the body as string', async () => {
    const payload = {
      test: 'this',
      hello: {
        world: 1
      }
    };
    expect.assertions(2);
    mockFetch((url, options) => {
      expect(options.body).toBe(JSON.stringify(payload));
      expect(options.headers['content-type']).toBe('application/json');
    });
    const client = new BaseClient(DEFAULT_OPTS);
    await client.post('/some/url', payload);
  });

  test('Sends JSON in the body with custom content type', async () => {
    const payload = {
      test: 'this',
      hello: {
        world: 1
      }
    };
    expect.assertions(2);
    mockFetch((url, options) => {
      expect(options.body).toBe(JSON.stringify(payload));
      expect(options.headers['content-type']).toBe('my/json');
    });
    const client = new BaseClient(DEFAULT_OPTS);
    await client.post('/some/url', payload, true, {
      headers: { 'content-type': 'my/json' }
    });
  });

  test('Adds cache-control header', async () => {
    expect.assertions(1);
    mockFetch((url, options) => {
      expect(options.headers['cache-control']).toBe('no-cache');
    });
    const client = new BaseClient(DEFAULT_OPTS);
    await client.get('/some/url', true, undefined);
  });

  test('Adds and normalize predefined header', async () => {
    expect.assertions(1);
    mockFetch((url, options) => {
      expect(options.headers['some-header']).toBe('Some Value');
    });
    const client = new BaseClient(OPTS_WITH_HEADER);
    await client.get('/some/url', true, undefined);
  });

  test('Can override predefined header', async () => {
    expect.assertions(1);
    mockFetch((url, options) => {
      expect(options.headers['some-header']).toBe('Some Value2');
    });
    const client = new BaseClient(OPTS_WITH_HEADER);
    await client.get('/some/url', true, {
      headers: {
        'SOME-HEADER': 'Some Value2'
      }
    });
  });

  test('Can override predefined header (Headers object)', async () => {
    expect.assertions(1);
    mockFetch((url, options) => {
      expect(options.headers['some-header']).toBe('Some Value2');
    });
    const client = new BaseClient(OPTS_WITH_HEADER);
    const headers = new Headers();
    headers.set('SOME-HEADER', 'Some Value2');
    await client.get('/some/url', true, {
      headers: headers
    });
  });
});

describe('Validate full URL scenarios', () => {
  test('Can get full URL', async () => {
    expect.assertions(1);
    mockFetch(url =>
      expect(url).toBe('https://platform.adobe.io/my/api/some/url')
    );
    const client = new BaseClient(DEFAULT_OPTS);
    await client.get('https://platform.adobe.io/my/api/some/url');
  });

  test('Will not accept full URL outside of endpoint', async () => {
    expect.assertions(1);
    mockFetch(url =>
      expect(url).toBe(
        'https://platform.adobe.io/my/api/https://platform.adobe.io/my2/api/some/url'
      )
    );
    const client = new BaseClient(DEFAULT_OPTS);
    await client.get('https://platform.adobe.io/my2/api/some/url');
  });
});

describe('Validate inheritance', () => {
  const SubClass = class SomeClient extends BaseClient {
    _default() {
      return {
        name: 'sub',
        rootPath: '/sub/api',
        gateway: 'https://test.adobe.io',
        headers: {
          'some-header': 'some-value'
        }
      };
    }
  };

  test('Override default gateway', async () => {
    expect.assertions(3);
    mockFetch((url, options) => {
      expect(url).toBe('https://test.adobe.io/sub/api/some/url');
      expect(options.headers).toBeDefined();
      expect(options.headers['some-header']).toBe('some-value');
    });
    const client = new SubClass(AUTH_ONLY_OPTS);
    await client.get('/some/url');
  });
});

describe('Validate Query Param utils', () => {
  const client = new BaseClient(DEFAULT_OPTS);

  test('Adds parameter to url', () => {
    expect(
      client.addParamsToPath('/some/path', {
        param1: 'value1'
      })
    ).toBe('/some/path?param1=value1');
    expect(
      client.addParamsToPath('/some/path', {
        param1: 'value1',
        param2: 'value2'
      })
    ).toBe('/some/path?param1=value1&param2=value2');
  });

  test('Adds parameter to url and encode', () =>
    expect(
      client.addParamsToPath('/some/path', {
        param1: 'value1',
        param2: 'value2@test'
      })
    ).toBe('/some/path?param1=value1&param2=value2%40test'));

  test('URL stays the same with no parameters', () => {
    expect(client.addParamsToPath('/some/path')).toBe('/some/path');
    expect(client.addParamsToPath('/some/path?param1=value1')).toBe(
      '/some/path?param1=value1'
    );
  });

  test('URL stays the same with no parameters', () => {
    expect(client.addParamsToPath('/some/path')).toBe('/some/path');
    expect(client.addParamsToPath('/some/path?param1=value1')).toBe(
      '/some/path?param1=value1'
    );
  });

  test('Override parameter in url', () =>
    expect(
      client.addParamsToPath('/some/path?param1=value1', {
        param1: 'value2'
      })
    ).toBe('/some/path?param1=value2'));
});
