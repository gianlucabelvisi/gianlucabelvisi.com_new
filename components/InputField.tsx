import React from 'react';

interface InputFieldProps {
  label: string;
  type: 'text' | 'email' | 'submit' | 'textarea';
  onChangeHandler?: (value: string) => void;
  value?: string;
  placeholder?: string;
  isRequired?: boolean;
  name?: string;
  formValues?: string[];
}

const InputField = (props: InputFieldProps) => {
  const validateInput = (values: string[]) => {
    if (values.some(f => f === "") || values[0].indexOf("@") === -1) {
      return true;
    } else {
      return false;
    }
  };

  if (props.type === "submit") {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0.5rem 0',
        alignItems: 'end',
        paddingRight: '20%'
      }}>
        <input
          type="submit"
          value={props.label}
          disabled={props.formValues ? validateInput(props.formValues) : false}
          style={{
            height: '2rem',
            paddingLeft: '10px',
            paddingRight: '10px',
            borderRadius: '5px',
            backgroundColor: 'white',
            border: '1px solid #484848',
            cursor: props.formValues && !validateInput(props.formValues) ? 'pointer' : 'not-allowed',
            opacity: props.formValues && validateInput(props.formValues) ? 0.6 : 1
          }}
        />
      </div>
    );
  } else if (props.type === "textarea") {
    return (
      <label style={{ display: 'inline-block' }}>
        {props.label}
        <textarea
          onChange={(e) => props.onChangeHandler?.(e.target.value)}
          placeholder={props.placeholder}
          value={props.value}
          required={props.isRequired}
          rows={7}
          name={props.name}
          style={{
            paddingLeft: '.3rem',
            marginLeft: '1rem',
            borderRadius: '5px',
            border: '1px solid #484848',
            width: '100%'
          }}
        />
      </label>
    );
  } else {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0.5rem 0',
        alignItems: 'end',
        paddingRight: '30%'
      }}>
        <label style={{ display: 'inline-block' }}>
          {props.label}
          <input
            onChange={(e) => props.onChangeHandler?.(e.target.value)}
            type={props.type}
            placeholder={props.placeholder}
            value={props.value}
            required={props.isRequired}
            name={props.name}
            style={{
              paddingLeft: '.3rem',
              marginLeft: '1rem',
              height: '2rem',
              borderRadius: '5px',
              border: '1px solid #484848'
            }}
          />
        </label>
      </div>
    );
  }
};

export default InputField; 