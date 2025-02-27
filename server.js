require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

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

// 让 OpenAI 返回 10 篇最佳论文，并带有相关性评分
app.post("/api/gpt", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "❌ No prompt provided." });
    }

    console.log(`🔍 Received prompt: "${prompt}"`);

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

    console.log("📝 OpenAI JSON Response:", jsonText); // 记录 OpenAI 返回的内容

    // ✅ 先尝试修正 JSON 格式错误（去除额外字符）
    jsonText = jsonText.replace(/(\r\n|\n|\r)/gm, "").trim(); // 去除换行符
    jsonText = jsonText.replace(/,\s*}/g, "}"); // 修正逗号+大括号错误
    jsonText = jsonText.replace(/,\s*]/g, "]"); // 修正逗号+方括号错误

    // ✅ 解析 OpenAI 返回的 JSON 数据
    const papers = JSON.parse(jsonText);

    // 发送 JSON 数据给前端
    res.json(papers);
  } catch (error) {
    console.error("❌ OpenAI API Error:", error);

    // ❌ 处理 JSON 解析错误
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
