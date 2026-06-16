exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { accessToken, to, cc, subject, htmlBody, plainBody } = JSON.parse(event.body);

    if (!accessToken) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing access token' }) };
    }

    // Build RFC 2822 email message
    const toLine = Array.isArray(to) ? to.join(', ') : to;
    const ccLine = Array.isArray(cc) && cc.length ? cc.join(', ') : '';

    const boundary = 'boundary_' + Math.random().toString(36).substr(2);

    let message = [
      `To: ${toLine}`,
      ccLine ? `Cc: ${ccLine}` : '',
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      plainBody,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      htmlBody,
      '',
      `--${boundary}--`
    ].filter(line => line !== null).join('\r\n');

    // Base64url encode
    const encoded = Buffer.from(message).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Create draft via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: { raw: encoded }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || 'Gmail API error' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, draftId: data.id })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
