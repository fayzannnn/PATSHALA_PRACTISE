function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = total ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(safePage * pageSize, total);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === pageCount || Math.abs(number - safePage) <= 1);

  return (
    <div className="transactions-pagination">
      <div className="pagination-size">
        <span>Rows per page</span>
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>
      <span className="pagination-range">{start}-{end} of {total}</span>
      <div className="pagination-controls">
        <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage <= 1}>‹</button>
        {pages.map((number, index) => (
          <span key={number}>
            {index > 0 && number - pages[index - 1] > 1 && <b>…</b>}
            <button type="button" className={number === safePage ? "active" : ""} onClick={() => onPageChange(number)}>{number}</button>
          </span>
        ))}
        <button type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage >= pageCount}>›</button>
      </div>
    </div>
  );
}

export default Pagination;
