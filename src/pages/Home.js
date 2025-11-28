import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Python Parallel Text Handling Processor</h1>
      <p style={{ fontSize: '18px', color: '#555' }}>
        A powerful system for processing large text datasets simultaneously.
      </p>
      
      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <div style={cardStyle}>
          <h3>🚀 Parallel Processing</h3>
          <p>Breaks down huge text files and processes them concurrently for maximum speed.</p>
        </div>
        <div style={cardStyle}>
          <h3>📊 Sentiment Analysis</h3>
          <p>Scores feelings and emotions in your text using advanced rule-based scoring.</p>
        </div>
        <div style={cardStyle}>
          <h3>🔍 Smart Search</h3>
          <p>Search through processed data and generate reports instantly.</p>
        </div>
      </div>

      <div style={{ marginTop: '50px' }}>
        <Link to="/login">
          <button style={buttonStyle}>Get Started</button>
        </Link>
      </div>
    </div>
  );
}

// Simple internal styles for this page
const cardStyle = {
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '20px',
  width: '250px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
};

const buttonStyle = {
  padding: '15px 30px',
  fontSize: '16px',
  backgroundColor: '#3498db',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer'
};

export default Home;