import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Escrow from '../../src/artifacts/contracts/Escrow.sol/Escrow.json';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext.jsx';

const InfoRow = ({ label, value }) => (
    <div className="flex justify-between py-3 border-b border-gray-200">
        <span className="font-semibold text-gray-600">{label}</span>
        <span className="font-mono text-sm text-gray-800 break-all">{value}</span>
    </div>
);

export default function EscrowDetailView({ escrowItem, onBack }) {
    const { session } = useAppContext();
    const [escrowInfo, setEscrowInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const escrowContractAddress = escrowItem.contractAddress;

    const fetchEscrowInfo = async () => {
        setIsLoading(true);
        try {
            if (!window.ethereum) throw new Error("Wallet not found.");
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(escrowContractAddress, Escrow.abi, provider);

            const [client, freelancer, arbiter, amount, isLocked] = await Promise.all([
                contract.client(),
                contract.freelancer(),
                contract.arbiter(),
                contract.amount(),
                contract.isLocked()
            ]);

            setEscrowInfo({
                client,
                freelancer,
                arbiter,
                amount: ethers.formatEther(amount),
                isLocked
            });
        } catch (error) {
            console.error("Failed to fetch escrow details:", error);
            toast.error("Could not load escrow details.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (escrowContractAddress) {
            fetchEscrowInfo();
        }
    }, [escrowContractAddress]);

    const handleRelease = async () => {
        setIsActionLoading(true);
        const loadingToast = toast.loading("Waiting for wallet confirmation...");
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(escrowContractAddress, Escrow.abi, signer);

            const tx = await contract.release();
            toast.loading("Processing transaction...", { id: loadingToast });
            await tx.wait();

            toast.success("Funds have been successfully released!", { id: loadingToast });
            fetchEscrowInfo(); // Refresh the component state after action
        } catch (error) {
            console.error("Failed to release funds:", error);
            toast.error(error.reason || "Failed to release funds.", { id: loadingToast });
        } finally {
            setIsActionLoading(false);
        }
    };
    
    if (isLoading) {
        return <div className="p-8 text-center">Loading Escrow Details...</div>;
    }

    if (!escrowInfo) {
        return <div className="p-8 text-center text-red-500">Could not find escrow details.</div>;
    }
    
    const isClient = session.wallet.address.toLowerCase() === escrowInfo.client.toLowerCase();

    return (
        <div className="p-4 sm:p-6 bg-gray-50 h-full">
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="text-gray-600 font-bold px-4 py-2 rounded-lg hover:bg-gray-200 mr-4">
                    &larr; Back
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Escrow Details</h1>
            </div>

            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <div className="space-y-2">
                    <InfoRow label="Status" value={escrowInfo.isLocked ? "Active / Awaiting Approval" : "Completed / Released"} />
                    <InfoRow label="Amount" value={`${escrowInfo.amount} $IRYS`} />
                    <InfoRow label="Contract Address" value={escrowContractAddress} />
                    <InfoRow label="Client" value={escrowInfo.client} />
                    <InfoRow label="Freelancer" value={escrowInfo.freelancer} />
                    <InfoRow label="Arbiter" value={escrowInfo.arbiter} />
                </div>
                {escrowInfo.isLocked && isClient && (
                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-800">Client Actions</h3>
                        <p className="text-sm text-gray-500 mb-4">Once you are satisfied with the delivered work, you can release the funds to the freelancer.</p>
                        <button
                            onClick={handleRelease}
                            disabled={isActionLoading}
                            className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-opacity disabled:opacity-50"
                        >
                            {isActionLoading ? "Processing..." : "Approve & Release Funds"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}