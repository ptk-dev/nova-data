import React, { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';

export default function NewsDashboard() {
  const [sources, setSources] = useState([]);
  const [articles, setArticles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [currentSource, setCurrentSource] = useState(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const api = {
    sources: '/api/sources',
    articles: '/api/articles',
    crawl: '/api/crawl',
  };

  useEffect(() => {
    fetch(api.sources)
      .then((res) => res.json())
      .then(setSources);
  }, []);

  const handleAddSource = async (e) => {
    e.preventDefault();
    await fetch(api.sources, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url }),
    });
    setName('');
    setUrl('');
    const data = await fetch(api.sources).then((r) => r.json());
    setSources(data);
  };

  const handleCrawl = async (id) => {
    await fetch(`${api.crawl}?sourceId=${id}`);
  };

  const viewArticles = async (id, page = 1) => {
    setCurrentSource(id);
    const res = await fetch(`${api.articles}?source=${id}&page=${page}`);
    const data = await res.json();
    setArticles(data.articles || data);
    setPagination({ page: data.page || 1, pages: data.pages || 1 });
  };

  // Columns for Sources Table
  const sourceColumns = useMemo(() => [
    { header: 'Name', accessorKey: 'name' },
    { header: 'URL', accessorKey: 'url' },
    { header: 'Last Crawl', accessorKey: 'last_crawl' },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div>
          <button onClick={() => handleCrawl(row.original.id)} style={styles.smallButton}>Crawl</button>
          <button onClick={() => viewArticles(row.original.id)} style={styles.smallButton}>View</button>
        </div>
      ),
    },
  ], []);

  // Columns for Articles Table
  const articleColumns = useMemo(() => [
    { header: 'Title', accessorKey: 'title' },
    { header: 'Date', accessorKey: 'date' },
    { header: 'Source', accessorKey: 'source' },
    { header: 'Author', accessorKey: 'authors' },
    {
      header: 'URL',
      cell: ({ row }) => (
        <a href={row.original.url} target="_blank" rel="noopener noreferrer">
          Read
        </a>
      ),
    },
  ], []);

  const sourceTable = useReactTable({
    data: sources,
    columns: sourceColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const articleTable = useReactTable({
    data: articles,
    columns: articleColumns,
    getCoreRowModel: getCoreRowModel(),
  });
  
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Add News Source</h2>
        <form onSubmit={handleAddSource}>
          <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Source Name" required />
          <input style={styles.input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Source URL" required />
          <button style={styles.button} type="submit">Add</button>
        </form>
      </div>
   
      <div style={styles.card}>
        <h2>News Sources</h2>
        <table style={styles.table}>
          <thead  style={styles.tableHeader}>
            {sourceTable.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}  style={styles.tableCell}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {sourceTable.getRowModel().rows.map(row => (
              <tr key={row.id}  style={styles.tableRowHover}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}  style={styles.tableCell}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.card}>
        <h2>Articles</h2>
        <h2><button style={styles.button} onClick={()=>viewArticles("")}>Show All</button></h2>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            {articleTable.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th style={styles.tableCell} key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {articleTable.getRowModel().rows.map(row => (
              <tr style={styles.tableRowHover} key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td style={styles.tableCell} key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {pagination.pages > 1 && (
          <div style={styles.pagination}>
            {Array.from({ length: pagination.pages }, (_, i) => (
              <button
                key={i}
                onClick={() => viewArticles(currentSource, i + 1)}
                disabled={i + 1 === pagination.page}
                style={{
                  ...styles.button,
                  background: i + 1 === pagination.page ? '#999' : '#007bff',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    fontFamily: 'system-ui, sans-serif',
    background: '#f5f5f5',
    maxWidth: 1200,
    margin: '0 auto',
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  input: {
    display: 'block',
    width: '100%',
    marginBottom: 10,
    padding: 10,
    borderRadius: 4,
    border: '1px solid #ccc',
    fontSize: 14,
  },
  button: {
    background: '#007bff',
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  smallButton: {
    marginRight: 5,
    padding: '6px 12px',
    fontSize: 13,
    borderRadius: 4,
    border: 'none',
    background: '#007bff',
    color: 'white',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 10,
    fontSize: 14,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    textAlign: 'left',
  },
  tableCell: {
    border: '1px solid #ddd',
    padding: '10px 12px',
  },
  tableRowHover: {
    transition: 'background 0.2s',
  },
  pagination: {
    marginTop: 15,
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
  },
};
