require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ ERROR: Missing OpenAI API Key. Check your .env file.");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const hashedPassword1 = "$2b$10$UEJPY82laAoJ3wQgf0mkauKMBfFESH82ZXzNlCAAGkOqHwbB42ZtK";
const hashedPassword2 = "$2b$10$cdTArMt6lUih5dRWIa4HHezUkuoMT68KSV0/mP/61hCE3BNBQpQk2";

const users = [
  { username: "testuser1", password: hashedPassword1, searchHistory: [] },
  { username: "testuser2", password: hashedPassword2, searchHistory: [] }
];

// 注册接口
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "用户名和密码必填" });
  }

  // 检查用户名是否已存在
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: "用户名已存在" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    res.json({ message: "注册成功" });
  } catch (error) {
    res.status(500).json({ error: "注册失败" });
  }
});

// 登录接口
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "用户名和密码必填" });
  }

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(400).json({ error: "用户不存在" });
  }

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "密码错误" });
    }
    // 生成 JWT token（JWT_SECRET 请在 .env 文件中配置）
    const token = jwt.sign({ username }, process.env.JWT_SECRET || "secret_key", { expiresIn: "1h" });
    res.json({ message: "登录成功", token });
  } catch (error) {
    res.status(500).json({ error: "登录失败" });
  }
});

// JWT 验证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || "secret_key", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 原有的 /api/gpt 接口添加保护（只有登录用户才能访问）
app.post("/api/gpt", authenticateToken, async (req, res) => {
  try {
    const { prompt, field } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "❌ No prompt provided." });
    }

    // 尝试解析 token（如果存在），否则将 currentUser 保持为 null
    let currentUser = null;
    const authHeader = req.headers["authorization"];
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
        currentUser = users.find(u => u.username === decoded.username);
      } catch (err) {
        console.log("无效或过期的 token，将作为访客处理。");
      }
    }

    // 如果有登录用户，则存储搜索历史（只保留最近 5 条）
    if (currentUser) {
      currentUser.searchHistory.push(prompt);
      if (currentUser.searchHistory.length > 5) {
        currentUser.searchHistory.shift();
      }
    }

    console.log(`🔍 Received prompt: "${prompt}", field: "${field || "All Fields"}"`);

    const gptPrompt = `
      Recommend the 10 best academic papers related to "${prompt}".
      Rank them by relevance and provide a relevance score from 0 to 100 (higher means more relevant).
      Format the response strictly as a valid JSON object:
      {
        "papers": [
          {
            "Title": "Paper title here",
            "Author": "Author names here",
            "Year": "Publication year",
            "Abstract": "Brief summary of the paper",
            "RelevanceScore": "Relevance score from 0 to 100"
          }
        ]
      }
      Ensure the JSON format is valid with proper commas and syntax.
      Do NOT include any explanation or extra text, only return JSON.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: gptPrompt }]
    });

    let jsonText = completion.choices[0].message.content.trim();
    console.log("📝 OpenAI JSON Response:", jsonText);

    jsonText = jsonText.replace(/(\r\n|\n|\r)/gm, "").trim();
    jsonText = jsonText.replace(/,\s*}/g, "}");
    jsonText = jsonText.replace(/,\s*]/g, "]");

    const papers = JSON.parse(jsonText);

    // 本地分类筛选
    if (field && field.trim() !== "" && field !== "All Fields") {
      console.log(`📂 Filtering papers for field: "${field}" using Topic_Net data`);
      let filtered = papers.papers.filter((paper) =>
        topicNetData[field]?.some(keyword =>
          (paper.Title || "").toLowerCase().includes(keyword.toLowerCase()) ||
          (paper.Abstract || "").toLowerCase().includes(keyword.toLowerCase())
        )
      );
      if (filtered.length < 10) {
        const needed = 10 - filtered.length;
        const unmatched = papers.papers.filter(p => !filtered.includes(p));
        const supplement = unmatched.slice(0, needed);
        filtered = [...filtered, ...supplement];
      }
      papers.papers = filtered;
    }

    res.json(papers);
  } catch (error) {
    console.error("❌ OpenAI API Error:", error);

    if (error instanceof SyntaxError) {
      return res.status(500).json({
        error: "Invalid JSON format received from OpenAI. Try again.",
        details: error.message
      });
    }

    res.status(500).json({
      error: "Something went wrong.",
      details: error.response ? error.response.data : error.message,
    });
  }
});

// 从 Topic_Net.json 加载本地分类数据（正确的相对路径）
let topicNetData = {};
try {
  const topicNetPath = path.join(__dirname, "..", "Topic_Net.json");
  const topicNetContent = fs.readFileSync(topicNetPath, "utf8");
  topicNetData = JSON.parse(topicNetContent);
  console.log("✅ Loaded Topic_Net.json successfully from:", topicNetPath);
} catch (error) {
  console.error("❌ Error loading Topic_Net.json:", error);
}

app.post("/api/gpt", async (req, res) => {
  try {
    const { prompt, field } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "❌ No prompt provided." });
    }

    console.log(`🔍 Received prompt: "${prompt}", field: "${field || "All Fields"}"`);

    // 🔥 让 GPT 返回 10 篇论文，并提供相关性评分
    const gptPrompt = `
      Recommend the 10 best academic papers related to "${prompt}".
      Rank them by relevance and provide a relevance score from 0 to 100 (higher means more relevant).
      Format the response strictly as a valid JSON object:
      {
        "papers": [
          {
            "Title": "Paper title here",
            "Author": "Author names here",
            "Year": "Publication year",
            "Abstract": "Brief summary of the paper",
            "RelevanceScore": "Relevance score from 0 to 100"
          }
        ]
      }
      Ensure the JSON format is valid with proper commas and syntax.
      Do NOT include any explanation or extra text, only return JSON.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: gptPrompt }]
    });

    // ✅ 让 OpenAI 只返回 JSON 格式的文本
    let jsonText = completion.choices[0].message.content.trim();
    console.log("📝 OpenAI JSON Response:", jsonText);

    jsonText = jsonText.replace(/(\r\n|\n|\r)/gm, "").trim();
    jsonText = jsonText.replace(/,\s*}/g, "}");
    jsonText = jsonText.replace(/,\s*]/g, "]");

    const papers = JSON.parse(jsonText);

    // 当接收到 field 参数且不为 "All Fields" 时，进行本地分类筛选
    if (field && field.trim() !== "" && field !== "All Fields") {
      console.log(`📂 Filtering papers for field: "${field}" using Topic_Net data`);
      // 使用 Topic_Net.json 中的数据来匹配论文标题或摘要
      let filtered = papers.papers.filter((paper) =>
        topicNetData[field]?.some(keyword =>
          (paper.Title || "").toLowerCase().includes(keyword.toLowerCase()) ||
          (paper.Abstract || "").toLowerCase().includes(keyword.toLowerCase())
        )
      );
      // 如果筛选后的结果不足 10 篇，则用剩余论文补足
      if (filtered.length < 10) {
        const needed = 10 - filtered.length;
        const unmatched = papers.papers.filter(p => !filtered.includes(p));
        const supplement = unmatched.slice(0, needed);
        filtered = [...filtered, ...supplement];
      }
      papers.papers = filtered;
    }

    res.json(papers);
  } catch (error) {
    console.error("❌ OpenAI API Error:", error);

    if (error instanceof SyntaxError) {
      return res.status(500).json({
        error: "Invalid JSON format received from OpenAI. Try again.",
        details: error.message
      });
    }

    res.status(500).json({
      error: "Something went wrong.",
      details: error.response ? error.response.data : error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("🚀 OpenAI API is running! Use /api/gpt to send requests.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
