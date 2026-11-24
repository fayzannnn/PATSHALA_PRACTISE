function SearchSuggestions({ items, activeIndex, onSelect, onHover, onClearRecent }) {
  if (!items.length && !onClearRecent) return null;

  return (
    <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
      {items.map((item, index) => (
        <button
          type="button"
          role="option"
          aria-selected={activeIndex === index}
          className={`search-suggestion${activeIndex === index ? " active" : ""}`}
          key={`${item.type}-${item.query}`}
          onMouseEnter={() => onHover(index)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(item)}
        >
          <span className="search-suggestion-icon" aria-hidden="true">
            {item.type === "period" ? (
              <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
            ) : (
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>
            )}
          </span>
          <span>{item.label}</span>
          {item.type === "period" && <small>Enter</small>}
        </button>
      ))}
      {onClearRecent && (
        <button type="button" className="search-clear-recent" onMouseDown={(event) => event.preventDefault()} onClick={onClearRecent}>
          Clear recent searches
        </button>
      )}
    </div>
  );
}

export default SearchSuggestions;
