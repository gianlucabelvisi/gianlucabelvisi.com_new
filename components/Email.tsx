import { FiCornerUpLeft, FiMail, FiStar } from 'react-icons/fi'
import styles from './Email.module.css'

interface EmailProps {
  /** "Display Name <address@example.com>" or just an address */
  from: string
  to: string
  subject?: string
  /** Rendered after the body behind an old-school "-- " signature delimiter */
  signature?: string
  children: React.ReactNode
}

interface Contact {
  name: string
  address: string | null
}

/** Split "Name <address>" into its parts; a bare address is used as the name */
function parseContact(raw: string): Contact {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  if (match && match[1]) return { name: match[1], address: match[2] }
  if (match) return { name: match[2], address: null }
  return { name: raw.trim(), address: null }
}

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'
}

/**
 * An email rendered like a message open in a mail client: subject bar,
 * sender avatar with name and address, recipient, then the body.
 */
const Email = ({ from, to, subject, signature, children }: EmailProps) => {
  const sender = parseContact(from)
  const recipient = parseContact(to)

  return (
    <figure className={styles.email} aria-label={subject ? `Email: ${subject}` : `Email from ${sender.name}`}>
      <div className={styles.toolbar}>
        <FiMail className={styles.toolbarIcon} aria-hidden="true" />
        <span className={styles.subject}>{subject || '(no subject)'}</span>
        <span className={styles.toolbarActions} aria-hidden="true">
          <FiStar />
          <FiCornerUpLeft />
        </span>
      </div>

      <div className={styles.meta}>
        <span className={styles.avatar} aria-hidden="true">{initials(sender.name)}</span>
        <div className={styles.metaText}>
          <div className={styles.sender}>
            <span className={styles.senderName}>{sender.name}</span>
            {sender.address && <span className={styles.address}>&lt;{sender.address}&gt;</span>}
          </div>
          <div className={styles.recipient}>
            to <span className={styles.recipientName}>{recipient.name}</span>
            {recipient.address && <> &lt;{recipient.address}&gt;</>}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {children}
        {signature && (
          <div className={styles.signature}>
            <span className={styles.sigDelimiter} aria-hidden="true">-- </span>
            {signature}
          </div>
        )}
      </div>
    </figure>
  )
}

export default Email
