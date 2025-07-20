import React, { useState } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';

export default function SendTokenModal({ recipientAddress, onClose, onSuccess }) {
    const { session } = useAppContext();
    const [amount, setAmount] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSendToken = async () => {
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return toast.error("Please enter a valid amount.");
        }
        
        setIsSending(true);
        const loadingToast = toast.loading(`Sending ${amount} MATIC...`);

        try {
            if (!window.ethereum) throw new Error("Wallet not found.");
            
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const tx = await signer.sendTransaction({
                to: recipientAddress,
                value: ethers.parseEther(amount) // Converts MATIC to WEI
            });

            toast.loading('Waiting for confirmation...', { id: loadingToast });
            await tx.wait(); // Wait for the transaction to be mined

            toast.success('Transaction successful!', { id: loadingToast });
            onSuccess(tx.hash, amount);

        } catch (error) {
            console.error("Token send failed:", error);
            toast.error(error?.reason || "Transaction failed.", { id: loadingToast });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-[#1F2129] p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Send Token</h2>
                <p className="text-sm text-gray-400 mb-1">To:</p>
                <p className="text-sm font-mono bg-gray-800 p-2 rounded-md text-gray-300 mb-4">{shortenAddress(recipientAddress)}</p>
                
                <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-1">Amount (MATIC)</label>
                <input
                    type="text"
                    name="amount"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 0.5"
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:ring-accent focus:border-accent text-gray-200"
                />

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isSending} className="text-gray-400 font-bold px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                    <button onClick={handleSendToken} disabled={isSending} className="bg-accent text-black font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                        {isSending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}