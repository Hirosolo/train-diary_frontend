import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./NavBar.css";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const linksRef = useRef<HTMLDivElement | null>(null);
  const underlineRef = useRef<HTMLDivElement | null>(null);
  const [teleport, setTeleport] = useState(false);

  /** shared reposition logic */
  const repositionUnderline = () => {
    const container = linksRef.current;
    const underline = underlineRef.current;
    if (!container || !underline) return;

    // Hide underline on home page
    if (location.pathname === "/" || !user) {
      underline.style.opacity = "0";
      return;
    }

    const active = container.querySelector("a.active") as HTMLElement | null;
    const firstLink = container.querySelector("a") as HTMLElement | null;
    const target = active || firstLink;

    if (!target) {
      underline.style.opacity = "0";
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const left = targetRect.left - containerRect.left + targetRect.width * 0.12;
    const width = Math.max(24, targetRect.width * 0.76);

    underline.style.opacity = "1";
    underline.style.width = `${width}px`;

    const baseTransform = `translateX(${left}px)`;

    if (teleport) {
      underline.style.transform = `${baseTransform} scale(1.12)`;
      window.setTimeout(() => {
        underline.style.transform = `${baseTransform} scale(1)`;
      }, 220);
    } else {
      underline.style.transform = baseTransform;
    }
  };

  /** reposition when path or menu changes */
  useEffect(() => {
    repositionUnderline();
  }, [location.pathname, isMenuOpen]);

  /** teleport reset */
  useEffect(() => {
    if (!teleport) return;
    const t = setTimeout(() => setTeleport(false), 420);
    return () => clearTimeout(t);
  }, [teleport]);

  /** trigger reposition on window resize */
  useEffect(() => {
    const handleResize = () => repositionUnderline();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [location.pathname, teleport]);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div
        className="logo"
        style={{ cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        <img src="/Assest/logo-traindiary.png" alt="TrainDiary" />
        <span className="logo-text">TrainDiary</span>
      </div>

      <button className="mobile-menu-btn" onClick={toggleMenu}>
        <span className={`hamburger ${isMenuOpen ? "open" : ""}`}></span>
      </button>

      <div className={`nav-links ${isMenuOpen ? "active" : ""}`} ref={linksRef}>
        <Link
          to="/workouts"
          onClick={() => {
            setIsMenuOpen(false);
            setTeleport(true);
          }}
          className={location.pathname.startsWith("/workouts") ? "active" : ""}
          aria-current={
            location.pathname.startsWith("/workouts") ? "page" : undefined
          }
        >
          Workout Tracker
        </Link>

        <Link
          to="/foods"
          onClick={() => {
            setIsMenuOpen(false);
            setTeleport(true);
          }}
          className={location.pathname.startsWith("/foods") ? "active" : ""}
          aria-current={
            location.pathname.startsWith("/foods") ? "page" : undefined
          }
        >
          Nutrition Guide
        </Link>

        <Link
          to="/dashboard"
          onClick={() => {
            setIsMenuOpen(false);
            setTeleport(true);
          }}
          className={location.pathname === "/dashboard" ? "active" : ""}
          aria-current={location.pathname === "/dashboard" ? "page" : undefined}
        >
          Progress Stats
        </Link>

        <Link
          to="/plans"
          onClick={() => {
            setIsMenuOpen(false);
            setTeleport(true);
          }}
          className={location.pathname.startsWith("/plans") ? "active" : ""}
          aria-current={
            location.pathname.startsWith("/plans") ? "page" : undefined
          }
        >
          Plans
        </Link>

        <div
          className={`nav-underline ${teleport ? "teleport" : ""}`}
          ref={underlineRef}
          aria-hidden="true"
        />
      </div>

      <div className={`auth-buttons ${isMenuOpen ? "active" : ""}`}>
        {!user ? (
          <>
            <button
              className="btn-outline"
              onClick={() => navigate("/register")}
            >
              Sign Up
            </button>
            <button className="btn-primary" onClick={() => navigate("/login")}>
              Login
            </button>
          </>
        ) : (
          <>
            <span className="user-greeting">Hi, {user.username}</span>
            <button className="btn-outline" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
