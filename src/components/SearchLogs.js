// src/components/SearchLogs.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import './SearchLogs.css';

function SearchLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // Estado para la consulta de búsqueda

  // Función para recuperar los registros de Supabase
  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('search_logs')
        .select('*')
        .order('timestamp', { ascending: false }) // Ordenar de más reciente a más antiguo
        .limit(100); // Limitar a los últimos 100 registros

      if (error) {
        throw error;
      }

      setLogs(data);
    } catch (error) {
      console.error('Error al recuperar los logs:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Suscribirse a cambios en la tabla para actualizaciones en tiempo real usando canales
    const subscription = supabase
      .channel('realtime_search_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'search_logs' },
        (payload) => {
          setLogs((prevLogs) => [payload.new, ...prevLogs].slice(0, 100));
        }
      )
      .subscribe();

    // Limpiar la suscripción al desmontar el componente
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []); // Array de dependencias vacío para ejecutar solo una vez al montar

  // Manejar cambios en la entrada de búsqueda
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filtrar los logs basados en la consulta de búsqueda
  const filteredLogs = logs.filter((log) =>
    log.wallet.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.token_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="search-logs-container">
      <h2>Historial de Búsquedas</h2>
      
      {/* Barra de búsqueda */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar por Wallet o Token ID..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {loading ? (
        <p>Cargando registros...</p>
      ) : filteredLogs.length === 0 ? (
        <p>No hay registros de búsqueda disponibles.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Wallet</th>
              <th>Token ID</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.wallet}</td>
                <td>{log.token_id}</td>
                <td>{new Date(log.timestamp).toLocaleString('es-ES')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SearchLogs;
