// 文件: api/callback.js
const { createOAuthAppAuth } = require("@octokit/auth-oauth-app");

module.exports = async (req, res) => {
  const { code, state } = req.query;
  const { state: cookieState } = req.cookies;

  if (state !== cookieState) {
    res.status(400).send("Error: State mismatch. Please try logging in again.");
    return;
  }

  try {
    const auth = createOAuthAppAuth({
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
    });

    const { token } = await auth({
      type: "oauth-user",
      code,
      state,
    });

    // 返回 HTML 页面，向 Decap CMS 发送 token
    res.send(`
      <!DOCTYPE html>
      <html><head><title>GitHub Auth Success</title></head>
      <body>
        <p>Authenticated! Redirecting...</p>
        <script>
          (function() {
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({
                token: token,
                provider: "github",
              })}',
              window.location.origin
            );
            window.close();
          })();
        </script>
      </body></html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error during GitHub OAuth token exchange.");
  }
};