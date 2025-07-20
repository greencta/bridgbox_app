import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import Escrow from '../../src/artifacts/contracts/Escrow.sol/Escrow.json';

const FormRow = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        {children}
    </div>
);

export default function CreateEscrowView({ onSaveSuccess, onCancel }) {
    const [freelancerAddress, setFreelancerAddress] = useState('');
    const [arbiterAddress, setArbiterAddress] = useState(''); // The state for the new field
    const [amount, setAmount] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateEscrow = async () => {
        // Validation now includes the arbiter address
        if (!freelancerAddress || !arbiterAddress || !amount) {
            return toast.error("Please fill out all fields.");
        }

        setIsCreating(true);
        const loadingToast = toast.loading('Waiting for wallet confirmation...');

        try {
            if (!window.ethereum) throw new Error("Wallet not found. Please install MetaMask.");
            const provider = new ethers.BrowserProvider(window.ethereum);
            
            const network = await provider.getNetwork();
            // This check should be for the Irys Testnet Chain ID
            if (network.chainId !== 1270) { 
                 throw new Error("Please switch your wallet to the Irys Testnet network.");
            }

            const signer = await provider.getSigner();
            const factory = new ethers.ContractFactory(Escrow.abi, Escrow.bytecode, signer);

            // The arbiterAddress is now correctly passed to the deploy function
            const escrowContract = await factory.deploy(
                freelancerAddress,
                arbiterAddress,
                { value: ethers.parseEther(amount) }
            );

            toast.loading('Deploying escrow to the Irys network...', { id: loadingToast });

            await escrowContract.waitForDeployment();
            const contractAddress = await escrowContract.getAddress();

            toast.success(`Escrow created on Irys at: ${contractAddress}`, { id: loadingToast, duration: 6000 });
            
            onCancel(); 

        } catch (error) {
            console.error("Escrow deployment failed:", error);
            const errorMessage = error.reason || error.message || "An error occurred during deployment.";
            toast.error(errorMessage, { id: loadingToast });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 h-full">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                    Create New Escrow on Irys
                </h1>
                <button onClick={onCancel} disabled={isCreating} className="text-gray-600 font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                    Cancel
                </button>
            </div>

            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
                <FormRow label="Freelancer's Wallet Address">
                    <input 
                        type="text" 
                        value={freelancerAddress}
                        onChange={(e) => setFreelancerAddress(e.target.value)}
                        placeholder="e.g., 0x..." 
                        className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-[#FF3142] focus:border-[#FF3142]"
                    />
                </FormRow>
                
                {/* =================================================================== */}
                {/* ===================== THE MISSING FIELD IS HERE =================== */}
                {/* =================================================================== */}
                <FormRow label="Arbiter's Wallet Address (The trusted third party)">
                    <input 
                        type="text" 
                        value={arbiterAddress}
                        onChange={(e) => setArbiterAddress(e.target.value)}
                        placeholder="e.g., 0x..." 
                        className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-[#FF3142] focus:border-[#FF3142]"
                    />
                </FormRow>
                {/* =================================================================== */}
                {/* ======================= END OF FIX ======================== */}
                {/* =================================================================== */}

                <div className="grid grid-cols-2 gap-6">
                    <FormRow label="Amount (in $IRYS)">
                        <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g., 500" 
                            className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-[#FF3142] focus:border-[#FF3142]"
                        />
                    </FormRow>
                     <FormRow label="Currency">
                        <select 
                            value="$IRYS"
                            disabled 
                            className="w-full mt-1 p-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm focus:ring-[#FF3142] focus:border-[#FF3142]"
                        >
                            <option>$IRYS</option>
                        </select>
                    </FormRow>
                </div>
                
                <FormRow label="Description of Work / Agreement Terms">
                    <textarea 
                        rows="4" 
                        placeholder="e.g., Design a new company logo and deliver as a .zip file. Payment released upon approval." 
                        className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-[#FF3142] focus:border-[#FF3142]"
                    />
                </FormRow>
                
                <div className="pt-4">
                     <button
                        onClick={handleCreateEscrow}
                        disabled={isCreating}
                        className="w-full bg-[#FF3142] text-white font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        {isCreating ? 'Processing...' : 'Create & Fund Escrow'}
                    </button>
                </div>
            </div>
        </div>
    );
}