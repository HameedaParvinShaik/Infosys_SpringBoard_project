import React from "react";
import { motion } from "framer-motion";
import "../styles/AboutUs.css";

function AboutUs() {
  const teamMembers = [
    {
      name: "Shaik Hameeda Parvin",
      role: "Project Leader & Database",
      description:
        "Leads the project roadmap and designs scalable MongoDB schemas for high-performance storage."
    },
    {
      name: "Sneha Hattaraki",
      role: "Frontend Developer",
      description:
        "Designed the React UI with a focus on clean layouts, animations, and responsive design."
    },
    {
      name: "Thirupathi Sindhu",
      role: "Frontend Developer",
      description:
        "Develops interactive dashboard components and ensures seamless API integration."
    },
    {
      name: "V Rishitha",
      role: "Algorithm Specialist (ML)",
      description:
        "Works on sentiment analysis rules, pattern matching logic, and ML optimization."
    },
    {
      name: "Devisri Vutukuri",
      role: "Gen AI / AI Engineer",
      description:
        "Implements Generative AI features for summarization and intelligent text insights."
    },
    {
      name: "Tautik Venkata Siva Sai Penumudi",
      role: "Backend Developer",
      description:
        "Builds the Python backend with parallel processing and API handling."
    }
  ];

  return (
    <div className="about-container">
      {/* HEADER */}
      <motion.div
        className="about-header"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h1>Meet Our Team</h1>
        <p>
          The passionate minds behind the <b>Python Parallel Text Handling Processor</b>.
        </p>
      </motion.div>

      {/* TEAM GRID */}
      <div className="team-grid">
        {teamMembers.map((member, index) => (
          <motion.div
            key={index}
            className="team-card"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.08, y: -5 }}
          >
            <div className="avatar-circle">{member.name.charAt(0)}</div>
            <h3>{member.name}</h3>
            <span className="role-badge">{member.role}</span>
            <p className="member-desc">{member.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default AboutUs;
