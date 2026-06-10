import { useMemo, useState } from 'react';
import type { Member } from '../types';

interface MemberSelectProps {
  members: Member[];
  value: { memberId?: number | null; name: string };
  onChange: (value: { memberId?: number | null; name: string }) => void;
  placeholder?: string;
}

export default function MemberSelect({
  members,
  value,
  onChange,
  placeholder = 'Search member or type a name...',
}: MemberSelectProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        (m.phone && m.phone.includes(term))
    );
  }, [members, search]);

  if (value.name && !open) {
    return (
      <div className="selected-reader">
        <span>{value.name}</span>
        {!value.memberId && <span className="badge badge-gold">Custom</span>}
        <button
          type="button"
          className="remove-selection"
          onClick={() => onChange({ memberId: null, name: '' })}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="searchable-dropdown">
      <input
        type="text"
        className="searchable-input"
        value={search}
        placeholder={placeholder}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="searchable-dropdown-list show">
          {search.trim() && (
            <button
              type="button"
              className="searchable-dropdown-item custom-option"
              onClick={() => {
                onChange({ memberId: null, name: search.trim() });
                setOpen(false);
                setSearch('');
              }}
            >
              Add &quot;{search.trim()}&quot; as reader
            </button>
          )}
          {filtered.map((member) => (
            <button
              key={member.id}
              type="button"
              className="searchable-dropdown-item"
              onClick={() => {
                onChange({ memberId: member.id, name: member.name });
                setOpen(false);
                setSearch('');
              }}
            >
              <div className="member-name">{member.name}</div>
              {member.phone && <div className="member-phone">{member.phone}</div>}
            </button>
          ))}
          {filtered.length === 0 && !search.trim() && (
            <div className="no-results">No members found</div>
          )}
        </div>
      )}
    </div>
  );
}
