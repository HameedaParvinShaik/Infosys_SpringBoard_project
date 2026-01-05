import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import "../styles/Signup.css";


function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    console.log("Registering User:", formData);
    
    // START OF SIMULATION
    alert("Account created successfully! Redirecting to login...");
    navigate('/login');
    // END OF SIMULATION
  };

  return (
    <div className="page-container">
      <div className="auth-card">
        <h2>Create an Account</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              name="name"
              className="form-input"
              placeholder="Enter your full name"
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              name="email"
              className="form-input"
              placeholder="Enter your email"
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password"
              className="form-input"
              placeholder="Create a password"
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              name="confirmPassword"
              className="form-input"
              placeholder="Confirm your password"
              onChange={handleChange} 
              required 
            />
          </div>

          <button type="submit" className="submit-btn">Sign Up</button>
        </form>
        
        <p style={{ marginTop: '20px', color: '#666', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: '#3498db', fontWeight: 'bold', textDecoration: 'none' }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;