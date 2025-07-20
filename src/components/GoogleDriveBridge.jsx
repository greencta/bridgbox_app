// src/components/GoogleDriveBridge.jsx

import React, { useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { useAppContext } from '../context/AppContext.jsx';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import getIrys from '../utils/irys';
import { Buffer } from 'buffer';
import toast from 'react-hot-toast';

// Replace this with your actual Client ID from the Google Cloud Console
const GOOGLE_CLIENT_ID = "949557806499-stm2p38vn3fhd6uo50qhhun5pftfjpqq.apps.googleusercontent.com";

// Helper map to handle the export of Google Workspace file types
const GOOGLE_DOCS_MIME_TYPES = {
    'application/vnd.google-apps.document': {
        exportMimeType: 'application/pdf',
        extension: '.pdf',
    },
    'application/vnd.google-apps.spreadsheet': {
        exportMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
    },
    'application/vnd.google-apps.presentation': {
        exportMimeType: 'application/pdf',
        extension: '.pdf',
    },
};

const MigrationController = () => {
    const { session } = useAppContext();
    const [googleAuthToken, setGoogleAuthToken] = useState(null);
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

    const login = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            setGoogleAuthToken(tokenResponse.access_token);
            fetchFiles(tokenResponse.access_token);
        },
        onError: () => toast.error("Google login failed. Please try again."),
        scope: 'https://www.googleapis.com/auth/drive.readonly',
    });

    const fetchFiles = async (accessToken) => {
        setIsLoadingFiles(true);
        const fetchToast = toast.loading("Fetching files from Google Drive...");
        try {
            const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size)', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error('Failed to fetch file list');
            const data = await response.json();
            setFiles(data.files || []);
            toast.success("Successfully connected!", { id: fetchToast });
        } catch (error) {
            toast.error(`Error: ${error.message}`, { id: fetchToast });
            console.error(error);
        } finally {
            setIsLoadingFiles(false);
        }
    };

    const handleFileSelection = (fileId) => {
        setSelectedFiles(prev => prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]);
    };

    const handleMigrate = async () => {
        if (selectedFiles.length === 0) return toast.error("Please select at least one file.");
        if (!session?.wallet?.address) return toast.error("Wallet not connected.");

        setIsMigrating(true);
        const migrationToast = toast.loading(`Starting migration...`);

        try {
            const irys = await getIrys();
            const filesToMigrate = files.filter(f => selectedFiles.includes(f.id));

            for (const file of filesToMigrate) {
                toast.loading(`Migrating ${file.name}...`, { id: migrationToast });

                let downloadUrl;
                let finalFileName = file.name;
                let finalMimeType = file.mimeType;

                // Check if the file is a Google Workspace document
                if (GOOGLE_DOCS_MIME_TYPES[file.mimeType]) {
                    const exportConfig = GOOGLE_DOCS_MIME_TYPES[file.mimeType];
                    downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${exportConfig.exportMimeType}`;
                    finalFileName = `${file.name}${exportConfig.extension}`;
                    finalMimeType = exportConfig.exportMimeType;
                } else {
                    // It's a regular file, use the direct download link
                    downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
                }

                // 1. Download from the correct Google Drive endpoint
                const downloadResponse = await fetch(downloadUrl, {
                    headers: { 'Authorization': `Bearer ${googleAuthToken}` }
                });
                if (!downloadResponse.ok) throw new Error(`Failed to download ${file.name}`);
                const fileBuffer = Buffer.from(await downloadResponse.arrayBuffer());

                // 2. Upload to Irys
                const tags = [{ name: "Content-Type", value: finalMimeType || "application/octet-stream" }];
                const receipt = await irys.upload(fileBuffer, { tags });

                // 3. Save Metadata to Firestore
                await addDoc(collection(db, 'driveFiles'), {
                    owner: session.wallet.address.toLowerCase(),
                    fileName: finalFileName,
                    irysTxId: receipt.id,
                    size: fileBuffer.length, // Use the actual buffer length for accurate size
                    mimeType: finalMimeType,
                    sharedWith: [],
                    timestamp: serverTimestamp(),
                });
            }

            toast.success(`Successfully migrated ${selectedFiles.length} file(s)!`, { id: migrationToast, duration: 4000 });
            // Reset state after successful migration
            setSelectedFiles([]);
            setFiles([]);
            setGoogleAuthToken(null);
        } catch (error) {
            toast.error(error.message || "An error occurred during migration.", { id: migrationToast });
            console.error(error);
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl border border-gray-200 w-full max-w-lg mx-auto">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Migrate from Google Drive</h2>
                <p className="text-gray-600 mb-6">Securely import your files to your decentralized Bridgbox Drive.</p>
            </div>

            {!googleAuthToken && (
                <div className="text-center">
                    <button onClick={() => login()} className="bg-[#4285F4] text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
                        Connect Google Drive
                    </button>
                </div>
            )}
            
            {isLoadingFiles && <p className="mt-4 text-center text-gray-500">Loading your files...</p>}

            {files.length > 0 && (
                <div className="mt-6 text-left">
                    <h3 className="font-semibold mb-2">Select files to migrate:</h3>
                    <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                        {files.map(file => (
                            <label key={file.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(file.id)}
                                    onChange={() => handleFileSelection(file.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-[#FF3142] focus:ring-[#FF3142]"
                                />
                                <span className="text-sm truncate">{file.name}</span>
                            </label>
                        ))}
                    </div>

                    <div className="mt-6 text-center">
                        <button
                            onClick={handleMigrate}
                            disabled={isMigrating || selectedFiles.length === 0}
                            className="bg-[#FF3142] text-white font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isMigrating ? 'Migrating...' : `Migrate ${selectedFiles.length} File(s)`}
                        </button>
                    </div>
                </div>
            )}

            <p className="text-xs text-gray-400 mt-6 text-center">
                By connecting, you allow Bridgbox to view and import files. We never store your Google password.
            </p>
        </div>
    );
};

// Main component that provides the Google OAuth context
const GoogleDriveBridge = () => (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <MigrationController />
    </GoogleOAuthProvider>
);

export default GoogleDriveBridge;