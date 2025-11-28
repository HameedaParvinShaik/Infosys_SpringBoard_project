import React from 'react';

function AboutUs() {
  // Define your team data here
  const teamMembers = [
    {
      name: "Shaik Hameeda Parvin",
      role: "Project Leader & Database",
      description: "Leads the project roadmap and architects the MongoDB database schemas for efficient storage."
    },
    {
      name: "Sneha Hattaraki",
      role: "Frontend Developer",
      description: "Designed the React UI, focusing on seamless user experience and responsive layouts."
    },
    {
      name: "Thirupathi Sindhu",
      role: "Frontend Developer",
      description: "Develops interactive dashboard components and ensures smooth integration with the backend APIs."
    },
    {
      name: "V RISHITHA",
      role: "Algorithm Specialist(ML)",
      description: "Focuses on the sentiment analysis rules, pattern matching logic, and ML model optimization."
    },
    {
      name: "Devisri Vutukuri",
      role: "Gen AI/AI",
      description: "Implements Generative AI features for advanced text summarization and intelligent insights."
    },
    {
      name: "Tautik Venkata Siva Sai Penumudi",
      role: "Backend",
      description: "Builds the robust Python backend, handling parallel processing tasks and API server logic."
    }
  ];

  return (
    <div className="page-container">
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1>Meet Our Team</h1>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>
          The minds behind the Python Parallel Text Handling Processor.
        </p>
      </div>

      <div className="team-grid">
        {teamMembers.map((member, index) => (
          <div key={index} className="team-card">
            {/* You can add an image here later if you want */}
            <div className="avatar-circle">
              {member.name.charAt(0)}
            </div>
            <h3>{member.name}</h3>
            <span className="role-badge">{member.role}</span>
            <p className="member-desc">{member.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AboutUs;