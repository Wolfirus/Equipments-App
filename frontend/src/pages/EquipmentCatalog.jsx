import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { equipmentAPI } from "../services/api";
import EquipmentCard from "../components/EquipmentCard";
import CenterAlert from "../components/CenterAlert";

const EquipmentCatalog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [alert, setAlert] = useState(null);

  const isSingleView = !!id;

  /** Load URL filters */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get("search") || "");
    setSelectedCategory(params.get("category") || "");
    setSelectedStatus(params.get("status") || "");
    setSelectedAvailability(params.get("available") === "true");
    setSortBy(params.get("sort") || "name");
    setSortOrder(params.get("order") || "asc");
    setCurrentPage(parseInt(params.get("page") || "1"));
  }, [location.search]);

  /** Categories */
  useEffect(() => {
    fetchCategories();
  }, []);

  /** Equipment fetch */
  useEffect(() => {
    isSingleView ? fetchSingleEquipment() : fetchEquipment();
  }, [
    searchTerm,
    selectedCategory,
    selectedStatus,
    selectedAvailability,
    sortBy,
    sortOrder,
    currentPage,
    isSingleView,
  ]);

  const fetchCategories = async () => {
    try {
      const res = await equipmentAPI.getCategories();
      if (res.success) setCategories(res.data.categories);
    } catch {
      setAlert({ message: "Impossible de charger les catégories", type: "error" });
    }
  };

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        category: selectedCategory,
        status: selectedStatus,
        available: selectedAvailability,
        sort: sortBy,
        order: sortOrder,
        page: currentPage,
        limit: 12,
      };

      const res = await equipmentAPI.getEquipment(params);
      if (res.success) {
        setEquipment(res.data.equipment);
        setTotalPages(res.data.pagination.pages);
      } else {
        setAlert({ message: "Échec du chargement des équipements", type: "error" });
      }
    } catch {
      setAlert({ message: "Erreur réseau. Réessayez.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleEquipment = async () => {
    setLoading(true);
    try {
      const res = await equipmentAPI.getEquipmentById(id);
      if (res.success) setEquipment([res.data.data]);
      else setAlert({ message: "Équipement introuvable", type: "error" });
    } catch {
      setAlert({ message: "Erreur réseau", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = (equipmentId) => {
    navigate(`/reservations?equipment=${equipmentId}`);
  };

  /** Single view */
  if (isSingleView && !loading && equipment.length === 0) {
    return (
      <div className="center-page">
        <div className="glass-card">
          <h2>Équipement non trouvé</h2>
          <button className="btn-primary" onClick={() => navigate("/equipment")}>
            Retour
          </button>
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
  }

  return (
    <div className="equipment-catalog">
      <div className="catalog-header">
        <h1>Catalogue d'équipements</h1>
        <button className="btn-filter" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
        </button>
      </div>

      {loading ? (
        <div className="catalog-loading">Chargement...</div>
      ) : (
        <div className="equipment-grid">
          {equipment.map((item) => (
            <EquipmentCard
              key={item._id}
              equipment={item}
              onReserve={handleReserve}
              compact
            />
          ))}
        </div>
      )}

      {totalPages > 1 && !loading && (
        <div className="catalog-pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← Précédent
          </button>
          <span>
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant →
          </button>
        </div>
      )}

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

export default EquipmentCatalog;
