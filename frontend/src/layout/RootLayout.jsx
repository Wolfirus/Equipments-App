import React, { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RootLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // ✅ Always go to the role-based dashboard home
  const goDashboard = () => navigate("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4">
          <div className="h-16 flex items-center justify-between">
            {/* ✅ If logged in, clicking logo should bring you to /dashboard */}
            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center font-bold">
                EQ
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-900">Équipements</div>
                <div className="text-xs text-slate-500">Plateforme de réservation</div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-4">
              <Link className="text-sm text-slate-600 hover:text-slate-900" to="/about">
                À propos
              </Link>
              <Link className="text-sm text-slate-600 hover:text-slate-900" to="/contact">
                Contact
              </Link>

              {user ? (
                <>
                  <button
                    className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90"
                    onClick={goDashboard}
                  >
                    Dashboard
                  </button>
                  <button
                    className="text-sm px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
                    onClick={() => {
                      logout();
                      navigate("/");
                    }}
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="text-sm px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
                    onClick={() => navigate("/login")}
                  >
                    Connexion
                  </button>
                  <button
                    className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90"
                    onClick={() => navigate("/register")}
                  >
                    Inscription
                  </button>
                </>
              )}
            </div>

            <button
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              ☰
            </button>
          </div>

          {open && (
            <div className="md:hidden pb-4">
              <div className="flex flex-col gap-2">
                <Link
                  className="text-sm px-3 py-2 rounded-lg hover:bg-gray-50"
                  to="/about"
                  onClick={() => setOpen(false)}
                >
                  À propos
                </Link>
                <Link
                  className="text-sm px-3 py-2 rounded-lg hover:bg-gray-50"
                  to="/contact"
                  onClick={() => setOpen(false)}
                >
                  Contact
                </Link>

                <div className="h-px bg-gray-200 my-2" />

                {user ? (
                  <>
                    <button
                      className="text-sm px-3 py-2 rounded-lg bg-slate-900 text-white"
                      onClick={() => {
                        setOpen(false);
                        goDashboard();
                      }}
                    >
                      Dashboard
                    </button>
                    <button
                      className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white"
                      onClick={() => {
                        setOpen(false);
                        logout();
                        navigate("/");
                      }}
                    >
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white"
                      onClick={() => {
                        setOpen(false);
                        navigate("/login");
                      }}
                    >
                      Connexion
                    </button>
                    <button
                      className="text-sm px-3 py-2 rounded-lg bg-slate-900 text-white"
                      onClick={() => {
                        setOpen(false);
                        navigate("/register");
                      }}
                    >
                      Inscription
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
