import React, { useState } from 'react';

function Dashboard() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = () => {
    if(selectedFile) {
      alert(`Uploading: ${selectedFile.name}`);
    } else {
      alert("Please select a file first");
    }
  };

  return (
    <div className="page-container">
      <h1>User Dashboard</h1>
      
      <div className="dashboard-grid">
        {/* Left Side: Upload */}
        <div className="card">
          <h3>1. Upload Text Data</h3>
          <p>Select your file (CSV, TXT, PDF) to begin parallel processing.</p>
          <div style={{ margin: '20px 0' }}>
            <input type="file" onChange={handleFileChange} />
          </div>
          <button onClick={handleUpload} className="submit-btn" style={{width: 'auto'}}>
            Process Text
          </button>
        </div>

        {/* Right Side: Output */}
        <div className="card">
          <h3>2. Analysis Results</h3>
          <div className="output-box">
            {selectedFile ? "Ready to process..." : "No data available."}
          </div>
        </div>
      </div>
    </div>
  );
}
export default Dashboard;