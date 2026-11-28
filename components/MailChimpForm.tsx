import React, { useId, useState } from 'react';
import MailchimpSubscribe, { EmailFormFields } from 'react-mailchimp-subscribe';
import { FiArrowRight } from 'react-icons/fi';
import styles from './MailChimpForm.module.css';

// EMAIL is Mailchimp's canonical field (MERGE0 is its alias); MERGE1/2 = first/last name
interface MailchimpFields extends EmailFormFields {
  MERGE1: string;
  MERGE2: string;
}

interface CustomFormProps {
  status: string | null;
  message: string | Error | null;
  onValidated: (formData: MailchimpFields) => void;
}

// Mailchimp answers with a string (which may contain a link) or an Error
const getMessageString = (msg: string | Error | null): string => {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  return msg.message || 'An error occurred';
};

const CustomForm = ({ status, message, onValidated }: CustomFormProps) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const fieldId = useId();

  const ready = Boolean(email && firstName && lastName && email.includes('@'));
  const sending = status === 'sending';
  const done = status === 'success';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ready) onValidated({ EMAIL: email, MERGE1: firstName, MERGE2: lastName });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.card}>
      <p className={styles.kicker}>Newsletter</p>
      <h2 className={styles.title}>{done ? 'I appreciate it!' : 'Join my mailing list!'}</h2>

      {done ? (
        // Mailchimp's own confirmation text
        <p className={styles.copy} dangerouslySetInnerHTML={{ __html: getMessageString(message) }} />
      ) : (
        <>
          <p className={styles.copy}>
            I will only send you mails when new posts are out. They will also contain original content,
            easter eggs, and other fun stuff. You can unsubscribe at any time, and it might go to your spam
            folder anyway.
          </p>

          <div className={styles.fields}>
            <label className={styles.field} htmlFor={`${fieldId}-first`}>
              <span>First name</span>
              <input id={`${fieldId}-first`} type="text" autoComplete="given-name" placeholder="Jane" required
                value={firstName} onChange={e => setFirstName(e.target.value)} />
            </label>
            <label className={styles.field} htmlFor={`${fieldId}-last`}>
              <span>Last name</span>
              <input id={`${fieldId}-last`} type="text" autoComplete="family-name" placeholder="Doe" required
                value={lastName} onChange={e => setLastName(e.target.value)} />
            </label>
            <label className={`${styles.field} ${styles.wide}`} htmlFor={`${fieldId}-email`}>
              <span>Email</span>
              <input id={`${fieldId}-email`} type="email" autoComplete="email" placeholder="you@matter.to.me" required
                value={email} onChange={e => setEmail(e.target.value)} />
            </label>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.submit} disabled={!ready || sending}>
              {sending ? 'Sending…' : 'Subscribe'} <FiArrowRight aria-hidden="true" />
            </button>
            {status === 'error' && (
              <p className={styles.error} role="alert" dangerouslySetInnerHTML={{ __html: getMessageString(message) }} />
            )}
          </div>
        </>
      )}
    </form>
  );
};

/** The newsletter sign-up at the end of every post (Mailchimp) */
const MailChimpForm = () => {
  const postUrl = `https://gianlucabelvisi.us20.list-manage.com/subscribe/post?u=${process.env.NEXT_PUBLIC_MAILCHIMP_U}&id=${process.env.NEXT_PUBLIC_MAILCHIMP_ID}`;

  return (
    <MailchimpSubscribe
      url={postUrl}
      render={({ subscribe, status, message }) => (
        <CustomForm
          status={status}
          message={message}
          onValidated={formData => subscribe(formData)}
        />
      )}
    />
  );
};

export default MailChimpForm;
