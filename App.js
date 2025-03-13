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
  const [selectedField, setSelectedField] = useState("All Fields");
  const [history, setHistory] = useState([]);  // 存储搜索历史
  const [showHistory, setShowHistory] = useState(false);  // 控制历史记录的显示

  // 当 selectedField 或 originalResults 改变时，进行二次过滤
  useEffect(() => {
    // 如果选的是 "All Fields"，就直接显示所有原始结果
    if (selectedField === "All Fields") {
      setResults(originalResults);
    } else {
      // 根据 Topic_Net.json 中的paper_id进行过滤
      const validPaperIds = topicNet[selectedField]?.papers || [];
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
    console.log("handleSearch triggered with query =", query);

    if (query.trim() === "") {
      console.log("Query is empty, returning...");
      setErrorMessage("Oops...");
      return;
    }

    console.log("Query is not empty, continuing...");
    setErrorMessage("");
    setLoading(true);
    setShowResults(true);
    setOriginalResults([]);
    setShowHistory(false);

    console.log("About to call setHistory...");
    setHistory(prevHistory => {
      console.log("Inside setHistory callback, prevHistory =", prevHistory);
      const newHistory = prevHistory.includes(query) ? prevHistory : [...prevHistory, query];
      return newHistory.slice(-5);
    });

    console.log("Set history done, about to fetch...");

    try {
      const response = await fetch("http://localhost:3001/api/gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query, field: selectedField }),
      });
      console.log("fetch response status =", response.status);

      const data = await response.json();
      console.log("前端拿到的数据 =", data);

      if (response.ok) {
        // 确保 data.papers 存在并是数组
        if (data.papers && Array.isArray(data.papers)) {
          const newPapers = data.papers.map((paper, idx) => ({
            paper_id: paper.paper_id || `paper_${idx + 1}`,
            title: paper.Title,
            author: paper.Author,
            year: paper.Year,
            abstract: paper.Abstract,
            relevance: `${paper.RelevanceScore}/100`,
          }));
          // 将处理好的论文列表保存到 originalResults
          setOriginalResults(newPapers);
        } else {
          setErrorMessage("No valid papers found. Try another search term.");
        }
      } else {
        // 如果响应状态不是 200-299，显示后端返回的错误或"Server error."
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
          {/* 🔥 把 value 设成 "All Fields" */}
          <option value="All Fields">All Fields</option>
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
