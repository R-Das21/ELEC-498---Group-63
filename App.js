import React, { useState, useEffect } from "react";
import "./App.css";
import myLogo from "./logoNEW.svg";
import topicNet from "./Topic_Net.json";
import CustomSpinner from "./loading-animation.js";
import Login from "./Login"; // Login 组件内包含 “Continue as Guest” 按钮

function App() {
  // token 为空表示未登录；isGuest 为 true 表示访客模式
  const [token, setToken] = useState(null);
  const [isGuest, setIsGuest] = useState(false);

  const [query, setQuery] = useState("");
  const [originalResults, setOriginalResults] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedField, setSelectedField] = useState("All Fields");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [username, setUsername] = useState("");


  // 根据选择的领域对搜索结果进行二次过滤
  useEffect(() => {
    if (selectedField === "All Fields") {
      setResults(originalResults);
    } else {
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
    if (query.trim() === "") {
      setErrorMessage("Oops...");
      return;
    }
    setErrorMessage("");
    setLoading(true);
    setShowResults(true);
    setOriginalResults([]);
    setShowHistory(false);

    // 保存最近 5 次搜索记录（仅在前端显示历史）
    setHistory(prevHistory => {
      const newHistory = prevHistory.includes(query) ? prevHistory : [...prevHistory, query];
      return newHistory.slice(-5);
    });

    try {
      const headers = { "Content-Type": "application/json" };
      // 如果已登录则带上 token；访客模式则不带 Authorization
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("http://localhost:3001/api/gpt", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: query, field: selectedField }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.papers && Array.isArray(data.papers)) {
          const newPapers = data.papers.map((paper, idx) => ({
            paper_id: paper.paper_id || `paper_${idx + 1}`,
            title: paper.Title,
            author: paper.Author,
            year: paper.Year,
            abstract: paper.Abstract,
            relevance: `${paper.RelevanceScore}/100`,
          }));
          setOriginalResults(newPapers);
        } else {
          setErrorMessage("No valid papers found. Try another search term.");
        }
      } else {
        setErrorMessage(data.error || "Server error.");
      }
    } catch (error) {
      setErrorMessage("Network error or server is not responding.");
    } finally {
      setLoading(false);
    }
  };

  // 若既没有 token 又不是访客，则显示登录界面
  if (!token && !isGuest) {
    return <Login onLogin={setToken} onGuest={() => setIsGuest(true)} />;
  }

  return (
    <div className="container">
      <header className="header">
        <div className="logo-container">
          <img src={myLogo} alt="NetSci Logo" className="logo-img" />
          <h1 className="logo">
            <span className="highlight">Net</span>Sci
          </h1>
        </div>
        {/* 右上角链接区域 */}
        <div className="header-links">
          {token ? (
            <div className="account-container" style={{ position: "relative" }}>
              <span
                className="header-link"
                onClick={() => setAccountMenuVisible(!accountMenuVisible)}
                style={{ cursor: "pointer" }}
              >
                Account

              </span>
              {accountMenuVisible && (
                <div className="account-dropdown">

                  <button
                      onClick={() => {
                      setToken(null);
                      setIsGuest(false);
                      setAccountMenuVisible(false);
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href="#login"
              className="header-link"
              onClick={() => {
                // 退出访客模式，回到登录页面
                setIsGuest(false);
                setToken(null);
              }}
            >
              Login
            </a>
          )}
          <a href="/help.html" target="_blank" className="header-link">
            Help
          </a>
        </div>
      </header>

      <div className="filter-row">
        <select
          className="filter-dropdown"
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
        >
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

      <main className={`main ${showResults ? "search-active" : ""}`}>
        {!showResults && (
          <h2 className="prompt">What would you like to discover today?</h2>
        )}

        <div className="search-container">
          <input
            type="text"
            placeholder="Type your keywords here..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
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

          {showHistory && history.length > 0 && (
            <ul className="history-dropdown">
              {history.map((item, idx) => (
                <li
                  key={idx}
                  onMouseDown={() => setQuery(item)}
                  className="history-item"
                >
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
