import React, { useState, useEffect } from "react";
import "./App.css";
import myLogo from "./logoNEW.svg";
import topicNet from "./Topic_Net.json";

import CustomSpinner from "./loading-animation.js"; // 确保路径正确

function App() {
  const [query, setQuery] = useState("");
  const [originalResults, setOriginalResults] = useState([]); // GPT返回的原始结果
  const [results, setResults] = useState([]);               // 最终显示的结果（经过过滤）
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedField, setSelectedField] = useState("");   // 学科筛选状态
  const [history, setHistory] = useState([]);  // 存储搜索历史
  const [showHistory, setShowHistory] = useState(false);  // 控制历史记录的显示


  // 当 selectedField 或 originalResults 改变时，进行二次过滤
  useEffect(() => {
    if (!selectedField) {
      // 如果未选学科，则直接显示所有原始结果
      setResults(originalResults);
    } else {
      // 取出 Topic_Net.json 中对应学科的论文ID列表
      const validPaperIds = topicNet[selectedField]?.papers || [];
      // 过滤：只保留那些 paper_id 存在于 validPaperIds 中的论文
      const filtered = originalResults.filter(paper =>
        validPaperIds.includes(paper.paper_id)
      );
      setResults(filtered);
    }
  }, [selectedField, originalResults]);

  const clearSearch = () => {
    setQuery("");
  };

  const handleSearch = async () => {
    if (query.trim() === "") {
      setErrorMessage("Oops, it looks like you didn't type anything. Please enter some keywords!");
      return;
    }
    setErrorMessage("");
    setLoading(true);
    setShowResults(true);
    setOriginalResults([]); // 清空原始结果
    setShowHistory(false);  // 关闭历史记录

    // ✅ 存储搜索历史（不存重复项）
    setHistory(prevHistory => {
      const newHistory = prevHistory.includes(query) ? prevHistory : [...prevHistory, query];
      return newHistory.slice(-5); // 只存 5 条最新记录
  });

    try {
      // 向后端发请求进行全领域搜索
      const response = await fetch("http://localhost:3001/api/gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query
          // 此处只传递 prompt，后端返回全领域结果
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.papers && Array.isArray(data.papers)) {
          // 假设每篇论文数据中包含一个 paper_id 字段（你可能需要在后端生成或映射它）
          const newPapers = data.papers.map((paper, idx) => ({
            paper_id: paper.paper_id || `paper_${idx + 1}`,  // 若没有 paper_id，临时生成一个
            title: paper.Title,
            author: paper.Author,
            year: paper.Year,
            abstract: paper.Abstract,
            relevance: `${paper.RelevanceScore}/100`,
          }));
          setOriginalResults(newPapers);
          // 过滤结果会自动由 useEffect 更新
        } else {
          setErrorMessage("No valid papers found. Try another search term.");
        }
      } else {
        setErrorMessage(data.error || "Server error.");
      }
    } catch (error) {
      console.error("Search failed:", error);
      setErrorMessage("Network error or server is not responding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {/* ======== 顶部 Header（蓝色横幅） ======== */}
      <header className="header">
        <div className="logo-container">
          <img src={myLogo} alt="NetSci Logo" className="logo-img" />
          <h1 className="logo">
            <span className="highlight">Net</span>Sci
          </h1>
        </div>
      </header>

      {/* ======== 下方 Filter 下拉菜单区域 ======== */}
      <div className="filter-row">
        <select
          className="filter-dropdown"
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
        >
          <option value="">All Fields</option>
          <option value="Artificial Intelligence (AI)">Artificial Intelligence (AI)</option>
          <option value="Biology">Biology</option>
          <option value="Chemistry">Chemistry</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Earth & Space Sciences">Earth & Space Sciences</option>
          <option value="Engineering">Engineering</option>
          <option value="Environmental Science">Environmental Science</option>
          <option value="Humanities">Humanities</option>
          <option value="Mathematics">Mathematics</option>
          <option value="Medicine & Health">Medicine & Health</option>
          <option value="Physics">Physics</option>
          <option value="Social Sciences">Social Sciences</option>
        </select>
      </div>

      {/* ======== 主体部分 ======== */}
      <main className={`main ${showResults ? "search-active" : ""}`}>
        {!showResults && (
          <h2 className="prompt">What would you like to discover today?</h2>
        )}

        {/* 🔥 搜索框 + 搜索历史 */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Type your keywords here..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}  // ✅ 聚焦显示历史
            onBlur={() => setTimeout(() => setShowHistory(false), 200)} // ✅ 失焦后隐藏，延迟防止点击丢失
            onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            className="search-input"
          />

          {query && (
            <button className="clear-button" onClick={clearSearch}>
              ✖
            </button>
          )}

          <button className="search-button" onClick={handleSearch}>
            🔍
          </button>

          {/* 🔥 搜索历史显示在输入框下方 */}
          {showHistory && history.length > 0 && (
            <ul className="history-dropdown">
              {history.map((item, idx) => (
                <li key={idx} onMouseDown={() => setQuery(item)} className="history-item">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {loading && <CustomSpinner />}

        {!loading && results.length > 0 && (
          <div className="results-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Year</th>
                  <th>Abstract</th>
                  <th>Relevance</th>
                </tr>
              </thead>
              <tbody>
                {results.map((paper, idx) => (
                  <tr key={idx}>
                    <td>{paper.title}</td>
                    <td>{paper.author}</td>
                    <td>{paper.year}</td>
                    <td>{paper.abstract}</td>
                    <td className="relevance-score">{paper.relevance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
