// Netlify serverless function that proxies requests to Clockify's API.
// This exists purely to get around browser CORS restrictions — Clockify's
// API doesn't allow direct calls from arbitrary browser origins, but it's
// totally happy to receive calls from a server (this function).
//
// The browser sends: { url, method, apiKey, body }
// This function forwards that request to Clockify and returns the response.

exports.handler = async function (event) {
  // Only allow POST requests to this proxy
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { url, method, apiKey, body } = JSON.parse(event.body);

    if (!url || !apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing url or apiKey" }),
      };
    }

    // Only allow forwarding to Clockify's own domains — this stops the
    // function being abused as an open proxy to call arbitrary URLs.
    const allowedHosts = ["api.clockify.me", "reports.api.clockify.me"];
    const targetUrl = new URL(url);
    if (!allowedHosts.includes(targetUrl.hostname)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "URL not allowed" }),
      };
    }

    const clockifyResponse = await fetch(url, {
      method: method || "GET",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await clockifyResponse.text();

    return {
      statusCode: clockifyResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: responseText,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};