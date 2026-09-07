import React, { useState } from 'react';
import MailchimpSubscribe, { EmailFormFields } from 'react-mailchimp-subscribe';
import InputField from './InputField';
import TextBox from './TextBox';

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

// Helper function to convert message to string
const getMessageString = (msg: string | Error | null): string => {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  return msg.message || 'An error occurred';
};

const CustomForm = ({ status, message, onValidated }: CustomFormProps) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // No need to clear fields on success: the inputs are unmounted once status === "success".

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && firstName && lastName && email.indexOf("@") > -1) {
      onValidated({
        EMAIL: email,
        MERGE1: firstName,
        MERGE2: lastName,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
      <TextBox title={status === "success" ? "I appreciate it!" : "Join my mailing list!"}>
        
        {status !== "success" && status !== "error" && status !== "submitted" && status !== "sending" && (
          <>
            <p style={{ marginBottom: '1rem' }}>
              I will only send you mails when new posts are out. They will also contain original content,
              easter eggs, and other fun stuff.
            </p>
            <p style={{ marginBottom: '1rem' }}>
              You can unsubscribe at any time, and it might go to your spam
              folder anyway.
            </p>
          </>
        )}

        {status === "sending" && (
          <p style={{ marginBottom: '1rem' }}>
            sending...
          </p>
        )}
        
        {status === "error" && (
          <p 
            style={{ marginBottom: '1rem' }}
            dangerouslySetInnerHTML={{ __html: getMessageString(message) }}
          />
        )}
        
        {status === "success" && (
          <p
            style={{ marginBottom: '1rem' }}
            dangerouslySetInnerHTML={{ __html: getMessageString(message) }}
          />
        )}

        {status !== "success" ? (
          <>
            <InputField
              label="First Name"
              onChangeHandler={setFirstName}
              type="text"
              value={firstName}
              placeholder="Jane"
              isRequired
            />

            <InputField
              label="Last Name"
              onChangeHandler={setLastName}
              type="text"
              value={lastName}
              placeholder="Doe"
              isRequired
            />

            <InputField
              label="Email"
              onChangeHandler={setEmail}
              type="email"
              value={email}
              placeholder="you@matter.to.me"
              isRequired
            />
          </>
        ) : null}

        <InputField
          label="subscribe"
          type="submit"
          formValues={[email, firstName, lastName]}
        />
        
      </TextBox>
    </form>
  );
};

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