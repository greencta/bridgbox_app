import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function EditNoteModal({ note, onSave, onClose }) {
    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState('Loading full content...');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchNoteContent = async () => {
            try {
                const response = await fetch(`https://gateway.irys.xyz/${note.irysTxId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch note content from Irys.");
                }
                const data = await response.json();
                setContent(data.content);
            } catch (error) {
                console.error(error);
                setContent("Error: Could not load note content.");
                toast.error("Could not load note content.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchNoteContent();
    }, [note.irysTxId]);

    const handleConfirm = async () => {
        setIsSaving(true);
        await onSave(title, content);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Note</h2>
                
                <div className="space-y-4">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Note title..."
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-[#FF3142] focus:border-[#FF3142]"
                    />
                    <textarea
                        rows="8"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Start writing..."
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-[#FF3142] focus:border-[#FF3142]"
                        disabled={isLoading}
                    />
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isSaving} className="text-gray-600 font-bold px-6 py-2 rounded-lg hover:bg-gray-100">
                        Cancel
                    </button>
                    <button onClick={handleConfirm} disabled={isSaving || isLoading} className="bg-[#FF3142] text-white font-bold px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}