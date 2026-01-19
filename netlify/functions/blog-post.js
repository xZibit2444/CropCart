const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY; // Secret key for admin operations

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

// Validate UUID format
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Verify admin authorization
function verifyAdminAuth(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  if (!ADMIN_API_KEY || token !== ADMIN_API_KEY) {
    return { authorized: false, error: 'Invalid or unauthorized API key' };
  }
  
  return { authorized: true };
}

const baseHeaders = {
  'Content-Type': 'application/json',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, PUT, DELETE, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.' }),
    };
  }

  // Enforce admin authentication for mutating operations
  if (['POST', 'PUT', 'DELETE'].includes(event.httpMethod)) {
    const authResult = verifyAdminAuth(event);
    if (!authResult.authorized) {
      return {
        statusCode: 401,
        headers: cors,
        body: JSON.stringify({ error: authResult.error }),
      };
    }
  }

  const tableUrl = `${SUPABASE_URL}/rest/v1/blog_posts`;
  const headers = {
    ...baseHeaders,
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  try {
    // CREATE - with UUID
    if (event.httpMethod === 'POST') {
      const { title, category, content, read_time, owner_id } = JSON.parse(event.body || '{}');
      if (!title || !category || !content) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'title, category, and content are required.' }) };
      }

      const postId = generateUUID();
      const payload = [{
        id: postId,
        title,
        category,
        content,
        read_time: read_time || null,
        owner_id: owner_id || null, // Track who created this post
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];

      const response = await fetch(tableUrl, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      if (!response.ok) {
        return { statusCode: response.status, headers: cors, body: text || JSON.stringify({ error: 'Insert failed.' }) };
      }

      return { statusCode: 201, headers: cors, body: text };
    }

    // UPDATE - with ownership check
    if (event.httpMethod === 'PUT') {
      const { id, title, category, content, read_time, owner_id } = JSON.parse(event.body || '{}');
      
      if (!id) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'id is required to update.' }) };
      }

      // Validate UUID format
      if (!isValidUUID(id)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid UUID format for id.' }) };
      }

      // First, verify ownership if owner_id is provided
      if (owner_id) {
        const checkResponse = await fetch(`${tableUrl}?id=eq.${encodeURIComponent(id)}&select=owner_id`, {
          method: 'GET',
          headers,
        });
        
        if (checkResponse.ok) {
          const existingPosts = await checkResponse.json();
          if (existingPosts.length > 0 && existingPosts[0].owner_id && existingPosts[0].owner_id !== owner_id) {
            return { 
              statusCode: 403, 
              headers: cors, 
              body: JSON.stringify({ error: 'Access denied. You do not own this resource.' }) 
            };
          }
        }
      }

      const updatePayload = {
        ...(title && { title }),
        ...(category && { category }),
        ...(content && { content }),
        ...(read_time !== undefined && { read_time }),
        updated_at: new Date().toISOString(),
      };

      const response = await fetch(`${tableUrl}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(updatePayload),
      });

      const text = await response.text();
      if (!response.ok) {
        return { statusCode: response.status, headers: cors, body: text || JSON.stringify({ error: 'Update failed.' }) };
      }

      return { statusCode: 200, headers: cors, body: text };
    }

    // DELETE - with ownership check
    if (event.httpMethod === 'DELETE') {
      const { id, owner_id } = JSON.parse(event.body || '{}');
      
      if (!id) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'id is required to delete.' }) };
      }

      // Validate UUID format
      if (!isValidUUID(id)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid UUID format for id.' }) };
      }

      // Verify ownership if owner_id is provided
      if (owner_id) {
        const checkResponse = await fetch(`${tableUrl}?id=eq.${encodeURIComponent(id)}&select=owner_id`, {
          method: 'GET',
          headers,
        });
        
        if (checkResponse.ok) {
          const existingPosts = await checkResponse.json();
          if (existingPosts.length > 0 && existingPosts[0].owner_id && existingPosts[0].owner_id !== owner_id) {
            return { 
              statusCode: 403, 
              headers: cors, 
              body: JSON.stringify({ error: 'Access denied. You do not own this resource.' }) 
            };
          }
        }
      }

      const response = await fetch(`${tableUrl}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });

      const text = await response.text();
      if (!response.ok) {
        return { statusCode: response.status, headers: cors, body: text || JSON.stringify({ error: 'Delete failed.' }) };
      }

      return { statusCode: 200, headers: cors, body: JSON.stringify({ message: 'Deleted successfully', id }) };
    }

    // GET - public read access
    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.id;
      
      let url = tableUrl;
      if (id) {
        if (!isValidUUID(id)) {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid UUID format for id.' }) };
        }
        url = `${tableUrl}?id=eq.${encodeURIComponent(id)}`;
      } else {
        url = `${tableUrl}?order=created_at.desc`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const text = await response.text();
      if (!response.ok) {
        return { statusCode: response.status, headers: cors, body: text || JSON.stringify({ error: 'Fetch failed.' }) };
      }

      return { statusCode: 200, headers: cors, body: text };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message || 'Server error' }) };
  }
};
