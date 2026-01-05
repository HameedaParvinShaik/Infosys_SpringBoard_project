import React from "react";
import { motion } from "framer-motion";
import "../styles/Home.css";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 }
};

function Home() {
  return (
    <div className="home">

      {/* ===== HERO SECTION ===== */}
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1>Python Parallel Text Handling Processor</h1>
          <p>
            A high-performance system for processing large-scale text data using
            parallel computing, sentiment analysis, and intelligent insights.
          </p>
        </motion.div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="section light">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Key Features
        </motion.h2>

        <div className="features-grid">
          {[
            "Parallel Text Processing",
            "Sentiment Analysis Engine",
            "Smart Search & Reports",
            "Processing History",
            "Scalable Python Backend"
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <h3>{feature}</h3>
              <p>
                Built to efficiently handle large datasets with high accuracy
                and performance.
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== WORKFLOW SECTION ===== */}
      <section className="section dark">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          How It Works
        </motion.h2>

        <div className="timeline">
          {[
            "Upload File",
            "Split into Chunks",
            "Parallel Processing",
            "Apply Sentiment Analysis",
            "Store Results",
            "Generate Reports"
          ].map((step, index) => (
            <motion.div
              key={index}
              className="timeline-item"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
            >
              <span>{index + 1}</span>
              <p>{step}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== TECH STACK ===== */}
      <section className="section light">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Technology Stack
        </motion.h2>

        <div className="tech-grid">
          {["React", "Python", "Flask", "MongoDB", "Framer Motion"].map(
            (tech, index) => (
              <motion.div
                key={index}
                className="tech-card"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                {tech}
              </motion.div>
            )
          )}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2>Start Processing Smarter</h2>
          <p>Create an account and explore parallel text analysis.</p>
          <Link to="/signup">
            <button className="hero-btn">Create Account</button>
          </Link>
        </motion.div>
      </section>

    </div>
  );
}

export default Home;
