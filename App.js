import React, { useState } from "react";
import "./App.css";
import myLogo from "./logoNEW.svg";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSearch = async () => {
    if (query.trim() === "") {
      setErrorMessage("Oops, it looks like you didn't type anything. Please enter some keywords!");
      return;
    }
    setErrorMessage("");
    setLoading(true);
    setResults([]);

    try {
      const response = await fetch("http://localhost:3001/api/gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.papers && Array.isArray(data.papers)) {
          setResults(data.papers.map((paper) => ({
            title: paper.Title,
            author: paper.Author,
            year: paper.Year,
            abstract: paper.Abstract,
            relevance: `${paper.RelevanceScore}/100` // ✅ 显示相关性评分
          })));
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
      <header className="header">
        <div className="logo-container">
          <img src={myLogo} alt="NetSci Logo" className="logo-img" />
          <h1 className="logo"><span className="highlight">Net</span>Sci</h1>
        </div>
      </header>

      <main className="main">
        <h2 className="prompt">What would you like to discover today?</h2>

        <div className="search-container">
          <input
            type="text"
            placeholder="Type your keywords here..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            className="search-input"
          />
          <button className="search-button" onClick={handleSearch}>🔍</button>
        </div>

        {errorMessage && <p className="error-message">{errorMessage}</p>}
        {loading && <div className="spinner"></div>}

        {!loading && results.length > 0 && (
          <table className="results-table">
            <thead>
              <tr><th>Title</th><th>Author</th><th>Year</th><th>Abstract</th><th>Relevance</th></tr>
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
        )}
      </main>
    </div>
  );
}

export default App;
