// 文件: api/callback.js
// 功能: GitHub 回调，用 code 交换 token

const { createOAuthAppAuth } = require("@octokit/auth-oauth-app");
const { HttpsProxyAgent } = require("https-proxy-agent");

module.exports = async (req, res) => {
  const { code, state } = req.query;
  const { state: cookieState } = req.cookies;

  if (state !== cookieState) {
    res
      .status(400)
      .send("Error: State mismatch. Please try logging in again.");
    return;
  }

  try {
    const auth = createOAuthAppAuth({
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      // (可选) 如果你的 Vercel 在国内受限，可能需要代理:
      // request: {
      //   agent: new HttpsProxyAgent(process.env.http_proxy || "http://127.0.0.1:7890"),
      // },
    });

    const { token } = await auth({
      type: "oauth-user",
      code,
      state,
    });

    // 返回一个 HTML 页面，它会向父窗口发送 token
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GitHub Auth Success</title>
      </head>
      <body>
        <p>Authenticated! Redirecting...</p>
        <script>
          (function() {
            // 将 token 发送给 Decap CMS 的父窗口
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({
                token: token,
                provider: "github",
              })}',
              window.location.origin
            );
            // 关闭此弹出窗口
            window.close();
          })();
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error during GitHub OAuth token exchange.");
  }
};