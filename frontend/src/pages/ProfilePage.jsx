import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";

const ProfilePage = () => {
  const { user, updateProfile, updatePreferences, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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

  /** LOAD PROFILE FROM API */
  useEffect(() => {
    if (user) fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await profileAPI.getProfile();

      if (response.success) {
        const data = response.data;

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
        setError("Impossible de charger vos informations.");
      }
    } catch (e) {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  /** HANDLE PERSONAL INFO UPDATE */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await updateProfile(profileData);

      if (response.success) {
        setSuccess("Profil mis à jour avec succès !");
        setProfileData((prev) => ({ ...prev, ...response.data }));
      } else {
        setError(response.error || "Erreur lors de la mise à jour.");
      }
    } catch (e) {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  /** HANDLE PREFERENCES UPDATE */
  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const response = await updatePreferences(profileData.preferences);

      if (response.success) {
        setSuccess("Préférences mises à jour !");
      } else {
        setError(response.error || "Erreur lors de la mise à jour.");
      }
    } catch (e) {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  /** HANDLE PASSWORD CHANGE */
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const current_password = formData.get("current_password");
    const new_password = formData.get("new_password");

    try {
      setLoading(true);
      setError(null);

      const response = await changePassword(current_password, new_password);

      if (response.success) {
        setSuccess("Mot de passe modifié !");
      } else {
        setError(response.error || "Échec du changement.");
      }
    } catch (e) {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  /** HANDLE ACCOUNT DELETE */
  const handleDeleteAccount = async () => {
    if (!window.confirm("Supprimer votre compte ? Action irréversible.")) return;

    try {
      const response = await profileAPI.deleteAccount();

      if (response.success) {
        logout();
        navigate("/");
      } else {
        setError("Impossible de supprimer le compte.");
      }
    } catch {
      setError("Erreur réseau.");
    }
  };

  /** BLOCK USER NOT LOGGED IN */
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

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {/* TABS */}
        <div className="profile-tabs">
          <button
            className={`tab-button ${activeTab === "personal" ? "active" : ""}`}
            onClick={() => setActiveTab("personal")}
          >
            Informations personnelles
          </button>

          <button
            className={`tab-button ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            Sécurité
          </button>
        </div>

        {/* PERSONAL INFO */}
        {activeTab === "personal" && (
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) =>
                  setProfileData({ ...profileData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Email (non modifiable)</label>
              <input type="email" value={profileData.email} disabled />
            </div>

            <div className="form-group">
              <label>Téléphone</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) =>
                  setProfileData({ ...profileData, phone: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Département</label>
              <select
                value={profileData.department}
                onChange={(e) =>
                  setProfileData({ ...profileData, department: e.target.value })
                }
              >
                <option value="General">Général</option>
                <option value="IT">IT</option>
                <option value="HR">RH</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Biographie</label>
              <textarea
                rows="4"
                value={profileData.bio}
                onChange={(e) =>
                  setProfileData({ ...profileData, bio: e.target.value })
                }
              />
            </div>

            <div className="form-group full-width">
              <label>URL Avatar</label>
              <input
                type="url"
                value={profileData.avatar_url}
                onChange={(e) =>
                  setProfileData({ ...profileData, avatar_url: e.target.value })
                }
              />
            </div>

            <button className="btn-primary" disabled={loading}>
              {loading ? "Sauvegarde…" : "Mettre à jour"}
            </button>
          </form>
        )}

        {/* SECURITY */}
        {activeTab === "security" && (
          <>
            {/* Password Change */}
            <form className="profile-form" onSubmit={handlePasswordChange}>
              <h3>Changer le mot de passe</h3>

              <div className="form-group">
                <label>Mot de passe actuel</label>
                <input type="password" name="current_password" required />
              </div>

              <div className="form-group">
                <label>Nouveau mot de passe</label>
                <input type="password" name="new_password" required />
              </div>

              <div className="form-group">
                <label>Confirmer</label>
                <input type="password" name="confirm_password" required />
              </div>

              <button className="btn-primary" disabled={loading}>
                {loading ? "Modification…" : "Modifier"}
              </button>
            </form>

            {/* Delete Account (non-admin) */}
            {user.role !== "admin" && (
              <div className="danger-section">
                <h3>Supprimer le compte</h3>
                <p className="warning">
                  Cette action est <strong>irréversible</strong>.
                </p>

                <button className="btn-danger" onClick={handleDeleteAccount}>
                  Supprimer mon compte
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
