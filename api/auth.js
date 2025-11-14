// 文件: api/auth.js
const { createOAuthAppAuth } = require("@octokit/auth-oauth-app");
const { v4: uuid } = require("uuid");

module.exports = async (req, res) => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const url = new URL(`https://github.com/login/oauth/authorize`);
  const state = uuid();
  
  // 设置 state cookie
  res.setHeader(
    "Set-Cookie",
    `state=${state}; HttpOnly; Max-Age=3600; ${
      !isDevelopment ? "Secure;" : ""
    } Path=/;`
  );

  url.searchParams.append("client_id", process.env.OAUTH_CLIENT_ID);
  
  // !!! 关键：这里的 URL 必须和你在 GitHub App 第 1 步里填的【完全一致】
  url.searchParams.append("redirect_uri", `https://www.philohao.com/api/callback`); 
  
  url.searchParams.append("state", state);
  url.searchParams.append("scope", "repo");

  res.writeHead(302, { Location: url.href });
  res.end();
};