import React, { useState, useEffect } from "react";
import Preloader from "../src/components/Pre";
import Navbar from "./components/Navbar";
import Home from "./components/Home/Home";
import About from "./components/About/About";
import Footer from "./components/Footer";
import Members from "./components/Members/Members";
import EditorialList from "./components/Editorials/EditorialList";
import EditorialDetail from "./components/Editorials/EditorialDetail";
import EventRegisteration from "./components/eventRegisteration"; 
import EventPopup from "./components/EventPopup";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate
} from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import "./style.css";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [load, updateLoad] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateLoad(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      {false && <EventPopup />}
      <Preloader load={load} />
      <div className="App" id={load ? "no-scroll" : "scroll"}>
        <Navbar />
        <ScrollToTop />

        {/* <main className="page-content"> */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/editorials" element={<EditorialList />} />
            <Route path="/editorials/:slug" element={<EditorialDetail />} />
            <Route path="/members" element={<Members />} />
            <Route path="/register" element={<EventRegisteration />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        {/* </main> */}

        <Footer />
      </div>
    </Router>
  );
}


export default App;
