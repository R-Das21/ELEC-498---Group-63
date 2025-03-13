require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

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
