const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const baseHeaders = {
  'Content-Type': 'application/json',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      headers: cors,
      body: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.',
    };
  }

  const tableUrl = `${SUPABASE_URL}/rest/v1/blog_posts`;
  const headers = {
    ...baseHeaders,
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  try {
    if (event.httpMethod === 'POST') {
      const { title, category, content, read_time } = JSON.parse(event.body || '{}');
      if (!title || !category || !content) {
        return { statusCode: 400, headers: cors, body: 'title, category, and content are required.' };
      }

      const payload = [{
        title,
        category,
        content,
        read_time: read_time || null,
        created_at: new Date().toISOString(),
      }];

      const response = await fetch(tableUrl, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      if (!response.ok) {
        return { statusCode: response.status, headers: cors, body: text || 'Insert failed.' };
      }

      return { statusCode: 200, headers: cors, body: text };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) {
        return { statusCode: 400, headers: cors, body: 'id is required to delete.' };
      }

      const response = await fetch(`${tableUrl}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });

      const text = await response.text();
      if (!response.ok) {
        return { statusCode: response.status, headers: cors, body: text || 'Delete failed.' };
      }

      return { statusCode: 200, headers: cors, body: 'Deleted' };
    }

    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: err.message || 'Server error' };
  }
};
