exports.handler = async function(event) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = 'https://cfaweeklystripereconciliation.netlify.app/auth';

  if (event.httpMethod === 'GET') {
    // Return auth URL for the frontend to redirect to
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.compose',
      access_type: 'offline',
      prompt: 'consent'
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUrl })
    };
  }

  if (event.httpMethod === 'POST') {
    // Exchange auth code for tokens
    const { code, refreshToken } = JSON.parse(event.body);

    if (refreshToken) {
      // Use refresh token to get new access token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });
      const data = await response.json();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    // Exchange code for tokens
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        grant_type: 'authorization_code'
      })
    });
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
