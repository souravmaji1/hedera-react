// src/App.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import HolderTable from "./components/HolderTable";
import HolderChart from "./components/HolderChart";
import NavigationBar from "./components/NavigationBar"; // Importar NavigationBar
import SearchLogs from "./components/SearchLogs"; // Importar SearchLogs
import NFTFriends from "./components/NFTFriends"; // Importar NFTFriends
import Modal from "./components/Modal"; // Importar Modal
import PropsForm from "./components/PropsForm"; // Importar PropsForm
import AdminProps from "./components/AdminProps"; // Importar AdminProps
import MyAccount from "./components/MyAccount"; // Importar MyAccount
import Footer from "./components/Footer"; // Importar Footer
import WalletTracker from "./components/WalletTracker"; // Importar WalletTracker
import AirTool from "./components/AirTool"; // Importar AirTool desde components
import AirManager from "./components/AirManager"; // Importar AirManager desde components (eliminar punto)
import Claim from "./components/Claim"; // Importar Claim desde components

import "./styles.css"; // Asegúrate de que este archivo exista y contenga estilos globales
import "./App.css"; // Importar App.css

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@radix-ui/react-dialog";

// Importaciones para la wallet
import { useWallet, useAccountId } from "@buidlerlabs/hashgraph-react-wallets";
import { HWCConnector } from "@buidlerlabs/hashgraph-react-wallets/connectors";

// Importamos Balance refactorizado (muestra el saldo del token introducido)
import Balance from "./Balance";

// Icono "info"
import infoIcon from "./assets/info-icon.png";

// Importamos la lista de tokens
import tokens from "./components/tokens";

// Importamos react-select
import Select from "react-select";

// Importamos la función de registro
import { logSearch } from "./utils/logger";

// Ruta del logo
import logo from "./assets/logo.png"; // Asegúrate de tener esta imagen

// Importar el cliente de Supabase
import { supabase } from "./config/supabaseClient";

// Importar wallets
import wallets from "./components/wallets";

// Importa el ABI aquí
import CONTRACT_ABI from "./abis/abi.json"; // Asegúrate de que la ruta es correcta
import { HashpackConnector } from '@buidlerlabs/hashgraph-react-wallets/connectors'
import { ContractId, AccountId } from "@hashgraph/sdk";

const CONTRACT_ID = ContractId.fromString("0.0.5408321"); 
const CONTRACT_EVM_ADDRESS = "0xd243f7c9bf9fed35c4c3eb513fa1ae20c1290c86"; // Dirección EVM del contrato



function App() {
  // Estados principales
  const [tokenId, setTokenId] = useState("");
  const [manualTokenId, setManualTokenId] = useState("");
  const [filterText, setFilterText] = useState(""); // Estado para la búsqueda
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decimals, setDecimals] = useState(0); // Decimales reales del token
  const [nftFriends, setNftFriends] = useState(0); // NFTs amigos (conteo total)

  // Estado para la barra de navegación
  const [activeTab, setActiveTab] = useState(null); // Inicializar como null

  // Estados para modales
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [showNftInfoPopup, setShowNftInfoPopup] = useState(false);

  // Estado para almacenar la lista de nft_friends desde Supabase
  const [nftTokens, setNftTokens] = useState([]);

  // Hooks de la wallet
  const { isConnected } = useWallet(HashpackConnector);
  const { data: accountId } = useAccountId();

  // Definir isAdminTab para evitar errores con activeTab null
  const isAdminTab = activeTab && activeTab.startsWith("ADMIN");

  // Función para eliminar el prefijo "0.0"
  const removePrefix = (id) => {
    return id.startsWith("0.0.") ? id.slice(4) : id;
  };

  // Función para resetear los estados relacionados con el token
  const resetAppState = () => {
    setBalances([]);
    setDecimals(0);
    setFilterText("");
    setNftFriends(0);
    setTokenId("");
    setManualTokenId("");
  };

  // Efecto para actualizar activeTab basado en la conexión de la wallet
  useEffect(() => {
    if (isConnected && !activeTab) {
      setActiveTab("MY_ACCOUNT"); // Establecer 'MY_ACCOUNT' como tab activo por defecto al conectar
    } else if (!isConnected) {
      setActiveTab(null); // Resetear activeTab al desconectar
      resetAppState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Función para obtener la lista de nft_friends desde Supabase
  const fetchNftTokens = async () => {
    try {
      const { data, error } = await supabase
        .from("nft_friends")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      setNftTokens(data);
    } catch (error) {
      console.error("Error al obtener NFTs amigos:", error.message);
    }
  };

  // Obtener decimales del token
  const fetchTokenDecimals = async (tid) => {
    try {
      const url = `https://testnet.mirrornode.hedera.com/api/v1/tokens/${tid}`;
      const response = await axios.get(url);
      if (response.data && response.data.decimals !== undefined) {
        setDecimals(response.data.decimals);
      } else {
        setDecimals(0);
      }
    } catch (err) {
      console.error("No se pudo obtener 'decimals':", err);
      setDecimals(0);
    }
  };

  // Obtener NFTs amigos (conteo total)
  const fetchNftFriends = async () => {
    if (!isConnected || !accountId) {
      setNftFriends(0);
      return;
    }

    if (nftTokens.length === 0) {
      setNftFriends(0);
      return;
    }

    try {
      // Paso 1: Obtener todos los tokens asociados a la cuenta conectada
      const response = await axios.get(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/nfts`
      );

      const userNfts = response.data.nfts || [];
      //console.log("NFTs asociados a la cuenta:", userNfts);

      // Paso 2: Filtrar NFTs que coincidan con los registrados como "amigos"
      const nftFriendCount = userNfts.reduce((count, nft) => {
        const isFriend = nftTokens.some((token) => token.id === nft.token_id);
        return isFriend ? count + 1 : count;
      }, 0);

      // Paso 3: Actualizar el estado con el total de NFTs amigos
      setNftFriends(nftFriendCount);
    } catch (err) {
      console.error("Error al obtener NFTs amigos:", err);
      setNftFriends(0);
    }
  };

  // Filtrar tokens según tipo (FT o NFT)
  const filterTokensByType = (type) => {
    if (type === "FT") {
      return tokens.filter((token) => token.type === "FT");
    } else if (type === "NFT") {
      return tokens.filter((token) => token.type === "NFT");
    }
    return tokens;
  };

  // Crear las "options" para react-select basadas en el tipo activo
  const tokenOptions = activeTab
    ? filterTokensByType(activeTab).map((token) => ({
        value: token.id,
        label: (
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* Imagen del token */}
            <img
              src={token.image}
              alt={token.symbol}
              style={{ width: "20px", height: "20px", marginRight: "8px" }}
            />
            {/* Nombre + symbol */}
            <span>
              {token.name} ({token.symbol})
            </span>
          </div>
        ),
      }))
    : []; // Si no hay activeTab, no mostrar opciones

  // Para que react-select muestre la opción actual
  // buscamos en 'tokenOptions' la que tenga .value === tokenId
  const selectedOption =
    tokenOptions.find((opt) => opt.value === tokenId) || null;

  // Obtener el símbolo del token seleccionado
  const selectedToken = tokens.find((token) => token.id === tokenId);
  const tokenSymbol = selectedToken ? selectedToken.symbol : "";

  // Determinar el símbolo a mostrar en el saldo
  const displaySymbol = tokenSymbol ? `$${tokenSymbol}` : "$";

  // Al cambiar el token en react-select
  const handleSelectChange = async (selectedOption) => {
    if (!selectedOption) {
      // Si se limpia la selección (isClearable=true), reseteamos
      setTokenId("");
      setBalances([]);
      setDecimals(0);
      setFilterText("");
      setNftFriends(0);
      setManualTokenId("");
      return;
    }
    const newTokenId = selectedOption.value;
    setTokenId(newTokenId);
    setManualTokenId(""); // Limpiar el campo manual al seleccionar desde dropdown
    await handleFetchBalances(newTokenId);
  };

  // Al cambiar el Token ID manualmente
  const handleManualTokenIdChange = (e) => {
    setManualTokenId(e.target.value);
  };

  const handleManualFetchBalances = async () => {
    if (!manualTokenId) {
      alert(
        "Por favor, introduce el Token ID manualmente o selecciona un token de la lista."
      );
      return;
    }
    setTokenId(manualTokenId);
    await handleFetchBalances(manualTokenId);
  };

  const [showNoBalanceModal, setShowNoBalanceModal] = useState(false);
  const [hasBalance, setHasBalance] = useState(true); // Nuevo estado para controlar la visibilidad

  const resetContent = () => {
    setBalances([]);
    setDecimals(0);
    setFilterText("");
    setNftFriends(0);
    setTokenId("");
    setManualTokenId("");
  };

  const handleFetchBalances = async (tokenIdParam) => {
    if (!tokenIdParam) {
      alert(
        "Por favor, selecciona un token o introduce el Token ID manualmente."
      );
      return;
    }
    setLoading(true);
    try {
      // Verificar saldo primero
      const { data, error } = await supabase
        .from("wallets")
        .select("saldo")
        .eq("wallet_id", accountId)
        .single();

      if (error) throw error;

      // Si el saldo es 0, mostrar modal, resetear contenido y detener la ejecución
      if (data.saldo === 0) {
        setShowNoBalanceModal(true);
        setHasBalance(false);
        resetContent();
        setLoading(false);
        return;
      }

      // Si llegamos aquí, asegurarnos que hasBalance es true
      setHasBalance(true);

      // Si hay saldo, reducirlo y continuar
      await supabase
        .from("wallets")
        .update({ saldo: data.saldo - 1 })
        .eq("wallet_id", accountId);

      await fetchTokenDecimals(tokenIdParam);
      let allBalances = [];
      let nextUrl = `https://testnet.mirrornode.hedera.com/api/v1/tokens/${tokenIdParam}/balances?limit=100`;
      while (nextUrl) {
        const res = await axios.get(nextUrl);
        allBalances = allBalances.concat(res.data.balances);
        nextUrl = res.data.links?.next
          ? `https://testnet.mirrornode.hedera.com${res.data.links.next}`
          : null;
      }
      setBalances(
        allBalances.map((balance) => ({
          ...balance,
          ...wallets.find((w) => w.account === balance.account),
        }))
      );
      await fetchNftFriends();
      if (isConnected) logSearch(accountId, tokenIdParam);
    } catch (error) {
      console.error("Error al obtener balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowNoBalanceModal(false);
  };

  const handleRechargeClick = () => {
    setShowNoBalanceModal(false);
    setActiveTab("MY_ACCOUNT");
  };

  // Filtramos balances en base a "filterText" considerando 'account' y 'name' (doxed)
  const filteredBalances = balances.filter(
    (b) =>
      b.account.toLowerCase().includes(filterText.toLowerCase()) ||
      (b.doxed && b.name.toLowerCase().includes(filterText.toLowerCase()))
  );

  // -----------------------------------
  // Lógica para Ranking / Posición del usuario
  // -----------------------------------
  // Ordenamos balances en descendente
  const sortedData = [...balances].sort((a, b) => b.balance - a.balance);
  const totalHodlers = sortedData.length;

  // Encontramos índice del usuario (si existe en la lista)
  const userIndex = sortedData.findIndex((h) => h.account === accountId);
  const userRank = userIndex >= 0 ? userIndex + 1 : null; // índice + 1 (1-based)
  let differenceToTop = 0;
  if (userIndex >= 0 && sortedData.length > 0) {
    const topBalance = sortedData[0].balance;
    const myBalance = sortedData[userIndex].balance;
    differenceToTop = topBalance - myBalance; // raw difference (no ajustada)
  }

  // Ajustamos la diferencia en base a los decimales del token
  const formattedDiff = (
    differenceToTop / Math.pow(10, decimals)
  ).toLocaleString("es-ES", {
    minimumFractionDigits: decimals > 0 ? 2 : 0,
    maximumFractionDigits: decimals > 0 ? 2 : 0,
  });

  const isTop1 = differenceToTop <= 0;

  // Función para agregar un nuevo NFT amigo
  const addNftToken = async (newToken) => {
    try {
      const { data, error } = await supabase
        .from("nft_friends")
        .insert([{ id: newToken.id, name: newToken.name }]);

      if (error) {
        throw error;
      }

      // Actualizar la lista local de nftTokens
      setNftTokens((prev) => [...prev, data[0]]);
      alert("NFT amigo agregado exitosamente.");
    } catch (error) {
      console.error("Error al agregar NFT amigo:", error.message);
      alert(`Error al agregar NFT amigo: ${error.message}`);
    }
  };

  // Función para eliminar un NFT amigo
  const deleteNftToken = async (id) => {
    try {
      const { error } = await supabase
        .from("nft_friends")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      // Actualizar la lista local de nftTokens eliminando el NFT borrado
      setNftTokens((prev) => prev.filter((token) => token.id !== id));
      alert("NFT amigo eliminado exitosamente.");
    } catch (error) {
      console.error("Error al eliminar NFT amigo:", error.message);
      alert(`Error al eliminar NFT amigo: ${error.message}`);
    }
  };

  // Manejar la selección de la pestaña ADMIN
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    window.scrollTo(0, 0); // <-- Desplazamos la ventana a la parte superior
    if (tab.startsWith("ADMIN")) {
      // Verificar si el wallet es admin
      if (accountId !== "0.0.4859816") {
        setShowAdminPopup(true);
      }
    }

    // Resetear los estados relacionados con el token al cambiar de pestaña
    if (!tab.startsWith("ADMIN")) {
      resetAppState();
    }
  };

  // Efecto para obtener la lista de nft_friends al montar la app
  useEffect(() => {
    fetchNftTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efecto para obtener el conteo total de NFTs amigos cuando la lista de nftTokens cambia
  useEffect(() => {
    fetchNftFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nftTokens, isConnected, accountId]);

  return (
    <div className="app-container">
      {/* Barra de Navegación */}
      <NavigationBar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        logo={logo}
        isConnected={isConnected} // Pasar estado de conexión
        accountId={accountId} // Aquí debe estar el valor correcto de la Wallet_ID
      />

      {/* Modal de No Saldo */}
      {showNoBalanceModal && (
        <Modal onClose={() => setShowNoBalanceModal(false)}>
          <div className="no-balance-modal">
            <h2
              style={{
                color: "#ff0000",
                borderColor: "#ff0000",
                marginBottom: "1rem",
              }}
            >
              Sin Saldo Disponible
            </h2>
            <p style={{ marginBottom: "1.5rem" }}>
              No dispones de más usos en tu cuenta. Para continuar utilizando el
              servicio, necesitas recargar tu saldo desde la sección "MI
              CUENTA".
            </p>
            <button
              onClick={() => {
                setShowNoBalanceModal(false);
                setActiveTab("MY_ACCOUNT");
              }}
              className="recharge-button"
              style={{
                backgroundColor: "#00ffc8",
                color: "#000",
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Recargar Saldo
            </button>
          </div>
        </Modal>
      )}

      {/* Pop-up de No Admin */}
      {showAdminPopup && (
        <Modal onClose={() => setShowAdminPopup(false)}>
          <p style={{ color: "#ff0000", fontWeight: "bold" }}>NO ERES ADMIN</p>
        </Modal>
      )}

      {/* Pop-up de Información de NFTs Amigos */}
      {showNftInfoPopup && (
        <Modal onClose={() => setShowNftInfoPopup(false)}>
          <h2>Información de NFTs Amigos</h2>
          <ul>
            {nftTokens.map((token) => (
              <li key={token.id} style={{ marginBottom: "0.5rem" }}>
                <a
                  href={`https://market.kabila.app/es/collections/${removePrefix(
                    token.id
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#00ffc8", textDecoration: "underline" }}
                >
                  {token.name}
                </a>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {isConnected ? (
        <>
          <h1 className="title">Hedera Token Balances</h1>

          {/* Mostrar la sección según la pestaña activa */}
          {activeTab === "FT" || activeTab === "NFT" ? (
            <div className="ft-nft-container">
              {/* Selección de Token desde Dropdown */}
              <div className="input-container">
                <label>Seleccionar Token:</label>
                <Select
                  options={tokenOptions}
                  value={selectedOption}
                  onChange={handleSelectChange}
                  // Permite limpiar la selección
                  isClearable
                  // Estilo base que quieras (o usa estilos css)
                  styles={{
                    control: (base) => ({
                      ...base,
                      backgroundColor: "#1c1f24",
                      border: "1px solid #333",
                      color: "#fff",
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: "#fff",
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: "#1c1f24",
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected
                        ? "#00ffc8"
                        : state.isFocused
                        ? "#333"
                        : "#1c1f24",
                      color: state.isSelected ? "#000" : "#fff",
                    }),
                  }}
                />
              </div>

              {/* Opción para introducir Token ID manualmente */}
              <div className="input-container manual-token">
                <label>O introduce manualmente el Token ID:</label>
                <div className="manual-input-group">
                  <input
                    type="text"
                    className="input-field"
                    value={manualTokenId}
                    onChange={handleManualTokenIdChange}
                    placeholder="Ej. 0.0.123456"
                  />
                  <button
                    className="btn-fetch"
                    onClick={handleManualFetchBalances}
                    disabled={loading}
                  >
                    {loading ? "Cargando..." : "Obtener Balances"}
                  </button>
                </div>
              </div>

              {/* Mostrar mensaje de bienvenida cuando no hay un token seleccionado */}
              {tokenId === "" && manualTokenId === "" && (
                <div className="welcome-screen">
                  <p>
                    Bienvenido a la sección de{" "}
                    {activeTab === "FT" ? "Tokens FT" : "Tokens NFT"}. Por
                    favor, selecciona un token de la lista desplegable o
                    introduce el Token ID manualmente para ver sus balances.
                  </p>
                </div>
              )}

              {/* Mostrar mensaje cuando no hay balances */}
              {balances.length === 0 && !loading && tokenId && (
                <p>
                  No posees ningún balance para este token. Aún así, se muestra
                  la lista completa de hodlers.
                </p>
              )}

              {hasBalance && balances.length > 0 && (
                <>
                  <div
                    className={`top-info-row ${
                      !userRank || differenceToTop <= 0 ? "zero-balance" : ""
                    }`}
                  >
                    <div className="wallet-label">
                      <strong>Tu Wallet ID:</strong>
                      <div className="info-content">{accountId}</div>
                    </div>
                    <div className="wallet-label">
                      <strong>Saldo:</strong>
                      <div className="info-content">
                        <Balance
                          tokenId={tokenId}
                          decimals={decimals}
                          symbol={displaySymbol}
                        />
                      </div>
                    </div>

                    {/* Si hay ranking y difference > 0, NFTs amigos va en la segunda fila */}
                    {userRank && differenceToTop > 0 ? (
                      <>
                        <div className="wallet-label">
                          <span
                            className="info-icon"
                            onClick={() => setShowNftInfoPopup(true)}
                          >
                            <img src={infoIcon} alt="info" />
                          </span>
                          <strong> NFTs amigos:</strong>
                          <div className="info-content">{nftFriends}</div>
                        </div>
                        <div className="ranking-info-container">
                          <strong>Ranking:</strong>
                          <span>
                            Posición #{userRank}, faltan {formattedDiff} tokens
                            para el TOP 1.
                          </span>
                        </div>
                      </>
                    ) : (
                      // Si no hay ranking o difference <= 0, NFTs amigos va en la misma fila
                      <div className="wallet-label">
                        <span
                          className="info-icon"
                          onClick={() => setShowNftInfoPopup(true)}
                        >
                          <img src={infoIcon} alt="info" />
                        </span>
                        <strong> NFTs amigos:</strong>
                        <div className="info-content">{nftFriends}</div>
                      </div>
                    )}
                  </div>

                  {/* Gráfica con espacio adicional */}
                  <HolderChart data={balances} decimals={decimals} />

                  {/* Mostrar el campo de búsqueda solo si hay un token seleccionado */}
                  {tokenId !== "" && (
                    <div className="input-container">
                      <label>Buscar por Wallet o Doxed:</label>
                      <input
                        type="text"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder="Buscar por Wallet (0.0.xxx) o Doxed"
                        className="input-field"
                      />
                    </div>
                  )}

                  {/* Tabla */}
                  <HolderTable data={filteredBalances} decimals={decimals} />
                </>
              )}
            </div>
          ) : activeTab === "WALLET_TRACKER" ? (
            <WalletTracker accountId={accountId} />
          ) : activeTab === "MY_ACCOUNT" ? (
            // Renderizar el componente MyAccount
            <MyAccount accountId={accountId} />
          ) : activeTab === "PROPS" ? (
            // Renderizar el formulario de Props
            <PropsForm />
          ) : activeTab === "AIR_TOOL" ? (
            // Renderizar AirTool
            <AirTool
            
          />
          ) : activeTab === "AIR_MANAGER" ? (
            // Renderizar AirManager
            <AirManager
           
            />
          ) : activeTab === "CLAIM" ? (
            // Renderizar Claim
            <Claim
           
            />
          ) : isAdminTab ? (
            // Mostrar SearchLogs o NFTFriends si es admin
            accountId === "0.0.4859816" ? (
              activeTab === "ADMIN_SEARCH_LOGS" ? (
                <SearchLogs />
              ) : activeTab === "ADMIN_NFT_AMIGOS" ? (
                <NFTFriends
                  nftTokens={nftTokens}
                  addNftToken={addNftToken}
                  deleteNftToken={deleteNftToken} // Pasar la función de eliminación
                />
              ) : activeTab === "ADMIN_PROPS" ? (
                <AdminProps />
              ) : null
            ) : null // El pop-up ya se maneja anteriormente
          ) : null}
        </>
      ) : (
        // Mostrar el texto informativo solo cuando NO hay una wallet conectada
        <div className="info-section">
          <h1>
            Descubre la Primera DApp Integral para Rastrear Tokens FT y NFT en
            Hedera
          </h1>

          <h2>¿Qué Ofrecemos?</h2>
          <p>
            <strong>Nuestra DApp</strong> es la{" "}
            <strong>primera plataforma todo-en-uno</strong> diseñada para
            rastrear y gestionar tokens fungibles (FT) y no fungibles (NFT) en
            la red de Hedera. Con herramientas avanzadas y una interfaz
            intuitiva, te permite:
          </p>

          <ul>
            <li>
              <strong>Monitorear Tokens FT y NFT:</strong> Accede a información
              detallada sobre cualquier token en Hedera, incluyendo su
              rendimiento y distribución.
            </li>
            <li>
              <strong>Visualizar Holders Doxed:</strong> Identifica a los
              holders de tus tokens con información verificada, permitiendo una
              mayor transparencia y confianza dentro de la comunidad.
            </li>
            <li>
              <strong>Analizar Datos con Gráficos Interactivos:</strong> Obtén
              insights profundos mediante gráficos dinámicos que representan la
              distribución y las tendencias de los tokens.
            </li>
            <li>
              <strong>Crear y Fortalecer la Comunidad:</strong> Participa
              activamente en la comunidad, comparte información y colabora con
              otros entusiastas de Hedera.
            </li>
            <li>
              <strong>Enviar Propuestas Remuneradas:</strong> Contribuye al
              desarrollo de la plataforma enviando propuestas que serán
              recompensadas según su impacto y relevancia.
            </li>
          </ul>

          <h2>Funcionalidades Clave</h2>

          <h3>Tablas de Holders Personalizadas</h3>
          <ul>
            <li>Visualiza y filtra los holders de cualquier token.</li>
            <li>Identifica holders doxed para mayor transparencia.</li>
          </ul>

          <h3>Gráficos de Distribución de Tokens</h3>
          <ul>
            <li>Analiza los top holders mediante gráficos interactivos.</li>
            <li>Comprende mejor la distribución y concentración de tokens.</li>
          </ul>

          <h3>Gestión de NFTs Amigos</h3>
          <ul>
            <li>
              Administra y visualiza NFTs destacados dentro de la comunidad.
            </li>
            <li>
              Enlaces directos a marketplaces para una interacción sencilla.
            </li>
          </ul>

          <h3>Destaca tu comunidad</h3>
          <ul>
            <li>
              Añade tu token a la lista de amigos para llegar a más público.
            </li>
            <li>
              Demuestra que tienes un gran alcance de público y una distribución
              sana y segura.
            </li>
          </ul>

          {/*<h3>Historial de Búsquedas en Tiempo Real</h3>
          <ul>
            <li>Accede a un registro completo de todas las búsquedas realizadas.</li>
            <li>Monitorea tendencias y comportamientos dentro de la plataforma.</li>
          </ul>*/}

          <h3>Interfaz de Usuario Intuitiva</h3>
          <ul>
            <li>Navegación sencilla entre diferentes secciones.</li>
            <li>Formularios dinámicos para enviar y gestionar propuestas.</li>
          </ul>

          <h2>Hoja de Ruta: Innovación Continua</h2>
          <p>
            Estamos comprometidos con la <strong>mejora constante</strong> y la{" "}
            <strong>expansión de nuestras funcionalidades</strong>.
            Próximamente, implementaremos:
          </p>

          <ul>
            <li>
              <strong>Integración de Wallet Tracker:</strong> Rastrea wallets,
              visualiza sus transacciones, sus tenencias tanto de FT como de
              NFTs y activa alertas para estar al corriente de los movimientos.
            </li>

            <li>
              <strong>Integración de Bot de Discord:</strong> Recibe
              notificaciones en tiempo real sobre cambios y actualizaciones
              directamente en tu servidor de Discord favorito.
            </li>

            <li>
              <strong>Mejoras Visuales y de Experiencia de Usuario:</strong>{" "}
              Rediseño completo de la interfaz para una navegación aún más
              fluida y atractiva.
            </li>
            <li>
              <strong>Colaboraciones Estratégicas:</strong> Alianzas con
              proyectos líderes en Hedera para ofrecer nuevas herramientas y
              recursos a nuestra comunidad.
            </li>
            <li>
              <strong>Funciones Avanzadas de Análisis:</strong> Implementación
              de algoritmos y sistemas de visualización intuitivos para el
              análisis de Tokens. Integración de KPIs y sistemas de análisis
              externos.
            </li>
            <li>
              <strong>Expansión de la Comunidad:</strong> Eventos exclusivos,
              webinars y talleres para fomentar el conocimiento y la
              participación activa.
            </li>
          </ul>

          <h2>Únete a la Revolución del Rastreo de Tokens en Hedera</h2>
          <p>
            <strong>Nuestra DApp</strong> no solo es una herramienta, sino el{" "}
            <strong>corazón de una comunidad en crecimiento </strong>
            que busca <strong>
              transparencia, eficiencia y colaboración
            </strong>{" "}
            en el ecosistema de Hedera. <strong>No te quedes atrás </strong>y sé
            parte de esta <strong>innovadora plataforma</strong> que está{" "}
            <strong>transformando la manera en que interactuamos </strong>
            con los tokens FT y NFT.
          </p>

          <p>
            <strong>
              ¡Aprovecha nuestras promociones exclusivas hoy mismo y potencia tu
              experiencia en Hedera!
            </strong>
          </p>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
