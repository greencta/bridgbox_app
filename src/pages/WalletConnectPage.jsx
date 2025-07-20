import React from 'react';

export default function WalletConnectPage({ connectWallet, isLoading, userEmail }) {
  return (
    <div className="app-container">
      <p className="logo-text">IRYSMAIL</p>
      <h1 className="main-heading">One Last Step</h1>
      <p className="text-gray-600 mb-2">Welcome, <span className="font-semibold">{userEmail}</span>!</p>
      <p className="text-gray-600 mb-8">Please connect your wallet to complete sign-in.</p>
      <button
        onClick={connectWallet}
        disabled={isLoading}
        className="action-button"
      >
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}