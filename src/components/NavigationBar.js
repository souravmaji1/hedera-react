// src/components/NavigationBar.js
import React, { useState } from "react";
import "./NavigationBar.css";
import PropTypes from "prop-types";
import Wallet from "../Wallet";
import Modal from "./Modal";
import { FaRocket } from "react-icons/fa";

function NavigationBar({
  activeTab,
  setActiveTab,
  logo,
  isConnected,
  accountId,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dropdowns en móvil
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [isTrackerDropdownOpen, setIsTrackerDropdownOpen] = useState(false);
  const [isClaimDropsDropdownOpen, setIsClaimDropsDropdownOpen] =
    useState(false);

  // Verificamos si es tab de CLAIMDROPS (CLAIM, AIR_TOOL o AIR_MANAGER)
  const isClaimDropsTab = ["CLAIM", "AIR_TOOL", "AIR_MANAGER"].includes(
    activeTab
  );

  const [modalType, setModalType] = useState(null); // Estado para determinar el tipo de Modal

  // Función para alternar el menú móvil
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setModalType(null);
  };

  // Función para manejar el cierre del menú móvil al seleccionar una opción
  const handleMenuItemClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    setIsAdminDropdownOpen(false);
    setIsTrackerDropdownOpen(false);
    setIsClaimDropsDropdownOpen(false);
  };

  // Funciones para alternar los dropdowns en móvil
  const toggleAdminDropdown = () => {
    setIsAdminDropdownOpen(!isAdminDropdownOpen);
  };
  const toggleTrackerDropdown = () => {
    setIsTrackerDropdownOpen(!isTrackerDropdownOpen);
  };
  const toggleClaimDropsDropdown = () => {
    setIsClaimDropsDropdownOpen(!isClaimDropsDropdownOpen);
  };

  // Verificamos si es tab ADMIN
  const isAdminTab = activeTab && activeTab.startsWith("ADMIN");
  // Verificamos si es tab PROPS
  const isPropsTab = activeTab === "PROPS";
  // Verificamos si es tab de TRACKER (FT, NFT o WALLET_TRACKER)
  const isTrackerTab = ["FT", "NFT", "WALLET_TRACKER"].includes(activeTab);

  // Ejemplo: si quisieras TOKEN POLICE con modal para no-admin
  const handleTokenPoliceClick = () => {
    if (accountId === "0.0.4859811") {
      setActiveTab("TOKEN_POLICE");
    } else {
      setModalType("TOKEN_POLICE");
    }
    setIsMobileMenuOpen(false);
  };

  // Modificación: Condición para abrir WALLET_TRACKER solo si accountId es "0.0.4859816"
  const handleWalletTrackerClick = () => {
    if (accountId === "0.0.4859816") {
      setActiveTab("WALLET_TRACKER");
    } else {
      setModalType("WALLET_TRACKER");
    }
    setIsMobileMenuOpen(false);
  };

  // Funciones para manejar Claim y Air Tool y Air Manager
  const handleClaimClick = () => {
    setModalType("CLAIM");
    setIsMobileMenuOpen(false);
  };
  const handleAirToolClick = () => {
    setModalType("AIR_TOOL");
    setIsMobileMenuOpen(false);
  };
  const handleAirManagerClick = () => {
    setModalType("AIR_MANAGER");
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navigation-bar">
      {/* Botón de hamburguesa para pantallas pequeñas */}
      <div className="mobile-menu-button" onClick={toggleMobileMenu}>
        <div className={`hamburger ${isMobileMenuOpen ? "open" : ""}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      {/* Logo centrado en la barra */}
      <div className="nav-center">
        <img src={logo} alt="Logo" className="nav-logo" />
      </div>

      {/* Sección izquierda */}
      <div className="nav-left">
        {isConnected && (
          <>
            {/* Botón de MI CUENTA */}
            <button
              className={`nav-button ${
                activeTab === "MY_ACCOUNT" ? "active" : ""
              }`}
              onClick={() => handleMenuItemClick("MY_ACCOUNT")}
            >
              MI CUENTA
            </button>

            {/* Botón/Dropdown principal TRACKER */}
            <div className="tracker-dropdown">
              <button
                className={`nav-button ${isTrackerTab ? "active" : ""}`}
                onClick={() => {
                  // Si quieres que al pulsar TRACKER sin desplegar submenú
                  // vaya a FT por defecto (opcional):
                  // handleMenuItemClick("FT");
                }}
              >
                TRACKER
              </button>
              <ul className="dropdown-menu">
                <li onClick={() => handleMenuItemClick("FT")}>TOKEN FT</li>
                <li onClick={() => handleMenuItemClick("NFT")}>TOKEN NFT</li>
                {/*<li onClick={handleTokenPoliceClick}>TOKEN POLICE</li>*/}
                <li onClick={handleWalletTrackerClick}>WALLET's</li>
              </ul>
            </div>

            {/* Nuevo botón CLAIMDROPS */}
            <div className="claimdrops-dropdown">
              <button
                className={`nav-button ${isClaimDropsTab ? "active" : ""}`}
                onClick={toggleClaimDropsDropdown}
              >
                CLAIMDROPS
              </button>
              <ul className="dropdown-menu">
                <li onClick={() => handleMenuItemClick("CLAIM")}>CLAIM</li>
                <li onClick={() => handleMenuItemClick("AIR_TOOL")}>AIRTOOL</li>
                <li onClick={() => handleMenuItemClick("AIR_MANAGER")}>
                  AIR MANAGER
                </li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Sección derecha */}
      <div className="nav-right">
        {isConnected && (
          <>
            {/* Botón PROPS */}
            <button
              className={`nav-button ${isPropsTab ? "active" : ""}`}
              onClick={() => handleMenuItemClick("PROPS")}
            >
              PROPS
            </button>

            {/* Dropdown de ADMIN (si es el account 0.0.4859816) */}
            {accountId === "0.0.4859816" && (
              <div className="admin-dropdown">
                <button
                  className={`nav-button ${isAdminTab ? "active" : ""}`}
                  onClick={() => handleMenuItemClick("ADMIN_SEARCH_LOGS")}
                >
                  ADMIN
                </button>
                <ul className="dropdown-menu">
                  <li onClick={() => handleMenuItemClick("ADMIN_SEARCH_LOGS")}>
                    Search Logs
                  </li>
                  <li onClick={() => handleMenuItemClick("ADMIN_NFT_AMIGOS")}>
                    NFT Amigos
                  </li>
                  <li onClick={() => handleMenuItemClick("ADMIN_PROPS")}>
                    PROPS
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
        <Wallet />
      </div>

      {/* Menú desplegable para móviles */}
      {isMobileMenuOpen && (
        <div className="mobile-dropdown">
          {isConnected && (
            <>
              <button
                className={`nav-button ${
                  activeTab === "MY_ACCOUNT" ? "active" : ""
                }`}
                onClick={() => handleMenuItemClick("MY_ACCOUNT")}
              >
                MI CUENTA
              </button>

              <hr className="divider" />

              {/* TRACKER en móvil */}
              <div className="mobile-tracker-dropdown">
                <button className="nav-button" onClick={toggleTrackerDropdown}>
                  TRACKER
                </button>
                {isTrackerDropdownOpen && (
                  <ul className="mobile-dropdown-menu centered">
                    <li onClick={() => handleMenuItemClick("FT")}>TOKEN FT</li>
                    <li onClick={() => handleMenuItemClick("NFT")}>
                      TOKEN NFT
                    </li>
                    {/*<li onClick={handleTokenPoliceClick}>TOKEN POLICE</li>*/}
                    <li onClick={handleWalletTrackerClick}>WALLET's</li>
                  </ul>
                )}
              </div>

              <hr className="divider" />

              {/* CLAIMDROPS en móvil */}
              <div className="mobile-claimdrops-dropdown">
                <button
                  className={`nav-button ${isClaimDropsTab ? "active" : ""}`}
                  onClick={toggleClaimDropsDropdown}
                >
                  CLAIMDROPS
                </button>
                {isClaimDropsDropdownOpen && (
                  <ul className="mobile-dropdown-menu centered">
                    <li onClick={() => handleMenuItemClick("CLAIM")}>CLAIM</li>
                    <li onClick={() => handleMenuItemClick("AIR_TOOL")}>
                      AIRTOOL
                    </li>
                    <li onClick={() => handleMenuItemClick("AIR_MANAGER")}>
                      AIR MANAGER
                    </li>
                  </ul>
                )}
              </div>

              <hr className="divider" />

              {/* Botón PROPS en móvil */}
              <button
                className={`nav-button ${
                  activeTab === "PROPS" ? "active" : ""
                }`}
                onClick={() => handleMenuItemClick("PROPS")}
              >
                PROPS
              </button>

              <hr className="divider" />

              {/* ADMIN en móvil (si wallet es la admin) */}
              {accountId === "0.0.4859816" && (
                <div className="mobile-admin-dropdown">
                  <button
                    className={`nav-button ${isAdminTab ? "active" : ""}`}
                    onClick={toggleAdminDropdown}
                  >
                    ADMIN
                  </button>
                  {isAdminDropdownOpen && (
                    <ul className="mobile-dropdown-menu centered">
                      <li
                        onClick={() => handleMenuItemClick("ADMIN_SEARCH_LOGS")}
                      >
                        Search Logs
                      </li>
                      <li
                        onClick={() => handleMenuItemClick("ADMIN_NFT_AMIGOS")}
                      >
                        NFT Amigos
                      </li>
                      <li onClick={() => handleMenuItemClick("ADMIN_PROPS")}>
                        PROPS
                      </li>
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
          <Wallet />
        </div>
      )}

      {/* Modal para funcionalidades futuras (opcional) */}
      {modalType && (
        <Modal onClose={handleCloseModal}>
          <div className="modal-body">
            <h2>
              <FaRocket /> Próximamente Disponible <FaRocket />
            </h2>

            {modalType === "WALLET_TRACKER" && (
              <>
                <p>
                  ¡La funcionalidad de <strong>WALLET TRACKER</strong> está
                  disponible solo para administradores.
                </p>
              </>
            )}

            {modalType === "TOKEN_POLICE" && (
              <p>
                ¡La funcionalidad de <strong>TOKEN POLICE</strong> estará
                disponible muy pronto!
              </p>
            )}
            {modalType === "CLAIM" && (
              <p>
                ¡La funcionalidad de <strong>CLAIM</strong> estará disponible
                muy pronto!
              </p>
            )}
            {modalType === "AIR_TOOL" && (
              <p>
                ¡La funcionalidad de <strong>AIR TOOL</strong> estará disponible
                muy pronto!
              </p>
            )}
            {modalType === "AIR_MANAGER" && (
              <p>
                ¡La funcionalidad de <strong>AIR MANAGER</strong> estará
                disponible muy pronto!
              </p>
            )}
          </div>
        </Modal>
      )}
    </nav>
  );
}

NavigationBar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  logo: PropTypes.string.isRequired,
  isConnected: PropTypes.bool.isRequired,
  accountId: PropTypes.string.isRequired,
};

export default NavigationBar;
