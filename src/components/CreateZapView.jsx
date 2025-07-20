import React, { useState } from 'react';
import toast from 'react-hot-toast';
import getIrys from '../utils/irys';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import Escrow from '../../src/artifacts/contracts/Escrow.sol/Escrow.json';
import { useAppContext } from '../context/AppContext.jsx';
import FilePickerModal from './FilePickerModal.jsx';

const FormSection = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const FormRow = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        {children}
    </div>
);

export default function CreateZapView({ onSaveSuccess, onCancel, driveFiles, isLoadingDrive }) {
    const { session } = useAppContext();
    const [isSaving, setIsSaving] = useState(false);
    
    const [formType, setFormType] = useState('AUTOMATION');
    const [triggerType, setTriggerType] = useState('FILE_UPLOAD');
    const [actionType, setActionType] = useState('SHARE_FILE'); // Default to the only action

    const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleSave = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        const loadingToast = toast.loading('Processing...');
        
        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            const irys = await getIrys();
            let tags;

            if (data.formType === 'ESCROW_AGREEMENT') {
                const { freelancerAddress, arbiterAddress, amount, description } = data;
                if (!freelancerAddress || !arbiterAddress || !amount) {
                    throw new Error("Please fill out all escrow fields.");
                }
                
                toast.loading('Waiting for wallet confirmation...', { id: loadingToast });
                
                if (!window.ethereum) throw new Error("Wallet not found. Please install MetaMask.");
                const provider = new ethers.BrowserProvider(window.ethereum);
                
                const network = await provider.getNetwork();
                if (network.chainId !== 1270n) {
                     throw new Error(`Incorrect Network. Please switch to Irys Testnet (Chain ID 1270).`);
                }

                const signer = await provider.getSigner();
                const factory = new ethers.ContractFactory(Escrow.abi, Escrow.bytecode, signer);

                const escrowContract = await factory.deploy(
                    freelancerAddress,
                    arbiterAddress,
                    { value: ethers.parseEther(amount) }
                );

                toast.loading('Deploying escrow to the Irys network...', { id: loadingToast });
                await escrowContract.waitForDeployment();
                const contractAddress = await escrowContract.getAddress();

                const agreementData = {
                    type: 'ESCROW',
                    isActive: true,
                    version: "1.5",
                    createdAt: new Date().toISOString(),
                    contractAddress,
                    client: session.wallet.address,
                    freelancer: freelancerAddress,
                    arbiter: arbiterAddress,
                    amount,
                    description,
                };
                 tags = [{ name: "Content-Type", value: "application/json" }, { name: "App-Name", value: "Bridgbox-Escrows" }];
                 await irys.upload(Buffer.from(JSON.stringify(agreementData)), { tags });
                toast.success(`Escrow created successfully!`, { id: loadingToast, duration: 6000 });

            } else { // AUTOMATION
                let zapObject = {
                    isActive: true,
                    version: "1.9", // Version bump
                    createdAt: new Date().toISOString(),
                    type: 'AUTOMATION',
                    trigger: { type: data.triggerType, filter: {} },
                    action: { type: data.actionType, params: {} }
                };

                if (data.triggerType === 'FILE_UPLOAD') {
                    zapObject.trigger.filter.fileNameContains = data.fileNameContains.trim();
                }
                if (data.triggerType === 'EMAIL_RECEIVED') {
                    zapObject.trigger.filter.fromAddress = data.fromEmail.trim();
                }
                
                if (data.actionType === 'SHARE_FILE') {
                    if (!selectedFile) throw new Error("Please select a file to share.");
                    zapObject.action.params.fileId = selectedFile.id;
                    zapObject.action.params.fileName = selectedFile.fileName;
                    zapObject.action.params.shareWith = data.shareRecipient.trim();
                } else {
                    throw new Error("Invalid action type selected.");
                }
                
                tags = [{ name: "Content-Type", value: "application/json" }, { name: "App-Name", value: "Bridgbox-Zaps" }];
                await irys.upload(Buffer.from(JSON.stringify(zapObject)), { tags });
                toast.success('Automation saved successfully!', { id: loadingToast });
            }
            
            onSaveSuccess();

        } catch (error) {
            toast.error(error.message || "Failed to save.", { id: loadingToast });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {isFilePickerOpen && (
                <FilePickerModal 
                    files={driveFiles}
                    isLoading={isLoadingDrive}
                    onClose={() => setIsFilePickerOpen(false)}
                    onSelectFile={(file) => setSelectedFile(file)}
                />
            )}
            <form className="p-4 sm:p-6 bg-gray-50 h-full" onSubmit={handleSave}>
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50/80 backdrop-blur-sm py-2 -mt-2 z-10">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Create New Item
                    </h1>
                    <button type="button" onClick={onCancel} disabled={isSaving} className="text-gray-600 font-bold px-4 py-2 rounded-lg hover:bg-gray-200">Cancel</button>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                    <FormSection title="1. Choose what to create">
                        <FormRow label="Type">
                            <select name="formType" value={formType} onChange={(e) => setFormType(e.target.value)} disabled={isSaving} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-sm">
                                <option value="AUTOMATION">Automation (Zap)</option>
                                <option value="ESCROW_AGREEMENT">Escrow Agreement</option>
                            </select>
                        </FormRow>
                    </FormSection>

                    {formType === 'AUTOMATION' && (
                        <>
                            <FormSection title="2. Define Trigger">
                                <FormRow label="When this happens...">
                                    <select name="triggerType" value={triggerType} onChange={(e) => setTriggerType(e.target.value)} disabled={isSaving} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md">
                                        <option value="FILE_UPLOAD">A file is uploaded</option>
                                        <option value="EMAIL_RECEIVED">An email is received</option>
                                    </select>
                                </FormRow>
                                {triggerType === 'FILE_UPLOAD' && <FormRow label="If filename contains (optional)"><input name="fileNameContains" type="text" placeholder="e.g., invoice" disabled={isSaving} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md"/></FormRow>}
                                {triggerType === 'EMAIL_RECEIVED' && <FormRow label="If email is from"><input name="fromEmail" type="text" required placeholder="e.g., client@bridgbox.cloud or 0x..." disabled={isSaving} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md"/></FormRow>}
                            </FormSection>

                            <div className="flex justify-center"><svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg></div>
                            
                            <FormSection title="3. Then Do This">
                                <FormRow label="Action">
                                    <select name="actionType" value={actionType} onChange={(e) => setActionType(e.target.value)} disabled={isSaving} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-sm">
                                        {/* --- THIS IS THE FIX: ONLY "SHARE_FILE" IS AN OPTION --- */}
                                        <option value="SHARE_FILE">Share a file</option>
                                    </select>
                                </FormRow>
                                
                                <FormRow label="File to Share">
                                    <div className="flex items-center space-x-3 mt-1">
                                        <button type="button" onClick={() => setIsFilePickerOpen(true)} className="bg-white border border-gray-300 text-gray-800 font-bold px-4 py-2 rounded-lg hover:bg-gray-100">
                                            Select File...
                                        </button>
                                        {selectedFile && <span className="text-sm text-gray-600 font-medium truncate">{selectedFile.fileName}</span>}
                                    </div>
                                </FormRow>
                                <FormRow label="Share With (Address / Recipient):">
                                    <input name="shareRecipient" type="text" required placeholder="user@bridgbox.cloud or 0x..." disabled={isSaving} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md"/>
                                </FormRow>
                            </FormSection>
                        </>
                    )}
                    
                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-[#FF3142] text-white font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            {isSaving ? 'Saving...' : 'Save & Activate'}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
}