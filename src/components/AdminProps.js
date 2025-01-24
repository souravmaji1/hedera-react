// src/components/AdminProps.js
import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient";
import "./AdminProps.css"; // Asegúrate de que este archivo exista y tenga los estilos adecuados

function AdminProps() {
  const [propsData, setPropsData] = useState([]);
  const [newProp, setNewProp] = useState({ name: "", value: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para obtener los props desde Supabase
  const fetchProps = async () => {
    try {
      const { data, error } = await supabase
        .from("props")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPropsData(data);
    } catch (err) {
      console.error("Error al obtener props:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para agregar un nuevo prop
  const addProp = async (e) => {
    e.preventDefault();
    if (!newProp.name || !newProp.value) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("props")
        .insert([{ name: newProp.name, value: newProp.value }]);

      if (error) throw error;

      setPropsData([data[0], ...propsData]);
      setNewProp({ name: "", value: "" });
      alert("Prop agregado exitosamente.");
    } catch (err) {
      console.error("Error al agregar prop:", err.message);
      alert(`Error al agregar prop: ${err.message}`);
    }
  };

  // Función para eliminar un prop
  const deleteProp = async (id) => {
    const confirmDelete = window.confirm(
      "¿Estás seguro de que deseas eliminar este prop?"
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from("props").delete().eq("id", id);

      if (error) throw error;

      setPropsData(propsData.filter((prop) => prop.id !== id));
      alert("Prop eliminado exitosamente.");
    } catch (err) {
      console.error("Error al eliminar prop:", err.message);
      alert(`Error al eliminar prop: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchProps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <p>Cargando props...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div className="nft-friends-container admin-props-container">
      <h2>Gestión de Props</h2>

      {/* Formulario para agregar un nuevo prop */}
      <div className="add-nft-form">
        <h3>Agregar Nuevo Prop</h3>
        <form onSubmit={addProp}>
          <div className="form-group">
            <label>Nombre:</label>
            <input
              type="text"
              value={newProp.name}
              onChange={(e) =>
                setNewProp({ ...newProp, name: e.target.value })
              }
              placeholder="Nombre del Prop"
            />
          </div>
          <div className="form-group">
            <label>Valor:</label>
            <input
              type="text"
              value={newProp.value}
              onChange={(e) =>
                setNewProp({ ...newProp, value: e.target.value })
              }
              placeholder="Valor del Prop"
            />
          </div>
          <button type="submit" className="btn-add">
            Agregar Prop
          </button>
        </form>
      </div>

      {/* Tabla de Props */}
      <div className="nft-list">
        <table className="nft-table props-table">
          <thead>
            <tr>
              {/* Ajusta los encabezados según los campos de tu tabla "props" */}
              <th>ID</th>
              <th>Nombre</th>
              <th>Valor</th>
              <th>Fecha de Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {propsData.map((prop) => (
              <tr key={prop.id}>
                <td>{prop.id}</td>
                <td>{prop.name}</td>
                <td>{prop.value}</td>
                <td>
                  {new Date(prop.created_at).toLocaleString("es-ES", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td>
                  <button
                    className="btn-delete"
                    onClick={() => deleteProp(prop.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminProps;
