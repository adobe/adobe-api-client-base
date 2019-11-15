[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) 
[![Build Status](https://travis-ci.org/adobe/adobe-api-client-base.svg?branch=master)](https://travis-ci.com/adobe/adobe-api-client-base)
[![codecov](https://codecov.io/gh/adobe/adobe-api-client-base/branch/master/graph/badge.svg)](https://codecov.io/gh/adobe/adobe-api-client-base)
[![Greenkeeper badge](https://badges.greenkeeper.io/adobe/adobe-api-client-base.svg)](https://greenkeeper.io/)

# adobe-api-client-base
Base class for building Adobe API clients

## Goals

A base class for building API clients for Adobe solutions running on the Adobe.IO API gateway. 

This package is build upon [adobe-fetch](https://github.com/adobe/adobe-fetch) which handles the low level API call, JWT authentication, token caching and storage.  

### Installation

```
npm install --save @adobe/adobe-api-client-base
```

### Common Usage

* Option A - Provide an adobefetch instance:

```javascript

    const { BaseClient } = require('@adobe/adobe-api-client-base');
    
    const config = { 
      auth: { ... See adobe/fetch documentation for details ... }
    };
    
    const adobefetch = require('@adobe/fetch').config(config);
    const client = new BaseClient(adobefetch, { rootPath: '/path/to/api' });

```

* Option B - Provide the auth configuration, adobefetch will be instantiated automatically:

```javascript

    const { BaseClient } = require('@adobe/adobe-api-client-base');
    
    const client = new BaseClient(adobefetch, { 
      auth: { ... See adobe/fetch documentation for details ... }, 
      rootPath: '/path/to/api' 
    });

```

#### Creating your own API client class 

To create your own API client class, extend BaseClient and override the default options function.
Then you can create helper methods for calling specific APIs. 

For example:

```javascript

const { BaseClient } = require('@adobe/adobe-api-client-base');

class MyApiClient extends BaseClient {
  constructor(fetch, opts) {
    super(fetch, opts);
    this.someParameter = opts.someParameter;
  }

  _default() {
    return {
      name: 'myapi',
      gateway: 'https://myapi.adobe.io',
      rootPath: '/path/to/api',
      headers: {
        'x-some-header': 'some-value'
      }
    };
  }

  // Call https://myapi.adobe.io/path/to/api/foo/bar 
  getFooBar(parameters = {}) {
    const path = this.addParamsToPath('/foo/bar', parameters);
    return this.get(path);
  }
```

### Contributing

Contributions are welcomed! Read the [Contributing Guide](.github/CONTRIBUTING.md) for more information.

### Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
