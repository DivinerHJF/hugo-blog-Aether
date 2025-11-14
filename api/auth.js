// 文件: api/auth.js
// 功能: 重定向用户到 GitHub 授权页面

const { createOAuthAppAuth } = require("@octokit/auth-oauth-app");
const { v4: uuid } = require("uuid");
const { HttpsProxyAgent } = require("https-proxy-agent");

module.exports = async (req, res) => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const { host } = req.headers;
  const url = new URL(`https://github.com/login/oauth/authorize`);

  const state = uuid();
  // 在 Vercel 中，我们无法直接使用会话(session)
  // 所以我们把 state cookie 设置为 httpOnly 和 secure
  // Vercel 似乎在 /api/ 路由上自动处理了 cookie
  res.setHeader(
    "Set-Cookie",
    `state=${state}; HttpOnly; Max-Age=3600; ${
      !isDevelopment ? "Secure;" : ""
    } Path=/;`
  );

  url.searchParams.append("client_id", process.env.OAUTH_CLIENT_ID);
  url.searchParams.append("redirect_uri", `https://www.philohao.com/api/callback`); // 替换成你的域名!
  url.searchParams.append("state", state);
  url.searchParams.append("scope", "repo");

  res.writeHead(302, { Location: url.href });
  res.end();
};