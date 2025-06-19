exports.handler = async (event, context) => {
  // Enable CORS for all origins
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-C3-API-Key, X-C3-Cookie, Cookie',
    'Access-Control-Allow-Credentials': 'true',
  }

  // Handle preflight OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  try {
    // Extract node URL and path from the request
    const path = event.path.replace('/api/comfyui-proxy/', '')
    const pathParts = path.split('/')
    const nodeUrl = pathParts[0]
    const comfyUIPath = pathParts.slice(1).join('/')
    
    if (!nodeUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing node URL' }),
      }
    }

    // Construct the target URL
    const targetUrl = `https://${nodeUrl}/${comfyUIPath}${event.rawQuery ? `?${event.rawQuery}` : ''}`
    
    console.log(`Proxying request to: ${targetUrl}`)

    // Prepare headers for the ComfyUI request
    const comfyUIHeaders = {
      'Content-Type': 'application/json',
    }

    // Forward authentication headers
    if (event.headers['x-c3-api-key']) {
      comfyUIHeaders['X-C3-API-Key'] = event.headers['x-c3-api-key']
    }
    if (event.headers['x-c3-cookie']) {
      comfyUIHeaders['X-C3-Cookie'] = event.headers['x-c3-cookie']
    }
    if (event.headers['cookie']) {
      comfyUIHeaders['Cookie'] = event.headers['cookie']
    }

    // Prepare the request options
    const requestOptions = {
      method: event.httpMethod,
      headers: comfyUIHeaders,
    }

    // Add body for POST/PUT requests
    if (event.body && (event.httpMethod === 'POST' || event.httpMethod === 'PUT')) {
      requestOptions.body = event.body
    }

    // Make the request to ComfyUI
    const response = await fetch(targetUrl, requestOptions)
    
    // Get response body
    let responseBody
    const contentType = response.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      responseBody = JSON.stringify(await response.json())
    } else if (contentType.includes('text/')) {
      responseBody = await response.text()
    } else {
      // For binary content (images, videos)
      const buffer = await response.arrayBuffer()
      responseBody = Buffer.from(buffer).toString('base64')
      headers['Content-Type'] = contentType
      headers['Content-Encoding'] = 'base64'
    }

    console.log(`Response: ${response.status} ${response.statusText}`)

    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': contentType || 'application/json',
      },
      body: responseBody,
      isBase64Encoded: !contentType.includes('text/') && !contentType.includes('application/json'),
    }

  } catch (error) {
    console.error('Proxy error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Proxy error', 
        message: error.message 
      }),
    }
  }
} 