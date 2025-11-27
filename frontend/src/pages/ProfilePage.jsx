import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';

const ProfilePage = () => {
  const { user, updateProfile, updatePreferences, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [profileData, setProfileData] = useState({
    phone: '',
    department: 'General',
    bio: '',
    avatar_url: '',
    preferences: {
      notifications: {
        email: true,
        browser: true,
        reservation_reminders: true,
        equipment_available: true,
        system_updates: false
      },
      language: 'en',
      theme: 'auto'
    }
  });

  // Load profile data on component mount
  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await profileAPI.getProfile();
      if (response.success) {
        setProfileData(response.data);
      } else {
        setError(response.error);
      }
    } catch (error) {
      setError('Failed to fetch profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const data = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        department: formData.get('department'),
        bio: formData.get('bio'),
        avatar_url: formData.get('avatar_url')
      };

      // Only update provided fields
      const updateData = {};
      if (data.name && data.name !== user?.name) updateData.name = data.name;
      if (data.phone && data.phone !== profileData.phone) updateData.phone = data.phone;
      if (data.department && data.department !== profileData.department) updateData.department = data.department;
      if (data.bio && data.bio !== profileData.bio) updateData.bio = data.bio;
      if (data.avatar_url && data.avatar_url !== profileData.avatar_url) updateData.avatar_url = data.avatar_url;

      const response = await updateProfile(updateData);
      if (response.success) {
        setSuccess('Profile updated successfully!');
        setProfileData(prev => ({ ...prev, ...response.data }));
        setError(null);
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      setLoading(true);
      setError(null);

      const data = {
        notifications: {
          email: formData.get('email_notifications') === 'true',
          browser: formData.get('browser_notifications') === 'true',
          reservation_reminders: formData.get('reservation_reminders') === 'true',
          equipment_available: formData.get('equipment_available') === 'true',
          system_updates: formData.get('system_updates') === 'true'
        },
        language: formData.get('language'),
        theme: formData.get('theme')
      };

      const response = await updatePreferences(data);
      if (response.success) {
        setSuccess('Preferences updated successfully!');
        setProfileData(prev => ({ ...prev, preferences: { ...prev.preferences, ...response.data } }));
        setError(null);
      } else {
        setError(response.error || 'Failed to update preferences');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      setLoading(true);
      setError(null);

      const data = {
        current_password: formData.get('current_password'),
        new_password: formData.get('new_password'),
        confirm_password: formData.get('confirm_password')
      };

      const response = await changePassword(data.current_password, data.new_password);
      if (response.success) {
        setSuccess('Password changed successfully!');
        setError(null);
      } else {
        setError(response.error || 'Failed to change password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      return;
    }

    try {
      const response = await profileAPI.deleteAccount('DELETE_MY_ACCOUNT');
      if (response.success) {
        setSuccess('Account deleted successfully');
        logout();
        navigate('/');
      } else {
        setError(response.error || 'Failed to delete account');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="center-page">
        <div className="glass-card">
          <h1>Authentication requise</h1>
          <p>Veuillez vous connecter pour accéder à votre profil.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Se connecter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="center-page">
      <div className="glass-card">
        <h1>Profil</h1>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        {success && (
          <div className="auth-success">{success}</div>
        )}

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button
            className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            Informations personnelles
          </button>

          {user.role === 'admin' && (
            <button
              className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              Sécurité
            </button>
          )}
        </div>

        {/* Personal Information Form */}
        {activeTab === 'personal' && (
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                name="name"
                defaultValue={profileData.name}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                defaultValue={profileData.email || ''}
                required
                disabled
              />
            </div>

            <div className="form-group">
              <label>Département</label>
              <select
                name="department"
                value={profileData.department}
                required
              >
                <option value="General">Général</option>
                <option value="IT">IT</option>
                <option value="HR">RH</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Opérations</option>
                <option value="Research">Recherche</option>
                <option value="Development">Développement</option>
                <option value="Sales">Ventes</option>
                <option value="Support">Support</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div className="form-group">
              <label>Téléphone</label>
              <input
                type="tel"
                name="phone"
                defaultValue={profileData.phone || ''}
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Biographie</label>
              <textarea
                name="bio"
                defaultValue={profileData.bio || ''}
                rows="4"
                maxLength={500}
              />
            </div>

            <div className="form-group full-width">
              <label>URL de l'avatar</label>
              <input
                type="url"
                name="avatar_url"
                defaultValue={profileData.avatar_url || ''}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sauvegarde...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && user.role === 'admin' && (
          <form className="profile-form" onSubmit={handlePreferencesSubmit}>
            <h3>Préférences de notification</h3>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="email_notifications"
                  defaultChecked={profileData.preferences.notifications.email}
                  defaultChecked disabled
                />
                Notifications par email
              </label>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="browser_notifications"
                  defaultChecked={profileData.preferences.notifications.browser}
                  defaultChecked disabled
                />
                Notifications navigateur
              </label>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="reservation_reminders"
                  defaultChecked={profileData.preferences.notifications.reservation_reminders}
                  defaultChecked disabled
                />
                Rappels de réservation
              </label>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="equipment_available"
                  defaultChecked={profileData.preferences.notifications.equipment_available}
                  defaultChecked disabled
                />
                Disponibilité des équipements
              </label>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="system_updates"
                  defaultChecked={profileData.preferences.notifications.system_updates}
                  defaultChecked disabled
                />
                Mises à jour système
              </label>
            </div>

            <div className="form-group">
              <label>Langue</label>
              <select
                name="language"
                value={profileData.preferences.language}
                disabled
                >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <div className="form-group">
              <label>Thème</label>
              <select
                name="theme"
                value={profileData.preferences.theme}
                disabled
                >
                <option value="light">Clair</option>
                <option value="dark">Sombre</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sauvegarde...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}

        {/* Password Change */}
        {activeTab === 'security' && (
          <form className="profile-form" onSubmit={handlePasswordChange}>
            <h3>Changer le mot de passe</h3>

            <div className="form-group">
              <label>Mot de passe actuel</label>
              <input
                type="password"
                name="current_password"
                required
                />
            </div>

            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                name="new_password"
                required
                minLength={6}
                />
            </div>

            <div className="form-group">
              <label>Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                name="confirm_password"
                required
                minLength={6}
                />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Changement...' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        )}

        {/* Delete Account */}
        {activeTab === 'security' && user.role !== 'admin' && (
          <div className="danger-section">
            <h3>Supprimer le compte</h3>
            <p className="warning">
              <strong>Attention:</strong> La suppression de votre compte est irréversible. Toutes vos réservations et données personnelles seront définitivement supprimées.
            </p>

            <button
              className="btn-danger"
              onClick={handleDeleteAccount}
              disabled={loading}
            >
              {loading ? 'Suppression...' : 'Supprimer mon compte'}
            </button>
          </div>
        )}
      </div>
    );
};

export default ProfilePage;