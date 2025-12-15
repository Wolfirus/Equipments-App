import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";
import CenterAlert from "../components/CenterAlert";

const ProfilePage = () => {
  const { user, updateProfile, updatePreferences, changePassword, logout } =
    useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "General",
    bio: "",
    avatar_url: "",
    preferences: {
      notifications: {
        email: true,
        browser: true,
        reservation_reminders: true,
        equipment_available: true,
        system_updates: false,
      },
      language: "en",
      theme: "auto",
    },
  });

  const [alert, setAlert] = useState(null);

  /** LOAD PROFILE */
  useEffect(() => {
    if (user) fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const res = await profileAPI.getProfile();

      if (res.success) {
        const data = res.data;
        setProfileData({
          name: data.name || user.name,
          email: data.email || user.email,
          phone: data.phone || "",
          department: data.department || "General",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          preferences: data.preferences || profileData.preferences,
        });
      } else {
        setAlert({
          message: "Impossible de charger vos informations",
          type: "error",
        });
      }
    } catch {
      setAlert({ message: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /** UPDATE PROFILE */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await updateProfile(profileData);

      if (res.success) {
        setAlert({
          message: "Profil mis à jour avec succès ✅",
          type: "success",
        });
      } else {
        setAlert({
          message: res.error || "Erreur lors de la mise à jour",
          type: "error",
        });
      }
    } catch {
      setAlert({ message: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /** UPDATE PREFERENCES */
  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await updatePreferences(profileData.preferences);

      if (res.success) {
        setAlert({
          message: "Préférences mises à jour ✅",
          type: "success",
        });
      } else {
        setAlert({
          message: res.error || "Erreur lors de la mise à jour",
          type: "error",
        });
      }
    } catch {
      setAlert({ message: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /** CHANGE PASSWORD */
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    try {
      setLoading(true);
      const res = await changePassword(
        form.get("current_password"),
        form.get("new_password")
      );

      if (res.success) {
        setAlert({
          message: "Mot de passe modifié avec succès 🔐",
          type: "success",
        });
        e.target.reset();
      } else {
        setAlert({
          message: res.error || "Échec du changement",
          type: "error",
        });
      }
    } catch {
      setAlert({ message: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /** DELETE ACCOUNT */
  const handleDeleteAccount = async () => {
    setAlert({
      message:
        "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.",
      type: "error",
    });

    // confirmation simple après affichage
    setTimeout(async () => {
      try {
        const res = await profileAPI.deleteAccount();
        if (res.success) {
          logout();
          navigate("/");
        } else {
          setAlert({
            message: "Impossible de supprimer le compte",
            type: "error",
          });
        }
      } catch {
        setAlert({ message: "Erreur réseau", type: "error" });
      }
    }, 1500);
  };

  /** NOT LOGGED */
  if (!user) {
    return (
      <div className="center-page">
        <div className="glass-card">
          <h1>Connexion requise</h1>
          <button className="btn-primary" onClick={() => navigate("/login")}>
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="center-page">
      <div className="glass-card">
        <h1>Profil utilisateur</h1>

        <div className="profile-tabs">
          <button
            className={`tab-button ${
              activeTab === "personal" ? "active" : ""
            }`}
            onClick={() => setActiveTab("personal")}
          >
            Informations personnelles
          </button>

          <button
            className={`tab-button ${
              activeTab === "security" ? "active" : ""
            }`}
            onClick={() => setActiveTab("security")}
          >
            Sécurité
          </button>
        </div>

        {activeTab === "personal" && (
          <form className="profile-form" onSubmit={handleSubmit}>
            <label>Nom</label>
            <input
              value={profileData.name}
              onChange={(e) =>
                setProfileData({ ...profileData, name: e.target.value })
              }
              required
            />

            <label>Email</label>
            <input value={profileData.email} disabled />

            <label>Téléphone</label>
            <input
              value={profileData.phone}
              onChange={(e) =>
                setProfileData({ ...profileData, phone: e.target.value })
              }
            />

            <label>Département</label>
            <select
              value={profileData.department}
              onChange={(e) =>
                setProfileData({
                  ...profileData,
                  department: e.target.value,
                })
              }
            >
              <option value="General">Général</option>
              <option value="IT">IT</option>
              <option value="HR">RH</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
            </select>

            <label>Biographie</label>
            <textarea
              rows="3"
              value={profileData.bio}
              onChange={(e) =>
                setProfileData({ ...profileData, bio: e.target.value })
              }
            />

            <label>Avatar (URL)</label>
            <input
              value={profileData.avatar_url}
              onChange={(e) =>
                setProfileData({
                  ...profileData,
                  avatar_url: e.target.value,
                })
              }
            />

            <button className="btn-primary" disabled={loading}>
              {loading ? "Sauvegarde…" : "Mettre à jour"}
            </button>
          </form>
        )}

        {activeTab === "security" && (
          <>
            <form className="profile-form" onSubmit={handlePasswordChange}>
              <h3>Changer le mot de passe</h3>

              <input
                type="password"
                name="current_password"
                placeholder="Mot de passe actuel"
                required
              />
              <input
                type="password"
                name="new_password"
                placeholder="Nouveau mot de passe"
                required
              />

              <button className="btn-primary" disabled={loading}>
                Modifier
              </button>
            </form>

            {user.role !== "admin" && (
              <div className="danger-section">
                <h3>Supprimer le compte</h3>
                <button className="btn-danger" onClick={handleDeleteAccount}>
                  Supprimer mon compte
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {alert && (
        <CenterAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
};

export default ProfilePage;
