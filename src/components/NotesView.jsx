import React, { useState } from 'react';
import { collection, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppContext } from '../context/AppContext';
import getIrys from '../utils/irys';
import { Buffer } from 'buffer';
import toast from 'react-hot-toast';
import CreateNoteModal from './CreateNoteModal';
import EditNoteModal from './EditNoteModal'; // We will create this
import ConfirmDeleteModal from './ConfirmDeleteModal'; // We will create this

const NoteCard = ({ note, onEdit, onDelete }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col space-y-3 break-words group relative">
        <div className="absolute top-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(note)} className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z"></path></svg>
            </button>
            <button onClick={() => onDelete(note)} className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>
        <span className="text-xs text-gray-500">
            {note.timestamp ? new Date(note.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Just now'}
        </span>
        <h3 className="font-bold text-gray-900 truncate">{note.title}</h3>
        <p className="text-sm text-gray-600 flex-grow whitespace-pre-wrap">
            {note.snippet}
        </p>
    </div>
);

const NotesSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-100 h-48 rounded-lg"></div>
        ))}
    </div>
);

export default function NotesView({ notes, isLoading }) {
    const { session } = useAppContext();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [noteToEdit, setNoteToEdit] = useState(null);
    const [noteToDelete, setNoteToDelete] = useState(null);

    const handleSaveNote = async (title, content) => {
        if (!title.trim() || !content.trim()) {
            return toast.error("Title and content cannot be empty.");
        }

        const loadingToast = toast.loading("Saving note to Irys...");

        try {
            const irys = await getIrys();
            const noteData = { content };
            const tags = [
                { name: "Content-Type", value: "application/json" },
                { name: "App-Name", value: "Bridgbox-Note" }
            ];
            const receipt = await irys.upload(Buffer.from(JSON.stringify(noteData)), { tags });

            toast.loading("Saving metadata...", { id: loadingToast });

            const notesColRef = collection(db, 'users', session.wallet.address, 'notes');
            await addDoc(notesColRef, {
                title: title.trim(),
                irysTxId: receipt.id,
                snippet: content.trim().substring(0, 150),
                timestamp: serverTimestamp()
            });

            toast.success("Note saved successfully!", { id: loadingToast });
            setIsCreateModalOpen(false);

        } catch (error) {
            console.error("Failed to save note:", error);
            toast.error(error.message || "Could not save note.", { id: loadingToast });
        }
    };
    
    const handleUpdateNote = async (updatedTitle, updatedContent) => {
        if (!noteToEdit) return;

        const loadingToast = toast.loading("Updating note on Irys...");
        try {
            // Upload new content to Irys
            const irys = await getIrys();
            const newNoteData = { content: updatedContent };
            const tags = [{ name: "Content-Type", value: "application/json" }, { name: "App-Name", value: "Bridgbox-Note" }];
            const receipt = await irys.upload(Buffer.from(JSON.stringify(newNoteData)), { tags });

            // Update Firestore document with new Irys TX ID and other details
            toast.loading("Updating metadata...", { id: loadingToast });
            const noteRef = doc(db, 'users', session.wallet.address, 'notes', noteToEdit.id);
            await updateDoc(noteRef, {
                title: updatedTitle.trim(),
                irysTxId: receipt.id,
                snippet: updatedContent.trim().substring(0, 150),
                timestamp: serverTimestamp() // To bring it to the front of the list
            });
            
            toast.success("Note updated successfully!", { id: loadingToast });
            setNoteToEdit(null);

        } catch(error) {
            console.error("Failed to update note:", error);
            toast.error(error.message || "Could not update note.", { id: loadingToast });
        }
    };

    const handleDeleteNote = async () => {
        if (!noteToDelete) return;

        const loadingToast = toast.loading("Deleting note...");
        try {
            const noteRef = doc(db, 'users', session.wallet.address, 'notes', noteToDelete.id);
            await deleteDoc(noteRef);
            toast.success("Note deleted successfully!", { id: loadingToast });
            setNoteToDelete(null);
        } catch(error) {
            console.error("Failed to delete note:", error);
            toast.error(error.message || "Could not delete note.", { id: loadingToast });
        }
    };

    return (
        <div className="h-full p-6 flex flex-col bg-gray-50">
            {isCreateModalOpen && (
                <CreateNoteModal 
                    onSave={handleSaveNote}
                    onClose={() => setIsCreateModalOpen(false)}
                />
            )}
            {noteToEdit && (
                <EditNoteModal
                    note={noteToEdit}
                    onSave={handleUpdateNote}
                    onClose={() => setNoteToEdit(null)}
                />
            )}
            {noteToDelete && (
                <ConfirmDeleteModal
                    onConfirm={handleDeleteNote}
                    onCancel={() => setNoteToDelete(null)}
                    title="Delete Note?"
                    message="This will only remove the note from your list. The content will remain permanently on the Irys network. This action cannot be undone."
                />
            )}
            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                <h1 className="text-3xl font-bold text-gray-900">My Notes</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-[#FF3142] text-white font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md flex items-center space-x-2"
                >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    <span>Add new note</span>
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto">
                {isLoading ? (
                    <NotesSkeleton />
                ) : notes.length === 0 ? (
                    <div className="text-center mt-16">
                        <p className="text-gray-500">You don't have any notes yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {notes.map(note => <NoteCard key={note.id} note={note} onEdit={setNoteToEdit} onDelete={setNoteToDelete} />)}
                    </div>
                )}
            </div>
        </div>
    );
}