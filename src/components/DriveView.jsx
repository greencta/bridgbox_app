import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import { addDoc, collection, serverTimestamp, doc, deleteDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import getIrys from '../utils/irys';
import { Buffer } from 'buffer';
import toast from 'react-hot-toast';
import ShareFileModal from './ShareFileModal.jsx';
import ConfirmDeleteModal from './ConfirmDeleteModal.jsx';
import GoogleDriveBridge from './GoogleDriveBridge.jsx';
import RenameFileModal from './RenameFileModal.jsx';

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const EmptyDriveState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
        <h2 className="mt-4 text-lg font-medium text-gray-600">Your Drive is Empty</h2>
        <p className="mt-1 text-sm text-gray-500">
            Your direct uploads will appear here.
        </p>
    </div>
);

const FileCard = ({ attachment, onShare, onDelete, onRename }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const isImage = attachment.mimeType && attachment.mimeType.startsWith('image/');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    const fileUrl = `https://gateway.irys.xyz/${attachment.irysTxId}`;

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col group relative">
            <div className="absolute top-2 right-2 z-10">
                <button 
                    onClick={() => setIsMenuOpen(prev => !prev)} 
                    className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
                </button>
                {isMenuOpen && (
                     <div ref={menuRef} className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
                        <ul>
                            {attachment.source !== 'shared' && (
                                <>
                                    <li>
                                        <button onClick={() => { onRename(attachment); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Rename</button>
                                    </li>
                                    <li>
                                        <button onClick={() => { onShare(attachment); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Share</button>
                                    </li>
                                </>
                            )}
                            <li>
                                <a href={fileUrl} download={attachment.fileName} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Download</a>
                            </li>
                            <li>
                                <button onClick={() => { onDelete(attachment); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Delete</button>
                            </li>
                        </ul>
                     </div>
                )}
            </div>
            
            <div className="h-32 bg-gray-100 flex items-center justify-center">
                {isImage ? (
                    <img src={fileUrl} alt={attachment.fileName} className="w-full h-full object-cover" />
                ) : (
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                )}
            </div>
            <div className="p-4 flex-grow flex flex-col justify-between border-t border-gray-200">
                <div>
                    <p className="text-sm font-medium text-gray-900 truncate" title={attachment.fileName}>{attachment.fileName}</p>
                     {attachment.source === 'shared' && (
                         <p className="text-xs text-gray-500 mt-1">Shared by: {attachment.sharedByShort}</p>
                    )}
                </div>
                <div className="mt-3">
                     <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                </div>
            </div>
        </div>
    );
};

const FileTable = ({ attachments, onShare, onDelete, onRename }) => (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {attachments.map((att) => {
                    const fileUrl = `https://gateway.irys.xyz/${att.irysTxId}`;
                    return (
                        <tr key={att.id} className="hover:bg-gray-100">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{att.fileName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {att.source === 'drive' ? 'Direct Upload' : `Shared by: ${att.sharedByShort}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatFileSize(att.size)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {att.timestamp?.toDate?.().toLocaleDateString() || new Date(att.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                {att.source !== 'shared' && (
                                    <>
                                        <button onClick={() => onRename(att)} className="text-[#FF3142] hover:opacity-80">Rename</button>
                                        <button onClick={() => onShare(att)} className="text-[#FF3142] hover:opacity-80">Share</button>
                                    </>
                                )}
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-[#FF3142] hover:opacity-80">
                                    Download
                                </a>
                                <button onClick={() => onDelete(att)} className="text-red-500 hover:opacity-80">Delete</button>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    </div>
);


export default function DriveView({ 
    myUploads = [], 
    sharedFiles = [], 
    contacts, 
    isLoading, 
    onDeleteFile, 
    zaps = [],
    fetchMyUploads,
    hasMoreUploads
}) {
    const { session } = useAppContext();
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [fileToShare, setFileToShare] = useState(null);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [fileToRename, setFileToRename] = useState(null);
    const [isMigrating, setIsMigrating] = useState(false);

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const executeZaps = async (zapsToExecute, triggerFile) => {
        for (const zap of zapsToExecute) {
            const executionToast = toast.loading(`Executing Zap: ${zap.action.type}...`);
            try {
                switch (zap.action.type) {
                    case 'SHARE_FILE': {
                        const fileIdToShare = zap.action.params.fileId;
                        if (!fileIdToShare) throw new Error("Zap is misconfigured: No file ID specified.");

                        let shareAddress = zap.action.params.shareWith;
                        if (!shareAddress) throw new Error("Zap is missing 'shareWith' parameter.");

                        if (shareAddress.includes('@')) {
                             const username = shareAddress.split('@')[0];
                             const usernameSnap = await getDoc(doc(db, 'usernames', username));
                             if (!usernameSnap.exists()) throw new Error(`Username ${username} not found.`);
                             shareAddress = usernameSnap.data().walletAddress;
                        }

                        const fileToUpdateRef = doc(db, 'driveFiles', fileIdToShare);
                        await updateDoc(fileToUpdateRef, {
                            sharedWith: arrayUnion(shareAddress.toLowerCase()),
                        });

                        toast.success(`Zap executed: Shared '${zap.action.params.fileName}' with ${zap.action.params.shareWith}`, { id: executionToast, duration: 4000 });
                        break;
                    }
                    default:
                        throw new Error(`Unknown or unsupported Zap action type: ${zap.action.type}`);
                }
            } catch (error) {
                console.error("Failed to execute Zap:", zap, error);
                toast.error(error.message || `Failed to execute Zap`, { id: executionToast });
            }
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const loadingToast = toast.loading(`Uploading ${file.name}...`);
        try {
            const irys = await getIrys();
            const tags = [{ name: "Content-Type", value: file.type || "application/octet-stream" }];
            const buffer = Buffer.from(await file.arrayBuffer());
            const receipt = await irys.upload(buffer, { tags });

            const newFileData = {
                owner: session.wallet.address.toLowerCase(),
                fileName: file.name,
                irysTxId: receipt.id,
                size: file.size,
                mimeType: file.type,
                sharedWith: [],
            };
            
            const docRef = await addDoc(collection(db, 'driveFiles'), {
                ...newFileData,
                timestamp: serverTimestamp(),
            });
            
            toast.success('File uploaded successfully!', { id: loadingToast });

            const finalFileData = { ...newFileData, id: docRef.id, source: 'drive' };
            
            const triggeredZaps = zaps.filter(zap => {
                if (!zap.isActive || !zap.trigger || zap.trigger.type !== 'FILE_UPLOAD') {
                    return false;
                }
                const filterText = zap.trigger.filter.fileNameContains?.toLowerCase() || "";
                if (filterText && !finalFileData.fileName.toLowerCase().includes(filterText)) {
                    return false;
                }
                return true;
            });

            if (triggeredZaps.length > 0) {
                toast.success(`Triggered ${triggeredZaps.length} Zap(s)!`);
                await executeZaps(triggeredZaps, finalFileData);
            }
            
        } catch (error) {
            console.error("Error uploading file to drive:", error);
            toast.error(error.message || "Failed to upload file.", { id: loadingToast });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    const handleRenameFile = async (newName) => {
        if (!fileToRename) return;

        const loadingToast = toast.loading('Renaming file...');
        try {
            const fileRef = doc(db, 'driveFiles', fileToRename.id);
            await updateDoc(fileRef, {
                fileName: newName
            });
            toast.success('File renamed successfully!', { id: loadingToast });
        } catch (error) {
            console.error('Error renaming file:', error);
            toast.error('Failed to rename file.', { id: loadingToast });
        } finally {
            setFileToRename(null);
        }
    };

    const openShareModal = (file) => setFileToShare(file);
    const closeShareModal = () => setFileToShare(null);
    const openDeleteModal = (file) => setFileToDelete(file);
    const closeDeleteModal = () => setFileToDelete(null);
    const openRenameModal = (file) => setFileToRename(file);
    const closeRenameModal = () => setFileToRename(null);

    const handleDeleteConfirm = () => {
        if (fileToDelete) {
            onDeleteFile(fileToDelete);
            closeDeleteModal();
        }
    };

    if (isMigrating) {
        return (
            <div className="h-full p-6 flex flex-col items-center justify-center bg-gray-50">
                <GoogleDriveBridge />
                <button 
                    onClick={() => setIsMigrating(false)} 
                    className="mt-4 text-gray-600 font-bold px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    Back to My Drive
                </button>
            </div>
        );
    }
    
    return (
        <div className="h-full p-6 flex flex-col bg-white text-gray-800">
             {fileToShare && <ShareFileModal fileToShare={fileToShare} contacts={contacts} onClose={closeShareModal} onShareSuccess={closeShareModal} />}
             {fileToDelete && <ConfirmDeleteModal onConfirm={handleDeleteConfirm} onCancel={closeDeleteModal} />}
             {fileToRename && <RenameFileModal file={fileToRename} onRename={handleRenameFile} onClose={closeRenameModal} />}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

            <div className="flex flex-wrap gap-4 justify-between items-center border-b border-gray-200 pb-4 mb-4">
                 <h1 className="text-3xl font-bold text-gray-900">My Drive</h1>
                 <div className="flex items-center space-x-2 sm:space-x-4">
                    <button 
                        onClick={() => setIsMigrating(true)} 
                        disabled={isUploading || isLoading} 
                        className="bg-white border border-gray-300 text-gray-800 font-bold px-4 py-2 rounded-lg hover:bg-gray-100 transition-opacity disabled:opacity-50 flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                        </svg>
                        <span className="hidden sm:inline">Import</span>
                    </button>

                    <button onClick={handleUploadClick} disabled={isUploading || isLoading} className="bg-[#FF3142] text-white font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        <span className="hidden sm:inline">{isLoading ? 'Loading...' : isUploading ? 'Uploading...' : 'Upload File'}</span>
                    </button>
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}>
                            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}>
                            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
                        </button>
                    </div>
                 </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-8">
                {isLoading && myUploads.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">Loading files...</div>
                ) : myUploads.length === 0 && sharedFiles.length === 0 ? (
                    <EmptyDriveState />
                ) : (
                    <>
                        {myUploads.length > 0 && (
                            <section>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">My Uploads</h2>
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {myUploads.map((att) => <FileCard key={att.id} attachment={att} onShare={openShareModal} onDelete={openDeleteModal} onRename={openRenameModal} />)}
                                    </div>
                                ) : (
                                    <FileTable attachments={myUploads} onShare={openShareModal} onDelete={openDeleteModal} onRename={openRenameModal} />
                                )}
                                {hasMoreUploads && (
                                    <div className="text-center mt-6">
                                        <button 
                                            onClick={() => fetchMyUploads(true)} 
                                            disabled={isLoading}
                                            className="bg-gray-100 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            {isLoading ? 'Loading...' : 'Load More'}
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}
                        {sharedFiles.length > 0 && (
                            <section>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 mt-8">Shared with Me</h2>
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {sharedFiles.map((att) => <FileCard key={att.id} attachment={att} onShare={openShareModal} onDelete={openDeleteModal} onRename={openRenameModal} />)}
                                    </div>
                                ) : (
                                    <FileTable attachments={sharedFiles} onShare={openShareModal} onDelete={openDeleteModal} onRename={openRenameModal} />
                                )}
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}