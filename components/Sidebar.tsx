
import React, { useState } from 'react';
import { ApiService, ServiceGroup } from '../types';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Code2, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  Edit2,
  GripVertical,
} from 'lucide-react';

interface SidebarProps {
  groups: ServiceGroup[];
  services: ApiService[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddService: (groupId: string) => void;
  onAddGroup: () => void;
  onDeleteService: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onOpenGlobalSettings: () => void;
  onOpenServiceSettings: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onMoveService: (serviceId: string, targetGroupId: string) => void;
  onReorderService: (dragId: string, dropId: string, position: 'before' | 'after') => void;
  onReorderGroup: (dragId: string, dropId: string, position: 'before' | 'after') => void;
}

type DragType = 'GROUP' | 'SERVICE';

interface DragState {
  type: DragType;
  id: string;
  groupId?: string; // Only for services
}

interface DropIndicator {
  targetId: string;
  position: 'before' | 'after' | 'inside'; // 'inside' is for dropping into a group
}

const Sidebar: React.FC<SidebarProps> = ({ 
  groups,
  services, 
  selectedId, 
  onSelect, 
  onAddService,
  onAddGroup,
  onDeleteService,
  onDeleteGroup,
  onOpenGlobalSettings,
  onOpenServiceSettings,
  onToggleGroup,
  onRenameGroup,
  onMoveService,
  onReorderService,
  onReorderGroup
}) => {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<string | null>(null);
  
  // DnD State
  const [draggedItem, setDraggedItem] = useState<DragState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

  // --- Drag Handlers ---

  const handleDragStart = (e: React.DragEvent, type: DragType, id: string, groupId?: string) => {
    e.dataTransfer.effectAllowed = 'move';
    // We set some data for compatibility, but main state is React state
    e.dataTransfer.setData('text/plain', id);
    setDraggedItem({ type, id, groupId });
  };

  const handleDragOver = (e: React.DragEvent, targetId: string, targetType: DragType | 'GROUP_HEADER' | 'EMPTY_GROUP') => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isTop = e.clientY < midY;

    // 1. Reordering Groups
    if (draggedItem.type === 'GROUP' && (targetType === 'GROUP_HEADER')) {
        if (draggedItem.id === targetId) {
            setDropIndicator(null);
            return;
        }
        setDropIndicator({
            targetId,
            position: isTop ? 'before' : 'after'
        });
        return;
    }

    // 2. Reordering Services
    if (draggedItem.type === 'SERVICE') {
        // Dragging service over another service -> Reorder (Line)
        if (targetType === 'SERVICE') {
             if (draggedItem.id === targetId) {
                setDropIndicator(null);
                return;
             }
             setDropIndicator({
                 targetId,
                 position: isTop ? 'before' : 'after'
             });
        }
        // Dragging service over Group Header -> Move to group (Highlight)
        else if (targetType === 'GROUP_HEADER') {
             // Don't allow moving to same group via header if it's just a reorder operation usually, 
             // but moving to self group is fine (effecitvely moves to end or no-op).
             if (draggedItem.groupId === targetId) {
                 // Optional: allow dragging to own group header to move to end?
                 // For now, let's show inside
             }
             setDropIndicator({
                 targetId,
                 position: 'inside'
             });
        }
        // Dragging service over Empty Group Zone -> Move to group
        else if (targetType === 'EMPTY_GROUP') {
             setDropIndicator({
                 targetId,
                 position: 'inside'
             });
        }
    }
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string, targetType: DragType | 'GROUP_HEADER' | 'EMPTY_GROUP') => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || !dropIndicator) {
        setDraggedItem(null);
        setDropIndicator(null);
        return;
    }

    // Execute Logic
    if (draggedItem.type === 'GROUP' && targetType === 'GROUP_HEADER') {
        if (draggedItem.id !== targetId && dropIndicator.position !== 'inside') {
             onReorderGroup(draggedItem.id, targetId, dropIndicator.position as 'before' | 'after');
        }
    } else if (draggedItem.type === 'SERVICE') {
        if (targetType === 'SERVICE') {
            if (draggedItem.id !== targetId && dropIndicator.position !== 'inside') {
                onReorderService(draggedItem.id, targetId, dropIndicator.position as 'before' | 'after');
            }
        } else if (targetType === 'GROUP_HEADER' || targetType === 'EMPTY_GROUP') {
            // Move to group
            if (draggedItem.groupId !== targetId) {
                onMoveService(draggedItem.id, targetId);
            }
        }
    }

    setDraggedItem(null);
    setDropIndicator(null);
  };

  // --- Group Renaming ---

  const startGroupEdit = (group: ServiceGroup) => {
    setEditingGroupId(group.id);
    setEditName(group.name);
  };

  const saveGroupEdit = () => {
    if (editingGroupId && editName.trim()) {
      onRenameGroup(editingGroupId, editName);
    }
    setEditingGroupId(null);
  };

  return (
    <div className="w-full bg-white border-r border-gray-200 h-full flex flex-col flex-shrink-0 select-none">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2 font-bold text-indigo-600">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-md">
            <Code2 size={20} />
          </div>
          <span className="hidden sm:inline">VolcAPI</span>
        </div>
        <button 
          onClick={onOpenGlobalSettings}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          title="Global Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        
        {groups.map(group => {
            const groupServices = services.filter(s => s.groupId === group.id);
            
            // Group Drop Indicator logic
            const isGroupDropTarget = dropIndicator?.targetId === group.id;
            const showLineBefore = isGroupDropTarget && dropIndicator.position === 'before' && draggedItem?.type === 'GROUP';
            const showLineAfter = isGroupDropTarget && dropIndicator.position === 'after' && draggedItem?.type === 'GROUP';
            const showGroupHighlight = isGroupDropTarget && dropIndicator.position === 'inside';

            const isDeleting = deleteConfirmGroupId === group.id;

            return (
                <div key={group.id} className="relative transition-all">
                    
                    {/* Group Insertion Lines */}
                    {showLineBefore && <div className="absolute -top-1 left-0 w-full h-0.5 bg-indigo-600 rounded-full z-20 shadow-sm" />}
                    {showLineAfter && <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-indigo-600 rounded-full z-20 shadow-sm" />}

                    <div 
                        className={`rounded-lg transition-colors ${showGroupHighlight ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset' : ''}`}
                    >
                        {/* Group Header */}
                        <div 
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'GROUP', group.id)}
                            onDragOver={(e) => handleDragOver(e, group.id, 'GROUP_HEADER')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, group.id, 'GROUP_HEADER')}
                            className={`flex items-center group/header px-2 py-2 rounded hover:bg-gray-50 cursor-pointer select-none ${draggedItem?.id === group.id ? 'opacity-30' : ''}`}
                        >
                            <button 
                                onClick={(e) => { e.stopPropagation(); onToggleGroup(group.id); }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-1 text-gray-400 hover:text-gray-600 mr-1"
                            >
                                {group.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </button>
                            
                            {editingGroupId === group.id ? (
                                <input 
                                    autoFocus
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={saveGroupEdit}
                                    onKeyDown={(e) => e.key === 'Enter' && saveGroupEdit()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="flex-1 text-xs font-semibold bg-white border border-indigo-300 rounded px-1 py-0.5 outline-none"
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                <div 
                                    className="flex-1 flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide overflow-hidden"
                                    onDoubleClick={() => startGroupEdit(group)}
                                >
                                    <Folder size={14} className={`shrink-0 ${showGroupHighlight ? 'text-indigo-600' : ''}`}/>
                                    <span className="truncate">{group.name}</span>
                                    <span className="text-[10px] font-normal bg-gray-100 text-gray-400 px-1.5 rounded-full shrink-0">
                                        {groupServices.length}
                                    </span>
                                </div>
                            )}

                            <div className={`flex items-center transition-opacity ml-auto pl-2 ${isDeleting ? 'opacity-100' : 'opacity-0 group-hover/header:opacity-100'}`}>
                                 {isDeleting ? (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            onDeleteGroup(group.id); 
                                            setDeleteConfirmGroupId(null);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="px-2 py-0.5 bg-red-100 text-red-600 hover:bg-red-200 text-[10px] font-bold rounded shadow-sm whitespace-nowrap"
                                    >
                                        Confirm Delete
                                    </button>
                                 ) : (
                                    <>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onAddService(group.id); }} 
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="p-1 text-gray-400 hover:text-indigo-600" 
                                            title="Add Service"
                                        >
                                            <Plus size={14}/>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); startGroupEdit(group); }} 
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="p-1 text-gray-400 hover:text-indigo-600" 
                                            title="Rename Group"
                                        >
                                            <Edit2 size={14}/>
                                        </button>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setDeleteConfirmGroupId(group.id); 
                                                setTimeout(() => setDeleteConfirmGroupId(null), 3000);
                                            }} 
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="p-1 text-gray-400 hover:text-red-500" 
                                            title="Delete Group"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </>
                                 )}
                            </div>
                        </div>

                        {/* Group Services */}
                        {!group.collapsed && (
                            <div className="pl-3 space-y-0.5 mt-1 pb-1">
                                {groupServices.length === 0 && (
                                    <div 
                                        className={`pl-6 py-4 text-xs text-gray-300 italic border border-dashed border-transparent rounded ${draggedItem?.type === 'SERVICE' ? 'hover:bg-indigo-50/50 hover:border-indigo-200' : ''}`}
                                        onDragOver={(e) => handleDragOver(e, group.id, 'EMPTY_GROUP')}
                                        onDrop={(e) => handleDrop(e, group.id, 'EMPTY_GROUP')}
                                    >
                                        {draggedItem?.type === 'SERVICE' ? 'Drop service here' : 'No services'}
                                    </div>
                                )}
                                {groupServices.map(service => {
                                    const isServiceDropTarget = dropIndicator?.targetId === service.id;
                                    const showServiceLineBefore = isServiceDropTarget && dropIndicator.position === 'before';
                                    const showServiceLineAfter = isServiceDropTarget && dropIndicator.position === 'after';

                                    return (
                                        <div
                                            key={service.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, 'SERVICE', service.id, group.id)}
                                            onDragOver={(e) => handleDragOver(e, service.id, 'SERVICE')}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, service.id, 'SERVICE')}
                                            className="relative"
                                        >
                                            {/* Service Insertion Lines */}
                                            {showServiceLineBefore && <div className="absolute -top-0.5 left-0 w-full h-0.5 bg-indigo-600 z-30 shadow-sm" />}
                                            {showServiceLineAfter && <div className="absolute -bottom-0.5 left-0 w-full h-0.5 bg-indigo-600 z-30 shadow-sm" />}

                                            <div
                                                className={`group/item relative flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm transition-all border border-transparent ${
                                                    selectedId === service.id
                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm z-10'
                                                        : 'text-gray-700 hover:bg-gray-50 hover:border-gray-200'
                                                } ${draggedItem?.id === service.id ? 'opacity-40' : ''}`}
                                                onClick={() => onSelect(service.id)}
                                            >
                                                <div className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing">
                                                    <GripVertical size={12} />
                                                </div>
                                                
                                                <div className="min-w-0 flex-1 flex flex-col">
                                                    <span className="truncate font-medium">{service.name}</span>
                                                    <span className="text-[10px] text-gray-400 truncate font-normal">{service.description}</span>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded px-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenServiceSettings(service.id);
                                                        }}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                        title="Service Settings"
                                                    >
                                                        <Settings size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            );
        })}

        <button
            onClick={onAddGroup}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 hover:border-indigo-400 hover:text-indigo-600 text-gray-400 rounded-lg text-xs font-medium transition-all mt-4"
        >
            <Plus size={14} />
            Add New Group
        </button>

      </div>
    </div>
  );
};

export default Sidebar;
