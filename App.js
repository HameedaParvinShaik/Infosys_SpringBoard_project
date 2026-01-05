import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import './App.css';


import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import AboutUs from './pages/AboutUs';


function Logout({ setIsLoggedIn }) {
const navigate = useNavigate();
useEffect(() => {
setIsLoggedIn(false);
navigate('/');
}, [navigate, setIsLoggedIn]);
return null;
}


function App() {
const [isLoggedIn, setIsLoggedIn] = useState(false);


return (
<Router>
<nav className="navbar">
<div className="nav-brand">Text Processor</div>
<div className="nav-links">
{!isLoggedIn ? (
<>
<Link to="/">Home</Link>
<Link to="/about">About Us</Link>
<Link to="/signup">Sign Up</Link>
<Link to="/login" className="nav-btn btn-login">Login</Link>
</>
) : (
<>
<Link to="/dashboard">Dashboard</Link>
<Link to="/history">History</Link>
<Link to="/logout" className="nav-btn btn-logout">Logout</Link>
</>
)}
</div>
</nav>


<Routes>
<Route path="/" element={<Home />} />
<Route path="/about" element={<AboutUs />} />
<Route path="/signup" element={<Signup />} />
<Route path="/login" element={<Login onLogin={() => setIsLoggedIn(true)} />} />
<Route path="/dashboard" element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" />} />
<Route path="/history" element={isLoggedIn ? <History /> : <Navigate to="/login" />} />
<Route path="/logout" element={<Logout setIsLoggedIn={setIsLoggedIn} />} />
</Routes>
</Router>
);
}


export default App;