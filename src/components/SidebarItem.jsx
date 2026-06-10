import React, { useState, useRef, useEffect } from 'react';

const SidebarItem = ({ title, active, onClick, onRename, delay = 0 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (editTitle.trim() && editTitle !== title) {
        onRename(editTitle);
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditTitle(title);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    if (editTitle.trim() && editTitle !== title) {
      onRename(editTitle);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div 
        className="w-full px-2 py-1 bg-input-bg border border-accent rounded-md"
        style={{ animation: `fadeSlideIn 0.2s ease ${delay}s both` }}
      >
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full bg-transparent border-none outline-none text-[13px] text-txt-primary select-text"
        />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      onDoubleClick={() => setIsEditing(true)}
      aria-label={`Discussion : ${title}`}
      className={`
        w-full text-left px-3 py-2 text-[13px] rounded-md transition-colors truncate cursor-pointer select-none
        ${active ? 'bg-item-active text-txt-primary' : 'text-txt-primary hover:bg-item-hover'}
      `}
      style={{
        animation: `fadeSlideIn 0.2s ease ${delay}s both`,
      }}
      title="Double-cliquer pour renommer"
    >
      {title}
    </button>
  );
};

export default SidebarItem;
