// src/components/WalletTracker.js

import React, { useState, useEffect } from "react";
import Select from "react-select";
import axios from "axios";
import wallets from "./wallets";
import CollapsibleSection from "./CollapsibleSection";
import { supabase } from "../config/supabaseClient";
import { logSearch } from "../utils/logger";
import "./WalletTracker.css";
import feeAccountsData from "./hederawallets.json";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

// Constantes de configuración
const MIRROR_NODE_BASE_URL = "https://testnet.mirrornode.hedera.com/api/v1";
const HASHSAN_URL_BASE = "https://hashscan.io/testnet/transaction/";
const FEE_ACCOUNTS = new Set(feeAccountsData.feeAccounts);

// Estilos personalizados para react-select
const customSelectStyles = {
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
};

function WalletTracker({ accountId }) {
  // Estados principales
  const [selectedWallet, setSelectedWallet] = useState("");
  const [manualWalletId, setManualWalletId] = useState("");
  const [loading, setLoading] = useState(false);

  // Datos de FT y NFT
  const [ftTokensData, setFtTokensData] = useState([]);
  const [nftTokensData, setNftTokensData] = useState([]);

  // Mapa de token_id a symbol para facilitar el acceso
  const [tokenSymbolMap, setTokenSymbolMap] = useState({});

  // Filtros para FT y NFT
  const [searchText, setSearchText] = useState("");
  const [hideZeroBalance, setHideZeroBalance] = useState(true);

  // Datos de Transacciones
  const [transactionsData, setTransactionsData] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [itemsPerPageTx, setItemsPerPageTx] = useState(10); // 10 por defecto
  const [nextTxUrl, setNextTxUrl] = useState(null);

  // Opciones para el dropdown de wallets
  const walletOptions = wallets.map((w) => ({
    value: w.account,
    label: `${w.name} (${w.account})`,
  }));
  const selectedOption =
    walletOptions.find((opt) => opt.value === selectedWallet) || null;

  // Handlers para selección de wallet
  const handleSelectChange = async (option) => {
    if (!option) {
      // Limpiar selección
      setSelectedWallet("");
      setManualWalletId("");
      resetAll();
      return;
    }
    setSelectedWallet(option.value);
    setManualWalletId("");
    resetAll();
    await handleUsageCheckAndFetch(option.value);
  };

  const handleManualWalletChange = (e) => {
    setManualWalletId(e.target.value);
  };

  const handleManualFetch = async () => {
    if (!manualWalletId) {
      alert("Por favor, introduce la Wallet ID manualmente.");
      return;
    }
    setSelectedWallet("");
    resetAll();
    await handleUsageCheckAndFetch(manualWalletId);
  };

  // Función para resetear estados
  const resetAll = () => {
    setFtTokensData([]);
    setNftTokensData([]);
    setTokenSymbolMap({});
    setSearchText("");
    setTransactionsData([]);
    setNextTxUrl(null);
  };

  // Verificar saldo y obtener información
  const handleUsageCheckAndFetch = async (targetWalletId) => {
    try {
      setLoading(true);

      // Consultar saldo en supabase
      const { data, error } = await supabase
        .from("wallets")
        .select("saldo")
        .eq("wallet_id", accountId)
        .single();

      if (error) {
        console.error("Error consultando saldo:", error);
        alert("Error consultando saldo. Revisa la consola.");
        return;
      }

      // Sin saldo => no fetch
      if (data.saldo === 0) {
        alert("Sin saldo disponible. Por favor, recarga tu saldo.");
        return;
      }

      // Descuenta 1 uso
      await supabase
        .from("wallets")
        .update({ saldo: data.saldo - 1 })
        .eq("wallet_id", accountId);

      // Registrar búsqueda
      if (accountId) {
        await logSearch(accountId, targetWalletId);
      }

      // Fetch de FT/NFT (incluyendo WHBAR)
      await fetchFtsAndNfts(targetWalletId);

      // Fetch Transacciones (página inicial)
      setTransactionsData([]);
      setNextTxUrl(null);
      await fetchTransactions(targetWalletId, itemsPerPageTx, null);
    } catch (err) {
      console.error("Error en handleUsageCheckAndFetch:", err);
    } finally {
      setLoading(false);
    }
  };

  // Obtener FT y NFT, incluyendo WHBAR
  async function fetchFtsAndNfts(accountIdBuscado) {
    setLoading(true);
    try {
      // 1) Tokens (FUNGIBLE_COMMON, etc.)
      const accountTokens = await fetchAccountTokens(accountIdBuscado);
      // 2) NFTs
      const accountNfts = await fetchAccountNfts(accountIdBuscado);
      // 3) NFTs map
      const nftsMap = buildNftsMap(accountNfts);

      // 4) Arrays FT/NFT
      const ftArray = [];
      const nftArray = [];

      // 5) Parse tokens
      const tokenInfoPromises = accountTokens.map(async (rel) => {
        const tokenId = rel.token_id;
        const tokenInfo = await fetchTokenInfo(tokenId);

        const { type: tokenType, decimals = "0", name, symbol } = tokenInfo;
        const balance = rel.balance;

        if (tokenType === "FUNGIBLE_COMMON") {
          ftArray.push({
            token_id: tokenId,
            name: name || "-",
            symbol: symbol || "-",
            decimals: parseInt(decimals, 10),
            balance,
          });
        } else if (tokenType === "NON_FUNGIBLE_UNIQUE") {
          const allSerials = nftsMap[tokenId] || [];
          nftArray.push({
            token_id: tokenId,
            name: name || "-",
            symbol: symbol || "-",
            decimals: parseInt(decimals, 10),
            balance,
            serials: allSerials,
          });
        }
      });

      await Promise.all(tokenInfoPromises);

      // 6) Añadir WHBAR (HBAR nativo) como FT
      const hbarBalance = await fetchHbarBalance(accountIdBuscado);
      ftArray.push({
        token_id: "WHBAR",
        name: "Wrapped HBAR",
        symbol: "ℏ",
        decimals: 8, // HBAR usa 8 decimales
        balance: hbarBalance, // tinybars
      });

      setFtTokensData(ftArray);
      setNftTokensData(nftArray);

      // Construir el mapa de token_id a symbol
      const symbolMap = ftArray.reduce((map, token) => {
        map[token.token_id] = token.symbol;
        return map;
      }, {});
      setTokenSymbolMap(symbolMap);
    } catch (err) {
      console.error("Error al obtener tokens/nfts/WHBAR:", err);
      alert("Error consultando Mirror Node (FT/NFT). Revisa consola.");
    } finally {
      setLoading(false);
    }
  }

  // Helper para HBAR nativo
  async function fetchHbarBalance(accountId) {
    const url = `${MIRROR_NODE_BASE_URL}/accounts/${accountId}`;
    try {
      const res = await axios.get(url);
      const acc = res.data.accounts && res.data.accounts[0];
      if (!acc || !acc.balance) {
        return 0;
      }
      return acc.balance.balance; // en tinybars
    } catch (err) {
      console.error("Error fetching HBAR balance:", err);
      return 0;
    }
  }

  // Auxiliares FT/NFT
  async function fetchAccountTokens(accountId) {
    let tokens = [];
    let nextUrl = `${MIRROR_NODE_BASE_URL}/accounts/${accountId}/tokens?limit=100`;
    while (nextUrl) {
      try {
        const { data } = await axios.get(nextUrl);
        const dataArr = data.tokens || [];
        tokens = tokens.concat(dataArr);
        if (data.links?.next) {
          nextUrl = `https://testnet.mirrornode.hedera.com${data.links.next}`;
        } else {
          nextUrl = null;
        }
      } catch (err) {
        console.error("Error fetching account tokens:", err);
        break;
      }
    }
    return tokens;
  }

  async function fetchAccountNfts(accountId) {
    let nfts = [];
    let nextUrl = `${MIRROR_NODE_BASE_URL}/accounts/${accountId}/nfts?limit=100`;
    while (nextUrl) {
      try {
        const { data } = await axios.get(nextUrl);
        const arr = data.nfts || [];
        nfts = nfts.concat(arr);
        if (data.links?.next) {
          nextUrl = `https://testnet.mirrornode.hedera.com${data.links.next}`;
        } else {
          nextUrl = null;
        }
      } catch (err) {
        console.error("Error fetching account NFTs:", err);
        break;
      }
    }
    return nfts;
  }

  function buildNftsMap(accountNfts) {
    const map = {};
    for (const n of accountNfts) {
      const { token_id: tid, serial_number: ser } = n;
      if (!map[tid]) {
        map[tid] = [];
      }
      map[tid].push(ser);
    }
    return map;
  }

  async function fetchTokenInfo(tokenId) {
    const url = `${MIRROR_NODE_BASE_URL}/tokens/${tokenId}`;
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      console.error("Error fetching token info:", err);
      return {};
    }
  }

  // Formateo de balance
  function formatBalance(rawBalance, decimals, symbol) {
    const real = rawBalance / Math.pow(10, decimals);
    return `${new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(real)} ${symbol}`;
  }

  // Filtros FT/NFT
  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };
  const handleHideZeroChange = () => {
    setHideZeroBalance((prev) => !prev);
  };

  const filteredFt = ftTokensData.filter((t) => {
    const s = searchText.toLowerCase();
    const matchesSearch =
      t.name?.toLowerCase().includes(s) ||
      t.symbol?.toLowerCase().includes(s) ||
      t.token_id?.toLowerCase().includes(s);
    const nonZero = hideZeroBalance ? t.balance !== 0 : true;
    return matchesSearch && nonZero;
  });

  const filteredNft = nftTokensData.filter((t) => {
    const s = searchText.toLowerCase();
    const matchesSearch =
      t.name?.toLowerCase().includes(s) ||
      t.symbol?.toLowerCase().includes(s) ||
      t.token_id?.toLowerCase().includes(s);
    const nonZero = hideZeroBalance ? t.balance !== 0 : true;
    return matchesSearch && nonZero;
  });

  // Lógica de Transacciones

  // Formato de fecha para mostrar
  function formatTimestamp(tsString) {
    const seconds = parseFloat(tsString);
    const d = new Date(seconds * 1000);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  // Obtener detalle de la transacción
  async function fetchTransactionDetail(transactionId) {
    try {
      const detailUrl = `${MIRROR_NODE_BASE_URL}/transactions/${transactionId}`;
      const { data } = await axios.get(detailUrl);
      return data; // { transactions: [ ... ] }
    } catch (err) {
      console.error("Error fetchTransactionDetail:", err);
      return null;
    }
  }

  // Parsear una transacción CRYPTOTRANSFER detallada
  function parseDetailedTx(tx, targetWalletId) {
    const { consensus_timestamp, transfers, token_transfers, transaction_id } = tx;
    const timestampFormatted = formatTimestamp(consensus_timestamp);

    const rows = [];

    // Procesar transferencias de HBAR
    const hbarTransfers = transfers.filter((t) => !t.token_id); // HBAR no tiene token_id

    if (hbarTransfers.length > 0) {
      const origins = hbarTransfers.filter((t) => t.amount < 0);
      const destinations = hbarTransfers.filter((t) => t.amount > 0);

      // Determinar si es una transacción saliente o entrante
      const isOutgoing = origins.some((t) => t.account === targetWalletId);

      if (isOutgoing) {
        // Transacción saliente: la wallet es el origen
        destinations.forEach((dest) => {
          // Exclusión de FEE_ACCOUNTS
          if (FEE_ACCOUNTS.has(dest.account)) return;

          rows.push({
            direction: "out",
            origin: targetWalletId,
            amount: dest.amount, // Guardar como número
            destination: dest.account,
            timestamp: timestampFormatted,
            consensus_timestamp, // Nuevo campo
            transaction_id,
            symbol: "ℏ",
            decimals: 8,
          });
        });
      } else {
        // Transacción entrante: la wallet es uno de los destinos
        const incomingDestinations = destinations.filter(
          (dest) => dest.account === targetWalletId
        );
        if (incomingDestinations.length > 0) {
          incomingDestinations.forEach((dest) => {
            origins.forEach((orig) => {
              // Exclusión de FEE_ACCOUNTS
              if (FEE_ACCOUNTS.has(orig.account)) return;

              rows.push({
                direction: "in",
                origin: orig.account,
                amount: dest.amount, // Guardar como número
                destination: targetWalletId,
                timestamp: timestampFormatted,
                consensus_timestamp, // Nuevo campo
                transaction_id,
                symbol: "ℏ",
                decimals: 8,
              });
            });
          });
        }
      }
    }

    // Procesar transferencias de Tokens
    if (token_transfers && token_transfers.length > 0) {
      token_transfers.forEach((tt) => {
        const symbol = tokenSymbolMap[tt.token_id] || "TOKEN";
        if (tt.amount > 0 && tt.account === targetWalletId) {
          // Transacción entrante de token
          rows.push({
            direction: "in",
            origin: "Otro",
            amount: tt.amount, // Guardar como número
            destination: targetWalletId,
            timestamp: timestampFormatted,
            consensus_timestamp, // Nuevo campo
            transaction_id,
            symbol,
            decimals: 0, // Ajusta decimales si es necesario
          });
        } else if (tt.amount < 0 && tt.account === targetWalletId) {
          // Transacción saliente de token
          rows.push({
            direction: "out",
            origin: targetWalletId,
            amount: Math.abs(tt.amount), // Guardar como número
            destination: "Otro",
            timestamp: timestampFormatted,
            consensus_timestamp, // Nuevo campo
            transaction_id,
            symbol,
            decimals: 0, // Ajusta decimales si es necesario
          });
        }
      });
    }

    return rows;
  }

  // Fetch paginado para transacciones con la nueva URL
  async function fetchTransactions(accountId, limit, nextUrlArg) {
    setTransactionsLoading(true);
    try {
      // Determinar la URL a usar
      let url = nextUrlArg
        ? nextUrlArg
        : `${MIRROR_NODE_BASE_URL}/transactions?account.id=${accountId}&limit=${limit}`;

      const res = await axios.get(url);
      const data = res.data || {};

      // Filtrar solo CRYPTOTRANSFER
      const cryptoTransfers = (data.transactions || []).filter(
        (t) => t.name === "CRYPTOTRANSFER"
      );

      // Obtener detalles de cada transacción
      const detailPromises = cryptoTransfers.map((tx) =>
        fetchTransactionDetail(tx.transaction_id)
      );
      const details = await Promise.all(detailPromises);

      // Parsear transacciones
      let finalRows = [];
      details.forEach((detail) => {
        if (
          detail &&
          detail.transactions &&
          detail.transactions.length > 0
        ) {
          const mainTx = detail.transactions[0];
          if (mainTx.name === "CRYPTOTRANSFER") {
            const rows = parseDetailedTx(mainTx, accountId);
            finalRows = finalRows.concat(rows);
          }
        }
      });

      // Obtener siguiente enlace de paginación
      const nextLink = data.links?.next
        ? `https://testnet.mirrornode.hedera.com${data.links.next}`
        : null;

      // Filtrar transacciones relevantes (excluyendo las que involucran FEE_ACCOUNTS)
      const transaccionesFiltradas = finalRows.filter(
        (tx) =>
          tx.destination !== "Otro" &&
          tx.origin !== "Otro" &&
          !FEE_ACCOUNTS.has(tx.origin) &&
          !FEE_ACCOUNTS.has(tx.destination)
      );

      // Actualizar estado
      if (nextUrlArg) {
        // Añadir al estado existente
        setTransactionsData((prev) => [...prev, ...transaccionesFiltradas]);
      } else {
        // Primera página
        setTransactionsData(transaccionesFiltradas);
      }
      setNextTxUrl(nextLink);
    } catch (err) {
      console.error("Error al obtener transacciones (nueva lógica):", err);
      alert("Error al consultar transacciones (cuenta). Revisa la consola.");
    } finally {
      setTransactionsLoading(false);
    }
  }

  // Manejo “cargar más”
  const handleLoadMore = () => {
    if (!nextTxUrl) return;
    const w = selectedWallet || manualWalletId;
    if (!w) return;
    fetchTransactions(w, itemsPerPageTx, nextTxUrl);
  };

  // Manejo del combo “items per page”
  const handleItemsPerPageChange = async (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setItemsPerPageTx(newLimit);
    setTransactionsData([]);
    setNextTxUrl(null);
    const w = selectedWallet || manualWalletId;
    if (w) {
      await fetchTransactions(w, newLimit, null);
    }
  };

  // Renderizado
  const hasWallet = !!(selectedWallet || manualWalletId);

  return (
    <div className="wallet-tracker-container">
      <h1 className="wallet-tracker-title">Wallet Tracker</h1>

      {/* Dropdown */}
      <div className="input-container">
        <label>Seleccionar Wallet:</label>
        <Select
          options={walletOptions}
          value={selectedOption}
          onChange={handleSelectChange}
          isClearable
          styles={customSelectStyles}
        />
      </div>

      {/* Manual */}
      <div className="input-container manual-wallet">
        <label>O introduce manualmente la Wallet:</label>
        <div className="manual-input-group">
          <input
            type="text"
            className="input-field"
            value={manualWalletId}
            onChange={handleManualWalletChange}
            placeholder="Ej. 0.0.123456"
          />
          <button
            className="btn-fetch"
            onClick={handleManualFetch}
            disabled={loading}
          >
            {loading ? "Cargando..." : "Buscar"}
          </button>
        </div>
      </div>

      {loading && <p>Cargando información de la wallet...</p>}

      {/* Filtros si hay FT/NFT */}
      {hasWallet && !loading && (ftTokensData.length > 0 || nftTokensData.length > 0) && (
        <div className="search-and-filter">
          <label>Buscar Token:</label>
          <input
            type="text"
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Filtrar por Name, Symbol o Token ID"
            className="input-field"
          />
          <div className="checkbox-filter">
            <label>
              <input
                type="checkbox"
                checked={hideZeroBalance}
                onChange={handleHideZeroChange}
              />
              Ocultar balances "0"
            </label>
          </div>
        </div>
      )}

      {/* Mensaje si no hay tokens */}
      {hasWallet && !loading && ftTokensData.length === 0 && nftTokensData.length === 0 && (
        <p>No se encontraron tokens para esta wallet.</p>
      )}

      {/* FT: inicia contraído */}
      {hasWallet && filteredFt.length > 0 && (
        <CollapsibleSection title={`Tokens FT (${filteredFt.length})`} startOpen={false}>
          <div className="ft-tokens-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Symbol</th>
                  <th>Token ID</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredFt.map((t, idx) => (
                  <tr key={`${t.token_id}-ft-${idx}`}>
                    <td>{t.name}</td>
                    <td>{t.symbol}</td>
                    <td>{t.token_id}</td>
                    <td>{formatBalance(t.balance, t.decimals, t.symbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      )}
      {hasWallet && !loading && ftTokensData.length > 0 && filteredFt.length === 0 && (
        <p>No se encontraron tokens FT con esos filtros.</p>
      )}

      {/* NFT: inicia contraído */}
      {hasWallet && filteredNft.length > 0 && (
        <CollapsibleSection title={`Tokens NFT (${filteredNft.length})`} startOpen={false}>
          <div className="nft-tokens-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Symbol</th>
                  <th>Token ID</th>
                  <th>Serial(es)</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredNft.map((t, idx) => {
                  const serialStr = t.serials.join(", ");
                  return (
                    <tr key={`${t.token_id}-nft-${idx}`}>
                      <td>{t.name}</td>
                      <td>{t.symbol}</td>
                      <td>{t.token_id}</td>
                      <td>{serialStr || "-"}</td>
                      <td>{formatBalance(t.balance, t.decimals, t.symbol)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      )}
      {hasWallet && !loading && nftTokensData.length > 0 && filteredNft.length === 0 && (
        <p>No se encontraron tokens NFT con esos filtros.</p>
      )}

      {/* Transacciones: inicia contraído */}
      {hasWallet && (
        <CollapsibleSection title="Transactions" startOpen={false}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ marginRight: "10px" }}>Items per page:</label>
            <select
              value={itemsPerPageTx}
              onChange={handleItemsPerPageChange}
              style={{ padding: "4px 8px", fontSize: "0.9rem" }}
            >
              <option value="10">10</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          {transactionsLoading && <p>Cargando transacciones...</p>}

          {!transactionsLoading && transactionsData.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#00ffc8", color: "#000" }}>
                  <th style={{ padding: "8px", border: "1px solid #333" }}>Dirección</th>
                  <th style={{ padding: "8px", border: "1px solid #333" }}>Origen</th>
                  <th style={{ padding: "8px", border: "1px solid #333" }}>Cantidad</th>
                  <th style={{ padding: "8px", border: "1px solid #333" }}>Destino</th>
                  <th style={{ padding: "8px", border: "1px solid #333" }}>Timestamp</th>
                  <th
                    style={{
                      padding: "8px",
                      border: "1px solid #333",
                      width: "200px",
                      textAlign: "center",
                    }}
                  >
                    Hash
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactionsData.map((tx, idx) => (
                  <tr key={idx} style={{ backgroundColor: "#1c1f24", color: "#fff" }}>
                    {/* Dirección con flecha */}
                    <td style={{ textAlign: "center", border: "1px solid #333" }}>
                      {tx.direction === "in" ? (
                        <FaArrowDown color="green" />
                      ) : (
                        <FaArrowUp color="red" />
                      )}
                    </td>
                    <td style={{ textAlign: "center", border: "1px solid #333" }}>
                      {tx.origin}
                    </td>
                    <td style={{ textAlign: "center", border: "1px solid #333" }}>
                      {formatBalance(tx.amount, tx.decimals, tx.symbol)}
                    </td>
                    <td style={{ textAlign: "center", border: "1px solid #333" }}>
                      {tx.destination}
                    </td>
                    <td style={{ textAlign: "center", border: "1px solid #333" }}>
                      {tx.timestamp}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        border: "1px solid #333",
                      }}
                    >
                      <a
                        href={`${HASHSAN_URL_BASE}${tx.consensus_timestamp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#00ffc8",
                          textDecoration: "none",
                          fontWeight: "bold",
                        }}
                      >
                        {tx.consensus_timestamp}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!transactionsLoading && transactionsData.length === 0 && (
            <p>No hay transacciones para esta wallet o no se han cargado aún.</p>
          )}

          {!transactionsLoading && nextTxUrl && (
            <button
              style={{
                marginTop: "1rem",
                backgroundColor: "#00ffc8",
                color: "#000",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                cursor: "pointer",
                border: "none",
                fontWeight: "bold",
              }}
              onClick={handleLoadMore}
            >
              Cargar más
            </button>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}

export default WalletTracker;
