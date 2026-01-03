// Code Snippet Generator - Supports all languages like Postman
import { KeyValuePair, RequestBody, AuthConfig } from '@/types'

export interface RequestConfig {
  method: string
  url: string
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body?: RequestBody
  auth?: AuthConfig
}

export interface LanguageOption {
  id: string
  name: string
  variant?: string
  language: string // For syntax highlighting
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  // Shell
  { id: 'curl', name: 'cURL', language: 'bash' },
  { id: 'wget', name: 'Wget', language: 'bash' },
  { id: 'httpie', name: 'HTTPie', language: 'bash' },

  // HTTP
  { id: 'http', name: 'HTTP', language: 'http' },

  // JavaScript
  { id: 'javascript-fetch', name: 'JavaScript', variant: 'Fetch', language: 'javascript' },
  { id: 'javascript-axios', name: 'JavaScript', variant: 'Axios', language: 'javascript' },
  { id: 'javascript-xhr', name: 'JavaScript', variant: 'XHR', language: 'javascript' },
  { id: 'javascript-jquery', name: 'JavaScript', variant: 'jQuery', language: 'javascript' },

  // Node.js
  { id: 'nodejs-fetch', name: 'Node.js', variant: 'Fetch', language: 'javascript' },
  { id: 'nodejs-axios', name: 'Node.js', variant: 'Axios', language: 'javascript' },
  { id: 'nodejs-native', name: 'Node.js', variant: 'Native', language: 'javascript' },
  { id: 'nodejs-request', name: 'Node.js', variant: 'Request', language: 'javascript' },

  // Python
  { id: 'python-requests', name: 'Python', variant: 'Requests', language: 'python' },
  { id: 'python-http', name: 'Python', variant: 'http.client', language: 'python' },

  // PHP
  { id: 'php-curl', name: 'PHP', variant: 'cURL', language: 'php' },
  { id: 'php-guzzle', name: 'PHP', variant: 'Guzzle', language: 'php' },

  // Go
  { id: 'go-native', name: 'Go', variant: 'Native', language: 'go' },

  // Ruby
  { id: 'ruby-nethttp', name: 'Ruby', variant: 'Net::HTTP', language: 'ruby' },

  // Java
  { id: 'java-okhttp', name: 'Java', variant: 'OkHttp', language: 'java' },
  { id: 'java-unirest', name: 'Java', variant: 'Unirest', language: 'java' },
  { id: 'java-httpurlconnection', name: 'Java', variant: 'HttpURLConnection', language: 'java' },

  // C#
  { id: 'csharp-httpclient', name: 'C#', variant: 'HttpClient', language: 'csharp' },
  { id: 'csharp-restsharp', name: 'C#', variant: 'RestSharp', language: 'csharp' },

  // Swift
  { id: 'swift-urlsession', name: 'Swift', variant: 'URLSession', language: 'swift' },

  // Kotlin
  { id: 'kotlin-okhttp', name: 'Kotlin', variant: 'OkHttp', language: 'kotlin' },

  // Dart
  { id: 'dart-http', name: 'Dart', variant: 'http', language: 'dart' },
  { id: 'dart-dio', name: 'Dart', variant: 'dio', language: 'dart' },

  // PowerShell
  { id: 'powershell-restmethod', name: 'PowerShell', variant: 'Invoke-RestMethod', language: 'powershell' },
  { id: 'powershell-webrequest', name: 'PowerShell', variant: 'Invoke-WebRequest', language: 'powershell' },

  // R
  { id: 'r-httr', name: 'R', variant: 'httr', language: 'r' },

  // Rust
  { id: 'rust-reqwest', name: 'Rust', variant: 'reqwest', language: 'rust' },
]

// Helper to build URL with query params
function buildUrl(url: string, params: KeyValuePair[]): string {
  const enabledParams = params.filter(p => p.enabled && p.key)
  if (enabledParams.length === 0) return url

  const queryString = enabledParams
    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&')

  return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`
}

// Helper to get enabled headers including auth
function getHeaders(headers: KeyValuePair[], auth?: AuthConfig): KeyValuePair[] {
  const result = headers.filter(h => h.enabled && h.key)

  if (auth) {
    switch (auth.type) {
      case 'basic':
        if (auth.basic?.username) {
          const credentials = btoa(`${auth.basic.username}:${auth.basic.password || ''}`)
          result.push({ key: 'Authorization', value: `Basic ${credentials}`, enabled: true })
        }
        break
      case 'bearer':
        if (auth.bearer?.token) {
          result.push({ key: 'Authorization', value: `Bearer ${auth.bearer.token}`, enabled: true })
        }
        break
      case 'apikey':
        if (auth.apikey?.in === 'header' && auth.apikey.key) {
          result.push({ key: auth.apikey.key, value: auth.apikey.value || '', enabled: true })
        }
        break
    }
  }

  return result
}

// Helper to get body content
function getBodyContent(body?: RequestBody): { content: string; contentType: string } | null {
  if (!body) return null

  switch (body.mode) {
    case 'raw':
      if (!body.raw?.trim()) return null
      const langToContentType: Record<string, string> = {
        json: 'application/json',
        xml: 'application/xml',
        text: 'text/plain',
        javascript: 'application/javascript',
        html: 'text/html',
      }
      return { content: body.raw, contentType: langToContentType[body.language || 'text'] || 'text/plain' }

    case 'urlencoded':
      const urlencodedItems = body.urlencoded?.filter(i => i.enabled && i.key) || []
      if (urlencodedItems.length === 0) return null
      const urlencodedContent = urlencodedItems
        .map(i => `${encodeURIComponent(i.key)}=${encodeURIComponent(i.value)}`)
        .join('&')
      return { content: urlencodedContent, contentType: 'application/x-www-form-urlencoded' }

    case 'graphql':
      if (!body.graphql?.query?.trim()) return null
      const graphqlBody = {
        query: body.graphql.query,
        ...(body.graphql.variables?.trim() ? { variables: JSON.parse(body.graphql.variables) } : {}),
      }
      return { content: JSON.stringify(graphqlBody, null, 2), contentType: 'application/json' }

    case 'formdata':
      // Form data is handled specially per language
      return { content: 'formdata', contentType: 'multipart/form-data' }

    default:
      return null
  }
}

// Escape string for different contexts
function escapeShell(str: string): string {
  return str.replace(/'/g, "'\\''")
}

function escapeJson(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
}

// ============== GENERATORS ==============

function generateCurl(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = [`curl --location '${escapeShell(fullUrl)}'`]

  if (method !== 'GET') {
    lines.push(`  --request ${method}`)
  }

  // Add content type if we have body
  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    const hasContentType = headers.some(h => h.key.toLowerCase() === 'content-type')
    if (!hasContentType) {
      lines.push(`  --header 'Content-Type: ${bodyData.contentType}'`)
    }
  }

  headers.forEach(h => {
    lines.push(`  --header '${escapeShell(h.key)}: ${escapeShell(h.value)}'`)
  })

  if (bodyData) {
    if (body?.mode === 'formdata') {
      const formItems = body.formdata?.filter(i => i.enabled && i.key) || []
      formItems.forEach(item => {
        if (item.type === 'file') {
          lines.push(`  --form '${escapeShell(item.key)}=@"${escapeShell(item.src || '')}"'`)
        } else {
          lines.push(`  --form '${escapeShell(item.key)}="${escapeShell(item.value)}"'`)
        }
      })
    } else {
      lines.push(`  --data '${escapeShell(bodyData.content)}'`)
    }
  }

  return lines.join(' \\\n')
}

function generateWget(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = ['wget']

  if (method !== 'GET') {
    lines.push(`  --method=${method}`)
  }

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    const hasContentType = headers.some(h => h.key.toLowerCase() === 'content-type')
    if (!hasContentType) {
      lines.push(`  --header='Content-Type: ${bodyData.contentType}'`)
    }
  }

  headers.forEach(h => {
    lines.push(`  --header='${h.key}: ${h.value}'`)
  })

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`  --body-data='${escapeShell(bodyData.content)}'`)
  }

  lines.push(`  '${escapeShell(fullUrl)}'`)

  return lines.join(' \\\n')
}

function generateHttpie(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const parts: string[] = ['http', method, `'${escapeShell(fullUrl)}'`]

  headers.forEach(h => {
    parts.push(`'${h.key}:${h.value}'`)
  })

  if (bodyData && body?.mode === 'raw' && body.language === 'json') {
    try {
      const jsonBody = JSON.parse(bodyData.content)
      Object.entries(jsonBody).forEach(([key, value]) => {
        if (typeof value === 'string') {
          parts.push(`${key}='${value}'`)
        } else {
          parts.push(`${key}:='${JSON.stringify(value)}'`)
        }
      })
    } catch {
      parts.push(`--raw='${escapeShell(bodyData.content)}'`)
    }
  } else if (bodyData && bodyData.content !== 'formdata') {
    parts.push(`--raw='${escapeShell(bodyData.content)}'`)
  }

  return parts.join(' ')
}

function generateHttp(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  // Parse URL to get path and host
  let host = ''
  let path = fullUrl
  try {
    const urlObj = new URL(fullUrl)
    host = urlObj.host
    path = urlObj.pathname + urlObj.search
  } catch {
    // Keep original if URL parsing fails
  }

  const lines: string[] = [`${method} ${path} HTTP/1.1`]

  if (host) {
    lines.push(`Host: ${host}`)
  }

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    const hasContentType = headers.some(h => h.key.toLowerCase() === 'content-type')
    if (!hasContentType) {
      lines.push(`Content-Type: ${bodyData.contentType}`)
    }
  }

  headers.forEach(h => {
    lines.push(`${h.key}: ${h.value}`)
  })

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push('')
    lines.push(bodyData.content)
  }

  return lines.join('\n')
}

function generateJavaScriptFetch(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const headersObj: Record<string, string> = {}
  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    headersObj['Content-Type'] = bodyData.contentType
  }
  headers.forEach(h => {
    headersObj[h.key] = h.value
  })

  const options: string[] = []
  options.push(`  method: '${method}'`)

  if (Object.keys(headersObj).length > 0) {
    options.push(`  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')}`)
  }

  if (bodyData) {
    if (body?.mode === 'formdata') {
      const formItems = body.formdata?.filter(i => i.enabled && i.key) || []
      const formDataLines = formItems.map(item => {
        if (item.type === 'file') {
          return `formdata.append('${item.key}', fileInput.files[0], '${item.src || 'file'}');`
        }
        return `formdata.append('${item.key}', '${escapeJson(item.value)}');`
      })

      return `const formdata = new FormData();
${formDataLines.join('\n')}

fetch('${fullUrl}', {
  method: '${method}',
  body: formdata
})
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));`
    }
    options.push(`  body: ${JSON.stringify(bodyData.content)}`)
  }

  return `fetch('${fullUrl}', {
${options.join(',\n')}
})
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));`
}

function generateJavaScriptAxios(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const headersObj: Record<string, string> = {}
  headers.forEach(h => {
    headersObj[h.key] = h.value
  })

  const configParts: string[] = []
  configParts.push(`  method: '${method.toLowerCase()}'`)
  configParts.push(`  url: '${fullUrl}'`)

  if (Object.keys(headersObj).length > 0) {
    configParts.push(`  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')}`)
  }

  if (bodyData && bodyData.content !== 'formdata') {
    if (body?.language === 'json') {
      try {
        const parsed = JSON.parse(bodyData.content)
        configParts.push(`  data: ${JSON.stringify(parsed, null, 4).replace(/\n/g, '\n  ')}`)
      } catch {
        configParts.push(`  data: ${JSON.stringify(bodyData.content)}`)
      }
    } else {
      configParts.push(`  data: ${JSON.stringify(bodyData.content)}`)
    }
  }

  return `axios({
${configParts.join(',\n')}
})
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.log(error);
  });`
}

function generateJavaScriptXhr(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const headerLines = headers.map(h => `xhr.setRequestHeader('${h.key}', '${escapeJson(h.value)}');`)
  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    headerLines.unshift(`xhr.setRequestHeader('Content-Type', '${bodyData.contentType}');`)
  }

  let bodyLine = 'xhr.send();'
  if (bodyData && bodyData.content !== 'formdata') {
    bodyLine = `xhr.send(${JSON.stringify(bodyData.content)});`
  }

  return `const xhr = new XMLHttpRequest();
xhr.open('${method}', '${fullUrl}');
${headerLines.join('\n')}

xhr.onload = function() {
  console.log(xhr.responseText);
};

${bodyLine}`
}

function generateJavaScriptJquery(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const headersObj: Record<string, string> = {}
  headers.forEach(h => {
    headersObj[h.key] = h.value
  })

  const settings: string[] = []
  settings.push(`  url: '${fullUrl}'`)
  settings.push(`  method: '${method}'`)

  if (Object.keys(headersObj).length > 0) {
    settings.push(`  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')}`)
  }

  if (bodyData && bodyData.content !== 'formdata') {
    settings.push(`  data: ${JSON.stringify(bodyData.content)}`)
    if (bodyData.contentType !== 'multipart/form-data') {
      settings.push(`  contentType: '${bodyData.contentType}'`)
    }
  }

  return `$.ajax({
${settings.join(',\n')}
}).done(function(response) {
  console.log(response);
}).fail(function(error) {
  console.log(error);
});`
}

function generateNodejsFetch(config: RequestConfig): string {
  const code = generateJavaScriptFetch(config)
  return `// Node.js 18+ (native fetch)\n${code}`
}

function generateNodejsAxios(config: RequestConfig): string {
  return `const axios = require('axios');\n\n${generateJavaScriptAxios(config)}`
}

function generateNodejsNative(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  let urlObj: URL
  try {
    urlObj = new URL(fullUrl)
  } catch {
    return `// Invalid URL: ${fullUrl}`
  }

  const isHttps = urlObj.protocol === 'https:'
  const headersObj: Record<string, string> = {}
  headers.forEach(h => {
    headersObj[h.key] = h.value
  })
  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    headersObj['Content-Type'] = bodyData.contentType
  }

  let bodyVar = ''
  if (bodyData && bodyData.content !== 'formdata') {
    bodyVar = `const postData = ${JSON.stringify(bodyData.content)};\n\n`
    headersObj['Content-Length'] = '${Buffer.byteLength(postData)}'
  }

  const headersStr = JSON.stringify(headersObj, null, 4)
    .replace('"${Buffer.byteLength(postData)}"', 'Buffer.byteLength(postData)')
    .replace(/\n/g, '\n  ')

  return `const ${isHttps ? 'https' : 'http'} = require('${isHttps ? 'https' : 'http'}');

${bodyVar}const options = {
  hostname: '${urlObj.hostname}',
  port: ${urlObj.port || (isHttps ? 443 : 80)},
  path: '${urlObj.pathname}${urlObj.search}',
  method: '${method}',
  headers: ${headersStr}
};

const req = ${isHttps ? 'https' : 'http'}.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(data);
  });
});

req.on('error', (error) => {
  console.error(error);
});

${bodyData ? 'req.write(postData);\n' : ''}req.end();`
}

function generateNodejsRequest(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const headersObj: Record<string, string> = {}
  headers.forEach(h => {
    headersObj[h.key] = h.value
  })

  const options: string[] = []
  options.push(`  method: '${method}'`)
  options.push(`  url: '${fullUrl}'`)

  if (Object.keys(headersObj).length > 0) {
    options.push(`  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')}`)
  }

  if (bodyData && bodyData.content !== 'formdata') {
    options.push(`  body: ${JSON.stringify(bodyData.content)}`)
  }

  return `const request = require('request');

const options = {
${options.join(',\n')}
};

request(options, function (error, response, body) {
  if (error) throw new Error(error);
  console.log(body);
});`
}

function generatePythonRequests(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = ['import requests']
  lines.push('')
  lines.push(`url = "${fullUrl}"`)

  if (headers.length > 0) {
    const headersObj: Record<string, string> = {}
    headers.forEach(h => {
      headersObj[h.key] = h.value
    })
    lines.push(`headers = ${JSON.stringify(headersObj, null, 4).replace(/"/g, "'")}`)
  }

  if (bodyData && bodyData.content !== 'formdata') {
    if (body?.language === 'json') {
      lines.push('import json')
      lines.push(`payload = json.dumps(${bodyData.content.replace(/"/g, "'")})`)
    } else {
      lines.push(`payload = """${bodyData.content}"""`)
    }
  }

  const requestArgs: string[] = ['url']
  if (headers.length > 0) requestArgs.push('headers=headers')
  if (bodyData && bodyData.content !== 'formdata') requestArgs.push('data=payload')

  lines.push('')
  lines.push(`response = requests.${method.toLowerCase()}(${requestArgs.join(', ')})`)
  lines.push('')
  lines.push('print(response.text)')

  return lines.join('\n')
}

function generatePythonHttp(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  let urlObj: URL
  try {
    urlObj = new URL(fullUrl)
  } catch {
    return `# Invalid URL: ${fullUrl}`
  }

  const isHttps = urlObj.protocol === 'https:'

  const lines: string[] = [`import http.client${isHttps ? '' : ''}`]
  if (body?.language === 'json') {
    lines.push('import json')
  }
  lines.push('')
  lines.push(`conn = http.client.${isHttps ? 'HTTPSConnection' : 'HTTPConnection'}("${urlObj.hostname}"${urlObj.port ? `, ${urlObj.port}` : ''})`)

  if (bodyData && bodyData.content !== 'formdata') {
    if (body?.language === 'json') {
      lines.push(`payload = json.dumps(${bodyData.content.replace(/"/g, "'")})`)
    } else {
      lines.push(`payload = """${bodyData.content}"""`)
    }
  }

  const headersObj: Record<string, string> = {}
  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    headersObj['Content-Type'] = bodyData.contentType
  }
  headers.forEach(h => {
    headersObj[h.key] = h.value
  })

  lines.push(`headers = ${JSON.stringify(headersObj, null, 4).replace(/"/g, "'")}`)
  lines.push('')
  lines.push(`conn.request("${method}", "${urlObj.pathname}${urlObj.search}"${bodyData ? ', payload' : ', ""'}, headers)`)
  lines.push('res = conn.getresponse()')
  lines.push('data = res.read()')
  lines.push('')
  lines.push('print(data.decode("utf-8"))')

  return lines.join('\n')
}

function generatePhpCurl(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const headerLines = headers.map(h => `  '${h.key}: ${h.value}'`)
  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    headerLines.unshift(`  'Content-Type: ${bodyData.contentType}'`)
  }

  const lines: string[] = ['<?php']
  lines.push('')
  lines.push('$curl = curl_init();')
  lines.push('')

  const curlOpts: string[] = []
  curlOpts.push(`  CURLOPT_URL => '${fullUrl}'`)
  curlOpts.push('  CURLOPT_RETURNTRANSFER => true')
  curlOpts.push('  CURLOPT_ENCODING => ""')
  curlOpts.push('  CURLOPT_MAXREDIRS => 10')
  curlOpts.push('  CURLOPT_TIMEOUT => 0')
  curlOpts.push('  CURLOPT_FOLLOWLOCATION => true')
  curlOpts.push('  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1')
  curlOpts.push(`  CURLOPT_CUSTOMREQUEST => '${method}'`)

  if (bodyData && bodyData.content !== 'formdata') {
    curlOpts.push(`  CURLOPT_POSTFIELDS => '${bodyData.content.replace(/'/g, "\\'")}'`)
  }

  if (headerLines.length > 0) {
    curlOpts.push(`  CURLOPT_HTTPHEADER => array(\n${headerLines.join(',\n')}\n  )`)
  }

  lines.push(`curl_setopt_array($curl, array(`)
  lines.push(curlOpts.join(',\n'))
  lines.push('));')
  lines.push('')
  lines.push('$response = curl_exec($curl);')
  lines.push('')
  lines.push('curl_close($curl);')
  lines.push('echo $response;')

  return lines.join('\n')
}

function generatePhpGuzzle(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const headersObj: Record<string, string> = {}
  headers.forEach(h => {
    headersObj[h.key] = h.value
  })

  const lines: string[] = ['<?php']
  lines.push("require_once 'vendor/autoload.php';")
  lines.push('')
  lines.push('$client = new GuzzleHttp\\Client();')
  lines.push('')

  const options: string[] = []
  if (Object.keys(headersObj).length > 0) {
    const headerLines = Object.entries(headersObj).map(([k, v]) => `    '${k}' => '${v}'`)
    options.push(`  'headers' => [\n${headerLines.join(',\n')}\n  ]`)
  }

  if (bodyData && bodyData.content !== 'formdata') {
    options.push(`  'body' => '${bodyData.content.replace(/'/g, "\\'")}'`)
  }

  if (options.length > 0) {
    lines.push(`$response = $client->request('${method}', '${fullUrl}', [`)
    lines.push(options.join(',\n'))
    lines.push(']);')
  } else {
    lines.push(`$response = $client->request('${method}', '${fullUrl}');`)
  }

  lines.push('')
  lines.push('echo $response->getBody();')

  return lines.join('\n')
}

function generateGoNative(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = ['package main']
  lines.push('')
  lines.push('import (')
  lines.push('  "fmt"')
  lines.push('  "io"')
  lines.push('  "net/http"')
  if (bodyData) lines.push('  "strings"')
  lines.push(')')
  lines.push('')
  lines.push('func main() {')

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`  payload := strings.NewReader(\`${bodyData.content}\`)`)
    lines.push('')
    lines.push(`  req, err := http.NewRequest("${method}", "${fullUrl}", payload)`)
  } else {
    lines.push(`  req, err := http.NewRequest("${method}", "${fullUrl}", nil)`)
  }

  lines.push('  if err != nil {')
  lines.push('    fmt.Println(err)')
  lines.push('    return')
  lines.push('  }')

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    lines.push(`  req.Header.Add("Content-Type", "${bodyData.contentType}")`)
  }
  headers.forEach(h => {
    lines.push(`  req.Header.Add("${h.key}", "${h.value}")`)
  })

  lines.push('')
  lines.push('  client := &http.Client{}')
  lines.push('  res, err := client.Do(req)')
  lines.push('  if err != nil {')
  lines.push('    fmt.Println(err)')
  lines.push('    return')
  lines.push('  }')
  lines.push('  defer res.Body.Close()')
  lines.push('')
  lines.push('  body, err := io.ReadAll(res.Body)')
  lines.push('  if err != nil {')
  lines.push('    fmt.Println(err)')
  lines.push('    return')
  lines.push('  }')
  lines.push('')
  lines.push('  fmt.Println(string(body))')
  lines.push('}')

  return lines.join('\n')
}

function generateRubyNetHttp(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  let urlObj: URL
  try {
    urlObj = new URL(fullUrl)
  } catch {
    return `# Invalid URL: ${fullUrl}`
  }

  const lines: string[] = ["require 'uri'", "require 'net/http'"]
  lines.push('')
  lines.push(`url = URI("${fullUrl}")`)
  lines.push('')
  lines.push(`http = Net::HTTP.new(url.host, url.port)`)
  if (urlObj.protocol === 'https:') {
    lines.push('http.use_ssl = true')
  }
  lines.push('')
  lines.push(`request = Net::HTTP::${method.charAt(0) + method.slice(1).toLowerCase()}.new(url)`)

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    lines.push(`request["Content-Type"] = "${bodyData.contentType}"`)
  }
  headers.forEach(h => {
    lines.push(`request["${h.key}"] = "${h.value}"`)
  })

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`request.body = ${JSON.stringify(bodyData.content)}`)
  }

  lines.push('')
  lines.push('response = http.request(request)')
  lines.push('puts response.read_body')

  return lines.join('\n')
}

function generateJavaOkHttp(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = ['OkHttpClient client = new OkHttpClient().newBuilder().build();']

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`MediaType mediaType = MediaType.parse("${bodyData.contentType}");`)
    lines.push(`RequestBody body = RequestBody.create(mediaType, ${JSON.stringify(bodyData.content)});`)
  }

  lines.push('Request request = new Request.Builder()')
  lines.push(`  .url("${fullUrl}")`)
  lines.push(`  .method("${method}", ${bodyData ? 'body' : 'null'})`)

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    lines.push(`  .addHeader("Content-Type", "${bodyData.contentType}")`)
  }
  headers.forEach(h => {
    lines.push(`  .addHeader("${h.key}", "${h.value}")`)
  })

  lines.push('  .build();')
  lines.push('Response response = client.newCall(request).execute();')
  lines.push('System.out.println(response.body().string());')

  return lines.join('\n')
}

function generateJavaUnirest(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = [`HttpResponse<String> response = Unirest.${method.toLowerCase()}("${fullUrl}")`]

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    lines.push(`  .header("Content-Type", "${bodyData.contentType}")`)
  }
  headers.forEach(h => {
    lines.push(`  .header("${h.key}", "${h.value}")`)
  })

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`  .body(${JSON.stringify(bodyData.content)})`)
  }

  lines.push('  .asString();')
  lines.push('')
  lines.push('System.out.println(response.getBody());')

  return lines.join('\n')
}

function generateJavaHttpUrlConnection(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = ['import java.io.*;', 'import java.net.*;', '']
  lines.push(`URL url = new URL("${fullUrl}");`)
  lines.push('HttpURLConnection conn = (HttpURLConnection) url.openConnection();')
  lines.push(`conn.setRequestMethod("${method}");`)

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    lines.push(`conn.setRequestProperty("Content-Type", "${bodyData.contentType}");`)
  }
  headers.forEach(h => {
    lines.push(`conn.setRequestProperty("${h.key}", "${h.value}");`)
  })

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push('conn.setDoOutput(true);')
    lines.push('try (OutputStream os = conn.getOutputStream()) {')
    lines.push(`  byte[] input = ${JSON.stringify(bodyData.content)}.getBytes("utf-8");`)
    lines.push('  os.write(input, 0, input.length);')
    lines.push('}')
  }

  lines.push('')
  lines.push('try (BufferedReader br = new BufferedReader(')
  lines.push('    new InputStreamReader(conn.getInputStream(), "utf-8"))) {')
  lines.push('  StringBuilder response = new StringBuilder();')
  lines.push('  String responseLine;')
  lines.push('  while ((responseLine = br.readLine()) != null) {')
  lines.push('    response.append(responseLine.trim());')
  lines.push('  }')
  lines.push('  System.out.println(response.toString());')
  lines.push('}')

  return lines.join('\n')
}

function generateCsharpHttpClient(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = ['var client = new HttpClient();']
  lines.push(`var request = new HttpRequestMessage(HttpMethod.${method.charAt(0) + method.slice(1).toLowerCase()}, "${fullUrl}");`)

  headers.forEach(h => {
    lines.push(`request.Headers.Add("${h.key}", "${h.value}");`)
  })

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`var content = new StringContent(${JSON.stringify(bodyData.content)}, null, "${bodyData.contentType}");`)
    lines.push('request.Content = content;')
  }

  lines.push('var response = await client.SendAsync(request);')
  lines.push('response.EnsureSuccessStatusCode();')
  lines.push('Console.WriteLine(await response.Content.ReadAsStringAsync());')

  return lines.join('\n')
}

function generateCsharpRestSharp(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = [`var client = new RestClient("${fullUrl}");`]
  lines.push(`var request = new RestRequest(Method.${method});`)

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    lines.push(`request.AddHeader("Content-Type", "${bodyData.contentType}");`)
  }
  headers.forEach(h => {
    lines.push(`request.AddHeader("${h.key}", "${h.value}");`)
  })

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`request.AddParameter("${bodyData.contentType}", ${JSON.stringify(bodyData.content)}, ParameterType.RequestBody);`)
  }

  lines.push('IRestResponse response = client.Execute(request);')
  lines.push('Console.WriteLine(response.Content);')

  return lines.join('\n')
}

function generateSwiftUrlSession(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = ['import Foundation']
  lines.push('')
  lines.push('let semaphore = DispatchSemaphore(value: 0)')
  lines.push('')
  lines.push(`var request = URLRequest(url: URL(string: "${fullUrl}")!)`)
  lines.push('request.httpMethod = "' + method + '"')

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    lines.push(`request.setValue("${bodyData.contentType}", forHTTPHeaderField: "Content-Type")`)
  }
  headers.forEach(h => {
    lines.push(`request.setValue("${h.value}", forHTTPHeaderField: "${h.key}")`)
  })

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`request.httpBody = ${JSON.stringify(bodyData.content)}.data(using: .utf8)`)
  }

  lines.push('')
  lines.push('let task = URLSession.shared.dataTask(with: request) { data, response, error in')
  lines.push('  guard let data = data else {')
  lines.push('    print(String(describing: error))')
  lines.push('    semaphore.signal()')
  lines.push('    return')
  lines.push('  }')
  lines.push('  print(String(data: data, encoding: .utf8)!)')
  lines.push('  semaphore.signal()')
  lines.push('}')
  lines.push('')
  lines.push('task.resume()')
  lines.push('semaphore.wait()')

  return lines.join('\n')
}

function generateKotlinOkHttp(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = ['val client = OkHttpClient()']

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`val mediaType = "${bodyData.contentType}".toMediaType()`)
    lines.push(`val body = ${JSON.stringify(bodyData.content)}.toRequestBody(mediaType)`)
  }

  lines.push('val request = Request.Builder()')
  lines.push(`  .url("${fullUrl}")`)

  if (bodyData) {
    lines.push(`  .${method.toLowerCase()}(body)`)
  } else if (method !== 'GET') {
    lines.push(`  .method("${method}", null)`)
  }

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    lines.push(`  .addHeader("Content-Type", "${bodyData.contentType}")`)
  }
  headers.forEach(h => {
    lines.push(`  .addHeader("${h.key}", "${h.value}")`)
  })

  lines.push('  .build()')
  lines.push('val response = client.newCall(request).execute()')
  lines.push('println(response.body?.string())')

  return lines.join('\n')
}

function generateDartHttp(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const headersObj: Record<string, string> = {}
  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    headersObj['Content-Type'] = bodyData.contentType
  }
  headers.forEach(h => {
    headersObj[h.key] = h.value
  })

  const lines: string[] = ["import 'package:http/http.dart' as http;"]
  lines.push('')
  lines.push('void main() async {')

  if (Object.keys(headersObj).length > 0) {
    lines.push(`  var headers = ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')};`)
  }

  if (['GET', 'DELETE', 'HEAD'].includes(method)) {
    lines.push(`  var response = await http.${method.toLowerCase()}(`)
    lines.push(`    Uri.parse('${fullUrl}'),`)
    if (Object.keys(headersObj).length > 0) {
      lines.push('    headers: headers,')
    }
    lines.push('  );')
  } else {
    if (bodyData && bodyData.content !== 'formdata') {
      lines.push(`  var body = ${JSON.stringify(bodyData.content)};`)
    }
    lines.push(`  var response = await http.${method.toLowerCase()}(`)
    lines.push(`    Uri.parse('${fullUrl}'),`)
    if (Object.keys(headersObj).length > 0) {
      lines.push('    headers: headers,')
    }
    if (bodyData && bodyData.content !== 'formdata') {
      lines.push('    body: body,')
    }
    lines.push('  );')
  }

  lines.push('')
  lines.push('  print(response.body);')
  lines.push('}')

  return lines.join('\n')
}

function generateDartDio(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const headersObj: Record<string, string> = {}
  headers.forEach(h => {
    headersObj[h.key] = h.value
  })

  const lines: string[] = ["import 'package:dio/dio.dart';"]
  lines.push('')
  lines.push('void main() async {')
  lines.push('  var dio = Dio();')
  lines.push('')

  const optionParts: string[] = []
  optionParts.push(`    method: '${method}'`)
  if (Object.keys(headersObj).length > 0) {
    optionParts.push(`    headers: ${JSON.stringify(headersObj, null, 6).replace(/\n/g, '\n    ')}`)
  }

  lines.push('  var response = await dio.request(')
  lines.push(`    '${fullUrl}',`)

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`    data: ${JSON.stringify(bodyData.content)},`)
  }

  lines.push('    options: Options(')
  lines.push(optionParts.join(',\n') + ',')
  lines.push('    ),')
  lines.push('  );')

  lines.push('')
  lines.push('  print(response.data);')
  lines.push('}')

  return lines.join('\n')
}

function generatePowershellRestMethod(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = []

  if (headers.length > 0) {
    lines.push('$headers = @{')
    headers.forEach(h => {
      lines.push(`  "${h.key}" = "${h.value}"`)
    })
    lines.push('}')
    lines.push('')
  }

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`$body = @"`)
    lines.push(bodyData.content)
    lines.push('"@')
    lines.push('')
  }

  const invokeArgs: string[] = []
  invokeArgs.push(`-Uri "${fullUrl}"`)
  invokeArgs.push(`-Method ${method}`)
  if (headers.length > 0) invokeArgs.push('-Headers $headers')
  if (bodyData && bodyData.content !== 'formdata') {
    invokeArgs.push('-Body $body')
    if (bodyData.contentType) {
      invokeArgs.push(`-ContentType "${bodyData.contentType}"`)
    }
  }

  lines.push(`$response = Invoke-RestMethod ${invokeArgs.join(' ')}`)
  lines.push('$response | ConvertTo-Json')

  return lines.join('\n')
}

function generatePowershellWebRequest(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = []

  if (headers.length > 0) {
    lines.push('$headers = @{')
    headers.forEach(h => {
      lines.push(`  "${h.key}" = "${h.value}"`)
    })
    lines.push('}')
    lines.push('')
  }

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`$body = @"`)
    lines.push(bodyData.content)
    lines.push('"@')
    lines.push('')
  }

  const invokeArgs: string[] = []
  invokeArgs.push(`-Uri "${fullUrl}"`)
  invokeArgs.push(`-Method ${method}`)
  if (headers.length > 0) invokeArgs.push('-Headers $headers')
  if (bodyData && bodyData.content !== 'formdata') {
    invokeArgs.push('-Body $body')
    if (bodyData.contentType) {
      invokeArgs.push(`-ContentType "${bodyData.contentType}"`)
    }
  }

  lines.push(`$response = Invoke-WebRequest ${invokeArgs.join(' ')}`)
  lines.push('$response.Content')

  return lines.join('\n')
}

function generateRHttr(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = ['library(httr)']
  lines.push('')

  const httrArgs: string[] = [`"${fullUrl}"`]

  headers.forEach(h => {
    httrArgs.push(`add_headers("${h.key}" = "${h.value}")`)
  })

  if (bodyData && bodyData.content !== 'formdata') {
    httrArgs.push(`body = ${JSON.stringify(bodyData.content)}`)
    if (bodyData.contentType) {
      httrArgs.push(`content_type("${bodyData.contentType}")`)
    }
  }

  lines.push(`response <- ${method}(`)
  lines.push('  ' + httrArgs.join(',\n  '))
  lines.push(')')
  lines.push('')
  lines.push('content(response, "text")')

  return lines.join('\n')
}

function generateRustReqwest(config: RequestConfig): string {
  const { method, url, params, body, auth } = config
  const fullUrl = buildUrl(url, params)
  const headers = getHeaders(config.headers, auth)
  const bodyData = getBodyContent(body)

  const lines: string[] = ['use reqwest;']
  lines.push('')
  lines.push('#[tokio::main]')
  lines.push('async fn main() -> Result<(), Box<dyn std::error::Error>> {')
  lines.push('    let client = reqwest::Client::new();')
  lines.push('')
  lines.push(`    let response = client.${method.toLowerCase()}("${fullUrl}")`)

  if (bodyData && bodyData.contentType !== 'multipart/form-data') {
    lines.push(`        .header("Content-Type", "${bodyData.contentType}")`)
  }
  headers.forEach(h => {
    lines.push(`        .header("${h.key}", "${h.value}")`)
  })

  if (bodyData && bodyData.content !== 'formdata') {
    lines.push(`        .body(${JSON.stringify(bodyData.content)})`)
  }

  lines.push('        .send()')
  lines.push('        .await?;')
  lines.push('')
  lines.push('    let body = response.text().await?;')
  lines.push('    println!("{}", body);')
  lines.push('')
  lines.push('    Ok(())')
  lines.push('}')

  return lines.join('\n')
}

// Main generator function
export function generateCodeSnippet(languageId: string, config: RequestConfig): string {
  const generators: Record<string, (config: RequestConfig) => string> = {
    'curl': generateCurl,
    'wget': generateWget,
    'httpie': generateHttpie,
    'http': generateHttp,
    'javascript-fetch': generateJavaScriptFetch,
    'javascript-axios': generateJavaScriptAxios,
    'javascript-xhr': generateJavaScriptXhr,
    'javascript-jquery': generateJavaScriptJquery,
    'nodejs-fetch': generateNodejsFetch,
    'nodejs-axios': generateNodejsAxios,
    'nodejs-native': generateNodejsNative,
    'nodejs-request': generateNodejsRequest,
    'python-requests': generatePythonRequests,
    'python-http': generatePythonHttp,
    'php-curl': generatePhpCurl,
    'php-guzzle': generatePhpGuzzle,
    'go-native': generateGoNative,
    'ruby-nethttp': generateRubyNetHttp,
    'java-okhttp': generateJavaOkHttp,
    'java-unirest': generateJavaUnirest,
    'java-httpurlconnection': generateJavaHttpUrlConnection,
    'csharp-httpclient': generateCsharpHttpClient,
    'csharp-restsharp': generateCsharpRestSharp,
    'swift-urlsession': generateSwiftUrlSession,
    'kotlin-okhttp': generateKotlinOkHttp,
    'dart-http': generateDartHttp,
    'dart-dio': generateDartDio,
    'powershell-restmethod': generatePowershellRestMethod,
    'powershell-webrequest': generatePowershellWebRequest,
    'r-httr': generateRHttr,
    'rust-reqwest': generateRustReqwest,
  }

  const generator = generators[languageId]
  if (!generator) {
    return `// Code generation for "${languageId}" is not yet implemented`
  }

  return generator(config)
}
