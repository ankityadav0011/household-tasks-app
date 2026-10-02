import { useState } from 'react';

/**
 * Small form helper: keeps values, shows an error only after the field was touched
 * (or after a failed submit), and can display errors that come back from the server.
 * validators = { fieldName: (value, allValues) => 'error message' | null }
 */
export default function useForm(initialValues, validators) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});

  const clientErrors = {};
  Object.keys(validators).forEach((field) => {
    clientErrors[field] = validators[field](values[field], values);
  });

  const setValue = (field) => (text) => {
    setValues((prev) => ({ ...prev, [field]: text }));
    setServerErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const touch = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const errorFor = (field) => serverErrors[field] || (touched[field] ? clientErrors[field] : null);

  // Marks every field as touched and returns true when everything is valid.
  const validateAll = () => {
    const all = {};
    Object.keys(validators).forEach((field) => {
      all[field] = true;
    });
    setTouched(all);
    return Object.values(clientErrors).every((e) => !e);
  };

  // details: [{ field, message }] from the API. fieldMap renames API fields to form fields.
  const applyServerErrors = (details, fieldMap = {}) => {
    const next = {};
    (details || []).forEach((d) => {
      const field = fieldMap[d.field] || d.field;
      if (field in initialValues && !next[field]) next[field] = d.message;
    });
    setServerErrors(next);
    return Object.keys(next).length > 0;
  };

  return { values, setValue, touch, errorFor, validateAll, applyServerErrors };
}
