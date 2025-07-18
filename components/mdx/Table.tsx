import React from 'react'
import styles from './Table.module.css'

interface TableProps {
  children: React.ReactNode
}

interface TableRowProps {
  children: React.ReactNode
}

interface TableCellProps {
  children: React.ReactNode
  header?: boolean
}

interface TableHeaderProps {
  children: React.ReactNode
}

interface TableBodyProps {
  children: React.ReactNode
}

export const Table: React.FC<TableProps> = ({ children }) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        {children}
      </table>
    </div>
  )
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children }) => {
  return <thead className={styles.tableHeader}>{children}</thead>
}

export const TableBody: React.FC<TableBodyProps> = ({ children }) => {
  return <tbody className={styles.tableBody}>{children}</tbody>
}

export const TableRow: React.FC<TableRowProps> = ({ children }) => {
  return <tr className={styles.tableRow}>{children}</tr>
}

export const TableCell: React.FC<TableCellProps> = ({ children, header = false }) => {
  const Component = header ? 'th' : 'td'
  return (
    <Component className={header ? styles.tableHeaderCell : styles.tableCell}>
      {children}
    </Component>
  )
}

export default Table 