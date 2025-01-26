import React, { useState } from "react";
import "./App.css";


function App() {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim() === "") {
      alert("Please enter a keyword!");
    } else {
      console.log(`Search initiated for: ${query}`);
    }
  };



  return (
    <div className="container">
      <header className="header">
        <div className="logo-container">
          <img src="/path-to-your-logo.png" alt="NetSci Logo" className="logo-img" />
          <h1 className="logo">
            <span className="highlight">Net</span>Sci
          </h1>
        </div>
        <nav className="navbar">
          <a href="#setting">Setting</a>
          <a href="#account">My Account</a>
          <a href="#help">Help</a>
          <a href="#about">About Us</a>
        </nav>
      </header>

      <main className="main">
        <h2 className="prompt">How can I help?</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Enter keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          <button className="search-button" onClick={handleSearch}>
            ➡
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
