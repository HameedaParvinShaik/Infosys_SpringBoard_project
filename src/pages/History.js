import React from 'react';

function History() {
  // Dummy data to simulate history from database
  const historyData = [
    { id: 1, date: '2023-10-24', filename: 'dataset_A.csv', status: 'Completed', result: 'View Report' },
    { id: 2, date: '2023-10-25', filename: 'review_logs.txt', status: 'Processing', result: 'Pending' },
    { id: 3, date: '2023-10-26', filename: 'error_report.pdf', status: 'Failed', result: 'Retry' },
    { id: 4, date: '2023-10-27', filename: 'social_media_dump.json', status: 'Completed', result: 'View Report' },
  ];

  return (
    <div className="page-container">
      <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ borderBottom: '2px solid #f4f6f8', paddingBottom: '15px', marginBottom: '20px' }}>
          Processing History
        </h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Here is a list of files you have processed previously.
        </p>
        
        <div className="table-responsive">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>File Name</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td style={{ fontWeight: '500' }}>{item.filename}</td>
                  <td>
                    <span className={`status-badge status-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button className="action-link">
                      {item.result}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default History;