/**
 * MemoryModal - Review & Management UI for ARAVAN's Persistent Brain
 */

import React, { useState, useEffect } from 'react';
import { MemoryManager } from '../memory/MemoryManager';
import { Memory, MemoryCategory } from '../memory/MemoryTypes';
import {
  Brain,
  Shield,
  Trash2,
  X,
  Plus,
  Check,
  AlertTriangle,
  Lock,
  Search,
  Edit2,
  Filter,
} from 'lucide-react';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (text: string) => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isMemoryEnabled, setIsMemoryEnabled] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Adding state
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preference');

  // Editing state
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('preference');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const memoryManager = MemoryManager.getInstance();

  const loadMemories = async () => {
    const list = await memoryManager.getAllMemories();
    setMemories(list);
    setIsMemoryEnabled(memoryManager.isMemoryEnabled());
  };

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
    const unsubscribe = memoryManager.subscribe(() => {
      loadMemories();
    });
    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleMemory = async () => {
    const nextState = !isMemoryEnabled;
    setIsMemoryEnabled(nextState);
    await memoryManager.toggleMemoryEnabled(nextState);
    setStatusMessage(nextState ? 'Memory system enabled.' : 'Memory system paused.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleDelete = async (id: string) => {
    await memoryManager.deleteMemory(id);
    await loadMemories();
  };

  const handleClearAll = async () => {
    await memoryManager.clearAllMemories();
    setShowClearConfirm(false);
    await loadMemories();
    setStatusMessage('All personal memories cleared.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      await memoryManager.saveExplicitMemory(
        newKey.trim(),
        newValue.trim(),
        newCategory,
        0.85
      );
      setNewKey('');
      setNewValue('');
      setIsAdding(false);
      setStatusMessage('Memory saved to persistent storage.');
      setTimeout(() => setStatusMessage(null), 2500);
      await loadMemories();
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to save memory.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleStartEdit = (mem: Memory) => {
    setEditingMemory(mem);
    setEditKey(mem.key);
    setEditValue(mem.value);
    setEditCategory(mem.category);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !editKey.trim() || !editValue.trim()) return;

    try {
      await memoryManager.saveExplicitMemory(
        editKey.trim(),
        editValue.trim(),
        editCategory,
        editingMemory.importance
      );
      if (editingMemory.key !== editKey.trim()) {
        await memoryManager.deleteMemory(editingMemory.id);
      }
      setEditingMemory(null);
      setStatusMessage('Memory updated successfully.');
      setTimeout(() => setStatusMessage(null), 2500);
      await loadMemories();
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to update memory.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const filteredMemories = memories.filter((mem) => {
    const matchesCategory =
      selectedCategory === 'all' || mem.category.toLowerCase() === selectedCategory.toLowerCase();
    const qLower = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !qLower ||
      mem.key.toLowerCase().includes(qLower) ||
      mem.value.toLowerCase().includes(qLower) ||
      mem.category.toLowerCase().includes(qLower);
    return matchesCategory && matchesSearch;
  });

  const categories = ['all', 'preference', 'project', 'personal', 'fact', 'routine'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="memory-modal-container"
        className="w-full max-w-2xl bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-all"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 tracking-wide flex items-center gap-2">
                ARAVAN'S MEMORY STORAGE
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-amber-400 border border-zinc-700/60">
                  {memories.length} Stored
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Persistent long-term brain across sessions & voice commands as per your wish
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 px-6 py-2 text-xs text-amber-300 flex items-center gap-2 font-mono">
            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Search & Category Filter Toolbar */}
        <div className="px-6 py-3 border-b border-zinc-800/70 bg-zinc-900/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search stored memories or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-700/60 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Privacy & Control Toggle */}
          <div className="flex items-center gap-2 justify-end text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className={isMemoryEnabled ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                {isMemoryEnabled ? 'Learning Active' : 'Paused'}
              </span>
            </div>
            <button
              onClick={handleToggleMemory}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                isMemoryEnabled
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isMemoryEnabled ? 'Pause' : 'Enable'}
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-6 py-2 border-b border-zinc-800/60 bg-zinc-950 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] capitalize font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Memories List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
              <Brain className="w-8 h-8 text-zinc-700" />
              <span>
                {searchQuery || selectedCategory !== 'all'
                  ? 'No memories match your query or category filter.'
                  : 'No custom memories saved yet. You can speak to ARAVAN or add facts below.'}
              </span>
            </div>
          ) : (
            filteredMemories.map((mem) => {
              const isCreator = mem.id === 'mem_creator_jayom_panchal' || mem.key === 'creator';

              return (
                <div
                  key={mem.id}
                  id={`memory-item-${mem.id}`}
                  className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-zinc-800 text-amber-400 border border-zinc-700/50">
                        {mem.category}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {mem.key}
                      </span>
                      {isCreator && (
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-mono">
                          <Lock className="w-2.5 h-2.5" /> Foundational
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500 font-mono ml-auto">
                        {(mem.importance * 100).toFixed(0)}% weight
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {mem.value}
                    </p>

                    <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                      <span>Updated: {new Date(mem.updatedAt).toLocaleDateString()}</span>
                      {mem.tags && mem.tags.length > 0 && (
                        <span className="text-zinc-600">Tags: {mem.tags.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  {!isCreator && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(mem)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                        title="Edit memory"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(mem.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Edit Memory Form Modal */}
        {editingMemory && (
          <form
            onSubmit={handleSaveEdit}
            className="p-4 border-t border-zinc-800 bg-zinc-900/90 space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
              <span className="flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" />
                Edit Stored Memory
              </span>
              <button
                type="button"
                onClick={() => setEditingMemory(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Key / Subject"
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                required
              />
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="preference">Preference</option>
                <option value="project">Project</option>
                <option value="personal">Personal</option>
                <option value="fact">Fact</option>
                <option value="routine">Routine</option>
                <option value="identity">Identity</option>
              </select>
            </div>
            <textarea
              placeholder="Information / Fact to remember..."
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 resize-none h-16"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors"
              >
                Update Memory
              </button>
            </div>
          </form>
        )}

        {/* Add Memory Form */}
        {isAdding && (
          <form
            onSubmit={handleAddMemory}
            className="p-4 border-t border-zinc-800 bg-zinc-900/90 space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
              <span className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                Add Custom Memory (As Per Your Wish)
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Key (e.g. Favorite Project, Preferred Tone)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                required
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="preference">Preference</option>
                <option value="project">Project</option>
                <option value="personal">Personal</option>
                <option value="fact">Fact</option>
                <option value="routine">Routine</option>
                <option value="identity">Identity</option>
              </select>
            </div>
            <textarea
              placeholder="Information / Details to remember (e.g. User likes dark cyber themes and concise explanations)..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none h-16"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors"
              >
                Save To Memory
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between">
          {!isAdding && !editingMemory && (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium py-1 px-2.5 rounded-lg hover:bg-zinc-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Fact as per Wish
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Clear personal memories?
                </span>
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-medium hover:bg-red-900"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                id="clear-all-memories-btn"
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-zinc-400 hover:text-red-400 py-1 px-2.5 rounded-lg hover:bg-zinc-900 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Memories
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
